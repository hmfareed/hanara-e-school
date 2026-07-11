const DailyFeeRegister = require('../models/DailyFeeRegister');
const Student = require('../models/Student');
const Class = require('../models/Class');
const logger = require('../utils/logger');

// GET /api/fees/daily-register
const getDailyRegister = async (req, res, next) => {
  try {
    const { classId, date } = req.query;
    if (!classId || !date) {
      return res.status(400).json({ success: false, message: 'classId and date are required' });
    }

    const searchDate = new Date(date);
    searchDate.setUTCHours(0, 0, 0, 0);

    const existing = await DailyFeeRegister.findOne({
      class: classId,
      date: searchDate,
    }).populate('records.student', 'firstName lastName otherNames admissionNumber transport');

    if (existing) {
      return res.json({ success: true, data: existing, exists: true });
    }

    // Default template with all active students in class
    const students = await Student.find({ currentClass: classId, status: 'active' })
      .select('firstName lastName otherNames admissionNumber transport')
      .sort({ lastName: 1, firstName: 1 });

    const records = students.map((student) => ({
      student: {
        _id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        otherNames: student.otherNames,
        admissionNumber: student.admissionNumber,
        transport: student.transport,
      },
      status: 'unpaid',
      amountPaid: 0,
    }));

    res.json({
      success: true,
      data: {
        date: searchDate,
        class: classId,
        records,
      },
      exists: false,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/fees/daily-register
const submitDailyRegister = async (req, res, next) => {
  try {
    const { classId, date, records } = req.body;
    if (!classId || !date || !records || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    const saveDate = new Date(date);
    saveDate.setUTCHours(0, 0, 0, 0);

    const targetClass = await Class.findById(classId);
    if (!targetClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // RBAC: Class Teachers can only submit for their assigned class
    const isTeacher = req.user.role === 'teacher' || (req.user.role === 'system_admin' && req.user.secondaryCapacities?.includes('teacher'));
    const isClassTeacher =
      targetClass.classTeacher &&
      targetClass.classTeacher.toString() === req.user.refStaff?.toString();

    if (isTeacher && !isClassTeacher) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not the class teacher for this class',
      });
    }

    const processedRecords = records.map((rec) => {
      let amountPaid = 0;
      if (rec.status === 'both') amountPaid = 9;
      else if (rec.status === 'feeding') amountPaid = 4;

      return {
        student: rec.student,
        status: rec.status,
        amountPaid,
      };
    });

    const register = await DailyFeeRegister.findOneAndUpdate(
      { class: classId, date: saveDate },
      {
        $set: {
          records: processedRecords,
          recordedBy: req.user.id,
        },
      },
      { upsert: true, new: true, runValidators: true }
    ).populate('records.student', 'firstName lastName admissionNumber');

    logger.info(
      `Daily fee register saved for class ${targetClass.name} on ${saveDate.toISOString().split('T')[0]}`
    );
    res.json({ success: true, data: register });
  } catch (error) {
    next(error);
  }
};

// GET /api/fees/daily-register/summary (Accountant report)
const getDailyFeeSummary = async (req, res, next) => {
  try {
    const { startDate, endDate, classId } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        filter.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    } else {
      // Default to today
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setUTCHours(23, 59, 59, 999);
      filter.date = { $gte: todayStart, $lte: todayEnd };
    }

    if (classId) {
      filter.class = classId;
    }

    const registers = await DailyFeeRegister.find(filter)
      .populate('class', 'name')
      .populate('records.student', 'firstName lastName admissionNumber currentClass')
      .populate({ path: 'records.student', populate: { path: 'currentClass', select: 'name' } });

    let totalCollected = 0;
    let feedingTotal = 0;
    let busTotal = 0;
    const unpaidStudents = [];
    const classSummaries = {};

    registers.forEach((reg) => {
      const className = reg.class?.name || 'Unknown Class';
      if (!classSummaries[className]) {
        classSummaries[className] = {
          classId: reg.class?._id,
          total: 0,
          feeding: 0,
          bus: 0,
          unpaidCount: 0,
          presentCount: 0,
        };
      }

      reg.records.forEach((rec) => {
        let amount = 0;
        let feedAmount = 0;
        let busAmount = 0;

        if (rec.status === 'both') {
          amount = 9;
          feedAmount = 4;
          busAmount = 5;
          classSummaries[className].presentCount++;
        } else if (rec.status === 'feeding') {
          amount = 4;
          feedAmount = 4;
          classSummaries[className].presentCount++;
        } else if (rec.status === 'unpaid') {
          classSummaries[className].unpaidCount++;
          classSummaries[className].presentCount++;
          unpaidStudents.push({
            studentId: rec.student?._id,
            fullName: rec.student ? `${rec.student.firstName} ${rec.student.lastName}` : 'Unknown Student',
            admissionNumber: rec.student?.admissionNumber || 'N/A',
            class: className,
            date: reg.date,
          });
        }

        totalCollected += amount;
        feedingTotal += feedAmount;
        busTotal += busAmount;

        classSummaries[className].total += amount;
        classSummaries[className].feeding += feedAmount;
        classSummaries[className].bus += busAmount;
      });
    });

    res.json({
      success: true,
      data: {
        totals: {
          totalCollected,
          feedingTotal,
          busTotal,
          unpaidCount: unpaidStudents.length,
        },
        classSummaries: Object.keys(classSummaries).map((name) => ({
          className: name,
          ...classSummaries[name],
        })),
        unpaidStudents,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDailyRegister,
  submitDailyRegister,
  getDailyFeeSummary,
};
