/**
 * grading.service.js
 *
 * Central grading calculation engine:
 *  - getGradeAndRemark()   → resolve letter/number grade from level config
 *  - calculateClassRankings() → rank all students in a class for a term
 *  - calculateBeceAggregate() → JHS-3 WAEC 30/70 aggregate
 *
 * The WAEC 9-point scale (lower = better) is used for JHS; descriptive bands
 * are used for lower levels. Configs are stored in GradingScaleConfig and
 * cached for the duration of the calculation run.
 */

const Grade = require('../models/Grade');
const Student = require('../models/Student');
const StudentReport = require('../models/StudentReport');
const GradingScaleConfig = require('../models/GradingScaleConfig');
const Subject = require('../models/Subject');
const logger = require('../utils/logger');

/* ────────────────────────────────────────────────────────── */
/*  DEFAULT SCALES (used as fallback if DB config missing)    */
/* ────────────────────────────────────────────────────────── */

const DEFAULT_SCALES = {
  Nursery: {
    scaleType: 'descriptive_band',
    caWeight: 30,
    examWeight: 70,
    bands: [
      { min: 80, max: 100, grade: 'EX', label: 'Excellent' },
      { min: 60, max: 79,  grade: 'VG', label: 'Very Good' },
      { min: 40, max: 59,  grade: 'S',  label: 'Satisfactory' },
      { min: 0,  max: 39,  grade: 'NI', label: 'Needs Improvement' },
    ],
  },
  KG: {
    scaleType: 'descriptive_band',
    caWeight: 30,
    examWeight: 70,
    bands: [
      { min: 80, max: 100, grade: 'EX', label: 'Excellent' },
      { min: 60, max: 79,  grade: 'VG', label: 'Very Good' },
      { min: 40, max: 59,  grade: 'S',  label: 'Satisfactory' },
      { min: 0,  max: 39,  grade: 'NI', label: 'Needs Improvement' },
    ],
  },
  Primary: {
    scaleType: 'descriptive_band',
    caWeight: 30,
    examWeight: 70,
    bands: [
      { min: 90, max: 100, grade: 'A', label: 'Excellent' },
      { min: 80, max: 89,  grade: 'B', label: 'Very Good' },
      { min: 70, max: 79,  grade: 'C', label: 'Good' },
      { min: 60, max: 69,  grade: 'D', label: 'Satisfactory' },
      { min: 50, max: 59,  grade: 'E', label: 'Pass' },
      { min: 0,  max: 49,  grade: 'F', label: 'Needs Improvement' },
    ],
  },
  JHS: {
    scaleType: 'waec_9point',
    caWeight: 30,
    examWeight: 70,
    bands: [
      { min: 90, max: 100, grade: '1', label: 'Highest' },
      { min: 80, max: 89,  grade: '2', label: 'Very Good' },
      { min: 70, max: 79,  grade: '3', label: 'Good' },
      { min: 60, max: 69,  grade: '4', label: 'Credit' },
      { min: 55, max: 59,  grade: '5', label: 'Credit' },
      { min: 50, max: 54,  grade: '6', label: 'Pass' },
      { min: 45, max: 49,  grade: '7', label: 'Pass' },
      { min: 40, max: 44,  grade: '8', label: 'Pass' },
      { min: 0,  max: 39,  grade: '9', label: 'Lowest' },
    ],
  },
};

/* ────────────────────────────────────────────────────────── */
/*  HELPERS                                                   */
/* ────────────────────────────────────────────────────────── */

/**
 * Load grading scale config from DB, fallback to hardcoded defaults.
 */
async function loadConfig(levelCategory) {
  const dbConfig = await GradingScaleConfig.findOne({ levelCategory });
  return dbConfig || DEFAULT_SCALES[levelCategory] || DEFAULT_SCALES.Primary;
}

/**
 * getGradeAndRemark(score, levelCategory)
 *
 * Returns { grade, label } for a given numeric total score.
 * e.g. getGradeAndRemark(85, 'Primary') → { grade: 'B', label: 'Very Good' }
 */
