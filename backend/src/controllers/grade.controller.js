const Grade = require('../models/Grade');
const StudentReport = require('../models/StudentReport');
const SubjectAssignment = require('../models/SubjectAssignment');
const Student = require('../models/Student');
const SchoolProfile = require('../models/SchoolProfile');
const { calculateClassRankings, getGradeAndRemark, loadConfig } = require('../services/grading.service');
const { generateReportCardPdf } = require('../services/pdf.service');
const { logAction } = require('../middleware/audit');


// POST /api/grades
const enterGrade = async (req, res, next) => {
  try {
    const {
      studentId,
      classId,
      subjectId,
      academicYear,
      term,
      classExercise1,
      classExercise2,
      classExercise3,
      classExercise4,
      weeklyTest,
      homework1,
      homework2,
      homework3,
      homework4,
      rawExamScore
    } = req.body;

    if (!studentId || !classId || !subjectId || !academicYear || !term) {
      return res.status(400).json({
        success: false,
        message: 'studentId, classId, subjectId, academicYear, and term are required',
      });
    }

    let sa = await SubjectAssignment.findOne({
      class: classId,
      subject: subjectId,
      academicYear,
      isActive: true,
    });

    if (!sa) {
      // Auto-create SubjectAssignment since user has been authorized by middleware
      sa = await SubjectAssignment.create({
        teacher: req.user.id || req.user._id,
        class: classId,
        subject: subjectId,
        academicYear,
        isActive: true,
      });
    }

    const hasDetailedCA = [
      classExercise1, classExercise2, classExercise3, classExercise4,
      weeklyTest, homework1, homework2, homework3, homework4
    ].some(val => val !== undefined);

    let finalClassExercise1 = 0;
    let finalClassExercise2 = 0;
    let finalClassExercise3 = 0;
    let finalClassExercise4 = 0;
    let finalWeeklyTest = 0;
    let finalHomework1 = 0;
    let finalHomework2 = 0;
    let finalHomework3 = 0;
    let finalHomework4 = 0;
    let finalRawExamScore = 0;

    let finalRawClassScore = 0;
    let finalClassScore = 0;
    let finalExamScore = 0;

    if (hasDetailedCA || rawExamScore !== undefined) {
      finalClassExercise1 = Number(classExercise1) || 0;
      finalClassExercise2 = Number(classExercise2) || 0;
      finalClassExercise3 = Number(classExercise3) || 0;
      finalClassExercise4 = Number(classExercise4) || 0;
      finalWeeklyTest = Number(weeklyTest) || 0;
      finalHomework1 = Number(homework1) || 0;
      finalHomework2 = Number(homework2) || 0;
      finalHomework3 = Number(homework3) || 0;
      finalHomework4 = Number(homework4) || 0;
      finalRawExamScore = Number(rawExamScore) || 0;

      finalRawClassScore = finalClassExercise1 + finalClassExercise2 + finalClassExercise3 + finalClassExercise4 + finalWeeklyTest + finalHomework1 + finalHomework2 + finalHomework3 + finalHomework4;
      finalClassScore = parseFloat(((finalRawClassScore / 80) * 30).toFixed(2));
      finalExamScore = parseFloat(((finalRawExamScore / 100) * 70).toFixed(2));
    } else {
      // Fallback/Legacy mode: Use classScore and examScore directly
      finalClassScore = Number(req.body.classScore) || 0;
      finalExamScore = Number(req.body.examScore) || 0;
      finalRawClassScore = 0;
      finalRawExamScore = 0;
    }

    const totalScore = parseFloat((finalClassScore + finalExamScore).toFixed(2));

    const grade = await Grade.findOneAndUpdate(
      { student: studentId, class: classId, subject: subjectId, academicYear, term },
      {
        subjectAssignment: sa._id,
        classExercise1: finalClassExercise1,
        classExercise2: finalClassExercise2,
        classExercise3: finalClassExercise3,
        classExercise4: finalClassExercise4,
        weeklyTest: finalWeeklyTest,
        homework1: finalHomework1,
        homework2: finalHomework2,
        homework3: finalHomework3,
        homework4: finalHomework4,
        rawClassScore: finalRawClassScore,
        classScore: finalClassScore,
        rawExamScore: finalRawExamScore,
        examScore: finalExamScore,
        totalScore,
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json({ success: true, data: grade });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/grades/conduct
const updateConduct = async (req, res, next) => {
  try {
    const { studentId, classId, academicYear, term, conductRemarks } = req.body;
    if (!studentId || !classId || !academicYear || !term) {
      return res.status(400).json({
        success: false,
        message: 'studentId, classId, academicYear, and term are required',
      });
    }

    const report = await StudentReport.findOneAndUpdate(
      { student: studentId, class: classId, academicYear, term },
      {
        conductRemarks: conductRemarks || '',
        formTeacher: req.user.id || req.user._id,
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/grades/attendance
const updateAttendance = async (req, res, next) => {
  try {
    const { studentId, classId, academicYear, term, present, absent, total } = req.body;
    if (!studentId || !classId || !academicYear || !term) {
      return res.status(400).json({
        success: false,
        message: 'studentId, classId, academicYear, and term are required',
      });
    }

    const report = await StudentReport.findOneAndUpdate(
      { student: studentId, class: classId, academicYear, term },
      {
        attendanceSummary: {
          present: Number(present) || 0,
          absent: Number(absent) || 0,
          total: Number(total) || 0,
        },
        formTeacher: req.user.id || req.user._id,
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/grades/promotion
const updatePromotion = async (req, res, next) => {
  try {
    const { studentId, classId, academicYear, term, promotionDecision } = req.body;
    if (!studentId || !classId || !academicYear || !term) {
      return res.status(400).json({
        success: false,
        message: 'studentId, classId, academicYear, and term are required',
      });
    }

    const report = await StudentReport.findOneAndUpdate(
      { student: studentId, class: classId, academicYear, term },
      {
        promotionDecision: promotionDecision || '',
        formTeacher: req.user.id || req.user._id,
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

// GET /api/grades/student/:studentId/report-card
const getReportCard = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { academicYear, term } = req.query;

    if (!academicYear || !term) {
      return res.status(400).json({
        success: false,
        message: 'academicYear and term query parameters are required',
      });
    }

    const student = await Student.findById(studentId).populate('currentClass');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const classId = student.currentClass ? student.currentClass._id : null;

    // Fetch subject grades
    const grades = await Grade.find({
      student: studentId,
      academicYear,
      term,
    })
      .populate('subject', 'name code')
      .populate({
        path: 'subjectAssignment',
        populate: {
          path: 'teacher',
          select: 'email role',
        },
      });

    // Fetch student report (conduct, attendance, promotion, form teacher)
    const report = await StudentReport.findOne({
      student: studentId,
      academicYear,
      term,
    }).populate('formTeacher', 'email role');

    res.json({
      success: true,
      data: {
        student,
        class: student.currentClass,
        academicYear,
        term,
        grades,
        report: report || {
          conductRemarks: '',
          attendanceSummary: { present: 0, absent: 0, total: 0 },
          promotionDecision: '',
          formTeacher: null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/grades/class/:classId/subject/:subjectId
const getClassGrades = async (req, res, next) => {
  try {
    const { classId, subjectId } = req.params;
    const { academicYear, term } = req.query;

    if (!academicYear || !term) {
      return res.status(400).json({
        success: false,
        message: 'academicYear and term query parameters are required',
      });
    }

    const students = await Student.find({ currentClass: classId, status: 'active' })
      .sort({ lastName: 1, firstName: 1 })
      .select('firstName lastName otherNames admissionNumber');

    const grades = await Grade.find({
      class: classId,
      subject: subjectId,
      academicYear,
      term,
    });

    const data = students.map((student) => {
      const grade = grades.find((g) => g.student.toString() === student._id.toString());
      return {
        student,
        grade: grade || null,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// POST /api/grades/class/:classId/finalize
const finalizeClassTerm = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const { academicYear, term } = req.body;

    if (!academicYear || !term) {
      return res.status(400).json({
        success: false,
        message: 'academicYear and term are required',
      });
    }

    const result = await calculateClassRankings(
      classId,
      academicYear,
      term,
      req.user.id || req.user._id
    );

    // Audit log — record who finalized the class term
    await logAction(req, 'FINALIZE_REPORT_CARD', 'ClassTerm', classId, null, {
      classId, academicYear, term, ...result,
    });

    res.json({
      success: true,
      message: `Term finalized. ${result.updated} student reports updated.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/grades/student/:studentId/report-card/pdf
const getReportCardPdf = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { academicYear, term } = req.query;

    if (!academicYear || !term) {
      return res.status(400).json({
        success: false,
        message: 'academicYear and term query parameters are required',
      });
    }

    const student = await Student.findById(studentId).populate('currentClass');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const classId = student.currentClass?._id;

    // Determine the level category for grading
    const classLevel = student.currentClass?.level;
    let levelCategory = 'Primary';
    if (classLevel) {
      const ClassLevel = require('../models/ClassLevel');
      const lvl = await ClassLevel.findById(classLevel);
      levelCategory = lvl?.category || 'Primary';
    }

    // Fetch grades
    const grades = await Grade.find({
      student: studentId,
      academicYear,
      term,
    }).populate('subject', 'name code _id');

    // Resolve grade label for each subject score
    const gradingDetails = await Promise.all(
      grades.map(async (g) => {
        const { grade, label } = await getGradeAndRemark(g.totalScore, levelCategory);
        return { subjectId: g.subject?._id, grade, label };
      })
    );

    // Fetch terminal report
    const report = await StudentReport.findOne({
      student: studentId,
      class: classId,
      academicYear,
      term,
    });

    const schoolProfile = await SchoolProfile.findOne({});

    const pdfBuffer = await generateReportCardPdf({
      student,
      report,
      grades,
      gradingDetails,
      schoolProfile,
      academicYear,
      term,
    });

    const safeName = `${student.admissionNumber || studentId}_Term${term}_${academicYear.replace('/', '-')}`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ReportCard_${safeName}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  enterGrade,
  updateConduct,
  updateAttendance,
  updatePromotion,
  getReportCard,
  getClassGrades,
  finalizeClassTerm,
  getReportCardPdf,
};

