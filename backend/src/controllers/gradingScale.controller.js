/**
 * gradingScale.controller.js
 *
 * Controller for managing grading scales (Nursery, KG, Primary, JHS).
 */

const gradingService = require('../services/grading.service');
const { logAction } = require('../middleware/audit');

// GET /api/grading-scales
const getGradingScales = async (req, res, next) => {
  try {
    // Seed default grading scales if they don't exist
    await gradingService.seedDefaultGradingScales();

    const scales = await gradingService.getAllScales();
    res.json({ success: true, data: scales });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/grading-scales/:levelCategory
const updateGradingScale = async (req, res, next) => {
  try {
    const { levelCategory } = req.params;
    const updates = req.body;

    const before = await gradingService.loadConfig(levelCategory);
    const updatedScale = await gradingService.upsertScale(levelCategory, updates);

    await logAction(
      req,
      'UPDATE_GRADING_SCALE',
      'GradingScaleConfig',
      updatedScale._id,
      before,
      updatedScale.toObject ? updatedScale.toObject() : updatedScale
    );

    res.json({ success: true, data: updatedScale });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGradingScales,
  updateGradingScale,
};