async function getGradeAndRemark(score, levelCategory) {
  const config = await loadConfig(levelCategory);
  const numScore = Number(score) || 0;
  const band = config.bands.find(
    (b) => numScore >= b.min && numScore <= b.max
  );
  return band
    ? { grade: band.grade, label: band.label }
    : { grade: '-', label: 'N/A' };
}

/**
 * calculateClassRankings(classId, academicYear, term, formTeacherId)
 *
 * Aggregates all subject scores for every active student in the class,
 * computes each student's average total, ranks them (dense ranking for ties),
 * then upserts their StudentReport record with position/average data.
 *
 * Returns summary { updated, skipped, classAverage }
 */
async function calculateClassRankings(classId, academicYear, term, formTeacherId) {
  // 1. Fetch all active students in the class
  const students = await Student.find({ currentClass: classId, status: 'active' })
    .sort({ lastName: 1, firstName: 1 });

  if (students.length === 0) {
    return { updated: 0, skipped: 0, classAverage: 0 };
  }

  const studentIds = students.map((s) => s._id);

  // 2. Fetch all grades for this class/term/year
  const grades = await Grade.find({
    class: classId,
    academicYear,
    term,
    student: { $in: studentIds },
  });

  // 3. Build a score map: studentId → average of all subject totalScores
  const scoreMap = {};
  students.forEach((s) => {
    scoreMap[s._id.toString()] = { total: 0, count: 0 };
  });

  grades.forEach((g) => {
    const key = g.student.toString();
    if (scoreMap[key]) {
      scoreMap[key].total += g.totalScore || 0;
      scoreMap[key].count += 1;
    }
  });

  // Compute average per student (0 if no subjects graded)
  const studentAverages = students.map((s) => ({
    student: s,
    average:
      scoreMap[s._id.toString()].count > 0
        ? parseFloat(
            (scoreMap[s._id.toString()].total / scoreMap[s._id.toString()].count).toFixed(2)
          )
        : 0,
  }));

  // 4. Sort descending, assign dense ranks
  studentAverages.sort((a, b) => b.average - a.average);

  let rank = 1;
  let prevAverage = null;
  let rankCounter = 0;

  const ranked = studentAverages.map((entry) => {
    rankCounter++;
    if (prevAverage !== null && entry.average < prevAverage) {
      rank = rankCounter; // skip ranks for ties
    }
    prevAverage = entry.average;
    return { ...entry, position: rank };
  });

  // 5. Class average
  const classAverage =
    studentAverages.length > 0
      ? parseFloat(
          (
            studentAverages.reduce((sum, e) => sum + e.average, 0) /
            studentAverages.length
          ).toFixed(2)
        )
      : 0;

  const totalStudents = students.length;

  // 6. Upsert StudentReport for each student
  let updated = 0;
  let skipped = 0;

  for (const entry of ranked) {
    try {
      await StudentReport.findOneAndUpdate(
        {
          student: entry.student._id,
          class: classId,
          academicYear,
          term,
        },
        {
          position: entry.position,
          totalStudents,
          studentAverage: entry.average,
          classAverage,
          formTeacher: formTeacherId,
          isFinalized: true,
          finalizedAt: new Date(),
        },
        { new: true, upsert: true, runValidators: true }
      );
      updated++;
    } catch (err) {
      logger.error(`Failed to upsert StudentReport for ${entry.student._id}: ${err.message}`);
      skipped++;
    }
  }

  logger.info(
    `Rankings calculated for class ${classId}, ${academicYear} Term ${term}: ${updated} updated, ${skipped} skipped`
  );

  return { updated, skipped, classAverage, totalStudents };
}

/* ────────────────────────────────────────────────────────── */
/*  BECE AGGREGATE                                            */
/* ────────────────────────────────────────────────────────── */

/**
 * WAEC Core subjects for BECE aggregate calculation
 * (stored by subject code in the Subject collection)
 */
const BECE_CORE_CODES = ['ENG', 'MATH', 'SCI', 'SOC'];

