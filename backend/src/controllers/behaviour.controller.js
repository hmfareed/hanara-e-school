const BehaviourRecord = require('../models/BehaviourRecord');
const AcademicYear = require('../models/AcademicYear');

// POST /api/behaviour-records
const createBehaviourRecord = async (req, res, next) => {
  try {
    const { studentId, classId, category, title, description, actionTaken, term } = req.body;
    const teacherId = req.user.id || req.user._id;

    if (!studentId || !classId || !category || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Student, Class, Category, Title, and Description are required.',
      });
    }

    const currentYear = await AcademicYear.findOne({ isCurrent: true });
    const academicYearStr = currentYear ? currentYear.name : '2025/2026';
    const termStr = currentYear ? String(currentYear.currentTerm || 1) : (term || '1');

    const record = await BehaviourRecord.create({
      student: studentId,
      class: classId,
      teacher: teacherId,
      category,
      title,
      description,
      actionTaken: actionTaken || '',
      date: new Date(),
      academicYear: academicYearStr,
      term: termStr,
    });

    const populated = await BehaviourRecord.findById(record._id)
      .populate('student', 'firstName lastName admissionNumber photoUrl')
      .populate('class', 'name')
      .populate('teacher', 'email');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// GET /api/behaviour-records
const getBehaviourRecords = async (req, res, next) => {
  try {
    const { studentId, classId, category } = req.query;

    const filter = {};
    if (studentId) filter.student = studentId;
    if (classId) filter.class = classId;
    if (category) filter.category = category;

    const records = await BehaviourRecord.find(filter)
      .populate('student', 'firstName lastName admissionNumber photoUrl currentClass')
      .populate('class', 'name')
      .populate('teacher', 'email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/behaviour-records/:id
const deleteBehaviourRecord = async (req, res, next) => {
  try {
    const deleted = await BehaviourRecord.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    res.json({ success: true, message: 'Behaviour record deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBehaviourRecord,
  getBehaviourRecords,
  deleteBehaviourRecord,
};
