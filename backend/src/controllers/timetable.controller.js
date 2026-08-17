const Timetable = require('../models/Timetable');
const Class = require('../models/Class');
const User = require('../models/User');
const Staff = require('../models/Staff');
const AcademicYear = require('../models/AcademicYear');
const logger = require('../utils/logger');

// Helper to convert time strings (e.g. "08:00 AM", "8:00", "08:00", "1:30 PM", "13:30") to minutes from midnight
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const s = timeStr.trim();
  const isPM = /pm/i.test(s);
  const isAM = /am/i.test(s);
  const clean = s.replace(/(am|pm)/i, '').trim();
  const parts = clean.split(':');
  if (parts.length < 2) return null;

  let hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes)) return null;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

// Check if two time intervals overlap
const doIntervalsOverlap = (startA, endA, startB, endB) => {
  const sA = parseTimeToMinutes(startA);
  const eA = parseTimeToMinutes(endA);
  const sB = parseTimeToMinutes(startB);
  const eB = parseTimeToMinutes(endB);

  if (sA === null || eA === null || sB === null || eB === null) return false;
  return sA < eB && sB < eA;
};

// Clash analysis function
const detectClashes = async ({
  day,
  startTime,
  endTime,
  teacherId,
  classId,
  room,
  academicYear,
  excludeSlotId = null,
}) => {
  const query = { day };
  if (academicYear) query.academicYear = academicYear;
  if (excludeSlotId) query._id = { $ne: excludeSlotId };

  const existingSlots = await Timetable.find(query)
    .populate('class', 'name')
    .populate('teacher', 'firstName lastName email')
    .lean();

  const clashes = [];

  for (const slot of existingSlots) {
    if (doIntervalsOverlap(startTime, endTime, slot.startTime, slot.endTime)) {
      // 1. Teacher Clash
      if (
        teacherId &&
        slot.teacher &&
        slot.teacher._id.toString() === teacherId.toString() &&
        slot.class?._id.toString() !== classId?.toString()
      ) {
        clashes.push({
          type: 'teacher_conflict',
          message: `Teacher ${slot.teacher.firstName || ''} ${slot.teacher.lastName || ''} is already scheduled in ${slot.class?.name || 'another class'} (${slot.startTime} - ${slot.endTime})`,
          conflictingSlot: slot,
        });
      }

      // 2. Room Clash
      if (
        room &&
        slot.room &&
        slot.room.toLowerCase().trim() === room.toLowerCase().trim() &&
        slot.class?._id.toString() !== classId?.toString()
      ) {
        clashes.push({
          type: 'room_conflict',
          message: `Room "${slot.room}" is already reserved by ${slot.class?.name || 'another class'} (${slot.startTime} - ${slot.endTime})`,
          conflictingSlot: slot,
        });
      }

      // 3. Class Overlap Clash
      if (
        classId &&
        slot.class &&
        slot.class._id.toString() === classId.toString()
      ) {
        clashes.push({
          type: 'class_overlap',
          message: `Class already has ${slot.subject} scheduled during this time slot (${slot.startTime} - ${slot.endTime})`,
          conflictingSlot: slot,
        });
      }
    }
  }

  return clashes;
};

