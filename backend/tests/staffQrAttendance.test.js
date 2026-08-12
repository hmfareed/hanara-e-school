const qrCredentialService = require('../src/services/qrCredential.service');
const AttendanceCredential = require('../src/models/AttendanceCredential');
const Staff = require('../src/models/Staff');

describe('Staff QR Credential Service Unit Tests', () => {
  let mockStaff;

  beforeAll(async () => {
    await AttendanceCredential.deleteMany({});
    await Staff.deleteMany({});

    mockStaff = await Staff.create({
      firstName: 'Abdul',
      lastName: 'Rahman',
      gender: 'male',
      staffId: 'HAN-2026-TEST01',
      employmentStatus: 'active',
      email: 'abdul.test@hanara.edu.gh',
      phone: '0241002003',
      role: 'teacher',
      department: 'Mathematics',
    });
  });

  afterAll(async () => {
    await AttendanceCredential.deleteMany({});
    await Staff.deleteMany({});
  });

  test('should generate a cryptographic QR token and SHA-256 hash', async () => {
    const cred = await qrCredentialService.generateCredentialForStaff(mockStaff._id);
    expect(cred).toBeDefined();
    expect(cred.rawToken).toMatch(/^HAN_ATT_[A-Z0-9]{32}$/);
    expect(cred.tokenPrefix).toMatch(/^HAN_ATT_/);
    expect(cred.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);

    const dbRecord = await AttendanceCredential.findOne({ staff: mockStaff._id, status: 'ACTIVE' });
    expect(dbRecord).toBeDefined();
    expect(dbRecord.credentialHash).toBeDefined();
    expect(dbRecord.credentialHash).not.toEqual(cred.rawToken); // Hashed, not plain
  });

  test('should verify valid scanned QR token', async () => {
    const cred = await qrCredentialService.generateCredentialForStaff(mockStaff._id);
    const verifyResult = await qrCredentialService.verifyCredentialToken(cred.rawToken);

    expect(verifyResult.valid).toBe(true);
    expect(verifyResult.staff).toBeDefined();
    expect(verifyResult.staff.firstName).toBe('Abdul');
  });

  test('should reject invalid or tampered QR token', async () => {
    const verifyResult = await qrCredentialService.verifyCredentialToken('HAN_ATT_INVALIDTOKEN1234567890');
    expect(verifyResult.valid).toBe(false);
    expect(verifyResult.reason).toMatch(/invalid or has been revoked/i);
  });

  test('should revoke active QR credential and block subsequent verification', async () => {
    const cred = await qrCredentialService.generateCredentialForStaff(mockStaff._id);
    await qrCredentialService.revokeCredential(mockStaff._id);

    const verifyResult = await qrCredentialService.verifyCredentialToken(cred.rawToken);
    expect(verifyResult.valid).toBe(false);
    expect(verifyResult.reason).toMatch(/revoked/i);
  });
});
