const crypto = require('crypto');
const StaffAttendanceRecord = require('../models/StaffAttendanceRecord');
const AttendanceAttempt = require('../models/AttendanceAttempt');
const AttendanceLocationOverride = require('../models/AttendanceLocationOverride');
const Staff = require('../models/Staff');
const Class = require('../models/Class');
const User = require('../models/User');
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

/**
 * Returns the full geofence + time policy settings.
 * Default check-in window: 05:40 – 10:00, late after 07:45.
 */
async function getGeofenceSettings() {
  const setting = await SystemSetting.findOne({ key: 'staff_attendance_geofence' });
  if (!setting || !setting.value) {
    return {
      enabled: true,
      radiusMetres: 150,
      lateThresholdMinutes: 15,
      // Time policy defaults (configurable by admin)
      checkInStartTime: '05:40',
      lateAfterTime: '07:45',
      checkInEndTime: '10:00',
      checkOutStartTime: '12:00',
      checkOutEndTime: '20:00',
      requireGpsOnCheckout: true,
      zogbeli: {
        name: 'Zogbeli Branch',
        lat: null,
        lng: null,
        radiusMetres: 150,
        maxGpsAccuracyMeters: 50,
      },
      vittin: {
        name: 'Vittin Branch',
        lat: null,
        lng: null,
        radiusMetres: 150,
        maxGpsAccuracyMeters: 50,
      },
    };
  }
  const val = setting.value;

  // Back-fill missing fields for older stored settings
  if (!val.zogbeli) {
    val.zogbeli = {
      name: 'Zogbeli Branch',
      lat: val.lat || null,
      lng: val.lng || null,
      radiusMetres: val.radiusMetres || 150,
      maxGpsAccuracyMeters: val.maxGpsAccuracyMeters || 50,
    };
  }
  if (!val.vittin) {
    val.vittin = {
      name: 'Vittin Branch',
      lat: null,
      lng: null,
      radiusMetres: val.radiusMetres || 150,
      maxGpsAccuracyMeters: val.maxGpsAccuracyMeters || 50,
    };
  }

  // Ensure per-branch maxGpsAccuracyMeters exists
  val.zogbeli.maxGpsAccuracyMeters = val.zogbeli.maxGpsAccuracyMeters ?? val.maxGpsAccuracyMeters ?? 50;
  val.vittin.maxGpsAccuracyMeters = val.vittin.maxGpsAccuracyMeters ?? val.maxGpsAccuracyMeters ?? 50;

  // Ensure time policy fields exist
  val.checkInStartTime = val.checkInStartTime ?? '05:40';
  val.lateAfterTime = val.lateAfterTime ?? '07:45';
  val.checkInEndTime = val.checkInEndTime ?? '10:00';
  val.checkOutStartTime = val.checkOutStartTime ?? '12:00';
  val.checkOutEndTime = val.checkOutEndTime ?? '20:00';
  val.requireGpsOnCheckout = val.requireGpsOnCheckout ?? true;

  return val;
}

/**
 * Resolves the effective branch for a staff member today.
 * Checks for an active temporary override first, then falls back to staff.branch.
 */
async function resolveEffectiveBranch(staff, today) {
  // 1. Check for active temporary override — always wins
  const override = await AttendanceLocationOverride.findOne({
    staff: staff._id,
    status: 'active',
    startDate: { $lte: today },
    endDate: { $gte: today },
  });
  if (override) {
    return { branch: override.temporaryBranch, fromOverride: true, overrideId: override._id };
  }

  // 2. Admin / non-teaching roles
  const role = (staff.role || '').toLowerCase();
  if (['admin', 'superadmin', 'system_admin', 'accountant'].includes(role)) {
    return { branch: 'Both', fromOverride: false };
  }

  // 3. Derive from class assignments — this is the PRIMARY rule:
  //    Zogbeli: Nursery 1, Nursery 2, KG 1, KG 2, Primary 1–Primary 4
  //    Vittin:  Primary 5, Primary 6, JHS 1, JHS 2, JHS 3
  if (staff.classesAssigned && staff.classesAssigned.length > 0) {
    const VITTIN_PATTERNS = [
      'primary 5', 'primary5', 'p5',
      'primary 6', 'primary6', 'p6',
      'jhs', 'j.h.s',
      'bs5', 'bs6', 'bs7', 'bs8', 'bs9',
    ];
    const hasVittin = staff.classesAssigned.some((c) => {
      const name = (c.name || c.displayName || '').toLowerCase().trim();
      return VITTIN_PATTERNS.some((pat) => name.includes(pat));
    });
    return { branch: hasVittin ? 'Vittin' : 'Zogbeli', fromOverride: false };
  }

  // 4. Fall back to the explicit branch field on the staff profile
  if (staff.branch && staff.branch !== 'Both') {
    return { branch: staff.branch, fromOverride: false };
  }

  // 5. Ultimate default
  return { branch: 'Zogbeli', fromOverride: false };
}

