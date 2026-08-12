const crypto = require('crypto');
const StaffAttendanceRecord = require('../models/StaffAttendanceRecord');
const Staff = require('../models/Staff');
const AttendanceDevice = require('../models/AttendanceDevice');
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceEvent = require('../models/AttendanceEvent');
const SystemSetting = require('../models/SystemSetting');
const qrCredentialService = require('../services/qrCredential.service');
const logger = require('../utils/logger');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in metres
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toMidnight(date) {
  const d = new Date(date || Date.now());
  d.setHours(0, 0, 0, 0);
  return d;
}

function nowTimeString(date = new Date()) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
  return h * 60 + m;
}

function calculateDurationMinutes(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const inMins = parseTimeToMinutes(checkIn);
  const outMins = parseTimeToMinutes(checkOut);
  return outMins > inMins ? outMins - inMins : 0;
}

async function getGeofenceSettings() {
  const setting = await SystemSetting.findOne({ key: 'staff_attendance_geofence' });
  if (!setting || !setting.value) {
    return {
      enabled: true,
      radiusMetres: 150,
      lateThresholdMinutes: 15,
      zogbeli: { name: 'Zogbeli Branch', lat: null, lng: null, radiusMetres: 150 },
      vittin: { name: 'Vittin Branch', lat: null, lng: null, radiusMetres: 150 },
    };
  }
  const val = setting.value;
  if (!val.zogbeli) {
    val.zogbeli = {
      name: 'Zogbeli Branch',
      lat: val.lat || null,
      lng: val.lng || null,
      radiusMetres: val.radiusMetres || 150,
    };
  }
  if (!val.vittin) {
    val.vittin = {
      name: 'Vittin Branch',
      lat: null,
      lng: null,
      radiusMetres: val.radiusMetres || 150,
    };
  }
  return val;
}

