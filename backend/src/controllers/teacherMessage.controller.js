const TeacherMessage = require('../models/TeacherMessage');
const User = require('../models/User');
const Student = require('../models/Student');
const Guardian = require('../models/Guardian');
const { sendSms } = require('../services/sms.service');
const { getIO } = require('../services/socket.service');
const { clearDashboardCache } = require('./dashboard.controller');

// GET /api/teacher-messages/recipients
const getRecipients = async (req, res, next) => {
  try {
    // 1. Fetch admins & staff users
    const adminsAndStaff = await User.find({
      role: { $in: ['superadmin', 'admin', 'system_admin', 'teacher'] },
    }).select('email role refId');

    // 2. Fetch parents of active students
    const students = await Student.find({ status: 'active' })
      .select('firstName lastName currentClass guardians')
      .populate('guardians', 'primaryPhone primaryPhoneOwner name')
      .populate('currentClass', 'name');

    res.json({
      success: true,
      data: {
        staff: adminsAndStaff,
        students,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/teacher-messages
const sendMessage = async (req, res, next) => {
  try {
    const { recipientId, recipientRole, classId, subject, body, sendSmsAlert } = req.body;
    const senderId = req.user.id || req.user._id;

    if (!subject || !body) {
      return res.status(400).json({ success: false, message: 'Subject and message body are required' });
    }

    let smsStatus = 'none';

    // Optional SMS dispatch to recipient or class parents
    if (sendSmsAlert) {
      try {
        let recipientPhones = [];
        if (recipientId) {
          const userObj = await User.findById(recipientId).populate('refId');
          if (userObj && userObj.refId && userObj.refId.phone) {
            recipientPhones.push(userObj.refId.phone);
          }
        } else if (classId) {
          const students = await Student.find({ currentClass: classId, status: 'active' }).populate('guardians');
          students.forEach((st) => {
            st.guardians?.forEach((g) => {
              if (g.primaryPhone) recipientPhones.push(g.primaryPhone);
            });
          });
        }

        const smsMsg = `[HANARA SMS NOTICE] ${subject}: ${body.substring(0, 140)}`;
        for (const phone of recipientPhones) {
          await sendSms({
            recipient: phone,
            message: smsMsg,
            type: 'broadcast',
            sentBy: senderId,
          });
        }
        smsStatus = 'sent';

        // Clear dashboard cache & notify clients
        try {
          clearDashboardCache();
        } catch (e) {}

        try {
          const io = getIO();
          if (io) {
            io.emit('sms_broadcast_sent', {
              message: smsMsg,
              sent: recipientPhones.length,
              createdAt: new Date(),
            });
            io.emit('dashboard_summary_updated');
          }
        } catch (e) {}
      } catch (err) {
        console.error('SMS Alert send error:', err);
        smsStatus = 'failed';
      }
    }

    const message = await TeacherMessage.create({
      sender: senderId,
      recipient: recipientId || null,
      recipientRole: recipientRole || 'admin',
      class: classId || null,
      subject,
      body,
      sendSmsAlert: !!sendSmsAlert,
      smsStatus,
    });

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};

// GET /api/teacher-messages/inbox
const getInbox = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    const messages = await TeacherMessage.find({ recipient: userId })
      .populate('sender', 'email role')
      .populate('class', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};

// GET /api/teacher-messages/sent
const getSent = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    const messages = await TeacherMessage.find({ sender: userId })
      .populate('recipient', 'email role')
      .populate('class', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};

// PUT /api/teacher-messages/:id/read
const markAsRead = async (req, res, next) => {
  try {
    const message = await TeacherMessage.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    res.json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecipients,
  sendMessage,
  getInbox,
  getSent,
  markAsRead,
};