// GET /api/timetables/master
const getMasterTimetable = async (req, res, next) => {
  try {
    const { classId, teacherId, room, day, academicYear } = req.query;

    const filter = {};
    if (classId) filter.class = classId;
    if (teacherId) filter.teacher = teacherId;
    if (room) filter.room = new RegExp(room, 'i');
    if (day && day !== 'all') filter.day = day;
    if (academicYear) filter.academicYear = academicYear;

    const slots = await Timetable.find(filter)
      .populate('class', 'name level capacity')
      .populate('teacher', 'firstName lastName email role')
      .sort({ day: 1, startTime: 1 });

    res.json({
      success: true,
      data: slots,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/timetables/check-clashes
const checkClashesEndpoint = async (req, res, next) => {
  try {
    const { day, startTime, endTime, teacherId, classId, room, academicYear, excludeSlotId } = req.body;

    if (!day || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Day, startTime, and endTime are required' });
    }

    const clashes = await detectClashes({
      day,
      startTime,
      endTime,
      teacherId,
      classId,
      room,
      academicYear,
      excludeSlotId,
    });

    res.json({
      success: true,
      hasClash: clashes.length > 0,
      clashes,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/timetables/slot
const createSlot = async (req, res, next) => {
  try {
    const {
      class: classId,
      teacher: teacherId,
      subject,
      day,
      startTime,
      endTime,
      periodType = 'lesson',
      topic = '',
      room = '',
      academicYear = '2026/2027',
      term = 1,
      allowClashOverride = false,
    } = req.body;

    if (!classId || !subject || !day || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Class, subject, day, startTime, and endTime are required.',
      });
    }

    // Check for clashes unless overridden
    const clashes = await detectClashes({
      day,
      startTime,
      endTime,
      teacherId,
      classId,
      room,
      academicYear,
    });

    if (clashes.length > 0 && !allowClashOverride) {
      return res.status(409).json({
        success: false,
        message: clashes[0].message,
        clashes,
      });
    }

    const newSlot = await Timetable.create({
      class: classId,
      teacher: teacherId || null,
      subject: subject.trim(),
      day,
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      periodType,
      topic: topic.trim(),
      room: room.trim(),
      academicYear,
      term,
    });

    const populated = await Timetable.findById(newSlot._id)
      .populate('class', 'name level')
      .populate('teacher', 'firstName lastName email');

    logger.info(`Timetable slot created for class ${classId}: ${subject} on ${day} (${startTime} - ${endTime})`);

    res.status(201).json({
      success: true,
      message: 'Timetable period created successfully',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/timetables/slot/:id
const updateSlot = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      class: classId,
      teacher: teacherId,
      subject,
      day,
      startTime,
      endTime,
      periodType,
      topic,
      room,
      academicYear,
      term,
      allowClashOverride = false,
    } = req.body;

    const existing = await Timetable.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Timetable slot not found' });
    }

    const targetDay = day || existing.day;
    const targetStart = startTime || existing.startTime;
    const targetEnd = endTime || existing.endTime;
    const targetTeacher = teacherId !== undefined ? teacherId : existing.teacher;
    const targetClass = classId || existing.class;
    const targetRoom = room !== undefined ? room : existing.room;
    const targetYear = academicYear || existing.academicYear;

    const clashes = await detectClashes({
      day: targetDay,
      startTime: targetStart,
      endTime: targetEnd,
      teacherId: targetTeacher,
      classId: targetClass,
      room: targetRoom,
      academicYear: targetYear,
      excludeSlotId: id,
    });

    if (clashes.length > 0 && !allowClashOverride) {
      return res.status(409).json({
        success: false,
        message: clashes[0].message,
        clashes,
      });
    }

    existing.class = targetClass;
    existing.teacher = targetTeacher || null;
    if (subject) existing.subject = subject.trim();
    if (day) existing.day = day;
    if (startTime) existing.startTime = startTime.trim();
    if (endTime) existing.endTime = endTime.trim();
    if (periodType) existing.periodType = periodType;
    if (topic !== undefined) existing.topic = topic.trim();
    if (room !== undefined) existing.room = room.trim();
    if (academicYear) existing.academicYear = academicYear;
    if (term) existing.term = term;

    await existing.save();

    const populated = await Timetable.findById(existing._id)
      .populate('class', 'name level')
      .populate('teacher', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Timetable slot updated successfully',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/timetables/slot/:id
const deleteSlot = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Timetable.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Timetable slot not found' });
    }
    res.json({
      success: true,
      message: 'Timetable slot deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/timetables/clone-class
const cloneClassTimetable = async (req, res, next) => {
  try {
    const { sourceClassId, targetClassId, academicYear } = req.body;

    if (!sourceClassId || !targetClassId) {
      return res.status(400).json({ success: false, message: 'sourceClassId and targetClassId are required' });
    }

    const sourceSlots = await Timetable.find({ class: sourceClassId, ...(academicYear ? { academicYear } : {}) });
    if (sourceSlots.length === 0) {
      return res.status(404).json({ success: false, message: 'No timetable slots found in source class to clone.' });
    }

    // Remove existing target class slots for that academic year
    await Timetable.deleteMany({ class: targetClassId, ...(academicYear ? { academicYear } : {}) });

    const newSlots = sourceSlots.map((s) => ({
      class: targetClassId,
      teacher: s.teacher,
      subject: s.subject,
      day: s.day,
      startTime: s.startTime,
      endTime: s.endTime,
      periodType: s.periodType,
      topic: s.topic,
      room: s.room,
      academicYear: s.academicYear,
      term: s.term,
    }));

    await Timetable.insertMany(newSlots);

    res.json({
      success: true,
      message: `Successfully cloned ${newSlots.length} timetable periods to target class.`,
      data: { count: newSlots.length },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMasterTimetable,
  checkClashesEndpoint,
  createSlot,
  updateSlot,
  deleteSlot,
  cloneClassTimetable,
};
