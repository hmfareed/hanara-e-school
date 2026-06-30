const bcrypt = require('bcryptjs');

const adminHash = '$2a$12$5HXiTkbRUGqBLo7nasQffOYoKtdQLyhMybTmvRfqRYU9OL3u0/5wK';
const password = 'Admin@2026';

bcrypt.compare(password, adminHash).then(res => {
  console.log(`Password "${password}" matches admin hash?`, res);
});

const teacherHash = '$2a$12$4A882/ywRy3J991rmjujoe8LfsR7jYtTTu02XP3umRk/opku9ro2a';
// What is the teacher password? Let's check what the user might have used or if we can test double hashing.
// If the seed password was 'Teacher@2026', but the user's password is 'Teacher@2026', let's test it:
bcrypt.compare('Teacher@2026', teacherHash).then(res => {
  console.log(`Password "Teacher@2026" matches teacher hash?`, res);
});

// Let's test if the hash is actually a double hash of 'Admin@2026' or 'Teacher@2026' or something else
// For example, if it was hashed twice:
// Wait, bcrypt.hash returns a different hash each time, but we can check:
// if we hash 'Admin@2026' and then hash that hash, or something like that.
