const express = require('express');
const router = express.Router();
const { login, refresh, logout, getMe, registerTeacher } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { loginSchema, refreshSchema } = require('../validators/auth.validators');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', validate(refreshSchema), refresh);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.post('/register-teacher', authLimiter, registerTeacher);

module.exports = router;
