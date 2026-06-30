const Student = require('../models/Student');

/**
 * Generates a unique admission number in the format HNRA/YYYY/NNNN
 * e.g. HNRA/2026/0001
 */
const generateAdmissionNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `HNRA/${year}/`;

  // Find the last student with this year's prefix
  const lastStudent = await Student.findOne(
    { admissionNumber: { $regex: `^${prefix}` } },
    { admissionNumber: 1 },
    { sort: { admissionNumber: -1 } }
  );

  let nextNum = 1;
  if (lastStudent) {
    const parts = lastStudent.admissionNumber.split('/');
    nextNum = parseInt(parts[2], 10) + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
};

module.exports = { generateAdmissionNumber };
