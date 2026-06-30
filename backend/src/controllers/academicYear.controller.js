const AcademicYear = require('../models/AcademicYear');
const logger = require('../utils/logger');

// GET /api/academic-years
const listAcademicYears = async (req, res, next) => {
  try {
    const years = await AcademicYear.find().sort({ createdAt: -1 });
    res.json({ success: true, data: years });
  } catch (error) {
    next(error);
  }
};

// GET /api/academic-years/:id
const getAcademicYearById = async (req, res, next) => {
  try {
    const year = await AcademicYear.findById(req.params.id);
    if (!year) {
      return res.status(404).json({ success: false, message: 'Academic year not found' });
    }
    res.json({ success: true, data: year });
  } catch (error) {
    next(error);
  }
};

// POST /api/academic-years
const createAcademicYear = async (req, res, next) => {
  try {
    const { name, terms, isCurrent } = req.body;
    const year = await AcademicYear.create({ name, terms, isCurrent: isCurrent || false });
    logger.info(`Academic year created: ${year.name}`);
    res.status(201).json({ success: true, data: year });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/academic-years/:id
const updateAcademicYear = async (req, res, next) => {
  try {
    const { name, terms } = req.body;
    const year = await AcademicYear.findById(req.params.id);
    if (!year) {
      return res.status(404).json({ success: false, message: 'Academic year not found' });
    }
    if (name !== undefined) year.name = name;
    if (terms !== undefined) year.terms = terms;
    await year.save();
    logger.info(`Academic year updated: ${year.name}`);
    res.json({ success: true, data: year });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/academic-years/:id/set-current
const setCurrentYear = async (req, res, next) => {
  try {
    const year = await AcademicYear.findById(req.params.id);
    if (!year) {
      return res.status(404).json({ success: false, message: 'Academic year not found' });
    }
    year.isCurrent = true;
    await year.save(); // pre-save hook clears isCurrent on all others
    logger.info(`Current academic year set to: ${year.name}`);
    res.json({ success: true, data: year, message: `${year.name} is now the current academic year` });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/academic-years/:id
const deleteAcademicYear = async (req, res, next) => {
  try {
    const year = await AcademicYear.findById(req.params.id);
    if (!year) {
      return res.status(404).json({ success: false, message: 'Academic year not found' });
    }
    if (year.isCurrent) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the currently active academic year. Set another year as current first.',
      });
    }
    await year.deleteOne();
    logger.info(`Academic year deleted: ${year.name}`);
    res.json({ success: true, message: `Academic year "${year.name}" deleted successfully` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listAcademicYears,
  getAcademicYearById,
  createAcademicYear,
  updateAcademicYear,
  setCurrentYear,
  deleteAcademicYear,
};