// ─── POST /api/attendance/scan ────────────────────────────────────────────────
const scanQr = async (req, res, next) => {
  try {
    const { credential, latitude, longitude } = req.body;
    const device = req.kioskDevice;

    if (!credential) {
      return res.status(400).json({ success: false, message: 'QR credential token is required' });
    }

    // 1. Verify credential
    const verifyResult = await qrCredentialService.verifyCredentialToken(credential);
    if (!verifyResult.valid) {
      // Log rejected audit event
      await AttendanceEvent.create({
        staff: null,
        device: device?._id || null,
        deviceName: device?.deviceName || 'Kiosk Scanner',
        eventType: 'REJECTED',
        latitude: latitude || null,
        longitude: longitude || null,
        ipAddress: req.ip,
        result: 'REJECTED',
        failureReason: verifyResult.reason,
      });

      return res.status(401).json({
        success: false,
        message: verifyResult.reason,
        eventType: 'REJECTED',
      });
    }

    const staff = verifyResult.staff;
    const today = toMidnight();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // 2. Check Session
    let activeSession = await AttendanceSession.findOne({
      date: { $gte: today, $lt: tomorrow },
      status: 'ACTIVE',
    });

    const lateThresholdStr = activeSession?.lateThresholdTime || '08:00';

    // 3. Location Verification (if required)
    const geofence = await getGeofenceSettings();
    let geofenceVerified = false;
    let distanceFromSchool = null;

    const allowedRadius = device?.allowedRadiusMetres || geofence.radiusMetres || 150;
    const schoolLat = device?.geoCoordinates?.lat ?? geofence.lat;
    const schoolLng = device?.geoCoordinates?.lng ?? geofence.lng;

    if (geofence.enabled || device?.antiProxyLevel === 'secure' || device?.antiProxyLevel === 'high_security') {
      if (latitude != null && longitude != null && schoolLat != null && schoolLng != null) {
        distanceFromSchool = Math.round(haversineDistance(latitude, longitude, schoolLat, schoolLng));
        if (distanceFromSchool <= allowedRadius) {
          geofenceVerified = true;
        } else if (geofence.enabled) {
          await AttendanceEvent.create({
            staff: staff._id,
            device: device?._id || null,
            deviceName: device?.deviceName || 'Kiosk Scanner',
            eventType: 'REJECTED',
            latitude,
            longitude,
            ipAddress: req.ip,
            result: 'REJECTED',
            failureReason: `Outside permitted radius (${distanceFromSchool}m away, max ${allowedRadius}m)`,
          });

          return res.status(403).json({
            success: false,
            message: `Location check failed. You are ${distanceFromSchool}m away (Max allowed: ${allowedRadius}m).`,
            eventType: 'REJECTED',
          });
        }
      }
    }

    // 4. Find existing record for today
    let record = await StaffAttendanceRecord.findOne({
      staff: staff._id,
      date: { $gte: today, $lt: tomorrow },
    });

    const now = new Date();
    const scanTimeStr = nowTimeString(now);
    let eventType = 'CHECK_IN';
    let responseStatus = 'present';
    let lateMinutes = 0;

    if (!record || !record.checkInTime) {
      // ── CHECK-IN ──
      eventType = 'CHECK_IN';
      const scanMins = parseTimeToMinutes(scanTimeStr);
      const lateMins = parseTimeToMinutes(lateThresholdStr);

      if (scanMins > lateMins) {
        responseStatus = 'late';
        lateMinutes = scanMins - lateMins;
      } else {
        responseStatus = 'present';
      }

      if (!record) {
        record = new StaffAttendanceRecord({
          staff: staff._id,
          date: today,
          session: activeSession?._id || null,
          device: device?._id || null,
          status: responseStatus,
          checkInTime: scanTimeStr,
          checkInStatus: responseStatus === 'late' ? 'LATE' : 'PRESENT',
          checkInLocation: { lat: latitude || null, lng: longitude || null },
          distanceFromSchool,
          geofenceVerified,
          markedByRole: device?._id ? 'kiosk' : 'self',
        });
      } else {
        record.checkInTime = scanTimeStr;
        record.status = responseStatus;
        record.checkInStatus = responseStatus === 'late' ? 'LATE' : 'PRESENT';
        record.checkInLocation = { lat: latitude || null, lng: longitude || null };
        record.distanceFromSchool = distanceFromSchool;
        record.geofenceVerified = geofenceVerified;
      }

      await record.save();

      // Log event
      await AttendanceEvent.create({
        staff: staff._id,
        device: device?._id || null,
        deviceName: device?.deviceName || 'Kiosk Scanner',
        eventType: 'CHECK_IN',
        timestamp: now,
        latitude: latitude || null,
        longitude: longitude || null,
        ipAddress: req.ip,
        result: responseStatus === 'late' ? 'LATE' : 'SUCCESS',
        failureReason: responseStatus === 'late' ? `Late by ${lateMinutes} mins` : '',
        metadata: { lateMinutes, antiProxyLevel: device?.antiProxyLevel || 'standard' },
      });
    } else if (record.checkInTime && !record.checkOutTime) {
      // ── CHECK-OUT ──
      eventType = 'CHECK_OUT';
      record.checkOutTime = scanTimeStr;
      record.checkOutStatus = 'CHECKED_OUT';
      record.totalMinutes = calculateDurationMinutes(record.checkInTime, scanTimeStr);
      await record.save();

      // Log event
      await AttendanceEvent.create({
        staff: staff._id,
        device: device?._id || null,
        deviceName: device?.deviceName || 'Kiosk Scanner',
        eventType: 'CHECK_OUT',
        timestamp: now,
        latitude: latitude || null,
        longitude: longitude || null,
        ipAddress: req.ip,
        result: 'SUCCESS',
        metadata: { totalMinutes: record.totalMinutes },
      });
    } else {
      // Already checked in and checked out today
      return res.json({
        success: true,
        alreadyCompleted: true,
        eventType: 'ALREADY_COMPLETED',
        message: `${staff.firstName} ${staff.lastName} has already completed check-in and check-out today.`,
        data: {
          staff: {
            id: staff._id,
            name: `${staff.title ? staff.title + ' ' : ''}${staff.firstName} ${staff.lastName}`,
            staffId: staff.staffId,
            photoUrl: staff.photoUrl,
            department: staff.department,
            role: staff.role,
          },
          record,
        },
      });
    }

    // 5. Real-time Socket.io Broadcast
    const io = req.app.get('io');
    const socketPayload = {
      recordId: record._id,
      staffId: staff._id,
      staffName: `${staff.title ? staff.title + ' ' : ''}${staff.firstName} ${staff.lastName}`,
      photoUrl: staff.photoUrl,
      role: staff.role,
      eventType,
      status: record.status,
      checkInTime: record.checkInTime,
      checkOutTime: record.checkOutTime,
      timestamp: new Date(),
    };

    if (io) {
      io.emit('staff_attendance_scanned', socketPayload);
      io.emit('staff_attendance_updated', socketPayload);
    }

    logger.info(`[StaffAttendance QR Scan] ${eventType} for ${staff.firstName} ${staff.lastName} (${staff._id})`);

    res.json({
      success: true,
      eventType,
      message:
        eventType === 'CHECK_IN'
          ? responseStatus === 'late'
            ? `Welcome ${staff.firstName}! Check-in recorded (Late by ${lateMinutes}m).`
            : `Good morning, ${staff.firstName}! Check-in successful.`
          : `Goodbye ${staff.firstName}! Check-out successful (${Math.floor(record.totalMinutes / 60)}h ${record.totalMinutes % 60}m worked).`,
      data: {
        staff: {
          id: staff._id,
          name: `${staff.title ? staff.title + ' ' : ''}${staff.firstName} ${staff.lastName}`,
          staffId: staff.staffId,
          photoUrl: staff.photoUrl,
          department: staff.department,
          role: staff.role,
        },
        record,
        antiProxyLevel: device?.antiProxyLevel || 'high_security',
        lateMinutes,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/attendance/sync (Offline Batch Sync) ──────────────────────────
const syncOfflineScans = async (req, res, next) => {
  try {
    const { events } = req.body; // Array of offline scan events
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ success: false, message: 'No offline events provided' });
    }

    const processed = [];
    const errors = [];

    for (const evt of events) {
      try {
        const verifyResult = await qrCredentialService.verifyCredentialToken(evt.credential);
        if (!verifyResult.valid) {
          errors.push({ credential: evt.credential, reason: verifyResult.reason });
          continue;
        }

        const staff = verifyResult.staff;
        const scanDate = evt.timestamp ? new Date(evt.timestamp) : new Date();
        const today = toMidnight(scanDate);
        const nextDay = new Date(today);
        nextDay.setDate(today.getDate() + 1);

        let record = await StaffAttendanceRecord.findOne({
          staff: staff._id,
          date: { $gte: today, $lt: nextDay },
        });

        const timeStr = nowTimeString(scanDate);

        if (!record) {
          record = await StaffAttendanceRecord.create({
            staff: staff._id,
            date: today,
            status: 'present',
            checkInTime: timeStr,
            checkInStatus: 'PRESENT',
            markedByRole: 'kiosk',
          });
        } else if (!record.checkOutTime && record.checkInTime !== timeStr) {
          record.checkOutTime = timeStr;
          record.checkOutStatus = 'CHECKED_OUT';
          record.totalMinutes = calculateDurationMinutes(record.checkInTime, timeStr);
          await record.save();
        }

        await AttendanceEvent.create({
          staff: staff._id,
          eventType: record.checkOutTime ? 'CHECK_OUT' : 'CHECK_IN',
          timestamp: scanDate,
          result: 'SUCCESS',
          metadata: { offlineSynced: true },
        });

        processed.push({ staffId: staff._id, name: `${staff.firstName} ${staff.lastName}` });
      } catch (err) {
        errors.push({ error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Synced ${processed.length} offline events successfully.`,
      data: { processed, errors },
    });
  } catch (error) {
    next(error);
  }
};

// ─── STAFF QR CREDENTIAL ENDPOINTS ───────────────────────────────────────────

const getStaffQrHandler = async (req, res, next) => {
  try {
    const staffId = req.params.id;
    const qrData = await qrCredentialService.getStaffQrCode(staffId);
    res.json({ success: true, data: qrData });
  } catch (error) {
    next(error);
  }
};

const generateStaffQrHandler = async (req, res, next) => {
  try {
    const staffId = req.params.id;
    const qrData = await qrCredentialService.generateCredentialForStaff(staffId, req.user.id);
    res.json({ success: true, message: 'New QR credential generated', data: qrData });
  } catch (error) {
    next(error);
  }
};

const revokeStaffQrHandler = async (req, res, next) => {
  try {
    const staffId = req.params.id;
    await qrCredentialService.revokeCredential(staffId, req.user.id);
    res.json({ success: true, message: 'QR credential revoked' });
  } catch (error) {
    next(error);
  }
};

// ─── KIOSK DEVICE MANAGEMENT ───────────────────────────────────────────────

const getDevices = async (req, res, next) => {
  try {
    const devices = await AttendanceDevice.find().sort({ createdAt: -1 });
    res.json({ success: true, data: devices });
  } catch (error) {
    next(error);
  }
};

const createDevice = async (req, res, next) => {
  try {
    const { deviceId, deviceName, locationName, deviceType, antiProxyLevel, allowedRadiusMetres } = req.body;

    // Generate plain device token for kiosk authentication
    const rawDeviceToken = `HAN_KIOSK_${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
    const deviceTokenHash = crypto.createHash('sha256').update(rawDeviceToken).digest('hex');

    const device = await AttendanceDevice.create({
      deviceId: deviceId || `DEV-${Date.now().toString().slice(-6)}`,
      deviceName,
      locationName: locationName || 'Main Reception',
      deviceType: deviceType || 'tablet',
      deviceTokenHash,
      antiProxyLevel: antiProxyLevel || 'high_security',
      allowedRadiusMetres: allowedRadiusMetres || 150,
      registeredBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: 'Kiosk device created successfully. Save the raw device token now.',
      data: {
        device,
        rawDeviceToken, // Only returned once upon creation
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateDevice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deviceName, locationName, status, antiProxyLevel, allowedRadiusMetres } = req.body;

    const device = await AttendanceDevice.findByIdAndUpdate(
      id,
      { $set: { deviceName, locationName, status, antiProxyLevel, allowedRadiusMetres } },
      { new: true }
    );

    res.json({ success: true, message: 'Device updated', data: device });
  } catch (error) {
    next(error);
  }
};

// ─── ATTENDANCE SESSION MANAGEMENT ───────────────────────────────────────────

const getSessions = async (req, res, next) => {
  try {
    const sessions = await AttendanceSession.find().sort({ date: -1, startTime: 1 });
    res.json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
};

const createSession = async (req, res, next) => {
  try {
    const { name, date, startTime, endTime, lateThresholdTime, sessionType } = req.body;

    const session = await AttendanceSession.create({
      name: name || 'Morning Attendance',
      date: toMidnight(date),
      startTime: startTime || '06:00',
      endTime: endTime || '10:00',
      lateThresholdTime: lateThresholdTime || '08:00',
      sessionType: sessionType || 'single_daily',
      status: 'ACTIVE',
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, message: 'Attendance session created', data: session });
  } catch (error) {
    next(error);
  }
};

const updateSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await AttendanceSession.findByIdAndUpdate(id, { $set: req.body }, { new: true });
    res.json({ success: true, message: 'Session updated', data: session });
  } catch (error) {
    next(error);
  }
};

// ─── MANUAL CORRECTION ENDPOINT ─────────────────────────────────────────────

const correctAttendanceRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { checkInTime, checkOutTime, status, reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Correction reason is required' });
    }

    const record = await StaffAttendanceRecord.findById(id).populate('staff');
    if (!record) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    const adminUser = req.user;
    const adminName = `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || adminUser.email;

    // Track correction history log
    const changes = [];
    if (checkInTime !== undefined && checkInTime !== record.checkInTime) {
      changes.push({
        fieldChanged: 'checkInTime',
        oldValue: record.checkInTime,
        newValue: checkInTime,
        reason,
        correctedBy: adminUser.id,
        correctedByName: adminName,
      });
      record.checkInTime = checkInTime;
    }

    if (checkOutTime !== undefined && checkOutTime !== record.checkOutTime) {
      changes.push({
        fieldChanged: 'checkOutTime',
        oldValue: record.checkOutTime,
        newValue: checkOutTime,
        reason,
        correctedBy: adminUser.id,
        correctedByName: adminName,
      });
      record.checkOutTime = checkOutTime;
    }

    if (status && status !== record.status) {
      changes.push({
        fieldChanged: 'status',
        oldValue: record.status,
        newValue: status,
        reason,
        correctedBy: adminUser.id,
        correctedByName: adminName,
      });
      record.status = status;
    }

    record.totalMinutes = calculateDurationMinutes(record.checkInTime, record.checkOutTime);
    record.corrections.push(...changes);
    await record.save();

    // Log correction event
    await AttendanceEvent.create({
      staff: record.staff._id,
      eventType: 'CORRECTION',
      result: 'SUCCESS',
      failureReason: '',
      correctionDetails: {
        newTime: checkInTime || checkOutTime,
        newStatus: status,
        reason,
        correctedBy: adminUser.id,
        correctedByName: adminName,
      },
    });

    res.json({ success: true, message: 'Attendance record corrected successfully', data: record });
  } catch (error) {
    next(error);
  }
};

// ─── AUDIT EVENTS ENDPOINT ──────────────────────────────────────────────────

const getAttendanceEvents = async (req, res, next) => {
  try {
    const events = await AttendanceEvent.find()
      .populate('staff', 'firstName lastName photoUrl role staffId')
      .populate('device', 'deviceName locationName')
      .sort({ timestamp: -1 })
      .limit(100);

    res.json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
};

// ─── ATTENDANCE REPORTS ENDPOINT ────────────────────────────────────────────

const getAttendanceReports = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const targetDate = new Date();
    const targetMonth = month ? parseInt(month, 10) - 1 : targetDate.getMonth();
    const targetYear = year ? parseInt(year, 10) : targetDate.getFullYear();

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    const records = await StaffAttendanceRecord.find({
      date: { $gte: startDate, $lte: endDate },
    }).populate('staff', 'firstName lastName department role staffId');

    const summary = records.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        acc.total++;
        return acc;
      },
      { present: 0, late: 0, absent: 0, on_leave: 0, half_day: 0, total: 0 }
    );

    res.json({
      success: true,
      data: {
        period: { month: targetMonth + 1, year: targetYear },
        summary,
        records,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── EXISTING COMPATIBILITY CONTROLLERS ──────────────────────────────────────

const getGeofenceSettingsHandler = async (req, res, next) => {
  try {
    const settings = await getGeofenceSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

const updateGeofenceSettings = async (req, res, next) => {
  try {
    const { enabled, radiusMetres, lateThresholdMinutes, zogbeli, vittin, lat, lng } = req.body;

    const current = await getGeofenceSettings();
    const updatedValue = {
      enabled: enabled !== undefined ? enabled : current.enabled,
      radiusMetres: radiusMetres || current.radiusMetres || 150,
      lateThresholdMinutes: lateThresholdMinutes || current.lateThresholdMinutes || 15,
      zogbeli: {
        name: 'Zogbeli Branch',
        lat: zogbeli?.lat ?? (lat || current.zogbeli?.lat || null),
        lng: zogbeli?.lng ?? (lng || current.zogbeli?.lng || null),
        radiusMetres: zogbeli?.radiusMetres || radiusMetres || 150,
      },
      vittin: {
        name: 'Vittin Branch',
        lat: vittin?.lat ?? current.vittin?.lat ?? null,
        lng: vittin?.lng ?? current.vittin?.lng ?? null,
        radiusMetres: vittin?.radiusMetres || radiusMetres || 150,
      },
    };

    await SystemSetting.findOneAndUpdate(
      { key: 'staff_attendance_geofence' },
      {
        $set: {
          key: 'staff_attendance_geofence',
          value: updatedValue,
          valueType: 'json',
          category: 'academic',
          editableBy: ['superadmin', 'admin', 'system_admin'],
          description: 'Dual-branch GPS geofence settings for Zogbeli and Vittin',
          lastModifiedBy: req.user.id,
        },
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Geofence settings updated successfully', data: updatedValue });
  } catch (error) {
    next(error);
  }
};

const getMyStatus = async (req, res, next) => {
  try {
    const staffId = req.user.refStaff;
    if (!staffId) {
      return res.status(400).json({ success: false, message: 'No staff profile linked to your account' });
    }

    const today = toMidnight();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const record = await StaffAttendanceRecord.findOne({
      staff: staffId,
      date: { $gte: today, $lt: tomorrow },
    });

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const history = await StaffAttendanceRecord.find({
      staff: staffId,
      date: { $gte: sevenDaysAgo, $lt: tomorrow },
    }).sort({ date: -1 });

    res.json({
      success: true,
      data: { today: record || null, history },
    });
  } catch (error) {
    next(error);
  }
};

const checkIn = async (req, res, next) => {
  try {
    const staffId = req.user.refStaff;
    if (!staffId) {
      return res.status(400).json({ success: false, message: 'No staff profile linked to your account' });
    }

    const staff = await Staff.findById(staffId).populate('classesAssigned');
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff record not found' });
    }

    const { lat, lng, branch: chosenBranch } = req.body;
    const today = toMidnight();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const role = (staff.role || '').toLowerCase();

    // Determine target branch
    let defaultBranch = staff.branch || 'Zogbeli';
    if (role === 'driver') {
      defaultBranch = 'Vittin';
    } else if (role === 'admin' || role === 'superadmin' || role === 'system_admin' || role === 'accountant') {
      defaultBranch = 'Both';
    } else if (staff.classesAssigned && staff.classesAssigned.length > 0) {
      const hasVittin = staff.classesAssigned.some((c) => {
        const name = (c.name || c.displayName || '').toLowerCase();
        return (
          name.includes('primary 5') ||
          name.includes('primary 6') ||
          name.includes('jhs') ||
          name.includes('bs5') ||
          name.includes('bs6') ||
          name.includes('bs7') ||
          name.includes('bs8') ||
          name.includes('bs9')
        );
      });
      defaultBranch = hasVittin ? 'Vittin' : 'Zogbeli';
    }

    let targetBranch = chosenBranch || (defaultBranch === 'Both' ? null : defaultBranch);

    const existing = await StaffAttendanceRecord.findOne({
      staff: staffId,
      date: { $gte: today, $lt: tomorrow },
    });

    if (existing && existing.checkInTime) {
      return res.status(409).json({
        success: false,
        message: `You already checked in today at ${existing.checkInTime}.`,
        data: existing,
      });
    }

    // Geofence & Location Validation
    const geofence = await getGeofenceSettings();
    let geofenceVerified = false;
    let distanceFromSchool = null;

    if (geofence.enabled !== false) {
      if (lat == null || lng == null) {
        return res.status(400).json({
          success: false,
          message: 'GPS location is required to check in. Please ensure location services are enabled on your device.',
        });
      }

      // Auto-detect branch for staff working at Both branches if not explicitly chosen
      if (!targetBranch) {
        const zogbeliConfig = geofence.zogbeli || {};
        const vittinConfig = geofence.vittin || {};

        const distZogbeli = zogbeliConfig.lat != null && zogbeliConfig.lng != null
          ? Math.round(haversineDistance(lat, lng, zogbeliConfig.lat, zogbeliConfig.lng))
          : null;
        const distVittin = vittinConfig.lat != null && vittinConfig.lng != null
          ? Math.round(haversineDistance(lat, lng, vittinConfig.lat, vittinConfig.lng))
          : null;

        const radZ = zogbeliConfig.radiusMetres || 150;
        const radV = vittinConfig.radiusMetres || 150;

        if (distZogbeli != null && distZogbeli <= radZ) {
          targetBranch = 'Zogbeli';
          distanceFromSchool = distZogbeli;
          geofenceVerified = true;
        } else if (distVittin != null && distVittin <= radV) {
          targetBranch = 'Vittin';
          distanceFromSchool = distVittin;
          geofenceVerified = true;
        } else {
          // If outside 150m of both campuses
          if (distZogbeli != null || distVittin != null) {
            await AttendanceEvent.create({
              staff: staffId,
              eventType: 'REJECTED',
              latitude: lat,
              longitude: lng,
              ipAddress: req.ip,
              result: 'REJECTED',
              failureReason: `Outside permitted radius for both campuses (Zogbeli: ${distZogbeli ?? 'N/A'}m, Vittin: ${distVittin ?? 'N/A'}m)`,
            });

            return res.status(403).json({
              success: false,
              message: `Location check failed. You are ${distZogbeli != null ? distZogbeli + 'm away from Zogbeli' : ''} ${distVittin != null ? 'and ' + distVittin + 'm away from Vittin' : ''}. Maximum permitted radius is 150m.`,
            });
          } else {
            targetBranch = 'Zogbeli';
            geofenceVerified = true;
          }
        }
      } else {
        const branchKey = targetBranch.toLowerCase() === 'vittin' ? 'vittin' : 'zogbeli';
        const branchConfig = geofence[branchKey] || { lat: null, lng: null, radiusMetres: 150 };
        const allowedRadius = branchConfig.radiusMetres || geofence.radiusMetres || 150;
        const branchLat = branchConfig.lat;
        const branchLng = branchConfig.lng;

        if (branchLat != null && branchLng != null) {
          distanceFromSchool = Math.round(haversineDistance(lat, lng, branchLat, branchLng));
          if (distanceFromSchool <= allowedRadius) {
            geofenceVerified = true;
          } else {
            await AttendanceEvent.create({
              staff: staffId,
              eventType: 'REJECTED',
              latitude: lat,
              longitude: lng,
              ipAddress: req.ip,
              result: 'REJECTED',
              failureReason: `Outside ${targetBranch} permitted radius (${distanceFromSchool}m away, max allowed ${allowedRadius}m)`,
            });

            return res.status(403).json({
              success: false,
              message: `Location check failed. You are ${distanceFromSchool}m away from ${targetBranch} Branch. Maximum permitted radius is ${allowedRadius}m.`,
              distanceFromSchool,
              allowedRadius,
              branch: targetBranch,
            });
          }
        } else {
          geofenceVerified = true;
        }
      }
    } else {
      targetBranch = targetBranch || 'Zogbeli';
      geofenceVerified = true;
    }

    // Determine late status against active session or default 08:00
    let activeSession = await AttendanceSession.findOne({
      date: { $gte: today, $lt: tomorrow },
      status: 'ACTIVE',
    });
    const lateThresholdStr = activeSession?.lateThresholdTime || '08:00';
    const checkInTime = nowTimeString();
    const scanMins = parseTimeToMinutes(checkInTime);
    const lateMins = parseTimeToMinutes(lateThresholdStr);
    const statusStr = scanMins > lateMins ? 'late' : 'present';

    const record = await StaffAttendanceRecord.findOneAndUpdate(
      { staff: staffId, date: today },
      {
        $set: {
          staff: staffId,
          date: today,
          session: activeSession?._id || null,
          status: statusStr,
          checkInTime,
          checkInStatus: statusStr === 'late' ? 'LATE' : 'PRESENT',
          checkInLocation: { lat: lat || null, lng: lng || null },
          branch: targetBranch,
          branchLocation: { lat: branchLat || null, lng: branchLng || null },
          distanceFromSchool,
          geofenceVerified,
          markedByRole: 'self',
          markedBy: req.user.id,
        },
      },
      { upsert: true, new: true }
    );

    // Audit event log
    await AttendanceEvent.create({
      staff: staffId,
      eventType: 'CHECK_IN',
      latitude: lat || null,
      longitude: lng || null,
      ipAddress: req.ip,
      result: statusStr === 'late' ? 'LATE' : 'SUCCESS',
      failureReason: statusStr === 'late' ? `Late check-in at ${targetBranch} Branch` : '',
      metadata: { branch: targetBranch, distanceFromSchool, geofenceVerified },
    });

    // Real-time socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('staff_attendance_scanned', {
        recordId: record._id,
        staffId,
        staffName: `${staff.title ? staff.title + ' ' : ''}${staff.firstName} ${staff.lastName}`,
        photoUrl: staff.photoUrl,
        branch: targetBranch,
        status: record.status,
        checkInTime: record.checkInTime,
        distanceFromSchool,
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      message: `Checked in successfully at ${targetBranch} Branch${distanceFromSchool != null ? ` (${distanceFromSchool}m away)` : ''}.`,
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

const checkOut = async (req, res, next) => {
  try {
    const staffId = req.user.refStaff;
    if (!staffId) {
      return res.status(400).json({ success: false, message: 'No staff profile linked to your account' });
    }

    const today = toMidnight();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const existing = await StaffAttendanceRecord.findOne({
      staff: staffId,
      date: { $gte: today, $lt: tomorrow },
    });

    if (!existing || !existing.checkInTime) {
      return res.status(400).json({ success: false, message: 'You have not checked in today.' });
    }

    const checkOutTime = nowTimeString();
    existing.checkOutTime = checkOutTime;
    existing.checkOutStatus = 'CHECKED_OUT';
    existing.totalMinutes = calculateDurationMinutes(existing.checkInTime, checkOutTime);
    await existing.save();

    res.json({
      success: true,
      message: `Checked out successfully at ${checkOutTime}.`,
      data: existing,
    });
  } catch (error) {
    next(error);
  }
};

const getAdminDailyOverview = async (req, res, next) => {
  try {
    const { date, branch: branchFilter } = req.query;
    const targetDate = toMidnight(date ? new Date(date) : new Date());
    const nextDay = new Date(targetDate);
    nextDay.setDate(targetDate.getDate() + 1);

    const allStaff = await Staff.find({ employmentStatus: 'active' })
      .populate('classesAssigned', 'name displayName level')
      .select('firstName lastName title role photoUrl department staffId branch classesAssigned')
      .sort({ firstName: 1 });

    const records = await StaffAttendanceRecord.find({
      date: { $gte: targetDate, $lt: nextDay },
    }).populate('corrections.correctedBy', 'firstName lastName email').lean();

    const recordMap = records.reduce((acc, r) => {
      acc[r.staff.toString()] = r;
      return acc;
    }, {});

    let overview = allStaff.map((s) => {
      const record = recordMap[s._id.toString()];

      let defaultBranch = s.branch || 'Zogbeli';
      const role = (s.role || '').toLowerCase();
      if (role === 'driver') {
        defaultBranch = 'Vittin';
      } else if (role === 'admin' || role === 'superadmin' || role === 'system_admin' || role === 'accountant') {
        defaultBranch = 'Both';
      } else if (s.classesAssigned && s.classesAssigned.length > 0) {
        const hasVittin = s.classesAssigned.some((c) => {
          const name = (c.name || c.displayName || '').toLowerCase();
          return (
            name.includes('primary 5') ||
            name.includes('primary 6') ||
            name.includes('jhs') ||
            name.includes('bs5') ||
            name.includes('bs6') ||
            name.includes('bs7') ||
            name.includes('bs8') ||
            name.includes('bs9')
          );
        });
        defaultBranch = hasVittin ? 'Vittin' : 'Zogbeli';
      }

      return {
        staffId: s._id,
        staffCode: s.staffId || 'N/A',
        name: `${s.title ? s.title + ' ' : ''}${s.firstName} ${s.lastName}`,
        role: s.role,
        department: s.department,
        photoUrl: s.photoUrl,
        branch: record?.branch || defaultBranch,
        status: record?.status || 'not_marked',
        checkInTime: record?.checkInTime || null,
        checkOutTime: record?.checkOutTime || null,
        totalMinutes: record?.totalMinutes || 0,
        checkInLocation: record?.checkInLocation || null,
        geofenceVerified: record?.geofenceVerified || false,
        distanceFromSchool: record?.distanceFromSchool || null,
        markedByRole: record?.markedByRole || null,
        notes: record?.notes || '',
        recordId: record?._id || null,
        corrections: record?.corrections || [],
      };
    });

    if (branchFilter && branchFilter !== 'all') {
      overview = overview.filter((r) => r.branch.toLowerCase() === branchFilter.toLowerCase());
    }

    const summary = overview.reduce(
      (acc, r) => {
        if (r.status === 'present') acc.present++;
        else if (r.status === 'absent') acc.absent++;
        else if (r.status === 'late') acc.late++;
        else if (r.status === 'on_leave') acc.onLeave++;
        else if (r.status === 'half_day') acc.halfDay++;
        else acc.notMarked++;
        acc.total++;
        return acc;
      },
      { present: 0, absent: 0, late: 0, onLeave: 0, halfDay: 0, notMarked: 0, total: 0 }
    );

    res.json({
      success: true,
      data: { date: targetDate, overview, summary },
    });
  } catch (error) {
    next(error);
  }
};

const adminBulkMark = async (req, res, next) => {
  try {
    const { date, records } = req.body;
    const targetDate = toMidnight(date ? new Date(date) : new Date());

    const ops = records.map((r) => ({
      updateOne: {
        filter: { staff: r.staffId, date: targetDate },
        update: {
          $set: {
            staff: r.staffId,
            date: targetDate,
            status: r.status,
            notes: r.notes || '',
            markedByRole: 'admin',
            markedBy: req.user.id,
          },
        },
        upsert: true,
      },
    }));

    const result = await StaffAttendanceRecord.bulkWrite(ops, { ordered: false });

    res.json({
      success: true,
      message: `${records.length} records updated`,
      data: { matched: result.matchedCount, upserted: result.upsertedCount },
    });
  } catch (error) {
    next(error);
  }
};

const getAdminHistory = async (req, res, next) => {
  try {
    const { staffId, status, from, to } = req.query;
    const filter = {};
    if (staffId) filter.staff = staffId;
    if (status) filter.status = status;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = toMidnight(from);
      if (to) filter.date.$lte = toMidnight(to);
    }

    const records = await StaffAttendanceRecord.find(filter)
      .populate('staff', 'firstName lastName title role photoUrl department staffId')
      .sort({ date: -1 })
      .limit(500);

    res.json({ success: true, data: { records } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  scanQr,
  syncOfflineScans,
  getStaffQrHandler,
  generateStaffQrHandler,
  revokeStaffQrHandler,
  getDevices,
  createDevice,
  updateDevice,
  getSessions,
  createSession,
  updateSession,
  correctAttendanceRecord,
  getAttendanceEvents,
  getAttendanceReports,
  getGeofenceSettingsHandler,
  updateGeofenceSettings,
  getMyStatus,
  checkIn,
  checkOut,
  getAdminDailyOverview,
  adminBulkMark,
  getAdminHistory,
};
