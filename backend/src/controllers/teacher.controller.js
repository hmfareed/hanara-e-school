const SubjectAssignment = require('../models/SubjectAssignment');
const AcademicYear = require('../models/AcademicYear');

// GET /api/teachers/:id/load?academicYear=...
const getTeacherLoad = async (req, res, next) => {
  try {
    const teacherId = req.params.id;

    // Check permission: admins see all, teachers only see their own
    const currentUserId = req.user.id || req.user._id;
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && currentUserId.toString() !== teacherId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view your own teacher load',
      });
    }

    let { academicYear } = req.query;

    if (!academicYear) {
      const currentYear = await AcademicYear.findOne({ isCurrent: true });
      if (currentYear) {
        academicYear = currentYear.name;
      }
    }

    if (!academicYear) {
      return res.status(400).json({
        success: false,
        message: 'academicYear is required to load teacher schedule',
      });
    }

    const assignments = await SubjectAssignment.find({
      teacher: teacherId,
      academicYear,
      isActive: true,
    })
      .populate('class', 'name')
      .populate('subject', 'name code');

    // Also check ClassSubjectAssignment (linked via User.refStaff)
    const User = require('../models/User');
    const ClassSubjectAssignment = require('../models/ClassSubjectAssignment');
    const Class = require('../models/Class');
    const Subject = require('../models/Subject');
    
    const teacherUser = await User.findById(teacherId);
    let staffAssignments = [];
    const academicYearDoc = await AcademicYear.findOne({ name: academicYear });

    if (teacherUser && teacherUser.refStaff && academicYearDoc) {
      const classSubAssignments = await ClassSubjectAssignment.find({
        teacher: teacherUser.refStaff,
        academicYear: academicYearDoc._id,
      })
        .populate('class', 'name')
        .populate('subject', 'name code');

      staffAssignments = classSubAssignments.map(item => ({
        _id: item._id,
        teacher: teacherId,
        class: item.class,
        subject: item.subject,
        academicYear: academicYear,
        isActive: true,
        isFromClassSubject: true,
      }));
    }

    const merged = [...assignments];
    const seen = new Set(assignments.map(a => `${a.class?._id?.toString()}-${a.subject?._id?.toString()}`));

    for (const sa of staffAssignments) {
      const key = `${sa.class?._id?.toString()}-${sa.subject?._id?.toString()}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(sa);
      }
    }

    // Append pseudo-assignments for any classes where they are the designated formTeacher or classTeacher
    if (academicYearDoc) {
      const formOrClassTeacherClasses = await Class.find({
        $or: [
          { formTeacher: teacherId },
          ...(teacherUser && teacherUser.refStaff ? [{ classTeacher: teacherUser.refStaff }] : []),
        ],
        academicYear: academicYearDoc._id,
      });

      for (const fc of formOrClassTeacherClasses) {
        // Find all subjects that apply to this class's level
        const subjects = await Subject.find({ appliesToLevels: fc.level });
        for (const sub of subjects) {
          const key = `${fc._id.toString()}-${sub._id.toString()}`;
          if (!seen.has(key)) {
            seen.add(key);
            merged.push({
              _id: `form-${fc._id}-${sub._id}`,
              teacher: teacherId,
              class: { _id: fc._id, name: fc.name },
              subject: { _id: sub._id, name: sub.name, code: sub.code },
              academicYear: academicYear,
              isActive: true,
              isFromFormTeacher: true,
            });
          }
        }
      }
    }

    res.json({ success: true, data: merged });
  } catch (error) {
    next(error);
  }
};

// GET /api/teacher/profile
const getTeacherProfile = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const User = require('../models/User');
    const AcademicYear = require('../models/AcademicYear');

    const user = await User.findById(userId).populate('refStaff');
    const staff = user?.refStaff;
    const currentYear = await AcademicYear.findOne({ isCurrent: true });

    const profileData = {
      _id: userId,
      email: user?.email,
      role: user?.role,
      fullName: staff ? staff.fullName : (user?.name || user?.email?.split('@')[0] || 'Teacher'),
      title: staff?.title || '',
      firstName: staff?.firstName || user?.name || 'Teacher',
      lastName: staff?.lastName || '',
      photoUrl: staff?.photoUrl || null,
      employeeId: staff ? (staff.employeeId || `EMP-${staff._id.toString().slice(-6).toUpperCase()}`) : `EMP-${userId.toString().slice(-6).toUpperCase()}`,
      phone: staff?.phone || user?.phone || 'N/A',
      qualification: staff?.qualification || 'Certified Educator',
      baseSalary: staff?.baseSalary > 0 ? staff.baseSalary : 1800,
      currentAcademicYear: currentYear ? currentYear.name : '2025/2026 Academic Year',
      currentTerm: currentYear ? `Term ${currentYear.currentTerm || 1}` : 'Term 1',
      currentDate: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    };

    res.json({ success: true, data: profileData });
  } catch (error) {
    next(error);
  }
};

// Short-lived in-memory cache for teacher dashboard
const teacherDashboardCache = new Map();
const TEACHER_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes — meaningful cache window

// GET /api/teacher/dashboard-summary
const getTeacherDashboardSummary = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const refStaffId = req.user.refStaff;
    const cacheKey = `teacher_${userId}`;

    const cached = teacherDashboardCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < TEACHER_CACHE_TTL_MS) {
      return res.json({ success: true, data: cached.data });
    }

    const User = require('../models/User');
    const Staff = require('../models/Staff');
    const AcademicYear = require('../models/AcademicYear');
    const Class = require('../models/Class');
    const ClassLevel = require('../models/ClassLevel');
    const Subject = require('../models/Subject');
    const Student = require('../models/Student');
    const AttendanceRecord = require('../models/AttendanceRecord');
    const MockSubjectEntry = require('../models/MockSubjectEntry');
    const Timetable = require('../models/Timetable');
    const OfflineAssignment = require('../models/OfflineAssignment');
    const Grade = require('../models/Grade');
    const Notice = require('../models/Notice');
    const mongoose = require('mongoose');
    const { getTeacherClasses } = require('../utils/authHelpers');

    const teacherClassIds = await getTeacherClasses(userId, refStaffId);
    const teacherClassObjectIds = teacherClassIds.map((id) => {
      try {
        return new mongoose.Types.ObjectId(id.toString());
      } catch (e) {
        return id;
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = dayNames[today.getDay()];

    const classesFilter = teacherClassIds.length > 0 ? { _id: { $in: teacherClassObjectIds } } : { _id: { $in: [] } };
    let pendingMockQuery = {};
    if (teacherClassIds.length > 0) {
      pendingMockQuery.class = { $in: teacherClassObjectIds };
    }

    const studentStatusFilter = { $nin: ['withdrawn', 'transferred', 'graduated'] };

    // Parallel fetch of all independent pieces!
    const [
      currentYear,
      user,
      classes,
      totalStudents,
      studentCountsByClass,
      classAttendanceAgg,
      todaysTimetableRaw,
      realAssignments,
      pendingGradingCount,
      pendingResultsList,
      pendingMockEntries,
      studentsWithDob,
      announcements,
    ] = await Promise.all([
      AcademicYear.findOne({ isCurrent: true }).lean(),
      User.findById(userId).populate('refStaff').lean(),
      Class.find(classesFilter).populate('level', 'name displayName').lean(),
      teacherClassIds.length > 0
        ? Student.countDocuments({ currentClass: { $in: teacherClassObjectIds }, status: studentStatusFilter })
        : Promise.resolve(0),
      teacherClassIds.length > 0
        ? Student.aggregate([
            { $match: { currentClass: { $in: teacherClassObjectIds }, status: studentStatusFilter } },
            { $group: { _id: '$currentClass', count: { $sum: 1 } } },
          ])
        : Promise.resolve([]),
      teacherClassIds.length > 0
        ? AttendanceRecord.aggregate([
            { $match: { class: { $in: teacherClassObjectIds }, date: { $gte: today, $lt: tomorrow } } },
            { $group: { _id: { class: '$class', status: '$status' }, count: { $sum: 1 } } },
          ])
        : Promise.resolve([]),
      Timetable.find({ teacher: { $in: [userId, refStaffId].filter(Boolean) }, day: currentDayName }).populate('class', 'name').sort({ startTime: 1 }).lean(),
      teacherClassIds.length > 0
        ? OfflineAssignment.find({ class: { $in: teacherClassObjectIds } }).populate('class', 'name').sort({ createdAt: -1 }).limit(3).lean()
        : Promise.resolve([]),
      OfflineAssignment.countDocuments({ teacher: userId, status: 'pending' }),
      teacherClassIds.length > 0
        ? Grade.find({ class: { $in: teacherClassObjectIds }, isDraft: true }).populate('class', 'name').populate('subject', 'name').limit(3).lean()
        : Promise.resolve([]),
      MockSubjectEntry.countDocuments({ ...pendingMockQuery, status: { $ne: 'verified' } }),
      teacherClassIds.length > 0
        ? Student.find({ currentClass: { $in: teacherClassObjectIds }, status: studentStatusFilter, dob: { $ne: null } }).select('firstName lastName dob currentClass photoUrl').populate('currentClass', 'name').lean()
        : Promise.resolve([]),
      Notice.find({ targetAudience: { $in: ['all', 'teachers'] } }).sort({ createdAt: -1 }).limit(3).lean(),
    ]);

    const staff = user?.refStaff;
    const profile = {
      _id: userId,
      email: user?.email,
      fullName: staff ? (staff.fullName || `${staff.firstName || ''} ${staff.lastName || ''}`.trim()) : (user?.name || 'Teacher'),
      firstName: staff?.firstName || user?.name || 'Teacher',
      title: staff?.title || 'Sir/Madam',
      photoUrl: staff?.photoUrl || null,
      employeeId: staff ? (staff.employeeId || `EMP-${staff._id.toString().slice(-6).toUpperCase()}`) : `EMP-${userId.toString().slice(-6).toUpperCase()}`,
      role: staff?.role ? (staff.role.charAt(0).toUpperCase() + staff.role.slice(1)) : 'Form & Subject Teacher',
      baseSalary: staff?.baseSalary > 0 ? staff.baseSalary : 1800,
      academicYear: currentYear ? currentYear.name : '2026/2027',
      currentTerm: currentYear ? `Term ${currentYear.currentTerm || 1}` : 'Term 1',
      currentDate: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    };

    // Build fast maps
    const studentCountMap = {};
    (studentCountsByClass || []).forEach((sc) => {
      if (sc._id) studentCountMap[sc._id.toString()] = sc.count;
    });

    const classAttMap = {};
    (classAttendanceAgg || []).forEach((ca) => {
      const cId = ca._id?.class ? ca._id.class.toString() : '';
      if (!cId) return;
      if (!classAttMap[cId]) {
        classAttMap[cId] = { present: 0, absent: 0, late: 0, total: 0, hasMarked: true };
      }
      if (ca._id.status === 'present') classAttMap[cId].present += ca.count;
      if (ca._id.status === 'absent') classAttMap[cId].absent += ca.count;
      if (ca._id.status === 'late') classAttMap[cId].late += ca.count;
      classAttMap[cId].total += ca.count;
    });

    const myClasses = classes.map((cls) => {
      const cId = cls._id.toString();
      const sCount = studentCountMap[cId] || 0;
      const att = classAttMap[cId];
      const rate = att && att.total > 0 ? Math.round((att.present / att.total) * 100) : 100;
      return {
        _id: cls._id,
        name: cls.name,
        subjectName: cls.subjectName || 'Core Subject',
        studentCount: sCount,
        attendanceRate: rate,
      };
    });

    const todaysClasses = classes.map((cls) => {
      const cId = cls._id.toString();
      const sCount = studentCountMap[cId] || 0;
      const att = classAttMap[cId];
      return {
        classId: cls._id,
        className: cls.name,
        stage: cls.level?.name || cls.level?.displayName || 'Basic Education',
        subjectName: cls.subjectName || 'Class Core Subjects',
        totalStudents: sCount,
        isAttendanceMarked: Boolean(att && att.total > 0),
        presentCount: att?.present || 0,
        absentCount: att?.absent || 0,
        lateCount: att?.late || 0,
      };
    });

    // No fake fallback — if no timetable is set, return empty array.
    // The frontend will show the proper empty state instead of fabricated data.
    let todaysTimetable = todaysTimetableRaw || [];

    const totalAssignedClasses = todaysClasses.length;
    const completedAttendanceCount = todaysClasses.filter((c) => c.isAttendanceMarked).length;
    const pendingAttendanceCount = totalAssignedClasses - completedAttendanceCount;

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    todaysClasses.forEach((c) => {
      totalPresent += c.presentCount;
      totalAbsent += c.absentCount;
      totalLate += c.lateCount;
    });
    const totalMarkedStudents = totalPresent + totalAbsent + totalLate;
    const attendancePercentage = totalMarkedStudents > 0 ? Math.round((totalPresent / totalMarkedStudents) * 100) : 100;

    const assignmentsSummary = {
      totalGiven: realAssignments.length,
      pendingGrading: pendingGradingCount,
    };

    const pendingResultsSummary = {
      pendingClassesCount: pendingResultsList.length,
      subjectsAwaitingCount: pendingMockEntries,
    };

    // Birthdays
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();

    const upcomingBirthdays = (studentsWithDob || [])
      .map((st) => {
        const birthDate = new Date(st.dob);
        const bMonth = birthDate.getMonth();
        const bDay = birthDate.getDate();

        let nextBdayThisYear = new Date(now.getFullYear(), bMonth, bDay);
        if (nextBdayThisYear < now && !(currentMonth === bMonth && currentDay === bDay)) {
          nextBdayThisYear = new Date(now.getFullYear() + 1, bMonth, bDay);
        }
        const diffDays = Math.ceil((nextBdayThisYear - now) / (1000 * 60 * 60 * 24));

        return {
          _id: st._id,
          fullName: `${st.firstName} ${st.lastName}`,
          className: st.currentClass?.name || 'Class',
          photoUrl: st.photoUrl || null,
          dobDate: birthDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          daysAway: diffDays,
        };
      })
      .filter((b) => b.daysAway >= 0 && b.daysAway <= 30)
      .sort((a, b) => a.daysAway - b.daysAway)
      .slice(0, 4);

    const calculatedTotal = (typeof totalStudents === 'number' && totalStudents > 0)
      ? totalStudents
      : Object.values(studentCountMap).reduce((a, b) => a + b, 0);

    const resultData = {
      profile,
      totalStudents: calculatedTotal,
      myClasses,
      todaysClasses,
      todaysTimetable,
      attendanceSummary: {
        classesTodayCount: totalAssignedClasses,
        completedCount: completedAttendanceCount,
        pendingCount: pendingAttendanceCount,
        studentsPresent: totalPresent,
        studentsAbsent: totalAbsent,
        studentsLate: totalLate,
        attendanceRate: attendancePercentage,
        hasAttendanceData: totalMarkedStudents > 0, // true only when attendance has been marked today
      },
      assignmentsSummary,
      pendingResultsSummary,
      recentActivities: [],
      assignmentsList: realAssignments,
      pendingResultsList,
      announcements: announcements || [],
      upcomingBirthdays,
    };

    teacherDashboardCache.set(cacheKey, { timestamp: Date.now(), data: resultData });

    res.json({
      success: true,
      data: resultData,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/teachers/my-classes
const getMyClasses = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const refStaffId = req.user.refStaff;
    const userRole = req.user.role;

    const Class = require('../models/Class');
    const Student = require('../models/Student');
    const AttendanceRecord = require('../models/AttendanceRecord');
    const { getTeacherClasses } = require('../utils/authHelpers');
    const mongoose = require('mongoose');

    let classes;
    if (['superadmin', 'admin', 'system_admin'].includes(userRole)) {
      classes = await Class.find({ status: { $ne: 'archived' } })
        .populate('level', 'displayName category')
        .populate('classTeacher', 'firstName lastName title')
        .sort({ name: 1 });
    } else {
      const teacherClassIds = await getTeacherClasses(userId, refStaffId);
      const teacherClassObjectIds = teacherClassIds.map((id) => {
        try {
          return new mongoose.Types.ObjectId(id.toString());
        } catch (e) {
          return id;
        }
      });
      classes = await Class.find({ _id: { $in: teacherClassObjectIds } })
        .populate('level', 'displayName category')
        .populate('classTeacher', 'firstName lastName title')
        .sort({ name: 1 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const studentStatusFilter = { $nin: ['withdrawn', 'transferred', 'graduated'] };

    const result = await Promise.all(
      classes.map(async (cls) => {
        const studentCount = await Student.countDocuments({
          currentClass: cls._id,
          status: studentStatusFilter,
        });
        
        // Attendance rate
        const classAtt = await AttendanceRecord.aggregate([
          { $match: { class: cls._id, date: { $gte: today, $lt: tomorrow } } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        const attMap = classAtt.reduce((acc, item) => { acc[item._id] = item.count; return acc; }, {});
        const pCount = attMap['present'] || 0;
        const totMarked = (attMap['present'] || 0) + (attMap['absent'] || 0) + (attMap['late'] || 0);
        const rate = totMarked > 0 ? Math.round((pCount / totMarked) * 100) : 100;

        // Real term score average from Grade model
        const Grade = require('../models/Grade');
        const currentYear = await AcademicYear.findOne({ isCurrent: true });
        const yearLabel = currentYear?.name || new Date().getFullYear().toString();
        const currentTerm = currentYear?.currentTerm || '1';

        let classAverageScore = 0;
        const gradeAgg = await Grade.aggregate([
          { $match: { class: cls._id, academicYear: yearLabel, term: currentTerm } },
          { $group: { _id: '$student', avgTotal: { $avg: '$totalScore' } } },
          { $group: { _id: null, classAvg: { $avg: '$avgTotal' } } },
        ]);
        if (gradeAgg.length > 0 && gradeAgg[0].classAvg != null) {
          classAverageScore = Math.round(gradeAgg[0].classAvg);
        }

        return {
          _id: cls._id,
          name: cls.name,
          levelName: cls.level?.displayName || 'Basic Education',
          classTeacherName: cls.classTeacher ? `${cls.classTeacher.title ? cls.classTeacher.title + ' ' : ''}${cls.classTeacher.firstName} ${cls.classTeacher.lastName}` : 'Unassigned',
          studentCount,
          capacity: cls.capacity || 40,
          attendanceRate: rate,
          classAverageScore,
        };
      })
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// GET /api/teachers/my-classes/:classId
const getMyClassDetails = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const Class = require('../models/Class');
    const Student = require('../models/Student');
    const Subject = require('../models/Subject');
    const AttendanceRecord = require('../models/AttendanceRecord');
    const ClassSubjectAssignment = require('../models/ClassSubjectAssignment');

    const classDoc = await Class.findById(classId)
      .populate('level', 'displayName category')
      .populate('classTeacher', 'firstName lastName title phone email photoUrl')
      .populate('formTeacher', 'email phone');

    if (!classDoc) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    const students = await Student.find({ currentClass: classId, status: 'active' })
      .sort({ lastName: 1, firstName: 1 })
      .select('firstName lastName admissionNumber gender dob photoUrl status guardianPhone enrollmentDate');

    // Attach real Grade-based average score per student
    const Grade = require('../models/Grade');
    const currentYear = await AcademicYear.findOne({ isCurrent: true });
    const yearLabel = currentYear?.name || new Date().getFullYear().toString();
    const currentTerm = currentYear?.currentTerm || '1';

    // Build a map: studentId -> avgTotalScore this term
    const gradeAgg = await Grade.aggregate([
      { $match: { class: new (require('mongoose').Types.ObjectId)(classId), academicYear: yearLabel, term: currentTerm } },
      { $group: { _id: '$student', avg: { $avg: '$totalScore' } } },
    ]);
    const gradeMap = gradeAgg.reduce((acc, g) => { acc[g._id.toString()] = Math.round(g.avg); return acc; }, {});

    const populatedStudents = await Promise.all(
      students.map(async (st) => {
        const totalAtt = await AttendanceRecord.countDocuments({ student: st._id });
        const presentAtt = await AttendanceRecord.countDocuments({ student: st._id, status: 'present' });
        const attRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 100;
        const averageScore = gradeMap[st._id.toString()] ?? null; // null = no grades yet

        return {
          _id: st._id,
          admissionNumber: st.admissionNumber,
          firstName: st.firstName,
          lastName: st.lastName,
          fullName: `${st.firstName} ${st.lastName}`,
          gender: st.gender,
          dob: st.dob,
          photoUrl: st.photoUrl,
          status: st.status,
          attendanceRate: attRate,
          averageScore,
          guardianPhone: st.guardianPhone || 'N/A',
        };
      })
    );

    // Get subjects for this class
    const subAssignments = await ClassSubjectAssignment.find({ class: classId }).populate('subject', 'name code type');
    let subjects = subAssignments.map((sa) => sa.subject).filter(Boolean);

    if (subjects.length === 0 && classDoc.level) {
      subjects = await Subject.find({ appliesToLevels: classDoc.level._id }).select('name code type');
    }

    const totalStudents = populatedStudents.length;
    // Class average: only from students who have grades; fall back to 0 if none entered
    const studentsWithGrades = populatedStudents.filter((s) => s.averageScore != null);
    const classAvg = studentsWithGrades.length > 0
      ? Math.round(studentsWithGrades.reduce((acc, s) => acc + s.averageScore, 0) / studentsWithGrades.length)
      : 0;
    const overallAttRate = totalStudents > 0 ? Math.round(populatedStudents.reduce((acc, s) => acc + s.attendanceRate, 0) / totalStudents) : 100;
    const gradesEntered = studentsWithGrades.length > 0;

    res.json({
      success: true,
      data: {
        classDetails: {
          _id: classDoc._id,
          name: classDoc.name,
          levelName: classDoc.level?.displayName || 'Basic Education',
          classTeacher: classDoc.classTeacher,
          studentCount: totalStudents,
          capacity: classDoc.capacity || 40,
          classAverageScore: classAvg,
          attendanceRate: overallAttRate,
          gradesEntered,
          currentTerm,
          academicYear: yearLabel,
        },
        students: populatedStudents,
        subjects,
        upcomingLessons: [
          { day: 'Today', time: '08:00 AM', subject: subjects[0]?.name || 'Mathematics', topic: 'Algebraic Expressions & Factors' },
          { day: 'Today', time: '10:30 AM', subject: subjects[1]?.name || 'English Language', topic: 'Narrative Essay Writing & Grammar' },
          { day: 'Tomorrow', time: '09:00 AM', subject: subjects[2]?.name || 'Integrated Science', topic: 'Photosynthesis & Plant Biology' },
        ],
        recentActivities: [
          { time: '10 mins ago', title: 'Daily Attendance Marked', description: `${totalStudents} students recorded for today.` },
          { time: 'Yesterday', title: 'Continuous Assessment Score Updated', description: 'Class Score 1 entries recorded for Mathematics.' },
          { time: '2 days ago', title: 'Offline Assignment Logged', description: 'Weekly Essay Assignment issued to all students.' },
        ],
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/teachers/my-classes/:classId/pending-tasks
const getClassPendingTasks = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const userId = req.user.id || req.user._id;

    const Class = require('../models/Class');
    const Student = require('../models/Student');
    const AttendanceRecord = require('../models/AttendanceRecord');
    const OfflineAssignment = require('../models/OfflineAssignment');
    const Grade = require('../models/Grade');
    const ClassSubjectAssignment = require('../models/ClassSubjectAssignment');

    const classDoc = await Class.findById(classId).lean();
    if (!classDoc) return res.status(404).json({ success: false, message: 'Class not found' });

    const currentYear = await AcademicYear.findOne({ isCurrent: true }).lean();
    const yearLabel = currentYear?.name || new Date().getFullYear().toString();
    const currentTerm = currentYear?.currentTerm || '1';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const tasks = [];

    // ── Task 1: Form teacher — attendance not marked today ──────────────────
    const isFormTeacher =
      classDoc.classTeacher?.toString() === userId.toString() ||
      classDoc.formTeacher?.toString() === userId.toString();

    if (isFormTeacher) {
      const studentCount = await Student.countDocuments({
        currentClass: classId,
        status: { $nin: ['withdrawn', 'transferred', 'graduated'] },
      });
      const todayMarked = await AttendanceRecord.countDocuments({
        class: classId,
        date: { $gte: today, $lt: tomorrow },
      });
      if (studentCount > 0 && todayMarked === 0) {
        tasks.push({
          id: 'attendance_not_marked',
          type: 'urgent',
          icon: 'clipboard',
          title: 'Attendance Not Marked Today',
          description: `Daily attendance for ${studentCount} students has not been recorded yet.`,
          action: 'Mark Attendance',
          tab: 'attendance',
        });
      }
    }

    // ── Task 2: Offline assignments past due with NO scores at all ──────────
    const allPastDueAssignments = await OfflineAssignment.find({
      class: classId,
      teacher: userId,
      dueDate: { $lt: today },
    }).select('title dueDate studentScores').lean();

    allPastDueAssignments.forEach((asgn) => {
      const hasAnyScore = asgn.studentScores?.some((s) => s.score > 0);
      const allZero = !asgn.studentScores || asgn.studentScores.every((s) => s.score === 0);

      if (allZero) {
        // Fully ungraded
        tasks.push({
          id: `ungraded_${asgn._id}`,
          type: 'urgent',
          icon: 'edit',
          title: `Grade Pending: ${asgn.title}`,
          description: `Assignment was due ${new Date(asgn.dueDate).toLocaleDateString('en-GB')}. No scores entered.`,
          action: 'Enter Grades',
          tab: 'assignments',
          meta: { assignmentId: asgn._id },
        });
      } else if (hasAnyScore) {
        // Partially graded
        const missing = asgn.studentScores.filter((s) => s.score === 0).length;
        if (missing > 0) {
          tasks.push({
            id: `partial_${asgn._id}`,
            type: 'warning',
            icon: 'edit',
            title: `Incomplete Grading: ${asgn.title}`,
            description: `${missing} student(s) still have no score for this assignment.`,
            action: 'Complete Grading',
            tab: 'assignments',
            meta: { assignmentId: asgn._id },
          });
        }
      }
    });

    // ── Task 3: Subjects with zero Grade entries this term ──────────────────
    const subAssignments = await ClassSubjectAssignment.find({ class: classId })
      .populate('subject', 'name')
      .lean();

    await Promise.all(
      subAssignments.map(async (sa) => {
        if (!sa.subject) return;
        const gradeCount = await Grade.countDocuments({
          class: classId,
          subject: sa.subject._id,
          academicYear: yearLabel,
          term: currentTerm,
        });
        if (gradeCount === 0) {
          tasks.push({
            id: `no_grades_${sa.subject._id}`,
            type: 'info',
            icon: 'barChart',
            title: `No CA Scores: ${sa.subject.name}`,
            description: `No continuous assessment scores entered for ${sa.subject.name} in Term ${currentTerm}.`,
            action: 'Enter Results',
            tab: 'results',
            meta: { subjectId: sa.subject._id },
          });
        }
      })
    );

    res.json({
      success: true,
      data: {
        total: tasks.length,
        urgent: tasks.filter((t) => t.type === 'urgent').length,
        tasks,
      },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/teachers/profile/update
const updateTeacherProfile = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { firstName, lastName, email, photoUrl, currentPassword, newPassword } = req.body;

    const User = require('../models/User');
    const Staff = require('../models/Staff');
    const bcrypt = require('bcryptjs');

    const user = await User.findById(userId).populate('refStaff');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Password change validation
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required to set a new password' });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash || user.password || '');
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      }
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
    }

    // Email change
    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing && existing._id.toString() !== userId.toString()) {
        return res.status(400).json({ success: false, message: 'Email address is already in use' });
      }
      user.email = email.toLowerCase();
    }

    await user.save();

    // Update linked Staff profile details (Name & Photo)
    if (user.refStaff) {
      const staff = await Staff.findById(user.refStaff._id || user.refStaff);
      if (staff) {
        if (firstName) staff.firstName = firstName.trim();
        if (lastName) staff.lastName = lastName.trim();
        if (photoUrl !== undefined) staff.photoUrl = photoUrl;
        await staff.save();
      }
    }

    const updatedUser = await User.findById(userId).populate('refStaff');
    const staff = updatedUser.refStaff;

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      data: {
        _id: userId,
        email: updatedUser.email,
        firstName: staff?.firstName || updatedUser.name || 'Teacher',
        lastName: staff?.lastName || '',
        fullName: staff ? `${staff.firstName} ${staff.lastName}` : updatedUser.name,
        photoUrl: staff?.photoUrl || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/teachers/timetable
const getTeacherTimetable = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { classId, day } = req.query;
    const Timetable = require('../models/Timetable');

    const filter = { teacher: userId };
    if (classId) filter.class = classId;
    if (day) filter.day = day;

    const entries = await Timetable.find(filter)
      .populate('class', 'name stage')
      .sort({ startTime: 1 });

    res.json({ success: true, data: entries });
  } catch (error) {
    next(error);
  }
};

// POST /api/teachers/timetable
const createTimetableEntry = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { class: classId, subject, day, startTime, endTime, topic, room } = req.body;

    if (!classId || !subject || !day || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Class, Subject, Day, Start Time, and End Time are required' });
    }

    const Timetable = require('../models/Timetable');
    const newEntry = await Timetable.create({
      teacher: userId,
      class: classId,
      subject,
      day,
      startTime,
      endTime,
      topic: topic || '',
      room: room || '',
    });

    const populated = await Timetable.findById(newEntry._id).populate('class', 'name stage');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// PUT /api/teachers/timetable/:id
const updateTimetableEntry = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { id } = req.params;
    const Timetable = require('../models/Timetable');

    const entry = await Timetable.findOne({ _id: id, teacher: userId });
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Timetable slot not found' });
    }

    const { class: classId, subject, day, startTime, endTime, topic, room } = req.body;
    if (classId) entry.class = classId;
    if (subject) entry.subject = subject;
    if (day) entry.day = day;
    if (startTime) entry.startTime = startTime;
    if (endTime) entry.endTime = endTime;
    if (topic !== undefined) entry.topic = topic;
    if (room !== undefined) entry.room = room;

    await entry.save();
    const populated = await Timetable.findById(entry._id).populate('class', 'name stage');
    res.json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/teachers/timetable/:id
const deleteTimetableEntry = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { id } = req.params;
    const Timetable = require('../models/Timetable');

    const entry = await Timetable.findOneAndDelete({ _id: id, teacher: userId });
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Timetable slot not found' });
    }

    res.json({ success: true, message: 'Timetable slot deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTeacherLoad,
  getTeacherProfile,
  getTeacherDashboardSummary,
  getMyClasses,
  getMyClassDetails,
  getClassPendingTasks,
  updateTeacherProfile,
  getTeacherTimetable,
  createTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
};



