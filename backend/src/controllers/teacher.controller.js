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
    const teacherUser = await User.findById(teacherId);
    let staffAssignments = [];
    if (teacherUser && teacherUser.refStaff) {
      const academicYearDoc = await AcademicYear.findOne({ name: academicYear });
      if (academicYearDoc) {
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

    res.json({ success: true, data: merged });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTeacherLoad,
};
