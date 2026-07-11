/**
 * mockExam.routes.js
 *
 * All routes under /api/mock-exams
 * Auth: protect (JWT) on all routes
 * RBAC enforced inside the controller per endpoint
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createSeries,
  listSeries,
  closeSeries,
  getMyEntries,
  getEntryScores,
  saveScores,
  submitEntry,
  reopenEntry,
  getSubmissionMatrix,
  getStudentResult,
  getRankings,
  getStudentTrend,
  generateSingleSlip,
  generateClassSlips,
  getClassGradesGrid,
} = require('../controllers/mockExam.controller');

// All routes require a valid JWT
router.use(protect);

/* ── Series management (admin / head teacher only, enforced in controller) ── */
router.post('/series', createSeries);
router.get('/series', listSeries);
router.patch('/series/:id/close', closeSeries);

/* ── Teacher entry flow ── */
// List teacher's JHS 3 subject/class combos for a series
router.get('/:seriesId/my-entries', getMyEntries);

// Load score grid (GET with entryId="new" for first-time, or existing entryId)
router.get('/:seriesId/entries/:entryId/scores', getEntryScores);

// Bulk save scores (draft)
router.post('/:seriesId/entries/:entryId/scores', saveScores);

// Teacher finalises (submit) — locks grid
router.patch('/:seriesId/entries/:entryId/submit', submitEntry);

// Admin/HT reopens a submitted entry — logged at severity:sensitive
router.patch('/:seriesId/entries/:entryId/reopen', reopenEntry);

/* ── Admin / Head Teacher panel ── */
// Submission status matrix (all subjects × all JHS 3 classes)
router.get('/:seriesId/matrix', getSubmissionMatrix);

// Full student result card + aggregate
router.get('/:seriesId/students/:studentId', getStudentResult);

// Rankings (class + cohort)
router.get('/:seriesId/rankings', getRankings);

// Cross-series trend for a student
router.get('/:seriesId/trend/:studentId', getStudentTrend);

// Class scores sheet grid view for Admin/HT
router.get('/:seriesId/classes/:classId/grades-grid', getClassGradesGrid);

/* ── PDF generation ── */
// Single student slip
router.post('/:seriesId/students/:studentId/slip', generateSingleSlip);

// Bulk class slips (zip)
router.post('/:seriesId/classes/:classId/slips', generateClassSlips);

module.exports = router;
