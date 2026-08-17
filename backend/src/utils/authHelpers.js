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
  const User = require('../models/User');
  const ClassSubjectAssignment = require('../models/ClassSubjectAssignment');
  const SubjectAssignment = require('../models/SubjectAssignment');
  const Timetable = require('../models/Timetable');
  const Class = require('../models/Class');

  const teacherIdSet = new Set();
  if (userId) teacherIdSet.add(userId.toString());
  if (refStaffId) teacherIdSet.add((refStaffId._id || refStaffId).toString());

  let classIds = [];

  // Parallel user and staff lookup if needed
  const userLookups = [];
  if (userId && !refStaffId) {
    userLookups.push(
      User.findById(userId).select('refStaff email phone').lean().then((u) => {
        if (u?.refStaff) teacherIdSet.add(u.refStaff.toString());
      }).catch(() => {})
    );
  }
  if (refStaffId) {
    userLookups.push(
      Staff.findById(refStaffId._id || refStaffId).select('_id classesAssigned').lean().then((s) => {
        if (Array.isArray(s?.classesAssigned)) {
          classIds.push(...s.classesAssigned.map((id) => (id._id || id).toString()));
        }
      }).catch(() => {})
    );
  }

  if (userLookups.length > 0) {
    await Promise.all(userLookups);
  }

  const teacherIds = Array.from(teacherIdSet);
  if (teacherIds.length === 0) return [];

  // Parallel query across all 4 assignment sources simultaneously
  const [csaClasses, saClasses, directClasses, ttClasses] = await Promise.all([
    ClassSubjectAssignment.find({ teacher: { $in: teacherIds } }).distinct('class').catch(() => []),
    SubjectAssignment.find({ teacher: { $in: teacherIds }, isActive: true }).distinct('class').catch(() => []),
    Class.find({
      $or: [{ classTeacher: { $in: teacherIds } }, { formTeacher: { $in: teacherIds } }],
    }).distinct('_id').catch(() => []),
    Timetable.find({ teacher: { $in: teacherIds } }).distinct('class').catch(() => []),
  ]);

  classIds.push(
    ...csaClasses.map((id) => id.toString()),
    ...saClasses.map((id) => id.toString()),
    ...directClasses.map((id) => id.toString()),
    ...ttClasses.map((id) => id.toString())
  );

  return [...new Set(classIds.filter(Boolean).map((id) => id.toString()))];
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
  const teacherIdSet = new Set();
  if (userId) teacherIdSet.add(userId.toString());
  if (refStaffId) teacherIdSet.add((refStaffId._id || refStaffId).toString());

  const User = require('../models/User');
  const Staff = require('../models/Staff');
  const Class = require('../models/Class');

  if (userId) {
    try {
      const userDoc = await User.findById(userId).select('refStaff email phone').lean();
      if (userDoc) {
        if (userDoc.refStaff) teacherIdSet.add(userDoc.refStaff.toString());
        if (userDoc.email) {
          const staff = await Staff.findOne({ email: userDoc.email }).select('_id').lean();
          if (staff) teacherIdSet.add(staff._id.toString());
        }
      }
    } catch (err) {}
  }

  const teacherIds = Array.from(teacherIdSet);
  if (teacherIds.length === 0) return false;

  const foundClass = await Class.findOne({
    $or: [
      { formTeacher: { $in: teacherIds } },
      { classTeacher: { $in: teacherIds } },
    ],
  }).select('_id').lean();

  return !!foundClass;
};

/**
 * isJHS3Teacher
 * Returns true if the teacher is assigned to at least one class whose
 * ClassLevel has category === 'JHS' and order === 13 (JHS 3 / BS9).
 * Used to gate Mock Exam access in the sidebar and page.
 */
const isJHS3Teacher = async (userId, refStaffId) => {
  const ClassLevel = require('../models/ClassLevel');
  const Class = require('../models/Class');
  const jhs3Level = await ClassLevel.findOne({ category: 'JHS', order: 13 }).select('_id').lean();
  if (!jhs3Level) return false;

  const classIds = await getTeacherClasses(userId, refStaffId);
  if (!classIds.length) return false;

  const jhs3Class = await Class.findOne({ _id: { $in: classIds }, level: jhs3Level._id }).select('_id').lean();
  return !!jhs3Class;
};

module.exports = {
  canGradeSubject,
  isFormTeacherOf,
  getTeacherClasses,
  isFormTeacherOfAnyClass,
  isJHS3Teacher,
};
