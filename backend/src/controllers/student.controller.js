const Student = require('../models/Student');
const Guardian = require('../models/Guardian');
const { generateAdmissionNumber } = require('../utils/admissionNumber');
const logger = require('../utils/logger');

// GET /api/students
const getStudents = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      class: classId,
      status = 'active',
      search,
      gender,
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    
    if (req.user && req.user.role === 'teacher') {
      const { getTeacherClasses } = require('../utils/authHelpers');
      const allowedClassIds = await getTeacherClasses(req.user.id, req.user.refStaff);
      if (classId) {
        if (!allowedClassIds.includes(classId.toString())) {
          filter.currentClass = null; // No access
        } else {
          filter.currentClass = classId;
        }
      } else {
        filter.currentClass = { $in: allowedClassIds };
      }
    } else {
      if (classId) filter.currentClass = classId;
    }
    if (gender) filter.gender = gender;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { admissionNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [students, total] = await Promise.all([
      Student.find(filter)
        .populate('currentClass', 'name level')
        .populate({ path: 'currentClass', populate: { path: 'level', select: 'displayName category' } })
        .sort({ lastName: 1, firstName: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-documents'),
      Student.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: students,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/students
const createStudent = async (req, res, next) => {
  try {
    const { guardian: guardianData, ...studentData } = req.body;

    const admissionNumber = await generateAdmissionNumber();

    // Map validator field names to model field names
    const student = await Student.create({
      ...studentData,
      admissionNumber,
      currentClass: studentData.currentClass || null,
    });

    // Create guardian if provided
    if (guardianData) {
      const guardian = await Guardian.create({
        ...guardianData,
        students: [student._id],
        consentDataProcessing: {
          granted: guardianData.consentDataProcessing?.granted || false,
          grantedAt: guardianData.consentDataProcessing?.granted ? new Date() : null,
        },
      });
      student.guardians = [guardian._id];
      await student.save();
    }

    const populated = await Student.findById(student._id)
      .populate('currentClass', 'name')
      .populate('guardians', 'firstName lastName phone relationship');

    logger.info(`New student admitted: ${student.admissionNumber}`);

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// GET /api/students/:id
const getStudentById = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate({ path: 'currentClass', populate: { path: 'level', select: 'displayName category' } })
      .populate('guardians');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (req.user && req.user.role === 'teacher') {
      const { getTeacherClasses } = require('../utils/authHelpers');
      const allowedClassIds = await getTeacherClasses(req.user.id, req.user.refStaff);
      const studentClassId = student.currentClass ? student.currentClass._id.toString() : null;
      if (!studentClassId || !allowedClassIds.includes(studentClassId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You do not have permission to view this student',
        });
      }
    }

    res.json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/students/:id
const updateStudent = async (req, res, next) => {
  try {
    const { guardian: guardianData, ...updateData } = req.body;

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('currentClass', 'name').populate('guardians');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

// POST /api/students/:id/withdraw
const withdrawStudent = async (req, res, next) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'withdrawn' } },
      { new: true }
    );
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    res.json({ success: true, data: student, message: 'Student withdrawn successfully' });
  } catch (error) {
    next(error);
  }
};

// POST /api/students/:id/promote — stub (Phase 1 basic version)
const promoteStudent = async (req, res, next) => {
  try {
    const { newClassId } = req.body;
    if (!newClassId) {
      return res.status(400).json({ success: false, message: 'newClassId is required' });
    }
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { $set: { currentClass: newClassId } },
      { new: true }
    ).populate('currentClass', 'name');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    res.json({ success: true, data: student, message: 'Student promoted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStudents, createStudent, getStudentById, updateStudent, withdrawStudent, promoteStudent };
