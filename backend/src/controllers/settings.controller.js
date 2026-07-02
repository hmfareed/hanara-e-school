const SchoolProfile = require('../models/SchoolProfile');
const User = require('../models/User');
const logger = require('../utils/logger');

// GET /api/settings/school-profile
const getSchoolProfile = async (req, res, next) => {
  try {
    const profile = await SchoolProfile.findOne();
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/settings/school-profile
const updateSchoolProfile = async (req, res, next) => {
  try {
    const { name, motto, logoUrl, address, phone, email, dataProtectionRegistrationNumber } = req.body;

    const profile = await SchoolProfile.findOneAndUpdate(
      {},
      {
        $set: {
          name,
          motto,
          logoUrl,
          address,
          phone,
          email,
          dataProtectionRegistrationNumber,
        },
      },
      { new: true, runValidators: true, upsert: true }
    );

    logger.info(`School profile updated by ${req.user.email}`);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

// GET /api/settings/users
const getSystemUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .populate('refStaff', 'title photoUrl firstName lastName role qualification')
      .populate('refGuardian', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/settings/users/:userId/toggle-active
const toggleUserActive = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Don't allow superadmin to deactivate themselves
    if (user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account' });
    }

    user.isActive = !user.isActive;
    await user.save();

    logger.info(`User account active status toggled to ${user.isActive} for ${user.email} by ${req.user.email}`);
    res.json({ success: true, message: `User account is now ${user.isActive ? 'active' : 'inactive'}`, data: user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSchoolProfile,
  updateSchoolProfile,
  getSystemUsers,
  toggleUserActive,
};
