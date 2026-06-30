const AttendanceRecord = require('../models/AttendanceRecord');
const Student = require('../models/Student');
const { sendAbsenceAlert } = require('../services/sms.service');
const logger = require('../utils/logger');

// GET /api/attendance?class=&date=
const getAttendance = async (req, res, next) => {
  try {
    const { class: classId, date, classId: classIdAlt } = req.query;
    const targetClass = classId || classIdAlt;

    if (!targetClass) {
      return res.status(400).json({ success: false, message: 'classId is required' });
    }

    let targetDate;
    if (date) {
      targetDate = new Date(date);
    } else {
      targetDate = new Date();
    }
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(targetDate.getDate() + 1);

    // Get all active students in this class
    const students = await Student.find({
      currentClass: targetClass,
      status: 'active',
    }).select('firstName lastName admissionNumber gender photoUrl');

    // Get attendance records for this date
    const records = await AttendanceRecord.find({
      class: targetClass,
      date: { $gte: targetDate, $lt: nextDay },
    }).select('student status notes smsAlertSent');

    // Merge: mark students not yet recorded as unmarked
    const recordMap = records.reduce((acc, r) => {
      acc[r.student.toString()] = r;
      return acc;
    }, {});

    const register = students.map((student) => {
      const record = recordMap[student._id.toString()];
      return {
        student: {
          _id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          admissionNumber: student.admissionNumber,
          gender: student.gender,
          photoUrl: student.photoUrl,
        },
        status: record ? record.status : null,
        notes: record ? record.notes : '',
        recorded: !!record,
      };
    });

    res.json({
      success: true,
      data: {
        classId: targetClass,
        date: targetDate,
        register,
        summary: {
          total: students.length,
          present: records.filter((r) => r.status === 'present').length,
          absent: records.filter((r) => r.status === 'absent').length,
          late: records.filter((r) => r.status === 'late').length,
          excused: records.filter((r) => r.status === 'excused').length,
          unmarked: students.length - records.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/attendance/bulk
const bulkMarkAttendance = async (req, res, next) => {
  try {
    const { classId, date, termId, records } = req.body;

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Bulk upsert — idempotent: re-submitting the same date overwrites
    const ops = records.map((record) => ({
      updateOne: {
        filter: {
          student: record.studentId,
          class: classId,
          date: targetDate,
        },
        update: {
          $set: {
            student: record.studentId,
            class: classId,
            date: targetDate,
            status: record.status,
            notes: record.notes || '',
            recordedBy: req.user.id,
            term: termId || null,
          },
        },
        upsert: true,
      },
    }));

    const result = await AttendanceRecord.bulkWrite(ops, { ordered: false });

    // Send SMS alerts for students marked absent who haven't received an alert yet
    try {
      const unsentAbsentRecords = await AttendanceRecord.find({
        class: classId,
        date: targetDate,
        status: 'absent',
        smsAlertSent: { $ne: true },
      }).populate({
        path: 'student',
        populate: { path: 'guardians' },
      });

      for (const record of unsentAbsentRecords) {
        const student = record.student;
        if (student && student.guardians && student.guardians.length > 0) {
          let alertSentSuccess = false;
          for (const guardian of student.guardians) {
            if (guardian.phone) {
              const resSms = await sendAbsenceAlert(student, guardian, targetDate);
              if (resSms.success) {
                alertSentSuccess = true;
              }
            }
          }
          if (alertSentSuccess) {
            record.smsAlertSent = true;
            await record.save();
          }
        }
      }
    } catch (smsError) {
      logger.error(`[Attendance SMS Error] ${smsError.message}`);
    }

    res.json({
      success: true,
      message: 'Attendance recorded successfully',
      data: {
        matched: result.matchedCount,
        upserted: result.upsertedCount,
        modified: result.modifiedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/attendance/student/:id/summary
const getStudentAttendanceSummary = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { termId, from, to } = req.query;

    const filter = { student: id };
    if (termId) filter.term = termId;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const records = await AttendanceRecord.find(filter).sort({ date: -1 });

    const summary = records.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        acc.total++;
        return acc;
      },
      { present: 0, absent: 0, late: 0, excused: 0, total: 0 }
    );

    summary.attendanceRate =
      summary.total > 0
        ? Math.round(((summary.present + summary.late) / summary.total) * 100)
        : null;

    res.json({
      success: true,
      data: { summary, records },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAttendance, bulkMarkAttendance, getStudentAttendanceSummary };
