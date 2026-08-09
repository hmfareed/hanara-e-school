const LearningResource = require('../models/LearningResource');
const AcademicYear = require('../models/AcademicYear');

// POST /api/learning-resources
const createResource = async (req, res, next) => {
  try {
    const { title, classId, subjectId, resourceType, url, description } = req.body;
    const teacherId = req.user.id || req.user._id;

    if (!title || !classId || !subjectId || !url) {
      return res.status(400).json({
        success: false,
        message: 'Title, Class, Subject, and Resource URL are required.',
      });
    }

    const currentYear = await AcademicYear.findOne({ isCurrent: true });
    const academicYearStr = currentYear ? currentYear.name : '2025/2026';

    const resource = await LearningResource.create({
      title,
      class: classId,
      subject: subjectId,
      teacher: teacherId,
      resourceType: resourceType || 'document',
      url,
      description: description || '',
      academicYear: academicYearStr,
    });

    const populated = await LearningResource.findById(resource._id)
      .populate('class', 'name')
      .populate('subject', 'name code')
      .populate('teacher', 'email');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// GET /api/learning-resources
const getResources = async (req, res, next) => {
  try {
    const { classId, subjectId, resourceType } = req.query;

    const filter = {};
    if (classId) filter.class = classId;
    if (subjectId) filter.subject = subjectId;
    if (resourceType) filter.resourceType = resourceType;

    const resources = await LearningResource.find(filter)
      .populate('class', 'name')
      .populate('subject', 'name code')
      .populate('teacher', 'email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: resources });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/learning-resources/:id
const deleteResource = async (req, res, next) => {
  try {
    const deleted = await LearningResource.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    res.json({ success: true, message: 'Learning resource deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createResource,
  getResources,
  deleteResource,
};
