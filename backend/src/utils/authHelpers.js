const SubjectAssignment = require('../models/SubjectAssignment');
const Class = require('../models/Class');

const canGradeSubject = async (userId, classId, subjectId, academicYear) => {
  const assignment = await SubjectAssignment.findOne({
    teacher: userId,
    class: classId,
    subject: subjectId,
    academicYear,
    isActive: true,
  });
  if (assignment) return true;

  const User = require('../models/User');
  const ClassSubjectAssignment = require('../models/ClassSubjectAssignment');
  const AcademicYear = require('../models/AcademicYear');

  const user = await User.findById(userId);
  if (user && user.refStaff) {
    const academicYearDoc = await AcademicYear.findOne({ name: academicYear });
    if (academicYearDoc) {
      const classSubAssignment = await ClassSubjectAssignment.findOne({
        teacher: user.refStaff,
        class: classId,
        subject: subjectId,
        academicYear: academicYearDoc._id,
      });
      if (classSubAssignment) return true;
    }
  }

  return false;
};

const isFormTeacherOf = async (userId, classId) => {
  const classDoc = await Class.findById(classId);
  if (!classDoc || !classDoc.formTeacher) return false;
  return classDoc.formTeacher.toString() === userId.toString();
};

const getTeacherClasses = async (userId, refStaffId) => {
  const Staff = require('../models/Staff');
  const ClassSubjectAssignment = require('../models/ClassSubjectAssignment');
  let classIds = [];
  if (refStaffId) {
    const staff = await Staff.findById(refStaffId).select('classesAssigned');
    if (staff && staff.classesAssigned) {
      classIds = classIds.concat(staff.classesAssigned.map(id => id.toString()));
    }
    const classSubAssignments = await ClassSubjectAssignment.find({ teacher: refStaffId }).distinct('class');
    classIds = classIds.concat(classSubAssignments.map(id => id.toString()));
  }
  const subjectClasses = await SubjectAssignment.find({ teacher: userId, isActive: true }).distinct('class');
  classIds = classIds.concat(subjectClasses.map(id => id.toString()));
  return [...new Set(classIds)];
};

module.exports = {
  canGradeSubject,
  isFormTeacherOf,
  getTeacherClasses,
};
