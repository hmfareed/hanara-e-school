const { z } = require('zod');

const createClassSchema = z.object({
  levelId: z.string().min(1, 'Level ID is required'),
  name: z.string().min(1, 'Class name is required'),
  academicYearId: z.string().min(1, 'Academic year ID is required'),
  classTeacherId: z.string().optional().nullable(),
  capacity: z.number().int().positive().default(40),
});

const createSubjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required'),
  code: z.string().min(1, 'Subject code is required'),
  appliesToLevels: z.array(z.string()).optional().default([]),
  type: z.enum(['subject', 'strand']).default('subject'),
});

const createAssignmentSchema = z.object({
  classId: z.string().min(1, 'Class ID is required'),
  subjectId: z.string().min(1, 'Subject ID is required'),
  teacherId: z.string().min(1, 'Teacher ID is required'),
  academicYearId: z.string().min(1, 'Academic year ID is required'),
});

module.exports = { createClassSchema, createSubjectSchema, createAssignmentSchema };
