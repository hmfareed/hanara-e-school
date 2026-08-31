const Student = require('../models/Student');
const Staff = require('../models/Staff');
const Class = require('../models/Class');
const logger = require('../utils/logger');

const VALID_SECTIONS = ['Red', 'Yellow', 'Green', 'Blue'];

/**
 * GET /api/sections/summary
 * Aggregate statistics, gender split, class distribution, and assigned patrons across Red, Yellow, Green, Blue
 */
const getSectionsSummary = async (req, res, next) => {
  try {
    // 1. Fetch all active students
    const students = await Student.find({ status: 'active' })
      .select('gender colorSection currentClass')
      .populate('currentClass', 'name level')
      .lean();

    // 2. Fetch all staff assigned to a color section
    const sectionStaff = await Staff.find({
      colorSection: { $in: VALID_SECTIONS },
      employmentStatus: 'active',
    })
      .select('firstName lastName otherNames title photoUrl phone email role colorSection sectionRole')
      .lean();

    // Initialize section accumulators
    const sectionsData = {};
    VALID_SECTIONS.forEach((color) => {
      sectionsData[color] = {
        name: color,
        totalStudents: 0,
        maleStudents: 0,
        femaleStudents: 0,
        classBreakdown: {},
        patrons: [],
      };
    });

    let unassignedStudents = {
      name: 'Unassigned',
      totalStudents: 0,
      maleStudents: 0,
      femaleStudents: 0,
    };

    // Aggregate students
    students.forEach((s) => {
      const section = s.colorSection;
      if (VALID_SECTIONS.includes(section)) {
        sectionsData[section].totalStudents += 1;
        if (s.gender === 'male') sectionsData[section].maleStudents += 1;
        if (s.gender === 'female') sectionsData[section].femaleStudents += 1;

        const className = s.currentClass?.name || 'Unassigned Class';
        sectionsData[section].classBreakdown[className] = (sectionsData[section].classBreakdown[className] || 0) + 1;
      } else {
        unassignedStudents.totalStudents += 1;
        if (s.gender === 'male') unassignedStudents.maleStudents += 1;
        if (s.gender === 'female') unassignedStudents.femaleStudents += 1;
      }
    });

    // Attach staff to their respective sections
    sectionStaff.forEach((st) => {
      const color = st.colorSection;
      if (VALID_SECTIONS.includes(color)) {
        sectionsData[color].patrons.push({
          _id: st._id,
          fullName: [st.title, st.firstName, st.otherNames, st.lastName].filter(Boolean).join(' '),
          firstName: st.firstName,
          lastName: st.lastName,
          title: st.title || '',
          photoUrl: st.photoUrl,
          phone: st.phone,
          email: st.email,
          role: st.role,
          sectionRole: st.sectionRole || 'Patron',
        });
      }
    });

    // Also fetch available teachers who can be assigned to sections
    const allTeachers = await Staff.find({
      role: { $in: ['teacher', 'admin'] },
      employmentStatus: 'active',
    })
      .select('firstName lastName otherNames title photoUrl phone email role colorSection sectionRole')
      .lean();

    res.json({
      success: true,
      data: {
        sections: Object.values(sectionsData),
        unassigned: unassignedStudents,
        totalActiveStudents: students.length,
        availableTeachers: allTeachers.map((t) => ({
          _id: t._id,
          fullName: [t.title, t.firstName, t.otherNames, t.lastName].filter(Boolean).join(' '),
          firstName: t.firstName,
          lastName: t.lastName,
          title: t.title || '',
          photoUrl: t.photoUrl,
          role: t.role,
          colorSection: t.colorSection || null,
          sectionRole: t.sectionRole || null,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/sections/:color
 * Get detailed view for a single color section
 */
const getSectionDetails = async (req, res, next) => {
  try {
    const { color } = req.params;
    const isUnassigned = color.toLowerCase() === 'unassigned';
    
    let filter = { status: 'active' };
    if (isUnassigned) {
      filter.colorSection = null;
    } else {
      if (!VALID_SECTIONS.includes(color)) {
        return res.status(400).json({ success: false, message: `Invalid color section '${color}'. Valid sections are Red, Yellow, Green, Blue.` });
      }
      filter.colorSection = color;
    }

    const { class: classId, search } = req.query;
    if (classId) filter.currentClass = classId;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { admissionNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const [students, patrons] = await Promise.all([
      Student.find(filter)
        .populate('currentClass', 'name level')
        .sort({ lastName: 1, firstName: 1 })
        .select('-documents')
        .lean(),
      !isUnassigned
        ? Staff.find({ colorSection: color, employmentStatus: 'active' })
            .select('firstName lastName otherNames title photoUrl phone email role colorSection sectionRole')
            .lean()
        : [],
    ]);

    const maleTotal = students.filter((s) => s.gender === 'male').length;
    const femaleTotal = students.filter((s) => s.gender === 'female').length;

    res.json({
      success: true,
      data: {
        color: isUnassigned ? 'Unassigned' : color,
        total: students.length,
        maleTotal,
        femaleTotal,
        students,
        patrons: patrons.map((st) => ({
          _id: st._id,
          fullName: [st.title, st.firstName, st.otherNames, st.lastName].filter(Boolean).join(' '),
          firstName: st.firstName,
          lastName: st.lastName,
          title: st.title || '',
          photoUrl: st.photoUrl,
          phone: st.phone,
          email: st.email,
          role: st.role,
          sectionRole: st.sectionRole || 'Patron',
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sections/assign-teacher
 * Assigns or reassigns a teacher to a color section
 */
const assignTeacherToSection = async (req, res, next) => {
  try {
    const { staffId, colorSection, sectionRole = 'Patron' } = req.body;

    if (!staffId) {
      return res.status(400).json({ success: false, message: 'Staff ID is required' });
    }

    if (colorSection && !VALID_SECTIONS.includes(colorSection)) {
      return res.status(400).json({ success: false, message: 'Invalid color section. Must be Red, Yellow, Green, or Blue.' });
    }

    const updatedStaff = await Staff.findByIdAndUpdate(
      staffId,
      {
        $set: {
          colorSection: colorSection || null,
          sectionRole: colorSection ? (sectionRole || 'Patron') : null,
        },
      },
      { new: true }
    );

    if (!updatedStaff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    logger.info(`Staff ${updatedStaff.firstName} ${updatedStaff.lastName} assigned to ${colorSection || 'no section'} as ${sectionRole || 'none'}`);

    res.json({
      success: true,
      message: colorSection
        ? `Successfully assigned to ${colorSection} section as ${sectionRole}`
        : 'Successfully removed from section',
      data: updatedStaff,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sections/assign-students
 * Batch assign multiple students to a color section
 */
const assignStudentsToSection = async (req, res, next) => {
  try {
    const { studentIds, colorSection } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'studentIds array is required' });
    }

    if (colorSection && !VALID_SECTIONS.includes(colorSection)) {
      return res.status(400).json({ success: false, message: 'Invalid color section. Must be Red, Yellow, Green, or Blue.' });
    }

    const updateResult = await Student.updateMany(
      { _id: { $in: studentIds } },
      { $set: { colorSection: colorSection || null } }
    );

    logger.info(`Batch assigned ${updateResult.modifiedCount || updateResult.nModified || 0} students to section ${colorSection || 'Unassigned'}`);

    res.json({
      success: true,
      message: `Successfully assigned ${updateResult.modifiedCount || updateResult.nModified || 0} students to ${colorSection || 'Unassigned'}.`,
      data: {
        modifiedCount: updateResult.modifiedCount || updateResult.nModified || 0,
        colorSection: colorSection || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/sections/auto-balance
 * Auto-distributes unassigned students (or all active students) evenly across the 4 color sections
 */
const autoBalanceSections = async (req, res, next) => {
  try {
    const { redistributeAll = false, classId = null } = req.body;

    const filter = { status: 'active' };
    if (!redistributeAll) {
      filter.$or = [{ colorSection: null }, { colorSection: { $nin: VALID_SECTIONS } }];
    }
    if (classId) {
      filter.currentClass = classId;
    }

    const students = await Student.find(filter).sort({ currentClass: 1, gender: 1, lastName: 1 });

    if (students.length === 0) {
      return res.json({
        success: true,
        message: 'No students found matching distribution criteria.',
        data: { updatedCount: 0 },
      });
    }

    // Separate by gender for balanced distribution
    const males = students.filter((s) => s.gender === 'male');
    const females = students.filter((s) => s.gender === 'female');

    const bulkOps = [];
    
    // Distribute males round-robin across VALID_SECTIONS
    males.forEach((student, index) => {
      const section = VALID_SECTIONS[index % VALID_SECTIONS.length];
      bulkOps.push({
        updateOne: {
          filter: { _id: student._id },
          update: { $set: { colorSection: section } },
        },
      });
    });

    // Distribute females round-robin across VALID_SECTIONS (offset by 2 to balance further)
    females.forEach((student, index) => {
      const section = VALID_SECTIONS[(index + 2) % VALID_SECTIONS.length];
      bulkOps.push({
        updateOne: {
          filter: { _id: student._id },
          update: { $set: { colorSection: section } },
        },
      });
    });

    if (bulkOps.length > 0) {
      await Student.bulkWrite(bulkOps);
    }

    logger.info(`Auto-balanced ${bulkOps.length} students across 4 color sections.`);

    res.json({
      success: true,
      message: `Successfully distributed ${bulkOps.length} students across Red, Yellow, Green, and Blue sections.`,
      data: {
        updatedCount: bulkOps.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSectionsSummary,
  getSectionDetails,
  assignTeacherToSection,
  assignStudentsToSection,
  autoBalanceSections,
};
