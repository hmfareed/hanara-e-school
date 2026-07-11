const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const studentRoutes = require('./routes/student.routes');
const guardianRoutes = require('./routes/guardian.routes');
const staffRoutes = require('./routes/staff.routes');
const classRoutes = require('./routes/class.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const academicYearRoutes = require('./routes/academicYear.routes');
const feeRoutes = require('./routes/fee.routes');
const smsRoutes = require('./routes/sms.routes');
const parentRoutes = require('./routes/parent.routes');
const momoRoutes = require('./routes/momo.routes');
const assignmentRoutes = require('./routes/assignment.routes');
const teacherRoutes = require('./routes/teacher.routes');
const gradeRoutes = require('./routes/grade.routes');
const settingsRoutes = require('./routes/settings.routes');
const transportRoutes = require('./routes/transport.routes');
const dailyFeeRoutes = require('./routes/dailyFee.routes');
const beceRoutes = require('./routes/bece.routes');
const gradingScaleRoutes = require('./routes/gradingScale.routes');
const adminRoutes = require('./routes/admin.routes');
const mockExamRoutes = require('./routes/mockExam.routes');

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration - support localhost:5173 for Vite dev server
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Logging middleware using winston stream
app.use(
  morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

// Parse JSON and URL-encoded request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser for refresh token cookie
app.use(cookieParser());

// Apply general rate limit to all routes
app.use('/api', generalLimiter);

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/guardians', guardianRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/academic-years', academicYearRoutes);
app.use('/api/fees/payments/momo', momoRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/fees/daily-register', dailyFeeRoutes);
app.use('/api/bece-candidates', beceRoutes);
app.use('/api/grading-scales', gradingScaleRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/mock-exams', mockExamRoutes);




// Fallback for 404
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
