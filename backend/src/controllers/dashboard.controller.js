const Student = require('../models/Student');
const Staff = require('../models/Staff');
const AttendanceRecord = require('../models/AttendanceRecord');

// GET /api/dashboard/summary
const getSummary = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Total active students
    const totalStudents = await Student.countDocuments({ status: 'active' });

    // Total active staff
    const totalStaff = await Staff.countDocuments({ employmentStatus: 'active' });

    // Today's attendance
    const todayAttendance = await AttendanceRecord.aggregate([
      {
        $match: {
          date: { $gte: today, $lt: tomorrow },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const attendanceMap = todayAttendance.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const presentToday = attendanceMap['present'] || 0;
    const absentToday = attendanceMap['absent'] || 0;
    const lateToday = attendanceMap['late'] || 0;
    const totalMarked = presentToday + absentToday + lateToday + (attendanceMap['excused'] || 0);
    const attendanceRate = totalMarked > 0 ? Math.round((presentToday / totalMarked) * 100) : null;

    // Recent admissions (last 5)
    const recentAdmissions = await Student.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('currentClass', 'name')
      .select('firstName lastName admissionNumber currentClass enrollmentDate');

    res.json({
      success: true,
      data: {
        totalStudents,
        totalStaff,
        attendance: {
          present: presentToday,
          absent: absentToday,
          late: lateToday,
          rate: attendanceRate,
          totalMarked,
        },
        recentAdmissions,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSummary };
