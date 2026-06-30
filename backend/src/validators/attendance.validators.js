const { z } = require('zod');

const attendanceEntrySchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  status: z.enum(['present', 'absent', 'late', 'excused']),
  notes: z.string().optional().default(''),
});

const bulkAttendanceSchema = z.object({
  classId: z.string().min(1, 'Class ID is required'),
  date: z.string().datetime({ message: 'Valid date required (ISO 8601)' }),
  termId: z.string().optional().nullable(),
  records: z.array(attendanceEntrySchema).min(1, 'At least one attendance record is required'),
});

module.exports = { bulkAttendanceSchema };
