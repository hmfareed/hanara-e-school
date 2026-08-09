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
  if (user) {
    // Check if designated formTeacher of the class
    const isForm = await isFormTeacherOf(userId, classId);
    if (isForm) return true;

    // Check if designated classTeacher of the class via staff profile
    if (user.refStaff) {
      const classDoc = await Class.findById(classId);
      if (classDoc && classDoc.classTeacher && classDoc.classTeacher.toString() === user.refStaff.toString()) {
        return true;
      }

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
    
    // Classes where designated classTeacher
    const classTeacherClasses = await Class.find({ classTeacher: refStaffId }).distinct('_id');
    classIds = classIds.concat(classTeacherClasses.map(id => id.toString()));
  }
  const subjectClasses = await SubjectAssignment.find({ teacher: userId, isActive: true }).distinct('class');
  classIds = classIds.concat(subjectClasses.map(id => id.toString()));

  // Classes where designated formTeacher
  const formTeacherClasses = await Class.find({ formTeacher: userId }).distinct('_id');
  classIds = classIds.concat(formTeacherClasses.map(id => id.toString()));

  return [...new Set(classIds)];
};

/**
 * isFormTeacherOfAnyClass
 * Returns true if the user (by userId / refStaffId) is the designated
 * formTeacher (User ref) OR classTeacher (Staff ref) of at least one class.
 *
 * Form teachers / class teachers are responsible for:
 *  - Attendance register
 *  - Daily fee register
 *
 * Subject-only teachers are NOT eligible for those duties.
 */
const isFormTeacherOfAnyClass = async (userId, refStaffId) => {
  const uId = userId?.toString();
  const sId = (refStaffId?._id || refStaffId)?.toString();

  if (uId) {
    const formTeacherClass = await Class.findOne({ formTeacher: uId });
    if (formTeacherClass) return true;
  }

  if (sId) {
    const classTeacherClass = await Class.findOne({ classTeacher: sId });
    if (classTeacherClass) return true;
  }

  return false;
};

module.exports = {
  canGradeSubject,
  isFormTeacherOf,
  getTeacherClasses,
  isFormTeacherOfAnyClass,
};
