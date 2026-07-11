const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const {
  listCandidates,
  registerCandidate,
  updateCandidate,
  removeMockResult,
  getAggregate,
} = require('../controllers/bece.controller');

// GET /api/bece-candidates - list all JHS 3 candidate registration statuses
router.get('/', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), listCandidates);

// POST /api/bece-candidates/:studentId - register student as BECE candidate
router.post('/:studentId', protect, authorize('superadmin', 'admin'), registerCandidate);

// PATCH /api/bece-candidates/:candidateId - update candidate details or append mock result
router.patch('/:candidateId', protect, authorize('superadmin', 'admin'), updateCandidate);

// DELETE /api/bece-candidates/:candidateId/mock/:index - remove mock result from candidate
router.delete('/:candidateId/mock/:index', protect, authorize('superadmin', 'admin'), removeMockResult);

// GET /api/bece-candidates/student/:studentId/aggregate - get student's computed BECE aggregate
router.get('/student/:studentId/aggregate', protect, authorize('superadmin', 'admin', 'teacher', 'system_admin'), getAggregate);

module.exports = router;
