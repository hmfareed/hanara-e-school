const crypto = require('crypto');
const QRCode = require('qrcode');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const SystemSetting = require('../models/SystemSetting');
const StaffAttendanceRecord = require('../models/StaffAttendanceRecord');

const SECRET_KEY = process.env.JWT_ACCESS_SECRET || 'hanara-secret-key-2026';

/**
 * Generate a signed QR token string for an entity
 */
function createEntityQrToken(type, id) {
  const payload = `${type}:${id}`;
  const hmac = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex').substring(0, 8);
  return `HNR:${type}:${id}:${hmac}`;
}

/**
 * Verify and parse QR token string
 */
function verifyEntityQrToken(qrString) {
  if (!qrString || typeof qrString !== 'string') return null;
  const parts = qrString.trim().split(':');
  if (parts.length !== 4 || parts[0] !== 'HNR') return null;
  const [_, type, id, signature] = parts;
  const expectedHmac = crypto.createHmac('sha256', SECRET_KEY).update(`${type}:${id}`).digest('hex').substring(0, 8);
  if (signature !== expectedHmac) return null;
  return { type, id };
}

/**
 * GET /api/id-cards/batch?entity=student|staff&classId=...
 * Returns batch payloads for generating ID cards
 */
exports.getBatchCardsPayload = async (req, res) => {
  try {
    const { entity = 'student', classId } = req.query;

    const schoolSetting = await SystemSetting.findOne({ key: 'school_profile' });
    const schoolProfile = schoolSetting?.value || {
      name: 'HANARA SCHOOLS',
      motto: 'Knowledge, Character & Excellence',
      phone: '+233 20 000 0000',
      address: 'Tamale, Northern Region, Ghana',
    };

    let items = [];

    if (entity === 'student') {
      const filter = { status: 'active' };
      if (classId) filter.currentClass = classId;
      const students = await Student.find(filter)
        .populate('currentClass', 'name level')
        .populate('guardians', 'primaryPhone firstName lastName')
        .lean();

      items = await Promise.all(
        students.map(async (s) => {
          const token = createEntityQrToken('student', s._id.toString());
          const qrDataUrl = await QRCode.toDataURL(token, { margin: 1, width: 200 });
          const primaryGuardian = s.guardians?.[0];
          return {
            _id: s._id,
            entity: 'student',
            fullName: `${s.firstName} ${s.lastName}`,
            admissionNumber: s.admissionNumber || 'N/A',
            photoUrl: s.photoUrl || null,
            subTitle: s.currentClass?.name || 'Student',
            level: s.currentClass?.level || 'Primary',
            gender: s.gender || 'N/A',
            dob: s.dateOfBirth ? new Date(s.dateOfBirth).toISOString().split('T')[0] : 'N/A',
            bloodGroup: s.bloodGroup || 'O+',
            emergencyContact: primaryGuardian?.primaryPhone || schoolProfile.phone,
            qrDataUrl,
            qrToken: token,
            schoolProfile,
          };
        })
      );
    } else {
      const staffList = await Staff.find({ status: 'active' }).lean();
      items = await Promise.all(
        staffList.map(async (st) => {
          const token = createEntityQrToken('staff', st._id.toString());
          const qrDataUrl = await QRCode.toDataURL(token, { margin: 1, width: 200 });
          const title = st.title ? `${st.title} ` : '';
          return {
            _id: st._id,
            entity: 'staff',
            fullName: `${title}${st.firstName} ${st.lastName}`,
            staffId: st.employeeId || st.staffId || st._id.toString().substring(0, 8).toUpperCase(),
            photoUrl: st.photoUrl || null,
            subTitle: st.role ? st.role.toUpperCase() : 'STAFF',
            department: st.department || 'Academic',
            phone: st.phone || schoolProfile.phone,
            emergencyContact: st.emergencyContactPhone || st.phone || schoolProfile.phone,
            qrDataUrl,
            qrToken: token,
            schoolProfile,
          };
        })
      );
    }

    return res.status(200).json({
      success: true,
      data: items,
      total: items.length,
    });
  } catch (error) {
    console.error('Error fetching batch card payload:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/gate-scanner/scan
 * Body: { qrToken }
 * Handles instant scan event for staff or student gate check-in
 */
exports.processGateScan = async (req, res) => {
  try {
    const { qrToken } = req.body;
    const parsed = verifyEntityQrToken(qrToken);

    if (!parsed) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or corrupted QR Code. Please scan an authentic HANARA ID Card.',
      });
    }

    const { type, id } = parsed;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateStr = now.toISOString().split('T')[0];

    if (type === 'staff') {
      const staff = await Staff.findById(id).lean();
      if (!staff) {
        return res.status(404).json({ success: false, message: 'Staff member record not found.' });
      }

      let record = await StaffAttendanceRecord.findOne({ staff: id, dateStr });
      let action = 'check_in';
      let status = 'present';

      if (!record) {
        // Perform Check-in
        const lateThresholdSetting = await SystemSetting.findOne({ key: 'staff_attendance_geofence' });
        const lateMins = lateThresholdSetting?.value?.lateThresholdMinutes || 15;
        const workStartMins = 7 * 60 + 30; // 7:30 AM
        const currentMins = now.getHours() * 60 + now.getMinutes();

        if (currentMins > workStartMins + lateMins) {
          status = 'late';
        }

        record = await StaffAttendanceRecord.create({
          staff: id,
          date: now,
          dateStr,
          status,
          checkInTime: timeStr,
          markedByRole: 'gate_scanner',
          geofenceVerified: true,
        });
        action = 'check_in';
      } else if (!record.checkOutTime) {
        // Perform Check-out
        record.checkOutTime = timeStr;
        await record.save();
        action = 'check_out';
        status = record.status;
      } else {
        // Already checked out
        action = 'already_completed';
        status = record.status;
      }

      const name = `${staff.title ? staff.title + ' ' : ''}${staff.firstName} ${staff.lastName}`;
      return res.status(200).json({
        success: true,
        entityType: 'staff',
        action,
        status,
        name,
        photoUrl: staff.photoUrl || null,
        role: staff.role || 'Staff',
        checkInTime: record.checkInTime,
        checkOutTime: record.checkOutTime,
        timestamp: now.toLocaleTimeString(),
        message: action === 'check_in'
          ? `Welcome, ${name}! Checked IN at ${timeStr}.`
          : action === 'check_out'
          ? `Goodbye, ${name}! Checked OUT at ${timeStr}.`
          : `${name} has already checked out for today.`,
      });
    }

    if (type === 'student') {
      const student = await Student.findById(id).populate('currentClass', 'name').lean();
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student record not found.' });
      }

      const name = `${student.firstName} ${student.lastName}`;
      return res.status(200).json({
        success: true,
        entityType: 'student',
        action: 'gate_entry',
        status: 'present',
        name,
        photoUrl: student.photoUrl || null,
        admissionNumber: student.admissionNumber || 'N/A',
        className: student.currentClass?.name || 'Class',
        timestamp: now.toLocaleTimeString(),
        message: `Gate Pass Approved: ${name} (${student.currentClass?.name || 'Student'}) logged at ${timeStr}.`,
      });
    }

    return res.status(400).json({ success: false, message: 'Unknown card type' });
  } catch (error) {
    console.error('Error processing gate scan:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