/**
 * calculateBeceAggregate(studentId, academicYear, term)
 *
 * For JHS-3 only. Computes:
 *   aggregate = sum of grades (1–9) for 4 core subjects
 *              + best 2 grades from remaining elective subjects
 *
 * Returns { aggregate, coreGrades, electiveGrades, warning }
 * Lower aggregate = better (6 is a perfect score).
 */
async function calculateBeceAggregate(studentId, academicYear, term) {
  const grades = await Grade.find({ student: studentId, academicYear, term }).populate(
    'subject',
    'name code'
  );

  if (grades.length === 0) {
    return {
      aggregate: null,
      coreGrades: [],
      electiveGrades: [],
      warning: 'No grades found for this student.',
    };
  }

  // Load JHS scale config for grade conversion
  const config = await loadConfig('JHS');

  // Convert totalScore → WAEC numeric grade (1–9)
  const resolveWaecGrade = (totalScore) => {
    const band = config.bands.find((b) => totalScore >= b.min && totalScore <= b.max);
    return band ? parseInt(band.grade, 10) : 9; // fallback to lowest
  };

  const coreGrades = [];
  const electiveGrades = [];

  grades.forEach((g) => {
    const code = g.subject?.code?.toUpperCase() || '';
    const numericGrade = resolveWaecGrade(g.totalScore || 0);
    const entry = {
      subject: g.subject?.name || code,
      code,
      totalScore: g.totalScore || 0,
      waecGrade: numericGrade,
    };
    if (BECE_CORE_CODES.includes(code)) {
      coreGrades.push(entry);
    } else {
      electiveGrades.push(entry);
    }
  });

  let warning = null;

  // Require exactly 4 core subjects
  if (coreGrades.length < 4) {
    warning = `Only ${coreGrades.length} of 4 required core subjects have grades. Aggregate may be incomplete.`;
  }

  // Sum 4 core grades
  const coreSum = coreGrades.reduce((sum, g) => sum + g.waecGrade, 0);

  // Best 2 from electives (lowest numbers = best in WAEC scale)
  const sortedElectives = [...electiveGrades].sort((a, b) => a.waecGrade - b.waecGrade);
  const bestElectives = sortedElectives.slice(0, 2);
  const electiveSum = bestElectives.reduce((sum, g) => sum + g.waecGrade, 0);

  const aggregate = coreSum + electiveSum;

  return { aggregate, coreGrades, electiveGrades, bestElectives, warning };
}

/* ────────────────────────────────────────────────────────── */
/*  GRADING SCALE MANAGEMENT                                  */
/* ────────────────────────────────────────────────────────── */

/**
 * seedDefaultGradingScales()
 *
 * Inserts the four default level configs if they don't already exist.
 * Safe to call on startup.
 */
async function seedDefaultGradingScales() {
  for (const [levelCategory, config] of Object.entries(DEFAULT_SCALES)) {
    const existing = await GradingScaleConfig.findOne({ levelCategory });
    if (!existing) {
      await GradingScaleConfig.create({
        levelCategory,
        scaleType: config.scaleType,
        caWeight: config.caWeight,
        examWeight: config.examWeight,
        bands: config.bands,
      });
      logger.info(`Seeded default grading scale for ${levelCategory}`);
    }
  }
}

/**
 * getAllScales()
 * Returns all four level configs (from DB, falling back to defaults for any missing).
 */
async function getAllScales() {
  const results = {};
  for (const category of ['Nursery', 'KG', 'Primary', 'JHS']) {
    results[category] = await loadConfig(category);
  }
  return results;
}

/**
 * upsertScale(levelCategory, updates)
 * Allows admins to customize the grading bands.
 */
async function upsertScale(levelCategory, updates) {
  const config = await GradingScaleConfig.findOneAndUpdate(
    { levelCategory },
    { $set: updates },
    { new: true, upsert: true, runValidators: true }
  );
  return config;
}

module.exports = {
  getGradeAndRemark,
  calculateClassRankings,
  calculateBeceAggregate,
  seedDefaultGradingScales,
  getAllScales,
  upsertScale,
  loadConfig,
};
