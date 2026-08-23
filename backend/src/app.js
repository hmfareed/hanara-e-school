const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const idempotency = require('./middleware/idempotency');

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
const offlineAssignmentRoutes = require('./routes/offlineAssignment.routes');
const lessonPlanRoutes = require('./routes/lessonPlan.routes');
const behaviourRoutes = require('./routes/behaviour.routes');
const learningResourceRoutes = require('./routes/learningResource.routes');
const teacherMessageRoutes = require('./routes/teacherMessage.routes');
const payrollRoutes = require('./routes/payroll.routes');
const storeRoutes = require('./routes/store.routes');
const syncRoutes = require('./routes/sync.routes');
const staffAttendanceRoutes = require('./routes/staffAttendance.routes');
const idCardsRoutes = require('./routes/idCards.routes');
const reportCardRoutes = require('./routes/reportCard.routes');
const timetableRoutes = require('./routes/timetable.routes');
const notificationRoutes = require('./routes/notification.routes');

const app = express();

// Security HTTP headers
app.use(helmet());

const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean);

// CORS configuration - support localhost/127.0.0.1 and configured client origins
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Active-Mode',
      'x-active-mode',
      'X-Idempotency-Key',
      'x-idempotency-key',
      'X-Kiosk-Device-Token',
      'x-kiosk-device-token',
      'X-Requested-With',
      'x-requested-with',
      'Accept',
      'Origin',
    ],
  })
);

// Logging middleware using winston stream
app.use(
  morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

// Parse JSON and URL-encoded request body (increase limit to 50mb for base64 photo uploads)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Cookie parser for refresh token cookie
app.use(cookieParser());

// Apply general rate limit to all routes
app.use('/api', generalLimiter);
app.use('/api', idempotency);

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
app.use('/api/teacher', teacherRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/fees/daily-register', dailyFeeRoutes);
app.use('/api/bece-candidates', beceRoutes);
app.use('/api/grading-scales', gradingScaleRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/mock-exams', mockExamRoutes);
app.use('/api/offline-assignments', offlineAssignmentRoutes);
app.use('/api/lesson-plans', lessonPlanRoutes);
app.use('/api/behaviour-records', behaviourRoutes);
app.use('/api/learning-resources', learningResourceRoutes);
app.use('/api/teacher-messages', teacherMessageRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/notices', require('./routes/notice.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));
app.use('/api/parent-queries', require('./routes/parentQuery.routes'));
app.use('/api/sync', syncRoutes);
app.use('/api/staff-attendance', staffAttendanceRoutes);
app.use('/api/id-cards', idCardsRoutes);
app.use('/api/gate-scanner', idCardsRoutes);
app.use('/api/reports', reportCardRoutes);
app.use('/api/timetables', timetableRoutes);
app.use('/api/notifications', notificationRoutes);




// Fallback for 404
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
