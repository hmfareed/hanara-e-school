const LessonPlan = require('../models/LessonPlan');
const AcademicYear = require('../models/AcademicYear');

// POST /api/lesson-plans
const createLessonPlan = async (req, res, next) => {
  try {
    const {
      classId,
      subjectId,
      weekNumber,
      topic,
      subTopic,
      objectives,
      teacherActivities,
      studentActivities,
      teachingMaterials,
      assessment,
      homework,
      status,
    } = req.body;

    const teacherId = req.user.id || req.user._id;

    if (!classId || !subjectId || !weekNumber || !topic || !objectives) {
      return res.status(400).json({
        success: false,
        message: 'Class, Subject, Week Number, Topic, and Objectives are required.',
      });
    }

    const currentYear = await AcademicYear.findOne({ isCurrent: true });
    const academicYearStr = currentYear ? currentYear.name : '2025/2026';
    const termStr = currentYear ? String(currentYear.currentTerm || 1) : '1';

    const lessonPlan = await LessonPlan.create({
      teacher: teacherId,
      class: classId,
      subject: subjectId,
      academicYear: academicYearStr,
      term: termStr,
      weekNumber: Number(weekNumber),
      topic,
      subTopic: subTopic || '',
      objectives,
      teacherActivities: teacherActivities || '',
      studentActivities: studentActivities || '',
      teachingMaterials: teachingMaterials || '',
      assessment: assessment || '',
      homework: homework || '',
      status: status || 'draft',
    });

    const populated = await LessonPlan.findById(lessonPlan._id)
      .populate('class', 'name')
      .populate('subject', 'name code');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// GET /api/lesson-plans
const getLessonPlans = async (req, res, next) => {
  try {
    const { classId, subjectId, weekNumber } = req.query;
    const teacherId = req.user.id || req.user._id;

    const filter = {};
    if (req.user.role === 'teacher') {
      filter.teacher = teacherId;
    }
    if (classId) filter.class = classId;
    if (subjectId) filter.subject = subjectId;
    if (weekNumber) filter.weekNumber = Number(weekNumber);

    const lessonPlans = await LessonPlan.find(filter)
      .populate('class', 'name')
      .populate('subject', 'name code')
      .sort({ weekNumber: -1, createdAt: -1 });

    res.json({ success: true, data: lessonPlans });
  } catch (error) {
    next(error);
  }
};

// POST /api/lesson-plans/:id/duplicate (Duplicate previous week's plan)
const duplicateLessonPlan = async (req, res, next) => {
  try {
    const original = await LessonPlan.findById(req.params.id);
    if (!original) {
      return res.status(404).json({ success: false, message: 'Lesson plan not found' });
    }

    const nextWeekNumber = original.weekNumber + 1;

    const duplicated = await LessonPlan.create({
      teacher: req.user.id || req.user._id,
      class: original.class,
      subject: original.subject,
      academicYear: original.academicYear,
      term: original.term,
      weekNumber: nextWeekNumber,
      topic: `${original.topic} (Week ${nextWeekNumber} Continuation)`,
      subTopic: original.subTopic,
      objectives: original.objectives,
      teacherActivities: original.teacherActivities,
      studentActivities: original.studentActivities,
      teachingMaterials: original.teachingMaterials,
      assessment: original.assessment,
      homework: original.homework,
      status: 'draft',
    });

    const populated = await LessonPlan.findById(duplicated._id)
      .populate('class', 'name')
      .populate('subject', 'name code');

    res.status(201).json({
      success: true,
      message: `Duplicated lesson plan successfully for Week ${nextWeekNumber}!`,
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/lesson-plans/:id
const updateLessonPlan = async (req, res, next) => {
  try {
    const updated = await LessonPlan.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('class', 'name')
      .populate('subject', 'name code');

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Lesson plan not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/lesson-plans/:id
const deleteLessonPlan = async (req, res, next) => {
  try {
    const deleted = await LessonPlan.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Lesson plan not found' });
    }
    res.json({ success: true, message: 'Lesson plan deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLessonPlan,
  getLessonPlans,
  duplicateLessonPlan,
  updateLessonPlan,
  deleteLessonPlan,
};
