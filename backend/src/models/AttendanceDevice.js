const mongoose = require('mongoose');

const attendanceDeviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: [true, 'Device ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    deviceName: {
      type: String,
      required: [true, 'Device name is required'], // e.g. "Main Reception Tablet"
      trim: true,
    },
    locationName: {
      type: String,
      default: 'Main Campus',
      trim: true,
    },
    deviceType: {
      type: String,
      enum: ['tablet', 'pc', 'phone', 'other'],
      default: 'tablet',
    },
    // SHA-256 hash of device authorization token
    deviceTokenHash: {
      type: String,
      required: [true, 'Device token hash is required'],
      unique: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'REVOKED'],
      default: 'ACTIVE',
      index: true,
    },
    geoCoordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    allowedRadiusMetres: {
      type: Number,
      default: 150,
    },
    antiProxyLevel: {
      type: String,
      enum: ['standard', 'secure', 'high_security'],
      default: 'high_security',
    },
    lastActiveAt: {
      type: Date,
      default: null,
    },
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AttendanceDevice', attendanceDeviceSchema);
