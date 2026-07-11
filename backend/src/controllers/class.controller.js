const Class = require('../models/Class');
const Subject = require('../models/Subject');
const ClassSubjectAssignment = require('../models/ClassSubjectAssignment');
const ClassLevel = require('../models/ClassLevel');

// GET /api/classes
const getClasses = async (req, res, next) => {
  try {
    const { academicYearId, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (academicYearId) filter.academicYear = academicYearId;

    if (req.user && (req.user.role === 'teacher' || (req.user.role === 'system_admin' && req.user.secondaryCapacities?.includes('teacher')))) {
      const { getTeacherClasses } = require('../utils/authHelpers');
      const allowedClassIds = await getTeacherClasses(req.user.id, req.user.refStaff);
      filter._id = { $in: allowedClassIds };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [classes, total] = await Promise.all([
      Class.find(filter)
        .populate('level', 'displayName category order levelCode')
        .populate('classTeacher', 'firstName lastName')
        .populate('academicYear', 'name')
        .sort({ 'level.order': 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Class.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: classes,
      meta: { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/classes
const createClass = async (req, res, next) => {
  try {
    const { levelId, name, academicYearId, classTeacherId, capacity } = req.body;
    const newClass = await Class.create({
      level: levelId,
      name,
      academicYear: academicYearId,
      classTeacher: classTeacherId || null,
      capacity: capacity || 40,
    });

    const populated = await Class.findById(newClass._id)
      .populate('level', 'displayName category')
      .populate('classTeacher', 'firstName lastName');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// GET /api/subjects
const getSubjects = async (req, res, next) => {
  try {
    const { type, levelId } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (levelId) filter.appliesToLevels = levelId;

    const subjects = await Subject.find(filter)
      .populate('appliesToLevels', 'displayName category')
      .sort({ name: 1 });

    res.json({ success: true, data: subjects });
  } catch (error) {
    next(error);
  }
};

// POST /api/subjects
const createSubject = async (req, res, next) => {
  try {
    const { name, code, appliesToLevels, type } = req.body;
    const subject = await Subject.create({ name, code, appliesToLevels, type });
    const populated = await Subject.findById(subject._id).populate('appliesToLevels', 'displayName');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// GET /api/class-subject-assignments
const getAssignments = async (req, res, next) => {
  try {
    const { classId, academicYearId } = req.query;
    const filter = {};
    if (classId) filter.class = classId;
    if (academicYearId) filter.academicYear = academicYearId;

    const assignments = await ClassSubjectAssignment.find(filter)
      .populate('subject', 'name code type')
      .populate('teacher', 'firstName lastName')
      .populate('class', 'name');

    res.json({ success: true, data: assignments });
  } catch (error) {
    next(error);
  }
};

// POST /api/class-subject-assignments
const createAssignment = async (req, res, next) => {
  try {
    const { classId, subjectId, teacherId, academicYearId } = req.body;
    const assignment = await ClassSubjectAssignment.create({
      class: classId,
      subject: subjectId,
      teacher: teacherId,
      academicYear: academicYearId,
    });

    const populated = await ClassSubjectAssignment.findById(assignment._id)
      .populate('subject', 'name code')
      .populate('teacher', 'firstName lastName')
      .populate('class', 'name');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// GET /api/class-levels
const getClassLevels = async (req, res, next) => {
  try {
    const levels = await ClassLevel.find().sort({ order: 1 });
    res.json({ success: true, data: levels });
  } catch (error) {
    next(error);
  }
};

// PUT /api/classes/:id
const updateClass = async (req, res, next) => {
  try {
    const { name, levelId, classTeacherId, capacity } = req.body;
    const updated = await Class.findByIdAndUpdate(
      req.params.id,
      { name, level: levelId, classTeacher: classTeacherId || null, capacity },
      { new: true, runValidators: true }
    )
      .populate('level', 'displayName category')
      .populate('classTeacher', 'firstName lastName');

    if (!updated) return res.status(404).json({ success: false, message: 'Class not found' });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/classes/:id
const deleteClass = async (req, res, next) => {
  try {
    const deleted = await Class.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Class not found' });
    res.json({ success: true, message: 'Class deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// PUT /api/classes/subjects/:id
const updateSubject = async (req, res, next) => {
  try {
    const { name, code, appliesToLevels, type } = req.body;
    const updated = await Subject.findByIdAndUpdate(
      req.params.id,
      { name, code, appliesToLevels, type },
      { new: true, runValidators: true }
    ).populate('appliesToLevels', 'displayName');

    if (!updated) return res.status(404).json({ success: false, message: 'Subject not found' });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/classes/subjects/:id
const deleteSubject = async (req, res, next) => {
  try {
    const deleted = await Subject.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Subject not found' });
    res.json({ success: true, message: 'Subject deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// PUT /api/classes/assignments/:id
const updateAssignment = async (req, res, next) => {
  try {
    const { classId, subjectId, teacherId } = req.body;
    const updated = await ClassSubjectAssignment.findByIdAndUpdate(
      req.params.id,
      { class: classId, subject: subjectId, teacher: teacherId },
      { new: true, runValidators: true }
    )
      .populate('subject', 'name code')
      .populate('teacher', 'firstName lastName')
      .populate('class', 'name');

    if (!updated) return res.status(404).json({ success: false, message: 'Assignment not found' });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/classes/assignments/:id
const deleteAssignment = async (req, res, next) => {
  try {
    const deleted = await ClassSubjectAssignment.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Assignment not found' });
    res.json({ success: true, message: 'Assignment deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const assignFormTeacher = async (req, res, next) => {
  try {
    const { formTeacherId } = req.body;
    const classId = req.params.id;

    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    if (formTeacherId) {
      // Find other class with same form teacher in the same academic year
      const duplicate = await Class.findOne({
        _id: { $ne: classId },
        academicYear: classDoc.academicYear,
        formTeacher: formTeacherId,
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'Teacher is already assigned as a form teacher for another class in this academic year',
        });
      }
    }

    classDoc.formTeacher = formTeacherId || null;
    await classDoc.save();

    const populated = await Class.findById(classDoc._id)
      .populate('level', 'displayName category')
      .populate('classTeacher', 'firstName lastName')
      .populate('formTeacher', 'email role');

    res.json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getClasses, createClass, updateClass, deleteClass,
  getSubjects, createSubject, updateSubject, deleteSubject,
  getAssignments, createAssignment, updateAssignment, deleteAssignment,
  getClassLevels, assignFormTeacher,
};
