const Student = require('../models/Student');
const Staff = require('../models/Staff');
const AttendanceRecord = require('../models/AttendanceRecord');
const Class = require('../models/Class');
const ClassLevel = require('../models/ClassLevel');
const AcademicYear = require('../models/AcademicYear');
const Invoice = require('../models/Invoice');
const SmsLog = require('../models/SmsLog');
const MockSubjectEntry = require('../models/MockSubjectEntry');
const { getTeacherClasses } = require('../utils/authHelpers');

// Short-lived in-memory cache to guarantee sub-millisecond responses on repeated hits
const dashboardCache = new Map();
const CACHE_TTL_MS = 6000; // 6 seconds

// GET /api/dashboard/summary
const getSummary = async (req, res, next) => {
  try {
    const isTeacher = req.user && req.user.role === 'teacher';
    const isAccountant = req.user && req.user.role === 'accountant';
    const userId = req.user ? (req.user.id || req.user._id)?.toString() : 'guest';
    const cacheKey = `${userId}_${req.user?.role || 'anon'}`;

    const cached = dashboardCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json({ success: true, data: cached.data });
    }

    if (isAccountant) {
      try {
        const currentYear = await AcademicYear.findOne({ isCurrent: true }).select('_id').lean();
        const currentYearId = currentYear ? currentYear._id : null;

        const [activeStudents, invoices] = await Promise.all([
          Student.find({ status: 'active' })
            .populate('currentClass', 'name')
            .select('firstName lastName admissionNumber currentClass enrollmentDate')
            .lean(),
          Invoice.find({ academicYear: currentYearId }).select('student amountDue amountPaid balance').lean(),
        ]);

        const studentInvoiceMap = {};
        invoices.forEach((inv) => {
          if (!inv.student) return;
          const studentId = inv.student.toString();
          if (!studentInvoiceMap[studentId]) {
            studentInvoiceMap[studentId] = [];
          }
          studentInvoiceMap[studentId].push(inv);
        });

        let paidCount = 0;
        let owingCount = 0;

        const studentList = activeStudents.map((student) => {
          const studentId = student._id.toString();
          const studentInvoices = studentInvoiceMap[studentId] || [];

          let amountDue = 0;
          let amountPaid = 0;
          let balance = 0;

          studentInvoices.forEach((inv) => {
            amountDue += inv.amountDue || 0;
            amountPaid += inv.amountPaid || 0;
            balance += inv.balance || 0;
          });

          let status = 'unpaid';
          if (studentInvoices.length === 0) {
            status = 'unpaid';
          } else if (balance <= 0) {
            status = 'paid';
          } else if (amountPaid > 0) {
            status = 'partial';
          } else {
            status = 'unpaid';
          }

          if (status === 'paid') {
            paidCount++;
          } else {
            owingCount++;
          }

          return {
            _id: student._id,
            firstName: student.firstName,
            lastName: student.lastName,
            admissionNumber: student.admissionNumber,
            currentClass: student.currentClass ? { _id: student.currentClass._id, name: student.currentClass.name } : null,
            amountDue,
            amountPaid,
            balance,
            status,
            enrollmentDate: student.enrollmentDate,
          };
        });

        const resultData = {
          totalStudents: activeStudents.length,
          paidStudents: paidCount,
          owingStudents: owingCount,
          students: studentList,
        };

        dashboardCache.set(cacheKey, { timestamp: Date.now(), data: resultData });
        return res.json({ success: true, data: resultData });
      } catch (err) {
        console.error('Accountant dashboard summary error:', err);
        return res.json({
          success: true,
          data: {
            totalStudents: 0,
            paidStudents: 0,
            owingStudents: 0,
            students: [],
          },
        });
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Get teacher's specific class IDs if teacher, or all classes if admin
    let teacherClassIds = [];
    if (isTeacher) {
      try {
        teacherClassIds = await getTeacherClasses(req.user.id, req.user.refStaff);
      } catch (err) {
        console.error('Error fetching teacher classes:', err);
      }
    }

    const teacherClassObjectIds = teacherClassIds.map((id) => {
      try {
        return new mongoose.Types.ObjectId(id.toString());
      } catch (e) {
        return id;
      }
    });

    const classFilter = isTeacher
      ? (teacherClassIds.length > 0 ? { _id: { $in: teacherClassObjectIds } } : { _id: { $in: [] } })
      : {};
    const studentFilter = { status: { $nin: ['withdrawn', 'transferred', 'graduated'] } };
    if (isTeacher) {
      studentFilter.currentClass = teacherClassIds.length > 0 ? { $in: teacherClassObjectIds } : { $in: [] };
    }

    let pendingMockQuery = {};
    if (isTeacher) {
      pendingMockQuery.class = teacherClassIds.length > 0 ? { $in: teacherClassObjectIds } : { $in: [] };
    }

    // Attendance match filter
    const attendanceMatch = {
      date: { $gte: today, $lt: tomorrow },
    };
    if (isTeacher) {
      attendanceMatch.class = teacherClassIds.length > 0 ? { $in: teacherClassObjectIds } : { $in: [] };
    }

    // Execute ALL top-level queries in parallel!
    const [
      classesRaw,
      totalStudents,
      totalStaff,
      studentCountsByClass,
      todayAttendanceAgg,
      classAttendanceAgg,
      recentAdmissions,
      recentAnnouncements,
      pendingMockEntries,
      studentsForBirthdays,
    ] = await Promise.all([
      Class.find(classFilter)
        .populate('level', 'name displayName order category')
        .select('name code level formTeacher classTeacher')
        .lean(),

      Student.countDocuments(studentFilter),

      Staff.countDocuments({ employmentStatus: { $ne: 'terminated' } }),

      Student.aggregate([
        { $match: studentFilter },
        { $group: { _id: '$currentClass', count: { $sum: 1 } } },
      ]),

      AttendanceRecord.aggregate([
        { $match: attendanceMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      AttendanceRecord.aggregate([
        { $match: { date: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: { class: '$class', status: '$status' }, count: { $sum: 1 } } },
      ]),

      Student.find(studentFilter)
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('currentClass', 'name')
        .select('firstName lastName admissionNumber currentClass enrollmentDate createdAt')
        .lean(),

      SmsLog.aggregate([
        { $match: { type: 'broadcast' } },
        {
          $group: {
            _id: '$message',
            message: { $first: '$message' },
            status: { $first: '$status' },
            createdAt: { $max: '$createdAt' },
            recipientCount: { $sum: 1 },
            sentCount: {
              $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
            },
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 4 },
      ]),

      MockSubjectEntry.countDocuments({ ...pendingMockQuery, status: { $ne: 'verified' } }),

      Student.find({ ...studentFilter, dob: { $exists: true, $ne: null } })
        .select('firstName lastName dob photoUrl currentClass')
        .populate('currentClass', 'name')
        .lean(),
    ]);

    // Sort classes by level order and name
    const classes = (classesRaw || []).sort((a, b) => {
      const orderA = a.level?.order ?? 999;
      const orderB = b.level?.order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });

    // Build fast in-memory map for student count per class
    const studentCountMap = {};
    (studentCountsByClass || []).forEach((sc) => {
      if (sc._id) studentCountMap[sc._id.toString()] = sc.count;
    });

    // Build fast in-memory map for class attendance
    const classAttMap = {};
    const markedClassSet = new Set();
    (classAttendanceAgg || []).forEach((ca) => {
      const cId = ca._id?.class ? ca._id.class.toString() : '';
      if (!cId) return;
      markedClassSet.add(cId);
      if (!classAttMap[cId]) {
        classAttMap[cId] = { present: 0, absent: 0, late: 0, total: 0 };
      }
      if (ca._id.status === 'present') classAttMap[cId].present += ca.count;
      if (ca._id.status === 'absent') classAttMap[cId].absent += ca.count;
      if (ca._id.status === 'late') classAttMap[cId].late += ca.count;
      classAttMap[cId].total += ca.count;
    });

    // Overall attendance summary
    const overallAttMap = (todayAttendanceAgg || []).reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const presentToday = overallAttMap['present'] || 0;
    const absentToday = overallAttMap['absent'] || 0;
    const lateToday = overallAttMap['late'] || 0;
    const totalMarked = presentToday + absentToday + lateToday + (overallAttMap['excused'] || 0);
    const attendanceRate = totalMarked > 0 ? Math.round((presentToday / totalMarked) * 100) : 0;

    // Pending attendance classes
    const pendingAttendanceClasses = classes
      .filter((c) => !markedClassSet.has(c._id.toString()))
      .map((c) => ({ _id: c._id, name: c.name }));

    // Classes overview array
    const myClasses = classes.map((c) => {
      const cId = c._id.toString();
      const sCount = studentCountMap[cId] || 0;
      const att = classAttMap[cId];
      const classRate = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : 0;

      return {
        _id: c._id,
        name: c.name,
        stage: c.level?.name || 'Basic Education',
        studentCount: sCount,
        attendanceRate: classRate,
      };
    });

    // Upcoming birthdays in next 30 days
    const upcomingBirthdays = [];
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    (studentsForBirthdays || []).forEach((student) => {
      if (!student.dob) return;
      const dob = new Date(student.dob);
      let bdayThisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
      if (bdayThisYear < todayMidnight) {
        bdayThisYear = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate());
      }
      const diffTime = bdayThisYear - todayMidnight;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 30) {
        upcomingBirthdays.push({
          _id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          dob: student.dob,
          photoUrl: student.photoUrl,
          currentClass: student.currentClass ? { _id: student.currentClass._id, name: student.currentClass.name } : null,
          daysToBirthday: diffDays,
        });
      }
    });

    upcomingBirthdays.sort((a, b) => a.daysToBirthday - b.daysToBirthday);

    const resultData = {
      totalStudents: totalStudents || 0,
      totalStaff: totalStaff || 0,
      todayClassesCount: classes.length,
      attendance: {
        present: presentToday,
        absent: absentToday,
        late: lateToday,
        rate: attendanceRate,
        totalMarked,
      },
      pendingAttendanceClasses,
      myClasses,
      recentAdmissions: recentAdmissions || [],
      recentAnnouncements: recentAnnouncements || [],
      pendingMockEntries: pendingMockEntries || 0,
      upcomingBirthdays,
    };

    dashboardCache.set(cacheKey, { timestamp: Date.now(), data: resultData });

    return res.json({
      success: true,
      data: resultData,
    });
  } catch (error) {
    console.error('Critical error in dashboard getSummary:', error);
    return res.json({
      success: true,
      data: {
        totalStudents: 0,
        totalStaff: 0,
        todayClassesCount: 0,
        attendance: { present: 0, absent: 0, late: 0, rate: 0, totalMarked: 0 },
        pendingAttendanceClasses: [],
        myClasses: [],
        recentAdmissions: [],
        recentAnnouncements: [],
        pendingMockEntries: 0,
        upcomingBirthdays: [],
      },
    });
  }
};

const clearDashboardCache = () => {
  dashboardCache.clear();
};

module.exports = { getSummary, clearDashboardCache };
