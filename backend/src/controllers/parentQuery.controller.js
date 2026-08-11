const ParentQuery = require('../models/ParentQuery');
const Student = require('../models/Student');
const Guardian = require('../models/Guardian');
const Class = require('../models/Class');

// POST /api/parent-queries (Parent submits query / sick note)
const createParentQuery = async (req, res, next) => {
  try {
    const { studentId, type, subject, message, startDate, endDate } = req.body;

    if (!studentId || !subject || !message) {
      return res.status(400).json({ success: false, message: 'Student, subject title, and message are required' });
    }

    // Verify parent owns this student
    if (!req.user.refGuardian) {
      return res.status(403).json({ success: false, message: 'User is not linked to any guardian profile' });
    }

    const guardian = await Guardian.findById(req.user.refGuardian);
    if (!guardian || !guardian.students.some((id) => id.toString() === studentId.toString())) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not a guardian of this student' });
    }

    const student = await Student.findById(studentId);
    if (!student || !student.currentClass) {
      return res.status(400).json({ success: false, message: 'Student or student current class not found' });
    }

    const parentQuery = await ParentQuery.create({
      parent: req.user.id,
      guardian: guardian._id,
      student: student._id,
      class: student.currentClass,
      type: type || 'general',
      subject,
      message,
      permissionDates: {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
      status: 'pending',
    });

    const populated = await ParentQuery.findById(parentQuery._id)
      .populate('student', 'firstName lastName admissionNumber')
      .populate('class', 'name');

    res.status(201).json({
      success: true,
      message: 'Message / permission note sent to class form teacher successfully!',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/parent-queries
const getQueriesForUser = async (req, res, next) => {
  try {
    const filter = {};

    if (req.user.role === 'parent') {
      filter.parent = req.user.id;
    } else if (['teacher'].includes(req.user.role)) {
      // Find classes assigned to teacher
      const staffId = req.user.refStaff?._id || req.user.refStaff;
      const assignedClasses = await Class.find({
        $or: [
          { formTeacher: req.user.id },
          { classTeacher: staffId },
        ],
      }).select('_id');

      const classIds = assignedClasses.map((c) => c._id);
      filter.class = { $in: classIds };
    }

    const queries = await ParentQuery.find(filter)
      .populate('student', 'firstName lastName admissionNumber')
      .populate('guardian', 'firstName lastName phone email')
      .populate('class', 'name')
      .populate('parent', 'email')
      .populate('replies.sender', 'email role')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: queries });
  } catch (error) {
    next(error);
  }
};

// POST /api/parent-queries/:id/reply (Reply or change approval status)
const replyToParentQuery = async (req, res, next) => {
  try {
    const { message, status } = req.body;
    const { id } = req.params;

    const parentQuery = await ParentQuery.findById(id);
    if (!parentQuery) {
      return res.status(404).json({ success: false, message: 'Message thread not found' });
    }

    if (message && message.trim()) {
      parentQuery.replies.push({
        sender: req.user.id,
        senderRole: req.user.role === 'parent' ? 'parent' : 'teacher',
        message: message.trim(),
      });
    }

    if (status && ['approved', 'rejected', 'closed', 'replied'].includes(status)) {
      parentQuery.status = status;
    } else if (message) {
      parentQuery.status = req.user.role === 'parent' ? 'pending' : 'replied';
    }

    await parentQuery.save();

    const updated = await ParentQuery.findById(id)
      .populate('student', 'firstName lastName admissionNumber')
      .populate('guardian', 'firstName lastName phone email')
      .populate('class', 'name')
      .populate('parent', 'email')
      .populate('replies.sender', 'email role');

    res.json({ success: true, message: 'Reply submitted successfully', data: updated });
  } catch (error) {
    next(error);
  }
};

module.exports = { createParentQuery, getQueriesForUser, replyToParentQuery };
