const SmsLog = require('../models/SmsLog');
const Student = require('../models/Student');
const Guardian = require('../models/Guardian');
const { sendSms } = require('../services/sms.service');
const logger = require('../utils/logger');

// POST /api/sms/broadcast
const broadcastSms = async (req, res, next) => {
  try {
    const { targets, classId, message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    let guardians = [];

    if (targets === 'class') {
      if (!classId) {
        return res.status(400).json({ success: false, message: 'classId is required for class target' });
      }
      // Get all active students in class
      const students = await Student.find({ currentClass: classId, status: 'active' }).populate('guardians');
      // Collect unique guardians
      const guardianMap = new Map();
      students.forEach((student) => {
        student.guardians.forEach((g) => {
          guardianMap.set(g._id.toString(), g);
        });
      });
      guardians = Array.from(guardianMap.values());
    } else {
      // Broadcast to all active guardians
      guardians = await Guardian.find({});
    }

    if (guardians.length === 0) {
      return res.status(400).json({ success: false, message: 'No guardians found to send broadcast to' });
    }

    const results = { sent: 0, failed: 0 };

    // Broadcast messages (can be async / background or inline for simplicity)
    for (const guardian of guardians) {
      if (!guardian.phone) continue;
      try {
        const resSms = await sendSms({
          recipient: guardian.phone,
          message,
          type: 'broadcast',
          sentBy: req.user.id,
        });
        if (resSms.success) {
          results.sent++;
        } else {
          results.failed++;
        }
      } catch (err) {
        results.failed++;
        logger.error(`Broadcast error to ${guardian.phone}: ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: `Broadcast complete. Sent: ${results.sent}, Failed: ${results.failed}`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/sms/logs
const getSmsLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, type, recipient } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (recipient) filter.recipient = { $regex: recipient, $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      SmsLog.find(filter)
        .populate('sentBy', 'email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      SmsLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: logs,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/sms/stats
const getSmsStats = async (req, res, next) => {
  try {
    const stats = await SmsLog.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const typeStats = await SmsLog.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ]);

    const statsMap = stats.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, { sent: 0, failed: 0, pending: 0 });

    res.json({
      success: true,
      data: {
        status: statsMap,
        types: typeStats.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  broadcastSms,
  getSmsLogs,
  getSmsStats,
};
