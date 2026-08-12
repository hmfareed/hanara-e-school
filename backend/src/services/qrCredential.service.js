const crypto = require('crypto');
const QRCode = require('qrcode');
const AttendanceCredential = require('../models/AttendanceCredential');
const Staff = require('../models/Staff');

/**
 * Hash raw token string using SHA-256
 */
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Generate a new random QR attendance credential for a staff member.
 * Revokes any previously active credential for the staff member.
 */
async function generateCredentialForStaff(staffId, issuedByUserId = null) {
  const staff = await Staff.findById(staffId);
  if (!staff) {
    throw new Error('Staff record not found');
  }

  // 1. Generate opaque random token: HAN_ATT_<16-byte-hex>
  const randomHex = crypto.randomBytes(16).toString('hex').toUpperCase();
  const rawToken = `HAN_ATT_${randomHex}`;
  const credentialHash = hashToken(rawToken);
  const tokenPrefix = `HAN_ATT_${randomHex.substring(0, 6)}...`;

  // 2. Revoke any existing active credentials
  await AttendanceCredential.updateMany(
    { staff: staffId, status: 'ACTIVE' },
    { $set: { status: 'REVOKED', revokedAt: new Date(), revokedBy: issuedByUserId } }
  );

  // 3. Create new credential
  const credential = await AttendanceCredential.create({
    staff: staffId,
    credentialHash,
    tokenPrefix,
    status: 'ACTIVE',
    issuedAt: new Date(),
  });

  // 4. Generate QR code Data URL
  const qrCodeDataUrl = await QRCode.toDataURL(rawToken, {
    errorCorrectionLevel: 'H',
    margin: 2,
    scale: 8,
    color: {
      dark: '#1e293b',
      light: '#ffffff',
    },
  });

  return {
    credentialId: credential._id,
    staffId: staff._id,
    rawToken, // Only returned at generation time for client QR display
    tokenPrefix,
    qrCodeDataUrl,
    status: credential.status,
    issuedAt: credential.issuedAt,
  };
}

/**
 * Verify a raw scanned QR token against database credential hashes.
 */
async function verifyCredentialToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') {
    return { valid: false, reason: 'Invalid or empty QR payload' };
  }

  const credentialHash = hashToken(rawToken.trim());
  const credential = await AttendanceCredential.findOne({
    credentialHash,
    status: 'ACTIVE',
  }).populate('staff');

  if (!credential) {
    return { valid: false, reason: 'QR credential is invalid or has been revoked' };
  }

  if (!credential.staff) {
    return { valid: false, reason: 'No staff record associated with this QR code' };
  }

  if (credential.staff.employmentStatus && credential.staff.employmentStatus !== 'active') {
    return { valid: false, reason: `Staff status is '${credential.staff.employmentStatus}' (Must be active)` };
  }

  return {
    valid: true,
    credential,
    staff: credential.staff,
  };
}

/**
 * Revoke active QR credential for a staff member.
 */
async function revokeCredential(staffId, revokedByUserId = null) {
  const result = await AttendanceCredential.updateMany(
    { staff: staffId, status: 'ACTIVE' },
    { $set: { status: 'REVOKED', revokedAt: new Date(), revokedBy: revokedByUserId } }
  );
  return result;
}

/**
 * Fetch or generate staff active QR credential code data.
 */
async function getStaffQrCode(staffId) {
  const staff = await Staff.findById(staffId);
  if (!staff) {
    throw new Error('Staff record not found');
  }

  const activeCred = await AttendanceCredential.findOne({ staff: staffId, status: 'ACTIVE' });
  if (!activeCred) {
    // Generate a fresh one if none exists
    return generateCredentialForStaff(staffId);
  }

  return {
    credentialId: activeCred._id,
    staffId: staff._id,
    tokenPrefix: activeCred.tokenPrefix,
    status: activeCred.status,
    issuedAt: activeCred.issuedAt,
  };
}

module.exports = {
  hashToken,
  generateCredentialForStaff,
  verifyCredentialToken,
  revokeCredential,
  getStaffQrCode,
};
