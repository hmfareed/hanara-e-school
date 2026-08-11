const StaffAttendanceRecord = require('../models/StaffAttendanceRecord');
const Staff = require('../models/Staff');
const SystemSetting = require('../models/SystemSetting');
const logger = require('../utils/logger');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Haversine formula: distance in metres between two lat/lng points.
 */
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

/** Normalize a JS Date to midnight UTC */
function toMidnight(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Current HH:mm string (24h) */
function nowTimeString() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ─── Fetch school geofence settings ──────────────────────────────────────────

async function getGeofenceSettings() {
  const setting = await SystemSetting.findOne({ key: 'staff_attendance_geofence' });
  if (!setting || !setting.value) {
    return { enabled: false, lat: null, lng: null, radiusMetres: 150 };
  }
  return setting.value; // { enabled, lat, lng, radiusMetres }
}

// ─── GET /api/staff-attendance/geofence-settings (public to authed staff) ────
const getGeofenceSettingsHandler = async (req, res, next) => {
  try {
    const settings = await getGeofenceSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/staff-attendance/geofence-settings (admin only) ──────────────
const updateGeofenceSettings = async (req, res, next) => {
  try {
    const { enabled, lat, lng, radiusMetres, lateThresholdMinutes } = req.body;

    await SystemSetting.findOneAndUpdate(
      { key: 'staff_attendance_geofence' },
      {
        $set: {
          key: 'staff_attendance_geofence',
          value: { enabled, lat, lng, radiusMetres: radiusMetres || 150, lateThresholdMinutes: lateThresholdMinutes || 15 },
          valueType: 'json',
          category: 'academic',
          editableBy: ['superadmin', 'admin', 'system_admin'],
          description: 'GPS geofence settings for staff attendance check-in',
          lastModifiedBy: req.user.id,
        },
      },
      { upsert: true, new: true }
    );

    logger.info(`[StaffAttendance] Geofence settings updated by ${req.user.email}`);
    res.json({ success: true, message: 'Geofence settings updated' });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/staff-attendance/my-status ─────────────────────────────────────
const getMyStatus = async (req, res, next) => {
  try {
    const staffId = req.user.refStaff;
    if (!staffId) {
      return res.status(400).json({ success: false, message: 'No staff profile linked to your account' });
    }

    const today = toMidnight(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const record = await StaffAttendanceRecord.findOne({
      staff: staffId,
      date: { $gte: today, $lt: tomorrow },
    });

    // Last 7 days history
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const history = await StaffAttendanceRecord.find({
      staff: staffId,
      date: { $gte: sevenDaysAgo, $lt: tomorrow },
    }).sort({ date: -1 });

    res.json({
      success: true,
      data: {
        today: record || null,
        history,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/staff-attendance/check-in ─────────────────────────────────────
const checkIn = async (req, res, next) => {
  try {
    const staffId = req.user.refStaff;
    if (!staffId) {
      return res.status(400).json({ success: false, message: 'No staff profile linked to your account' });
    }

    const { lat, lng } = req.body; // GPS from device
    const today = toMidnight(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // ── Geofence validation ──────────────────────────────────────────────────
    const geofence = await getGeofenceSettings();
    let geofenceVerified = false;
    let distanceFromSchool = null;

    if (geofence.enabled) {
      if (lat == null || lng == null) {
        return res.status(403).json({
          success: false,
          message: 'Location is required for check-in. Please enable GPS on your device.',
        });
      }
      if (geofence.lat == null || geofence.lng == null) {
        return res.status(500).json({
          success: false,
          message: 'School location has not been configured. Please contact admin.',
        });
      }

      distanceFromSchool = Math.round(haversineDistance(lat, lng, geofence.lat, geofence.lng));

      if (distanceFromSchool > geofence.radiusMetres) {
        return res.status(403).json({
          success: false,
          message: `You must be within ${geofence.radiusMetres}m of school to check in. You are currently ${distanceFromSchool}m away.`,
          data: { distanceFromSchool, radiusAllowed: geofence.radiusMetres },
        });
      }
      geofenceVerified = true;
    }

    // ── Check if already checked in today ───────────────────────────────────
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

    // ── Determine status: late vs present ───────────────────────────────────
    const now = new Date();
    const lateThreshold = geofence.lateThresholdMinutes || 15;
    // School start time: 07:30 by default (to be made configurable later)
    const schoolStartHour = 7;
    const schoolStartMinute = 30;
    const startMinutes = schoolStartHour * 60 + schoolStartMinute;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const isLate = currentMinutes > startMinutes + lateThreshold;
    const status = isLate ? 'late' : 'present';
    const checkInTime = nowTimeString();

    const record = await StaffAttendanceRecord.findOneAndUpdate(
      { staff: staffId, date: today },
      {
        $set: {
          staff: staffId,
          date: today,
          status,
          checkInTime,
          checkInLocation: { lat: lat || null, lng: lng || null },
          distanceFromSchool,
          geofenceVerified,
          markedByRole: 'self',
          markedBy: req.user.id,
        },
      },
      { upsert: true, new: true }
    );

    // ── Late notification flag (admin will poll or SSE later) ───────────────
    if (isLate && !record.lateNotificationSent) {
      await StaffAttendanceRecord.findByIdAndUpdate(record._id, {
        lateNotificationSent: true,
      });
      logger.info(`[StaffAttendance] LATE check-in: staff=${staffId} time=${checkInTime}`);
    }

    logger.info(`[StaffAttendance] Check-in: staff=${staffId} status=${status} time=${checkInTime}`);

    res.json({
      success: true,
      message: isLate
        ? `You checked in late at ${checkInTime}. Your manager has been notified.`
        : `Checked in successfully at ${checkInTime}. Have a great day!`,
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/staff-attendance/check-out ────────────────────────────────────
const checkOut = async (req, res, next) => {
  try {
    const staffId = req.user.refStaff;
    if (!staffId) {
      return res.status(400).json({ success: false, message: 'No staff profile linked to your account' });
    }

    const today = toMidnight(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const existing = await StaffAttendanceRecord.findOne({
      staff: staffId,
      date: { $gte: today, $lt: tomorrow },
    });

    if (!existing) {
      return res.status(400).json({
        success: false,
        message: 'You have not checked in today. Please check in first.',
      });
    }

    if (existing.checkOutTime) {
      return res.status(409).json({
        success: false,
        message: `You already checked out today at ${existing.checkOutTime}.`,
        data: existing,
      });
    }

    const checkOutTime = nowTimeString();
    existing.checkOutTime = checkOutTime;
    await existing.save();

    logger.info(`[StaffAttendance] Check-out: staff=${staffId} time=${checkOutTime}`);

    res.json({
      success: true,
      message: `Checked out successfully at ${checkOutTime}. Goodbye!`,
      data: existing,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/staff-attendance/admin/daily?date= ─────────────────────────────
const getAdminDailyOverview = async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = toMidnight(date ? new Date(date) : new Date());
    const nextDay = new Date(targetDate);
    nextDay.setDate(targetDate.getDate() + 1);

    // All active staff
    const allStaff = await Staff.find({ employmentStatus: 'active' })
      .select('firstName lastName otherNames photoUrl role title')
      .sort({ firstName: 1 });

    // Attendance records for that date
    const records = await StaffAttendanceRecord.find({
      date: { $gte: targetDate, $lt: nextDay },
    }).lean();

    const recordMap = records.reduce((acc, r) => {
      acc[r.staff.toString()] = r;
      return acc;
    }, {});

    const overview = allStaff.map((s) => {
      const record = recordMap[s._id.toString()];
      return {
        staffId: s._id,
        name: `${s.title ? s.title + ' ' : ''}${s.firstName} ${s.lastName}`,
        role: s.role,
        photoUrl: s.photoUrl,
        status: record?.status || 'not_marked',
        checkInTime: record?.checkInTime || null,
        checkOutTime: record?.checkOutTime || null,
        geofenceVerified: record?.geofenceVerified || false,
        distanceFromSchool: record?.distanceFromSchool || null,
        markedByRole: record?.markedByRole || null,
        notes: record?.notes || '',
        recordId: record?._id || null,
      };
    });

    // Summary
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

    const markedCount = summary.present + summary.absent + summary.late + summary.onLeave + summary.halfDay;
    summary.attendanceRate =
      markedCount > 0
        ? Math.round(((summary.present + summary.late + summary.halfDay) / markedCount) * 100)
        : null;

    // Late arrivals that need admin attention
    const lateAlerts = records.filter((r) => r.status === 'late' && r.lateNotificationSent);

    res.json({
      success: true,
      data: { date: targetDate, overview, summary, lateAlerts },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/staff-attendance/admin/bulk ────────────────────────────────────
const adminBulkMark = async (req, res, next) => {
  try {
    const { date, records } = req.body; // records: [{ staffId, status, notes }]
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
            geofenceVerified: true, // admin override bypasses geofence
          },
        },
        upsert: true,
      },
    }));

    const result = await StaffAttendanceRecord.bulkWrite(ops, { ordered: false });

    logger.info(`[StaffAttendance] Admin bulk mark by ${req.user.email}: ${records.length} records`);

    res.json({
      success: true,
      message: `${records.length} staff attendance records updated`,
      data: { matched: result.matchedCount, upserted: result.upsertedCount, modified: result.modifiedCount },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/staff-attendance/admin/history ─────────────────────────────────
const getAdminHistory = async (req, res, next) => {
  try {
    const { staffId, status, from, to, timeframe } = req.query;

    const filter = {};
    if (staffId) filter.staff = staffId;
    if (status) filter.status = status;

    const today = toMidnight(new Date());

    if (timeframe === 'today') {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      filter.date = { $gte: today, $lt: tomorrow };
    } else if (timeframe === 'last_week') {
      const d = new Date(today);
      d.setDate(today.getDate() - 7);
      filter.date = { $gte: d };
    } else if (timeframe === 'last_month') {
      const d = new Date(today);
      d.setDate(today.getDate() - 30);
      filter.date = { $gte: d };
    } else if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = toMidnight(new Date(from));
      if (to) {
        const toDate = toMidnight(new Date(to));
        toDate.setDate(toDate.getDate() + 1); // inclusive
        filter.date.$lt = toDate;
      }
    }

    const records = await StaffAttendanceRecord.find(filter)
      .populate('staff', 'firstName lastName title role photoUrl')
      .sort({ date: -1 })
      .limit(500);

    const summary = records.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        acc.total++;
        return acc;
      },
      { present: 0, absent: 0, late: 0, on_leave: 0, half_day: 0, total: 0 }
    );

    res.json({ success: true, data: { records, summary } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGeofenceSettingsHandler,
  updateGeofenceSettings,
  getMyStatus,
  checkIn,
  checkOut,
  getAdminDailyOverview,
  adminBulkMark,
  getAdminHistory,
};
