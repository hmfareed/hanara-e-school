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

// GET /api/dashboard/summary
const getSummary = async (req, res, next) => {
  try {
    const isTeacher = req.user && req.user.role === 'teacher';
    const isAccountant = req.user && req.user.role === 'accountant';

    if (isAccountant) {
      try {
        const AcademicYear = require('../models/AcademicYear');
        const Invoice = require('../models/Invoice');

        const currentYear = await AcademicYear.findOne({ isCurrent: true });
        const currentYearId = currentYear ? currentYear._id : null;

        const activeStudents = await Student.find({ status: 'active' })
          .populate('currentClass', 'name')
          .select('firstName lastName admissionNumber currentClass enrollmentDate');

        const invoices = await Invoice.find({ academicYear: currentYearId });

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

        return res.json({
          success: true,
          data: {
            totalStudents: activeStudents.length,
            paidStudents: paidCount,
            owingStudents: owingCount,
            students: studentList,
          },
        });
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

    const classFilter = isTeacher && teacherClassIds.length > 0 ? { _id: { $in: teacherClassIds } } : {};
    let classes = [];
    try {
      classes = await Class.find(classFilter).populate('level', 'name').select('name code level formTeacher classTeacher');
    } catch (err) {
      console.error('Error fetching classes in dashboard:', err);
    }

    // Query active students
    const studentFilter = { status: 'active' };
    if (isTeacher && teacherClassIds.length > 0) {
      studentFilter.currentClass = { $in: teacherClassIds };
    }

    let totalStudents = 0;
    let totalStaff = 0;
    try {
      totalStudents = await Student.countDocuments(studentFilter);
      totalStaff = await Staff.countDocuments({ employmentStatus: 'active' });
    } catch (err) {
      console.error('Error counting students/staff:', err);
    }

    // Find student IDs for attendance matching
    let teacherStudentIds = [];
    try {
      const teacherStudentDocs = await Student.find(studentFilter).select('_id currentClass');
      teacherStudentIds = teacherStudentDocs.map((s) => s._id);
    } catch (err) {
      console.error('Error fetching student IDs:', err);
    }

    // Attendance metrics for today
    const attendanceMatch = {
      date: { $gte: today, $lt: tomorrow },
    };
    if (isTeacher && teacherStudentIds.length > 0) {
      attendanceMatch.student = { $in: teacherStudentIds };
    }

    let todayAttendance = [];
    try {
      todayAttendance = await AttendanceRecord.aggregate([
        { $match: attendanceMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);
    } catch (err) {
      console.error('Error aggregating attendance:', err);
    }

    const attendanceMap = todayAttendance.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const presentToday = attendanceMap['present'] || 0;
    const absentToday = attendanceMap['absent'] || 0;
    const lateToday = attendanceMap['late'] || 0;
    const totalMarked = presentToday + absentToday + lateToday + (attendanceMap['excused'] || 0);
    const attendanceRate = totalMarked > 0 ? Math.round((presentToday / totalMarked) * 100) : 0;

    // Determine pending attendance classes for today
    let markedClassIds = [];
    try {
      markedClassIds = await AttendanceRecord.distinct('class', { date: { $gte: today, $lt: tomorrow } });
    } catch (err) {
      console.error('Error fetching marked attendance classes:', err);
    }
    const markedClassIdStrs = markedClassIds.map((id) => (id ? id.toString() : ''));
    
    const pendingAttendanceClasses = classes.filter((c) => !markedClassIdStrs.includes(c._id.toString()));

    // Build My Classes array with real student count & attendance rate
    let myClasses = [];
    try {
      myClasses = await Promise.all(
        classes.map(async (c) => {
          const studentCount = await Student.countDocuments({ currentClass: c._id, status: 'active' });
          const classAtt = await AttendanceRecord.aggregate([
            { $match: { class: c._id, date: { $gte: today, $lt: tomorrow } } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ]);
          const classAttMap = classAtt.reduce((acc, i) => { acc[i._id] = i.count; return acc; }, {});
          const pCount = classAttMap['present'] || 0;
          const totalClassMarked = (classAttMap['present'] || 0) + (classAttMap['absent'] || 0) + (classAttMap['late'] || 0);
          const classRate = totalClassMarked > 0 ? Math.round((pCount / totalClassMarked) * 100) : 0;

          return {
            _id: c._id,
            name: c.name,
            stage: c.level?.name || 'Basic Education',
            studentCount,
            attendanceRate: classRate,
          };
        })
      );
    } catch (err) {
      console.error('Error mapping myClasses:', err);
    }

    // Query recent student admissions / activity
    let recentAdmissions = [];
    try {
      recentAdmissions = await Student.find(studentFilter)
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('currentClass', 'name')
        .select('firstName lastName admissionNumber currentClass enrollmentDate createdAt');
    } catch (err) {
      console.error('Error fetching recent admissions:', err);
    }

    // Recent announcements / broadcast logs
    let recentAnnouncements = [];
    try {
      recentAnnouncements = await SmsLog.find({})
        .sort({ createdAt: -1 })
        .limit(3)
        .select('recipient message status createdAt');
    } catch (err) {
      console.error('Error fetching recent announcements:', err);
    }

    // Pending Results / Mock Entries pending
    let pendingMockEntries = 0;
    try {
      let pendingMockQuery = {};
      if (isTeacher && teacherClassIds.length > 0) {
        pendingMockQuery.class = { $in: teacherClassIds };
      }
      pendingMockEntries = await MockSubjectEntry.countDocuments({ ...pendingMockQuery, status: { $ne: 'verified' } });
    } catch (err) {
      console.error('Error counting pending mock entries:', err);
    }

    // Upcoming Birthdays
    let upcomingBirthdays = [];
    try {
      const studentsForBirthdays = await Student.find(studentFilter)
        .select('firstName lastName dob photoUrl currentClass')
        .populate('currentClass', 'name');

      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      studentsForBirthdays.forEach((student) => {
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
    } catch (err) {
      console.error('Error calculating upcoming birthdays:', err);
    }

    return res.json({
      success: true,
      data: {
        totalStudents,
        totalStaff,
        todayClassesCount: classes.length,
        attendance: {
          present: presentToday,
          absent: absentToday,
          late: lateToday,
          rate: attendanceRate,
          totalMarked,
        },
        pendingAttendanceClasses: pendingAttendanceClasses.map((c) => ({ _id: c._id, name: c.name })),
        myClasses,
        recentAdmissions,
        recentAnnouncements,
        pendingMockEntries,
        upcomingBirthdays,
      },
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

module.exports = { getSummary };
