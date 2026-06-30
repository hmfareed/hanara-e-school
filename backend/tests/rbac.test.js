const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const { signAccessToken } = require('../src/services/token.service');

describe('RBAC Authorization', () => {
  let superadminToken, adminToken, teacherToken, parentToken;
  let superadminUser, adminUser, teacherUser, parentUser;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    await User.deleteMany({});

    superadminUser = await User.create({ email: 'superadmin@hanara.edu.gh', phone: '0241000000', passwordHash: 'pwd', role: 'superadmin' });
    adminUser = await User.create({ email: 'admin@hanara.edu.gh', phone: '0242000000', passwordHash: 'pwd', role: 'admin' });
    teacherUser = await User.create({ email: 'teacher@hanara.edu.gh', phone: '0243000000', passwordHash: 'pwd', role: 'teacher' });
    parentUser = await User.create({ email: 'parent@hanara.edu.gh', phone: '0244000000', passwordHash: 'pwd', role: 'parent' });

    superadminToken = signAccessToken({ id: superadminUser._id, role: 'superadmin', email: superadminUser.email });
    adminToken = signAccessToken({ id: adminUser._id, role: 'admin', email: adminUser.email });
    teacherToken = signAccessToken({ id: teacherUser._id, role: 'teacher', email: teacherUser.email });
    parentToken = signAccessToken({ id: parentUser._id, role: 'parent', email: parentUser.email });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('GET /api/staff - Staff Management access', () => {
    it('should allow admin and superadmin to view staff list', async () => {
      const resAdmin = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resAdmin.status).toBe(200);

      const resSuper = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${superadminToken}`);
      expect(resSuper.status).toBe(200);
    });

    it('should deny access to teachers and parents for staff list', async () => {
      const resTeacher = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(resTeacher.status).toBe(403);

      const resParent = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${parentToken}`);
      expect(resParent.status).toBe(403);
    });
  });

  describe('POST /api/students - Admission restrictions', () => {
    it('should deny admission endpoint to teachers', async () => {
      const res = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ firstName: 'A', lastName: 'B', gender: 'male', dob: new Date().toISOString() });
      expect(res.status).toBe(403);
    });
  });
});
