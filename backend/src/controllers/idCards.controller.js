const crypto = require('crypto');
const QRCode = require('qrcode');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const SystemSetting = require('../models/SystemSetting');
const StaffAttendanceRecord = require('../models/StaffAttendanceRecord');
const AttendanceRecord = require('../models/AttendanceRecord');

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
          const baseUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
          const qrPayloadUrl = `${baseUrl}/verify-card/${token}`;
          const qrDataUrl = await QRCode.toDataURL(qrPayloadUrl, { margin: 1, width: 200 });
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
            qrPayloadUrl,
            schoolProfile,
          };
        })
      );
    } else {
      const staffList = await Staff.find({ status: 'active' }).lean();
      items = await Promise.all(
        staffList.map(async (st) => {
          const token = createEntityQrToken('staff', st._id.toString());
          const baseUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
          const qrPayloadUrl = `${baseUrl}/verify-card/${token}`;
          const qrDataUrl = await QRCode.toDataURL(qrPayloadUrl, { margin: 1, width: 200 });
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
            qrPayloadUrl,
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
      const student = await Student.findById(id)
        .populate('currentClass', 'name')
        .populate('guardians', 'primaryPhone firstName lastName')
        .lean();

      if (!student) {
        return res.status(404).json({ success: false, message: 'Student record not found.' });
      }

      // Upsert student daily attendance record for today
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const lateCutoffMins = 8 * 60; // 8:00 AM late cutoff
      const studentStatus = currentMins > lateCutoffMins ? 'late' : 'present';

      if (student.currentClass?._id) {
        await AttendanceRecord.findOneAndUpdate(
          { student: id, class: student.currentClass._id, date: startOfDay },
          {
            student: id,
            class: student.currentClass._id,
            date: startOfDay,
            status: studentStatus,
            recordedBy: req.user?.id || req.user?._id || id,
            notes: `Logged via Gate QR Terminal at ${timeStr}`,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }

      const name = `${student.firstName} ${student.lastName}`;
      const primaryGuardian = student.guardians?.[0];

      return res.status(200).json({
        success: true,
        entityType: 'student',
        action: 'gate_entry',
        status: studentStatus,
        name,
        photoUrl: student.photoUrl || null,
        admissionNumber: student.admissionNumber || 'N/A',
        className: student.currentClass?.name || 'Unassigned',
        emergencyContact: primaryGuardian?.primaryPhone || 'N/A',
        timestamp: now.toLocaleTimeString(),
        message: `Gate Entry Verified: ${name} (${student.currentClass?.name || 'Student'}) logged as ${studentStatus.toUpperCase()} at ${timeStr}.`,
      });
    }

    return res.status(400).json({ success: false, message: 'Unknown card type' });
  } catch (error) {
    console.error('Error processing gate scan:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/gate-scanner/stats
 * Returns today's terminal scan metrics
 */
exports.getGateStats = async (req, res) => {
  try {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [staffPresent, studentsLogged] = await Promise.all([
      StaffAttendanceRecord.countDocuments({ dateStr }),
      AttendanceRecord.countDocuments({ date: startOfDay }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        staffPresent,
        studentsLogged,
        totalScansToday: staffPresent + studentsLogged,
      },
    });
  } catch (error) {
    console.error('Error fetching gate stats:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/gate-scanner/sample-tokens
 * Returns pre-signed QR sample tokens for instant testing
 */
exports.getSampleTokens = async (req, res) => {
  try {
    const [students, staffList] = await Promise.all([
      Student.find({ status: 'active' }).limit(5).populate('currentClass', 'name').lean(),
      Staff.find({ status: 'active' }).limit(5).lean(),
    ]);

    const sampleTokens = [
      ...students.map((s) => ({
        id: s._id,
        entityType: 'student',
        name: `${s.firstName} ${s.lastName}`,
        sub: s.currentClass?.name || 'Student',
        token: createEntityQrToken('student', s._id.toString()),
      })),
      ...staffList.map((st) => ({
        id: st._id,
        entityType: 'staff',
        name: `${st.title ? st.title + ' ' : ''}${st.firstName} ${st.lastName}`,
        sub: st.role ? st.role.toUpperCase() : 'STAFF',
        token: createEntityQrToken('staff', st._id.toString()),
      })),
    ];

    return res.status(200).json({
      success: true,
      data: sampleTokens,
    });
  } catch (error) {
    console.error('Error fetching sample tokens:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/id-cards/verify-public/:token
 * Unauthenticated endpoint for verifying scanned ID cards via mobile phone cameras
 */
exports.verifyPublicCardToken = async (req, res) => {
  try {
    const { token } = req.params;
    const parsed = verifyEntityQrToken(token);

    if (!parsed) {
      return res.status(200).json({
        success: true,
        valid: false,
        message: 'Invalid or forged ID Card QR code. Document authenticity cannot be verified.',
      });
    }

    const schoolSetting = await SystemSetting.findOne({ key: 'school_profile' });
    const schoolProfile = schoolSetting?.value || {
      name: 'HANARA SCHOOLS',
      motto: 'Knowledge, Character & Excellence',
      phone: '+233 20 000 0000',
      address: 'Tamale, Northern Region, Ghana',
    };

    const { type, id } = parsed;

    if (type === 'student') {
      const student = await Student.findById(id)
        .populate('currentClass', 'name')
        .populate('guardians', 'primaryPhone firstName lastName')
        .lean();

      if (!student) {
        return res.status(200).json({
          success: true,
          valid: false,
          message: 'Student record not found or has been revoked.',
        });
      }

      const primaryGuardian = student.guardians?.[0];

      return res.status(200).json({
        success: true,
        valid: true,
        entityType: 'student',
        token,
        data: {
          fullName: `${student.firstName} ${student.otherNames ? student.otherNames + ' ' : ''}${student.lastName}`,
          admissionNumber: student.admissionNumber || 'N/A',
          photoUrl: student.photoUrl || null,
          gender: student.gender || 'N/A',
          className: student.currentClass?.name || 'Unassigned',
          status: student.status || 'active',
          emergencyContact: primaryGuardian?.primaryPhone || schoolProfile.phone,
          schoolProfile,
          verifiedAt: new Date().toISOString(),
        },
      });
    }

    if (type === 'staff') {
      const staff = await Staff.findById(id).lean();
      if (!staff) {
        return res.status(200).json({
          success: true,
          valid: false,
          message: 'Staff record not found or has been revoked.',
        });
      }

      const title = staff.title ? `${staff.title} ` : '';
      return res.status(200).json({
        success: true,
        valid: true,
        entityType: 'staff',
        token,
        data: {
          fullName: `${title}${staff.firstName} ${staff.lastName}`,
          staffId: staff.employeeId || staff.staffId || staff._id.toString().substring(0, 8).toUpperCase(),
          photoUrl: staff.photoUrl || null,
          role: staff.role ? staff.role.toUpperCase() : 'STAFF',
          department: staff.department || 'Academic',
          status: staff.status || 'active',
          emergencyContact: staff.phone || schoolProfile.phone,
          schoolProfile,
          verifiedAt: new Date().toISOString(),
        },
      });
    }

    return res.status(200).json({ success: true, valid: false, message: 'Unrecognized card token type.' });
  } catch (error) {
    console.error('Error verifying public card token:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
