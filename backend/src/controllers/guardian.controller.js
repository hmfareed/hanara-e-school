const Guardian = require('../models/Guardian');
const Student = require('../models/Student');

// GET /api/guardians/:id
const getGuardianById = async (req, res, next) => {
  try {
    const guardian = await Guardian.findById(req.params.id)
      .populate('students', 'firstName lastName admissionNumber currentClass');
    if (!guardian) {
      return res.status(404).json({ success: false, message: 'Guardian not found' });
    }
    res.json({ success: true, data: guardian });
  } catch (error) {
    next(error);
  }
};

// POST /api/guardians
const createGuardian = async (req, res, next) => {
  try {
    const guardian = await Guardian.create(req.body);
    res.status(201).json({ success: true, data: guardian });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/guardians/:id
const updateGuardian = async (req, res, next) => {
  try {
    const guardian = await Guardian.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!guardian) {
      return res.status(404).json({ success: false, message: 'Guardian not found' });
    }
    res.json({ success: true, data: guardian });
  } catch (error) {
    next(error);
  }
};

// GET /api/guardians/:id/students
const getGuardianStudents = async (req, res, next) => {
  try {
    const guardian = await Guardian.findById(req.params.id);
    if (!guardian) {
      return res.status(404).json({ success: false, message: 'Guardian not found' });
    }
    const students = await Student.find({ _id: { $in: guardian.students } })
      .populate('currentClass', 'name');
    res.json({ success: true, data: students });
  } catch (error) {
    next(error);
  }
};

module.exports = { getGuardianById, createGuardian, updateGuardian, getGuardianStudents };
