const Notice = require('../models/Notice');
const Guardian = require('../models/Guardian');
const Staff = require('../models/Staff');
const { sendSms } = require('../services/sms.service');
const { getIO } = require('../services/socket.service');
const { clearDashboardCache } = require('./dashboard.controller');
const logger = require('../utils/logger');

// GET /api/notices
const getNotices = async (req, res, next) => {
  try {
    const { category, audience } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (audience) filter.targetAudience = { $in: [audience, 'all'] };

    // Filter by role
    if (req.user.role === 'parent') {
      filter.targetAudience = { $in: ['all', 'parents'] };
    } else if (['teacher'].includes(req.user.role)) {
      filter.targetAudience = { $in: ['all', 'teachers'] };
    }

    const notices = await Notice.find(filter)
      .populate('author', 'email role')
      .sort({ isPinned: -1, createdAt: -1 });

    res.json({ success: true, data: notices });
  } catch (error) {
    next(error);
  }
};

// POST /api/notices (Admin/Headmaster create notice + optional SMS broadcast)
const createNotice = async (req, res, next) => {
  try {
    const {
      title,
      content,
      category,
      targetAudience,
      eventDate,
      location,
      isPinned,
      sendSmsBroadcast,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Notice title and content are required' });
    }

    let smsRecipientCount = 0;
    let smsBroadcastSent = false;

    if (sendSmsBroadcast) {
      const recipients = [];
      if (targetAudience === 'all' || targetAudience === 'parents') {
        const guardians = await Guardian.find({ phone: { $exists: true, $ne: '' } }).select('phone');
        guardians.forEach((g) => {
          if (g.phone && !recipients.includes(g.phone)) recipients.push(g.phone);
        });
      }
      if (targetAudience === 'all' || targetAudience === 'teachers') {
        const staffList = await Staff.find({ phone: { $exists: true, $ne: '' } }).select('phone');
        staffList.forEach((s) => {
          if (s.phone && !recipients.includes(s.phone)) recipients.push(s.phone);
        });
      }

      const smsText = `HANARA NOTICE [${title.toUpperCase()}]: ${content.slice(0, 140)}`;
      for (const phone of recipients) {
        try {
          await sendSms({
            recipient: phone,
            message: smsText,
            type: 'broadcast',
            sentBy: req.user?.id || req.user?._id,
          });
          smsRecipientCount++;
        } catch (err) {
          logger.error(`Failed SMS notice dispatch to ${phone}: ${err.message}`);
        }
      }
      smsBroadcastSent = true;

      // Invalidate dashboard cache & emit socket event
      try {
        clearDashboardCache();
      } catch (e) {}

      try {
        const io = getIO();
        if (io) {
          io.emit('sms_broadcast_sent', {
            message: smsText,
            targets: targetAudience,
            sent: smsRecipientCount,
            createdAt: new Date(),
          });
          io.emit('dashboard_summary_updated');
        }
      } catch (e) {
        logger.warn(`Notice socket broadcast error: ${e.message}`);
      }
    }

    const notice = await Notice.create({
      title,
      content,
      category: category || 'general',
      targetAudience: targetAudience || 'all',
      eventDate: eventDate || null,
      location: location || '',
      isPinned: isPinned || false,
      author: req.user.id,
      smsBroadcastSent,
      smsRecipientCount,
    });

    res.status(201).json({
      success: true,
      message: sendSmsBroadcast
        ? `Notice posted and SMS broadcast sent to ${smsRecipientCount} recipient(s)!`
        : 'Notice posted successfully!',
      data: notice,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/notices/:id
const updateNotice = async (req, res, next) => {
  try {
    const notice = await Notice.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!notice) return res.status(404).json({ success: false, message: 'Notice not found' });
    res.json({ success: true, data: notice });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/notices/:id
const deleteNotice = async (req, res, next) => {
  try {
    const notice = await Notice.findByIdAndDelete(req.params.id);
    if (!notice) return res.status(404).json({ success: false, message: 'Notice not found' });
    res.json({ success: true, message: 'Notice deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getNotices, createNotice, updateNotice, deleteNotice };
