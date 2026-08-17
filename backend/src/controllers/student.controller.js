const Student = require('../models/Student');
const Guardian = require('../models/Guardian');
const Class = require('../models/Class');
const ClassLevel = require('../models/ClassLevel');
const Bus = require('../models/Bus');
const { generateAdmissionNumber } = require('../utils/admissionNumber');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

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
      minAge,
      maxAge,
    } = req.query;

    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (req.user && (req.user.role === 'teacher' || (req.user.role === 'system_admin' && req.user.secondaryCapacities?.includes('teacher')))) {
      const { getTeacherClasses } = require('../utils/authHelpers');
      const allowedClassIds = await getTeacherClasses(req.user.id, req.user.refStaff);
      const allowedClassObjectIds = allowedClassIds.map((id) => {
        try {
          return new mongoose.Types.ObjectId(id.toString());
        } catch (e) {
          return id;
        }
      });
      if (classId) {
        if (!allowedClassIds.includes(classId.toString())) {
          filter.currentClass = null; // No access
        } else {
          try {
            filter.currentClass = new mongoose.Types.ObjectId(classId.toString());
          } catch (e) {
            filter.currentClass = classId;
          }
        }
      } else {
        filter.currentClass = { $in: allowedClassObjectIds };
      }
    } else {
      if (classId) {
        try {
          filter.currentClass = new mongoose.Types.ObjectId(classId.toString());
        } catch (e) {
          filter.currentClass = classId;
        }
      }
    }
    if (gender) filter.gender = gender;
    
    // Age filtering based on dob (Date of Birth)
    if (minAge || maxAge) {
      const now = new Date();
      filter.dob = {};
      
      if (maxAge) {
        // Upper bound for age means lower bound for dob (born at least maxAge years ago, but not more than maxAge+1)
        const minDob = new Date(now.getFullYear() - parseInt(maxAge) - 1, now.getMonth(), now.getDate() + 1);
        filter.dob.$gte = minDob;
      }
      
      if (minAge) {
        // Lower bound for age means upper bound for dob (born at most minAge years ago)
        const maxDob = new Date(now.getFullYear() - parseInt(minAge), now.getMonth(), now.getDate());
        filter.dob.$lte = maxDob;
      }
    }

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { otherNames: { $regex: search, $options: 'i' } },
        { admissionNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [students, total, maleTotal, femaleTotal] = await Promise.all([
      Student.find(filter)
        .populate('currentClass', 'name level')
        .populate({ path: 'currentClass', populate: { path: 'level', select: 'displayName category' } })
        .populate('transport.bus')
        .sort({ lastName: 1, firstName: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-documents'),
      Student.countDocuments(filter),
      Student.countDocuments({ ...filter, gender: 'male' }),
      Student.countDocuments({ ...filter, gender: 'female' }),
    ]);

    res.json({
      success: true,
      data: students,
      meta: {
        total,
        maleTotal,
        femaleTotal,
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
      .populate('guardians')
      .populate({ path: 'transport.bus', populate: { path: 'route' } });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (req.user && (req.user.role === 'teacher' || (req.user.role === 'system_admin' && req.user.secondaryCapacities?.includes('teacher')))) {
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
    const existingStudent = await Student.findById(req.params.id);
    if (!existingStudent) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (req.user && (req.user.role === 'teacher' || (req.user.role === 'system_admin' && req.user.secondaryCapacities?.includes('teacher')))) {
      const { getTeacherClasses } = require('../utils/authHelpers');
      const allowedClassIds = await getTeacherClasses(req.user.id, req.user.refStaff);
      const studentClassId = existingStudent.currentClass ? existingStudent.currentClass.toString() : null;
      if (!studentClassId || !allowedClassIds.includes(studentClassId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You do not have permission to update this student',
        });
      }
    }

    const { guardian: guardianData, ...updateData } = req.body;

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('currentClass', 'name')
      .populate('guardians')
      .populate({ path: 'transport.bus', populate: { path: 'route' } });

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

// POST /api/students/bulk
const createStudentsBulk = async (req, res, next) => {
  try {
    const studentsArray = req.body;
    if (!Array.isArray(studentsArray) || studentsArray.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid payload: expected an array of students' });
    }

    const AcademicYear = require('../models/AcademicYear');
    const Class = require('../models/Class');
    const mongoose = require('mongoose');

    // 1. Get active academic year
    const activeYear = await AcademicYear.findOne({ isCurrent: true });
    if (!activeYear) {
      return res.status(400).json({ success: false, message: 'No active academic year found. Please configure one first.' });
    }

    // 2. Fetch and pre-cache classes for active academic year
    const classes = await Class.find({ academicYear: activeYear._id });
    const classMap = new Map();
    classes.forEach(c => {
      classMap.set(c.name.trim().toLowerCase(), c._id);
    });

    // 3. Determine base sequence number for admission number generation
    const year = new Date().getFullYear();
    const prefix = `HNRA/${year}/`;
    const lastStudent = await Student.findOne(
      { admissionNumber: { $regex: `^${prefix}` } },
      { admissionNumber: 1 },
      { sort: { admissionNumber: -1 } }
    );

    let currentSeq = 0;
    if (lastStudent) {
      const parts = lastStudent.admissionNumber.split('/');
      if (parts[2]) {
        currentSeq = parseInt(parts[2], 10);
      }
    }

    // 4. Pre-fetch existing guardians by phone number to handle siblings/duplications
    const uniquePhones = [...new Set(studentsArray
      .map(s => s.guardian?.phone)
      .filter(phone => typeof phone === 'string' && phone.trim().length >= 10)
      .map(p => p.trim())
    )];

    const existingGuardians = await Guardian.find({ phone: { $in: uniquePhones } });
    const guardianMap = new Map();
    existingGuardians.forEach(g => {
      guardianMap.set(g.phone.trim(), g);
    });

    const newGuardianMap = new Map();

    const studentsToInsert = [];
    const guardiansToInsert = [];
    const guardiansToUpdate = [];

    // 5. Process each student row
    for (let i = 0; i < studentsArray.length; i++) {
      const row = studentsArray[i];
      const studentId = new mongoose.Types.ObjectId();

      // Map className to classId
      let classId = null;
      if (row.className) {
        const normalizedClassName = row.className.trim().toLowerCase();
        classId = classMap.get(normalizedClassName) || null;
      }

      // Generate next admission number
      currentSeq++;
      const admissionNumber = `${prefix}${String(currentSeq).padStart(4, '0')}`;

      const studentGuardians = [];

      // Process guardian if provided
      if (row.guardian && row.guardian.phone) {
        const phoneKey = row.guardian.phone.trim();
        let guardianDoc = guardianMap.get(phoneKey) || newGuardianMap.get(phoneKey);

        if (guardianDoc) {
          studentGuardians.push(guardianDoc._id);
          guardianDoc.students.push(studentId);
          if (!newGuardianMap.has(phoneKey) && !guardiansToUpdate.includes(guardianDoc)) {
            guardiansToUpdate.push(guardianDoc);
          }
        } else {
          const guardianId = new mongoose.Types.ObjectId();
          const newGuardian = new Guardian({
            _id: guardianId,
            firstName: row.guardian.firstName || '',
            lastName: row.guardian.lastName || '',
            relationship: row.guardian.relationship || 'guardian',
            phone: phoneKey,
            altPhone: row.guardian.altPhone || '',
            email: row.guardian.email || '',
            occupation: row.guardian.occupation || '',
            address: row.guardian.address || '',
            students: [studentId],
            consentDataProcessing: {
              granted: row.guardian.consentDataProcessing?.granted ?? true,
              grantedAt: (row.guardian.consentDataProcessing?.granted ?? true) ? new Date() : null,
            }
          });
          
          studentGuardians.push(guardianId);
          newGuardianMap.set(phoneKey, newGuardian);
          guardiansToInsert.push(newGuardian);
        }
      }

      const studentDoc = {
        _id: studentId,
        admissionNumber,
        firstName: row.firstName || '',
        lastName: row.lastName || '',
        otherNames: row.otherNames || '',
        gender: row.gender || 'male',
        dob: row.dob ? new Date(row.dob) : new Date(),
        currentClass: classId,
        guardians: studentGuardians,
        medicalNotes: row.medicalNotes || '',
        enrollmentDate: row.enrollmentDate ? new Date(row.enrollmentDate) : new Date(),
        status: 'active',
        transport: {
          usesBus: row.transport?.usesBus || false,
          bus: row.transport?.bus || null,
          stop: row.transport?.stop || '',
        }
      };

      studentsToInsert.push(studentDoc);
    }

    // 6. Bulk database operations
    if (studentsToInsert.length > 0) {
      await Student.insertMany(studentsToInsert);
    }
    if (guardiansToInsert.length > 0) {
      await Guardian.insertMany(guardiansToInsert);
    }
    if (guardiansToUpdate.length > 0) {
      await Promise.all(guardiansToUpdate.map(g => g.save()));
    }

    logger.info(`Bulk student import successful. Created ${studentsToInsert.length} students, created ${guardiansToInsert.length} new guardians, linked ${guardiansToUpdate.length} existing guardians.`);

    res.status(201).json({
      success: true,
      message: `Successfully imported ${studentsToInsert.length} students.`,
      data: {
        studentsCount: studentsToInsert.length,
        newGuardiansCount: guardiansToInsert.length,
        linkedGuardiansCount: guardiansToUpdate.length,
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/students/promote-batch (Batch Student Promotion & Graduation)
const promoteBatchStudents = async (req, res, next) => {
  try {
    const { studentIds, action, targetClassId } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'studentIds array is required' });
    }

    if (!action || !['promote', 'repeat', 'graduate'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Valid action (promote, repeat, graduate) is required' });
    }

    if (action === 'promote' && !targetClassId) {
      return res.status(400).json({ success: false, message: 'targetClassId is required when action is promote' });
    }

    let updatePayload = {};
    if (action === 'promote') {
      updatePayload = { currentClass: targetClassId, status: 'active' };
    } else if (action === 'graduate') {
      updatePayload = { status: 'graduated' };
    } else if (action === 'repeat') {
      updatePayload = { status: 'active' };
    }

    const updateResult = await Student.updateMany(
      { _id: { $in: studentIds } },
      { $set: updatePayload }
    );

    logger.info(`Batch student action [${action}] executed on ${updateResult.modifiedCount || updateResult.nModified || 0} students.`);

    res.json({
      success: true,
      message: `Batch transition [${action}] executed successfully. Updated ${updateResult.modifiedCount || updateResult.nModified || 0} students.`,
      data: {
        modifiedCount: updateResult.modifiedCount || updateResult.nModified || 0,
        action,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudents,
  createStudent,
  createStudentsBulk,
  getStudentById,
  updateStudent,
  withdrawStudent,
  promoteStudent,
  promoteBatchStudents,
};
