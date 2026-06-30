const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../services/token.service');
const logger = require('../utils/logger');

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user with password hash
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Block pending users from logging in
    if (user.approvalStatus === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending superadmin approval. You will be able to log in once approved.',
        approvalStatus: 'pending',
      });
    }

    // Block rejected users from logging in
    if (user.approvalStatus === 'rejected') {
      return res.status(403).json({
        success: false,
        message: 'Your registration request was not approved. Please contact the school administrator.',
        approvalStatus: 'rejected',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is inactive. Please contact the administrator.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const payload = { id: user._id, role: user.role, email: user.email };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Store hashed refresh token
    user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    logger.info(`User logged in: ${user.email} (${user.role})`);

    const populatedUser = await User.findById(user._id)
      .populate({
        path: 'refStaff',
        select: 'firstName lastName role classesAssigned',
        populate: { path: 'classesAssigned', select: 'name' }
      })
      .populate('refGuardian');

    res.json({
      success: true,
      data: {
        accessToken,
        user: populatedUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/refresh
const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'No refresh token provided' });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      return res.status(401).json({ success: false, message: 'Refresh token invalid or expired' });
    }

    const user = await User.findById(decoded.id).select('+refreshTokenHash');
    if (!user || !user.isActive || !user.refreshTokenHash) {
      return res.status(401).json({ success: false, message: 'Session expired, please log in again' });
    }

    const tokenMatch = await bcrypt.compare(token, user.refreshTokenHash);
    if (!tokenMatch) {
      // Possible token reuse — revoke all sessions
      user.refreshTokenHash = null;
      await user.save({ validateBeforeSave: false });
      return res.status(401).json({ success: false, message: 'Token reuse detected. Please log in again.' });
    }

    const payload = { id: user._id, role: user.role, email: user.email };
    const newAccessToken = signAccessToken(payload);
    const newRefreshToken = signRefreshToken(payload);

    user.refreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
    await user.save({ validateBeforeSave: false });

    res.cookie('refreshToken', newRefreshToken, REFRESH_COOKIE_OPTIONS);

    const populatedUser = await User.findById(user._id)
      .populate({
        path: 'refStaff',
        select: 'firstName lastName role classesAssigned',
        populate: { path: 'classesAssigned', select: 'name' }
      })
      .populate('refGuardian');

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        user: populatedUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      // Revoke the refresh token
      const user = await User.findOne({}).select('+refreshTokenHash');
      // Find the user by decoding (don't re-verify — just clear)
      try {
        const decoded = verifyRefreshToken(token);
        await User.findByIdAndUpdate(decoded.id, { refreshTokenHash: null });
      } catch {
        // Token already expired — still clear cookie
      }
    }

    res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict' });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'refStaff',
        select: 'firstName lastName role classesAssigned',
        populate: { path: 'classesAssigned', select: 'name' }
      })
      .populate('refGuardian');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/register-teacher  (public — teacher self-registration)
const registerTeacher = async (req, res, next) => {
  try {
    const Staff = require('../models/Staff');
    const RegistrationCode = require('../models/RegistrationCode');
    const {
      firstName,
      lastName,
      otherNames,
      gender,
      dob,
      phone,
      email,
      password,
      role,          // 'teacher' | 'accountant' | 'support' | 'driver'
      qualification,
      registrationCode, // required 6-digit secret code
    } = req.body;

    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'First name, last name, email, password and role are required.' });
    }

    // Validate the registration code. Since codes are now multi-use, we do not check isUsed: false.
    // We still mark it as used and record the latest user who registered with it.
    const codeRecord = await RegistrationCode.findOneAndUpdate(
      { code: registrationCode.trim(), isActive: true },
      { $set: { isUsed: true, usedBy: email.toLowerCase(), usedAt: new Date() } },
      { new: false } // return the original doc; null means it wasn't found
    );

    if (!codeRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid registration code. Please request the current code from the administrator.',
      });
    }

    // Check for duplicate email in User collection
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Create Staff record
    const staff = await Staff.create({
      firstName,
      lastName,
      otherNames: otherNames || '',
      gender: gender || 'male',
      dob: dob || null,
      phone: phone || '',
      email: email.toLowerCase(),
      role,
      qualification: qualification || '',
      employmentStatus: 'active',
    });

    // Create linked User account — inactive until superadmin approves

    const userRole = ['admin', 'accountant', 'driver'].includes(role) ? role : 'teacher';
    const newUser = await User.create({
      email: email.toLowerCase(),
      phone: phone || '',
      passwordHash: password,    // User model pre-save hook hashes this
      role: userRole,
      refStaff: staff._id,
      isActive: false,           // blocked until approval
      approvalStatus: 'pending', // superadmin must approve
    });

    logger.info(`Staff self-registered (pending approval): ${staff.firstName} ${staff.lastName} (${email})`);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Your account is now pending superadmin approval. You will be able to log in once your account has been approved.',
      data: {
        staffId: staff._id,
        name: `${staff.firstName} ${staff.lastName}`,
        role: newUser.role,
        approvalStatus: 'pending',
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, refresh, logout, getMe, registerTeacher };