/**
 * Logs a rejected attendance attempt.
 */
async function logAttempt(staffId, attemptType, rejectionCode, rejectionMessage, extraData = {}) {
  try {
    await AttendanceAttempt.create({
      staff: staffId,
      attemptType,
      rejectionCode,
      rejectionMessage,
      ...extraData,
    });
  } catch (err) {
    logger.warn(`[AttendanceAttempt] Failed to log attempt: ${err.message}`);
  }
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
          attendanceStatus: responseStatus === 'late' ? 'LATE' : 'PRESENT',
          checkInTime: scanTimeStr,
          checkInStatus: responseStatus === 'late' ? 'LATE' : 'PRESENT',
          checkInVerification: 'KIOSK_SCAN',
          checkInLocation: { lat: latitude || null, lng: longitude || null },
          distanceFromSchool,
          geofenceVerified,
          markedByRole: device?._id ? 'kiosk' : 'self',
        });
      } else {
        record.checkInTime = scanTimeStr;
        record.status = responseStatus;
        record.attendanceStatus = responseStatus === 'late' ? 'LATE' : 'PRESENT';
        record.checkInStatus = responseStatus === 'late' ? 'LATE' : 'PRESENT';
        record.checkInVerification = 'KIOSK_SCAN';
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
      record.checkOutVerification = 'KIOSK_SCAN';
      record.attendanceStatus = 'CHECKED_OUT';
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
    const duplicates = [];
    const errors = [];
    const io = req.app.get('io');

    for (const evt of events) {
      try {
        const eventId = evt.eventId || evt.id || null;

        // Deduplication check: If this event was already ingested, skip re-processing
        if (eventId) {
          const existingEvent = await AttendanceEvent.findOne({ eventId });
          if (existingEvent) {
            duplicates.push({
              eventId,
              alreadyProcessed: true,
              staffId: existingEvent.staff,
            });
            continue;
          }
        }

        let staff;
        if (evt.manualStaffId) {
          if (!req.user || !['superadmin', 'admin', 'system_admin'].includes(req.user.role)) {
            errors.push({ eventId, reason: 'Only an administrator can synchronize a manual attendance entry.' });
            continue;
          }
          staff = await Staff.findOne({ _id: evt.manualStaffId, employmentStatus: 'active' });
          if (!staff) {
            errors.push({ eventId, reason: 'The manually selected staff member is no longer active.' });
            continue;
          }
        } else {
          const verifyResult = await qrCredentialService.verifyCredentialToken(evt.credential);
          if (!verifyResult.valid) {
            errors.push({ eventId, credential: evt.credential, reason: verifyResult.reason });
            continue;
          }
          staff = verifyResult.staff;
        }
        const scanDate = evt.timestamp ? new Date(evt.timestamp) : new Date();
        const today = toMidnight(scanDate);
        const nextDay = new Date(today);
        nextDay.setDate(today.getDate() + 1);

        let record = await StaffAttendanceRecord.findOne({
          staff: staff._id,
          date: { $gte: today, $lt: nextDay },
        });

        const timeStr = nowTimeString(scanDate);
        let eventType = 'CHECK_IN';

        if (!record) {
          record = await StaffAttendanceRecord.create({
            staff: staff._id,
            date: today,
            status: 'present',
            attendanceStatus: 'PRESENT',
            checkInTime: timeStr,
            checkInStatus: 'PRESENT',
            checkInVerification: 'KIOSK_SCAN',
            markedByRole: 'kiosk',
          });
          eventType = 'CHECK_IN';
        } else if (!record.checkOutTime && record.checkInTime !== timeStr) {
          record.checkOutTime = timeStr;
          record.checkOutStatus = 'CHECKED_OUT';
          record.checkOutVerification = 'KIOSK_SCAN';
          record.attendanceStatus = 'CHECKED_OUT';
          record.totalMinutes = calculateDurationMinutes(record.checkInTime, timeStr);
          await record.save();
          eventType = 'CHECK_OUT';
        } else {
          eventType = 'CHECK_IN';
        }

        await AttendanceEvent.create({
          eventId,
          staff: staff._id,
          eventType,
          timestamp: scanDate,
          latitude: evt.latitude || null,
          longitude: evt.longitude || null,
          result: 'SUCCESS',
          metadata: { offlineSynced: true },
        });

        // Broadcast to live dashboards
        if (io) {
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
            timestamp: scanDate,
            offlineSynced: true,
          };
          io.emit('staff_attendance_scanned', socketPayload);
          io.emit('staff_attendance_updated', socketPayload);
        }

        processed.push({ staffId: staff._id, name: `${staff.firstName} ${staff.lastName}`, eventId });
      } catch (err) {
        errors.push({ error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Synced ${processed.length} offline events (${duplicates.length} duplicates skipped).`,
      data: {
        processed,
        duplicates: duplicates.length,
        synced: processed.length,
        errors,
      },
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
      startTime: startTime || '05:40',
      endTime: endTime || '10:00',
      lateThresholdTime: lateThresholdTime || '07:45',
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
      // Update attendanceStatus when admin corrects status
      if (status === 'present') record.attendanceStatus = record.checkOutTime ? 'CHECKED_OUT' : 'PRESENT';
      else if (status === 'late') record.attendanceStatus = record.checkOutTime ? 'CHECKED_OUT' : 'LATE';
      else if (status === 'absent') record.attendanceStatus = 'ABSENT';
    }

    // When admin manually corrects, update verification
    if (checkInTime !== undefined) record.checkInVerification = 'ADMIN_MARKED';
    if (checkOutTime !== undefined) record.checkOutVerification = 'ADMIN_MARKED';

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

// ─── GEOFENCE SETTINGS ENDPOINTS ──────────────────────────────────────────────

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
    const {
      enabled,
      radiusMetres,
      lateThresholdMinutes,
      zogbeli,
      vittin,
      lat,
      lng,
      // Time policy
      checkInStartTime,
      lateAfterTime,
      checkInEndTime,
      checkOutStartTime,
      checkOutEndTime,
      requireGpsOnCheckout,
      // Global GPS accuracy (fallback if per-branch not set)
      maxGpsAccuracyMeters,
    } = req.body;

    const current = await getGeofenceSettings();
    const updatedValue = {
      enabled: enabled !== undefined ? enabled : current.enabled,
      radiusMetres: radiusMetres || current.radiusMetres || 150,
      lateThresholdMinutes: lateThresholdMinutes || current.lateThresholdMinutes || 15,
      // Time policy
      checkInStartTime: checkInStartTime || current.checkInStartTime || '05:40',
      lateAfterTime: lateAfterTime || current.lateAfterTime || '07:45',
      checkInEndTime: checkInEndTime || current.checkInEndTime || '10:00',
      checkOutStartTime: checkOutStartTime || current.checkOutStartTime || '12:00',
      checkOutEndTime: checkOutEndTime || current.checkOutEndTime || '20:00',
      requireGpsOnCheckout: requireGpsOnCheckout !== undefined ? requireGpsOnCheckout : (current.requireGpsOnCheckout ?? true),
      maxGpsAccuracyMeters: maxGpsAccuracyMeters || current.maxGpsAccuracyMeters || 50,
      zogbeli: {
        name: 'Zogbeli Branch',
        lat: zogbeli?.lat ?? (lat || current.zogbeli?.lat || null),
        lng: zogbeli?.lng ?? (lng || current.zogbeli?.lng || null),
        radiusMetres: zogbeli?.radiusMetres || radiusMetres || current.zogbeli?.radiusMetres || 150,
        maxGpsAccuracyMeters: zogbeli?.maxGpsAccuracyMeters ?? current.zogbeli?.maxGpsAccuracyMeters ?? maxGpsAccuracyMeters ?? 50,
      },
      vittin: {
        name: 'Vittin Branch',
        lat: vittin?.lat ?? current.vittin?.lat ?? null,
        lng: vittin?.lng ?? current.vittin?.lng ?? null,
        radiusMetres: vittin?.radiusMetres || radiusMetres || current.vittin?.radiusMetres || 150,
        maxGpsAccuracyMeters: vittin?.maxGpsAccuracyMeters ?? current.vittin?.maxGpsAccuracyMeters ?? maxGpsAccuracyMeters ?? 50,
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

// ─── GET MY STATUS ──────────────────────────────────────────────────────────

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

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const history = await StaffAttendanceRecord.find({
      staff: staffId,
      date: { $gte: thirtyDaysAgo, $lt: tomorrow },
    }).sort({ date: -1 });

    // Also return the staff's assigned branch and geofence info
    const staff = await Staff.findById(staffId).populate('classesAssigned', 'name displayName level');
    const geofence = await getGeofenceSettings();
    const { branch } = await resolveEffectiveBranch(staff, today);

    res.json({
      success: true,
      data: {
        today: record || null,
        history,
        assignedBranch: branch,
        geofence: {
          enabled: geofence.enabled,
          requireGpsOnCheckout: geofence.requireGpsOnCheckout,
          checkInStartTime: geofence.checkInStartTime,
          lateAfterTime: geofence.lateAfterTime,
          checkInEndTime: geofence.checkInEndTime,
          checkOutStartTime: geofence.checkOutStartTime,
          checkOutEndTime: geofence.checkOutEndTime,
          branch:
            branch === 'Vittin'
              ? { ...geofence.vittin, key: 'vittin' }
              : branch === 'Both'
              ? null
              : { ...geofence.zogbeli, key: 'zogbeli' },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── SELF CHECK-IN ────────────────────────────────────────────────────────────

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

    if (staff.employmentStatus !== 'active') {
      await logAttempt(staffId, 'CHECK_IN', 'ACCOUNT_DISABLED', 'Your account is not active.', {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      return res.status(403).json({ success: false, message: 'Your account is not active. Please contact admin.' });
    }

    // Accept lat, lng AND accuracy from the frontend GPS acquisition
    const { lat, lng, accuracy } = req.body;
    const today = toMidnight();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // ── Server-side branch resolution (teacher does not pick branch) ──────────
    const { branch: targetBranch } = await resolveEffectiveBranch(staff, today);

    // ── Duplicate check-in guard ──────────────────────────────────────────────
    const existing = await StaffAttendanceRecord.findOne({
      staff: staffId,
      date: { $gte: today, $lt: tomorrow },
    });

    if (existing && existing.checkInTime) {
      await logAttempt(staffId, 'CHECK_IN', 'ALREADY_CHECKED_IN', `Already checked in today at ${existing.checkInTime}.`, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        assignedBranch: targetBranch,
      });
      return res.status(409).json({
        success: false,
        message: `You already checked in today at ${existing.checkInTime}.`,
        data: existing,
      });
    }

    // ── Geofence & Location Validation ────────────────────────────────────────
    const geofence = await getGeofenceSettings();
    let geofenceVerified = false;
    let distanceFromSchool = null;
    let branchLat = null;
    let branchLng = null;

    // ── Time window check ─────────────────────────────────────────────────────
    const checkInTime = nowTimeString();
    const nowMins = parseTimeToMinutes(checkInTime);
    const openMins = parseTimeToMinutes(geofence.checkInStartTime || '05:40');
    const closeMins = parseTimeToMinutes(geofence.checkInEndTime || '10:00');

    if (nowMins < openMins) {
      await logAttempt(staffId, 'CHECK_IN', 'ATTENDANCE_NOT_OPEN', `Attendance check-in opens at ${geofence.checkInStartTime || '05:40'}.`, {
        latitude: lat,
        longitude: lng,
        accuracy,
        assignedBranch: targetBranch,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      return res.status(400).json({
        success: false,
        message: `Attendance check-in is not yet open. It opens at ${geofence.checkInStartTime || '05:40'} AM.`,
        rejectionCode: 'ATTENDANCE_NOT_OPEN',
      });
    }

    if (nowMins > closeMins) {
      await logAttempt(staffId, 'CHECK_IN', 'ATTENDANCE_CLOSED', `Attendance check-in closed at ${geofence.checkInEndTime || '10:00'}.`, {
        latitude: lat,
        longitude: lng,
        accuracy,
        assignedBranch: targetBranch,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      return res.status(400).json({
        success: false,
        message: `Attendance check-in has closed for today (closed at ${geofence.checkInEndTime || '10:00'}).`,
        rejectionCode: 'ATTENDANCE_CLOSED',
      });
    }

    if (geofence.enabled !== false) {
      if (lat == null || lng == null) {
        await logAttempt(staffId, 'CHECK_IN', 'GPS_UNAVAILABLE', 'No GPS coordinates submitted.', {
          assignedBranch: targetBranch,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
        return res.status(400).json({
          success: false,
          message: 'GPS location is required to check in. Please ensure location services are enabled on your device.',
          rejectionCode: 'GPS_UNAVAILABLE',
        });
      }

      if (targetBranch === 'Both') {
        // Auto-detect campus for "Both" staff (admin/accountant) — whichever they are physically at
        const zogbeliConfig = geofence.zogbeli || {};
        const vittinConfig = geofence.vittin || {};

        const distZ = zogbeliConfig.lat != null && zogbeliConfig.lng != null
          ? Math.round(haversineDistance(lat, lng, zogbeliConfig.lat, zogbeliConfig.lng))
          : null;
        const distV = vittinConfig.lat != null && vittinConfig.lng != null
          ? Math.round(haversineDistance(lat, lng, vittinConfig.lat, vittinConfig.lng))
          : null;

        const radZ = zogbeliConfig.radiusMetres || 150;
        const radV = vittinConfig.radiusMetres || 150;
        const maxAccZ = zogbeliConfig.maxGpsAccuracyMeters || 50;
        const maxAccV = vittinConfig.maxGpsAccuracyMeters || 50;

        const inZogbeli = distZ != null && distZ <= radZ && (accuracy == null || accuracy <= maxAccZ);
        const inVittin = distV != null && distV <= radV && (accuracy == null || accuracy <= maxAccV);

        if (inZogbeli) {
          targetBranchResolved = 'Zogbeli';
          distanceFromSchool = distZ;
          branchLat = zogbeliConfig.lat;
          branchLng = zogbeliConfig.lng;
          geofenceVerified = true;
        } else if (inVittin) {
          targetBranchResolved = 'Vittin';
          distanceFromSchool = distV;
          branchLat = vittinConfig.lat;
          branchLng = vittinConfig.lng;
          geofenceVerified = true;
        } else {
          const reason = `Outside both campus geofences (Zogbeli: ${distZ ?? 'N/A'}m, Vittin: ${distV ?? 'N/A'}m)`;
          await logAttempt(staffId, 'CHECK_IN', 'OUTSIDE_GEOFENCE', reason, {
            latitude: lat,
            longitude: lng,
            accuracy,
            assignedBranch: 'Both',
            distanceFromBranch: Math.min(distZ ?? Infinity, distV ?? Infinity) || null,
            configuredRadius: Math.min(radZ, radV),
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          });
          return res.status(403).json({
            success: false,
            message: `Location check failed. You are not within the geofence of either campus. Zogbeli: ${distZ ?? 'N/A'}m, Vittin: ${distV ?? 'N/A'}m away.`,
            rejectionCode: 'OUTSIDE_GEOFENCE',
          });
        }
      } else {
        // Teacher assigned to a specific branch — validate against that branch only
        const branchKey = targetBranch.toLowerCase() === 'vittin' ? 'vittin' : 'zogbeli';
        const branchConfig = geofence[branchKey] || {};
        const allowedRadius = branchConfig.radiusMetres || geofence.radiusMetres || 150;
        const maxAccuracy = branchConfig.maxGpsAccuracyMeters || geofence.maxGpsAccuracyMeters || 50;
        branchLat = branchConfig.lat;
        branchLng = branchConfig.lng;

        // ── GPS Accuracy Check (server-side) ─────────────────────────────────
        if (accuracy != null && accuracy > maxAccuracy) {
          await logAttempt(staffId, 'CHECK_IN', 'GPS_ACCURACY_TOO_LOW', `GPS accuracy ${accuracy}m exceeds max ${maxAccuracy}m.`, {
            latitude: lat,
            longitude: lng,
            accuracy,
            assignedBranch: targetBranch,
            configuredRadius: allowedRadius,
            configuredMaxAccuracy: maxAccuracy,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          });
          return res.status(400).json({
            success: false,
            message: `Your GPS signal is too weak (±${accuracy}m accuracy). Maximum allowed is ±${maxAccuracy}m. Please move to an open area and try again.`,
            rejectionCode: 'GPS_ACCURACY_TOO_LOW',
            accuracy,
            maxAccuracy,
          });
        }

        if (branchLat != null && branchLng != null) {
          distanceFromSchool = Math.round(haversineDistance(lat, lng, branchLat, branchLng));

          if (distanceFromSchool <= allowedRadius) {
            geofenceVerified = true;
          } else {
            await logAttempt(staffId, 'CHECK_IN', 'OUTSIDE_GEOFENCE', `${distanceFromSchool}m away from ${targetBranch} (max ${allowedRadius}m)`, {
              latitude: lat,
              longitude: lng,
              accuracy,
              assignedBranch: targetBranch,
              distanceFromBranch: distanceFromSchool,
              configuredRadius: allowedRadius,
              configuredMaxAccuracy: maxAccuracy,
              ipAddress: req.ip,
              userAgent: req.headers['user-agent'],
            });
            return res.status(403).json({
              success: false,
              message: `Location check failed. You are ${distanceFromSchool}m away from ${targetBranch} Branch. Maximum permitted radius is ${allowedRadius}m.`,
              rejectionCode: 'OUTSIDE_GEOFENCE',
              distanceFromSchool,
              allowedRadius,
              branch: targetBranch,
            });
          }
        } else {
          // Branch GPS not yet configured by admin — allow check-in without geofence
          geofenceVerified = true;
        }
      }
    } else {
      geofenceVerified = true;
    }

    const resolvedBranch = typeof targetBranchResolved !== 'undefined' ? targetBranchResolved : targetBranch;

    // ── Determine late status ──────────────────────────────────────────────────
    let activeSession = await AttendanceSession.findOne({
      date: { $gte: today, $lt: tomorrow },
      status: 'ACTIVE',
    });
    const lateThresholdStr = activeSession?.lateThresholdTime || geofence.lateAfterTime || '07:45';
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
          attendanceStatus: statusStr === 'late' ? 'LATE' : 'PRESENT',
          checkInTime,
          checkInStatus: statusStr === 'late' ? 'LATE' : 'PRESENT',
          checkInVerification: 'GPS_VERIFIED',
          checkInLocation: { lat: lat || null, lng: lng || null },
          checkInAccuracy: accuracy != null ? Math.round(accuracy) : null,
          branch: resolvedBranch,
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
      failureReason: statusStr === 'late' ? `Late check-in at ${resolvedBranch} Branch` : '',
      metadata: { branch: resolvedBranch, distanceFromSchool, geofenceVerified, accuracy },
    });

    // Real-time socket event
    const io = req.app.get('io');
    if (io) {
      const socketPayload = {
        recordId: record._id,
        staffId,
        staffName: `${staff.title ? staff.title + ' ' : ''}${staff.firstName} ${staff.lastName}`,
        photoUrl: staff.photoUrl,
        branch: resolvedBranch,
        status: record.status,
        checkInTime: record.checkInTime,
        checkOutTime: record.checkOutTime || null,
        distanceFromSchool,
        geofenceVerified,
        timestamp: new Date(),
      };
      io.emit('staff_attendance_scanned', socketPayload);
      io.emit('staff_attendance_updated', socketPayload);
    }

    res.json({
      success: true,
      message: `Checked in successfully at ${resolvedBranch} Branch${distanceFromSchool != null ? ` (${distanceFromSchool}m from campus)` : ''}.`,
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

// ─── SELF CHECK-OUT ───────────────────────────────────────────────────────────

const checkOut = async (req, res, next) => {
  try {
    const staffId = req.user.refStaff;
    if (!staffId) {
      return res.status(400).json({ success: false, message: 'No staff profile linked to your account' });
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff record not found' });
    }

    const today = toMidnight();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const existing = await StaffAttendanceRecord.findOne({
      staff: staffId,
      date: { $gte: today, $lt: tomorrow },
    });

    if (!existing || !existing.checkInTime) {
      await logAttempt(staffId, 'CHECK_OUT', 'CHECKOUT_WITHOUT_CHECKIN', 'No check-in record found for today.', {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      return res.status(400).json({
        success: false,
        message: 'You have not checked in today. You cannot check out without first checking in.',
        rejectionCode: 'CHECKOUT_WITHOUT_CHECKIN',
      });
    }

    if (existing.checkOutTime) {
      await logAttempt(staffId, 'CHECK_OUT', 'ALREADY_CHECKED_OUT', `Already checked out at ${existing.checkOutTime}.`, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        assignedBranch: existing.branch,
      });
      return res.status(409).json({
        success: false,
        message: `You already checked out today at ${existing.checkOutTime}.`,
        data: existing,
      });
    }

    // ── GPS validation at checkout ─────────────────────────────────────────────
    const geofence = await getGeofenceSettings();
    const { lat, lng, accuracy } = req.body;
    let checkOutGeoVerified = false;
    let checkOutDist = null;
    let checkOutLat = null;
    let checkOutLng = null;

    if (geofence.requireGpsOnCheckout !== false && geofence.enabled !== false) {
      if (lat == null || lng == null) {
        await logAttempt(staffId, 'CHECK_OUT', 'GPS_UNAVAILABLE', 'No GPS coordinates submitted for checkout.', {
          assignedBranch: existing.branch,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
        return res.status(400).json({
          success: false,
          message: 'GPS location is required to check out. Please enable location services and try again.',
          rejectionCode: 'GPS_UNAVAILABLE',
        });
      }

      const branchKey = (existing.branch || 'Zogbeli').toLowerCase() === 'vittin' ? 'vittin' : 'zogbeli';
      const branchConfig = geofence[branchKey] || {};
      const allowedRadius = branchConfig.radiusMetres || 150;
      const maxAccuracy = branchConfig.maxGpsAccuracyMeters || 50;
      checkOutLat = lat;
      checkOutLng = lng;

      // GPS accuracy check
      if (accuracy != null && accuracy > maxAccuracy) {
        await logAttempt(staffId, 'CHECK_OUT', 'GPS_ACCURACY_TOO_LOW', `GPS accuracy ${accuracy}m exceeds max ${maxAccuracy}m.`, {
          latitude: lat,
          longitude: lng,
          accuracy,
          assignedBranch: existing.branch,
          configuredMaxAccuracy: maxAccuracy,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
        return res.status(400).json({
          success: false,
          message: `Your GPS signal is too weak (±${accuracy}m). Maximum allowed is ±${maxAccuracy}m. Please move to an open area and try again.`,
          rejectionCode: 'GPS_ACCURACY_TOO_LOW',
          accuracy,
          maxAccuracy,
        });
      }

      if (branchConfig.lat != null && branchConfig.lng != null) {
        checkOutDist = Math.round(haversineDistance(lat, lng, branchConfig.lat, branchConfig.lng));

        if (checkOutDist <= allowedRadius) {
          checkOutGeoVerified = true;
        } else {
          await logAttempt(staffId, 'CHECK_OUT', 'OUTSIDE_GEOFENCE', `${checkOutDist}m away from ${existing.branch} (max ${allowedRadius}m)`, {
            latitude: lat,
            longitude: lng,
            accuracy,
            assignedBranch: existing.branch,
            distanceFromBranch: checkOutDist,
            configuredRadius: allowedRadius,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          });
          return res.status(403).json({
            success: false,
            message: `Checkout location check failed. You are ${checkOutDist}m away from ${existing.branch} Branch. You must be within ${allowedRadius}m to check out.`,
            rejectionCode: 'OUTSIDE_GEOFENCE',
            distanceFromSchool: checkOutDist,
            allowedRadius,
          });
        }
      } else {
        // Branch not configured — allow checkout without geofence
        checkOutGeoVerified = true;
      }
    } else {
      // GPS not required for checkout
      checkOutGeoVerified = false;
      checkOutLat = lat || null;
      checkOutLng = lng || null;
    }

    const checkOutTime = nowTimeString();
    existing.checkOutTime = checkOutTime;
    existing.checkOutStatus = 'CHECKED_OUT';
    existing.checkOutVerification = checkOutGeoVerified ? 'GPS_VERIFIED' : 'NONE';
    existing.checkOutLocation = { lat: checkOutLat, lng: checkOutLng };
    existing.checkOutAccuracy = accuracy != null ? Math.round(accuracy) : null;
    existing.checkOutDistance = checkOutDist;
    existing.attendanceStatus = 'CHECKED_OUT';
    existing.totalMinutes = calculateDurationMinutes(existing.checkInTime, checkOutTime);
    await existing.save();

    // Audit event log
    await AttendanceEvent.create({
      staff: staffId,
      eventType: 'CHECK_OUT',
      timestamp: new Date(),
      latitude: checkOutLat,
      longitude: checkOutLng,
      ipAddress: req.ip,
      result: 'SUCCESS',
      metadata: {
        branch: existing.branch,
        totalMinutes: existing.totalMinutes,
        checkOutDistance: checkOutDist,
        accuracy,
      },
    });

    // Real-time socket broadcast
    const io = req.app.get('io');
    if (io) {
      const socketPayload = {
        recordId: existing._id,
        staffId,
        staffName: `${staff.title ? staff.title + ' ' : ''}${staff.firstName} ${staff.lastName}`,
        photoUrl: staff.photoUrl,
        branch: existing.branch,
        status: existing.status,
        checkInTime: existing.checkInTime,
        checkOutTime: existing.checkOutTime,
        totalMinutes: existing.totalMinutes,
        distanceFromSchool: existing.distanceFromSchool,
        checkOutDistance: existing.checkOutDistance,
        geofenceVerified: existing.geofenceVerified,
        timestamp: new Date(),
      };
      io.emit('staff_attendance_updated', socketPayload);
      io.emit('staff_attendance_scanned', socketPayload);
    }

    const hours = Math.floor(existing.totalMinutes / 60);
    const mins = existing.totalMinutes % 60;
    const durationText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    res.json({
      success: true,
      message: `Checked out successfully at ${checkOutTime} (${durationText} worked today).`,
      data: existing,
    });
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN DAILY OVERVIEW ─────────────────────────────────────────────────────

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

    let overview = await Promise.all(allStaff.map(async (s) => {
      const record = recordMap[s._id.toString()];
      const { branch: defaultBranch } = await resolveEffectiveBranch(s, targetDate);

      return {
        staffId: s._id,
        staffCode: s.staffId || 'N/A',
        name: `${s.title ? s.title + ' ' : ''}${s.firstName} ${s.lastName}`,
        role: s.role,
        department: s.department,
        photoUrl: s.photoUrl,
        branch: record?.branch || defaultBranch,
        status: record?.status || 'not_marked',
        attendanceStatus: record?.attendanceStatus || null,
        checkInTime: record?.checkInTime || null,
        checkOutTime: record?.checkOutTime || null,
        totalMinutes: record?.totalMinutes || 0,
        // GPS evidence
        checkInLocation: record?.checkInLocation || null,
        checkInAccuracy: record?.checkInAccuracy || null,
        checkOutLocation: record?.checkOutLocation || null,
        checkOutAccuracy: record?.checkOutAccuracy || null,
        checkOutDistance: record?.checkOutDistance || null,
        distanceFromSchool: record?.distanceFromSchool || null,
        geofenceVerified: record?.geofenceVerified || false,
        // Verification status
        checkInVerification: record?.checkInVerification || null,
        checkOutVerification: record?.checkOutVerification || null,
        markedByRole: record?.markedByRole || null,
        notes: record?.notes || '',
        recordId: record?._id || null,
        corrections: record?.corrections || [],
      };
    }));

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

    // Branch-level breakdown
    const zogbeliStaff = overview.filter((r) => r.branch === 'Zogbeli' || r.branch === 'Both');
    const vittinStaff = overview.filter((r) => r.branch === 'Vittin');
    const branchBreakdown = {
      zogbeli: {
        total: zogbeliStaff.length,
        present: zogbeliStaff.filter((r) => r.status === 'present').length,
        late: zogbeliStaff.filter((r) => r.status === 'late').length,
        absent: zogbeliStaff.filter((r) => r.status === 'absent').length,
        notMarked: zogbeliStaff.filter((r) => r.status === 'not_marked').length,
      },
      vittin: {
        total: vittinStaff.length,
        present: vittinStaff.filter((r) => r.status === 'present').length,
        late: vittinStaff.filter((r) => r.status === 'late').length,
        absent: vittinStaff.filter((r) => r.status === 'absent').length,
        notMarked: vittinStaff.filter((r) => r.status === 'not_marked').length,
      },
    };

    res.json({
      success: true,
      data: { date: targetDate, overview, summary, branchBreakdown },
    });
  } catch (error) {
    next(error);
  }
};

// ─── ADMIN BULK MARK ──────────────────────────────────────────────────────────

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
            attendanceStatus: r.status === 'present' ? 'PRESENT' : r.status === 'late' ? 'LATE' : r.status === 'absent' ? 'ABSENT' : r.status.toUpperCase(),
            checkInVerification: 'ADMIN_MARKED',
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

// ─── ADMIN HISTORY ────────────────────────────────────────────────────────────

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

// ─── ATTENDANCE ATTEMPTS (REJECTED) ──────────────────────────────────────────

const getAttendanceAttempts = async (req, res, next) => {
  try {
    const { staffId, from, to, rejectionCode, limit = 100 } = req.query;
    const filter = {};
    if (staffId) filter.staff = staffId;
    if (rejectionCode) filter.rejectionCode = rejectionCode;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const attempts = await AttendanceAttempt.find(filter)
      .populate('staff', 'firstName lastName title role photoUrl staffId branch')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit, 10));

    res.json({ success: true, data: { attempts, total: attempts.length } });
  } catch (error) {
    next(error);
  }
};

// ─── TEMPORARY BRANCH OVERRIDES ────────────────────────────────────────────────

const getTemporaryOverrides = async (req, res, next) => {
  try {
    const { staffId, status = 'active' } = req.query;
    const filter = {};
    if (staffId) filter.staff = staffId;
    if (status) filter.status = status;

    const overrides = await AttendanceLocationOverride.find(filter)
      .populate('staff', 'firstName lastName title role photoUrl staffId branch')
      .populate('createdBy', 'firstName lastName email')
      .sort({ startDate: -1 });

    res.json({ success: true, data: { overrides } });
  } catch (error) {
    next(error);
  }
};

const createTemporaryOverride = async (req, res, next) => {
  try {
    const { staffId, temporaryBranch, startDate, endDate, reason } = req.body;

    if (!staffId || !temporaryBranch || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'staffId, temporaryBranch, startDate, and endDate are required.' });
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    const start = toMidnight(new Date(startDate));
    const end = toMidnight(new Date(endDate));

    if (end < start) {
      return res.status(400).json({ success: false, message: 'endDate cannot be before startDate.' });
    }

    // Cancel any existing active override for this staff that overlaps the date range
    await AttendanceLocationOverride.updateMany(
      {
        staff: staffId,
        status: 'active',
        startDate: { $lte: end },
        endDate: { $gte: start },
      },
      { $set: { status: 'cancelled', cancelledBy: req.user.id, cancelledAt: new Date() } }
    );

    const override = await AttendanceLocationOverride.create({
      staff: staffId,
      permanentBranch: staff.branch || 'Zogbeli',
      temporaryBranch,
      startDate: start,
      endDate: end,
      reason: reason || '',
      createdBy: req.user.id,
    });

    await override.populate('staff', 'firstName lastName title role staffId branch');
    await override.populate('createdBy', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: `Temporary branch override created: ${staff.firstName} ${staff.lastName} → ${temporaryBranch} from ${start.toDateString()} to ${end.toDateString()}.`,
      data: { override },
    });
  } catch (error) {
    next(error);
  }
};

const cancelTemporaryOverride = async (req, res, next) => {
  try {
    const { id } = req.params;
    const override = await AttendanceLocationOverride.findById(id);
    if (!override) {
      return res.status(404).json({ success: false, message: 'Override not found.' });
    }
    override.status = 'cancelled';
    override.cancelledBy = req.user.id;
    override.cancelledAt = new Date();
    await override.save();
    res.json({ success: true, message: 'Temporary override cancelled.', data: { override } });
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
  getAttendanceAttempts,
  getTemporaryOverrides,
  createTemporaryOverride,
  cancelTemporaryOverride,
};
