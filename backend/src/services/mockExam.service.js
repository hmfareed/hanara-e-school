/**
 * mockExam.service.js
 *
 * Business logic for the JHS 3 Mock Exam module:
 *  - computeGradeFromScore()   → WAEC 9-point grade from raw score (0-100)
 *  - recomputeAggregate()      → recalculates MockAggregate for a student in a series
 *  - recomputeRankings()       → dense-ranks students by aggregate (class + cohort)
 *
 * Core subjects: English Language, Mathematics, Integrated Science, Social Studies
 * The isCore flag is stored on MockSubjectEntry at entry creation time.
 */

const GradingScaleConfig = require('../models/GradingScaleConfig');
const MockExamResult = require('../models/MockExamResult');
const MockSubjectEntry = require('../models/MockSubjectEntry');
const MockAggregate = require('../models/MockAggregate');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const logger = require('../utils/logger');

/* ── WAEC 9-point default scale (fallback if DB missing) ── */
const JHS_BANDS = [
  { min: 90, max: 100, grade: 1 },
  { min: 80, max: 89,  grade: 2 },
  { min: 70, max: 79,  grade: 3 },
  { min: 60, max: 69,  grade: 4 },
  { min: 55, max: 59,  grade: 5 },
  { min: 50, max: 54,  grade: 6 },
  { min: 45, max: 49,  grade: 7 },
  { min: 40, max: 44,  grade: 8 },
  { min: 0,  max: 39,  grade: 9 },
];

/**
 * computeGradeFromScore(rawScore)
 * Returns numeric grade 1–9 (WAEC 9-point, lower = better).
 * Uses the DB-configured JHS grading scale when available.
 */
async function computeGradeFromScore(rawScore) {
  let bands = JHS_BANDS;
  try {
    const dbConfig = await GradingScaleConfig.findOne({ levelCategory: 'JHS' });
    if (dbConfig && dbConfig.bands && dbConfig.bands.length > 0) {
      bands = dbConfig.bands.map((b) => ({
        min: b.min,
        max: b.max,
        grade: parseInt(b.grade, 10),
      }));
    }
  } catch (err) {
    logger.warn('mockExam.service: could not load JHS grading config from DB, using defaults');
  }

  const score = Number(rawScore) || 0;
  const band = bands.find((b) => score >= b.min && score <= b.max);
  return band ? band.grade : 9; // default to 9 (fail) if out of range
}

/**
 * recomputeAggregate(seriesId, studentId)
 *
 * Pulls all submitted MockExamResults for this student in this series,
 * groups into core (isCore=true) and electives (isCore=false),
 * selects best 2 electives (lowest grade number = better),
 * computes aggregate = sum(4 core) + sum(best 2 electives),
 * sets isComplete = true when 4 core + ≥2 electives are present.
 */
async function recomputeAggregate(seriesId, studentId) {
  try {
    // Get all results for this student in this series
    const results = await MockExamResult.find({
      seriesId,
      studentId,
      rawScore: { $ne: null },
    }).populate('subjectId', 'name');

    if (results.length === 0) {
      return null;
    }

    // For each result, look up whether the entry is core
    const entryIds = [...new Set(results.map((r) => r.subjectEntryId.toString()))];
    const entries = await MockSubjectEntry.find({ _id: { $in: entryIds } }).select('subjectId isCore status');
    const entryMap = {};
    entries.forEach((e) => {
      entryMap[e._id.toString()] = { isCore: e.isCore, status: e.status };
    });

    // Only count results from submitted entries
    const submittedResults = results.filter((r) => {
      const entry = entryMap[r.subjectEntryId.toString()];
      return entry && (entry.status === 'submitted' || entry.status === 'reopened');
    });

    const coreResults = submittedResults.filter((r) => {
      const entry = entryMap[r.subjectEntryId.toString()];
      return entry && entry.isCore;
    });

    const electiveResults = submittedResults.filter((r) => {
      const entry = entryMap[r.subjectEntryId.toString()];
      return entry && !entry.isCore;
    });

    const coreGrades = coreResults.map((r) => ({
      subjectId: r.subjectId._id || r.subjectId,
      subjectName: r.subjectId.name || '',
      grade: r.grade || 9,
    }));

    const electiveGrades = electiveResults.map((r) => ({
      subjectId: r.subjectId._id || r.subjectId,
      subjectName: r.subjectId.name || '',
      grade: r.grade || 9,
    }));

    // Best 2 electives = lowest grade values (1 is best, 9 is worst)
    const sortedElectives = [...electiveGrades].sort((a, b) => a.grade - b.grade);
    const bestElectivesUsed = sortedElectives.slice(0, 2);

    const coreSum = coreGrades.reduce((sum, g) => sum + g.grade, 0);
    const electiveSum = bestElectivesUsed.reduce((sum, g) => sum + g.grade, 0);

    // isComplete = 4 core subjects submitted + at least 2 electives submitted
    const isComplete = coreGrades.length >= 4 && electiveGrades.length >= 2;

    const aggregate = isComplete ? coreSum + electiveSum : null;

    // Determine classId from the first result
    const classId = submittedResults[0]?.classId;

    const updated = await MockAggregate.findOneAndUpdate(
      { seriesId, studentId },
      {
        seriesId,
        studentId,
        classId,
        coreGrades,
        electiveGrades,
        bestElectivesUsed,
        aggregate,
        isComplete,
        computedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return updated;
  } catch (err) {
    logger.error('mockExam.service recomputeAggregate error:', err);
    throw err;
  }
}

/**
 * recomputeRankings(seriesId, classId)
 *
 * Dense-ranks all complete students by aggregate (ascending — lower is better)
 * for the given class, then re-ranks across the full JHS 3 cohort.
 * Incomplete students get null positions.
 */
async function recomputeRankings(seriesId, classId) {
  try {
    // ── Class rankings ──
    const classAggregates = await MockAggregate.find({
      seriesId,
      classId,
      isComplete: true,
    }).sort({ aggregate: 1 });

    // Dense ranking (same aggregate = same rank, next rank skips count)
    let rank = 1;
    let prevAgg = null;
    let sameCount = 0;

    for (const agg of classAggregates) {
      if (prevAgg !== null && agg.aggregate !== prevAgg) {
        rank += sameCount;
        sameCount = 1;
      } else {
        sameCount++;
      }
      agg.classPosition = rank;
      prevAgg = agg.aggregate;
    }

    await Promise.all(classAggregates.map((a) => a.save()));

    // ── Cohort rankings (all JHS 3 classes in this series) ──
    const cohortAggregates = await MockAggregate.find({
      seriesId,
      isComplete: true,
    }).sort({ aggregate: 1 });

    let cohortRank = 1;
    let prevCohortAgg = null;
    let cohortSameCount = 0;

    for (const agg of cohortAggregates) {
      if (prevCohortAgg !== null && agg.aggregate !== prevCohortAgg) {
        cohortRank += cohortSameCount;
        cohortSameCount = 1;
      } else {
        cohortSameCount++;
      }
      agg.cohortPosition = cohortRank;
      prevCohortAgg = agg.aggregate;
    }

    await Promise.all(cohortAggregates.map((a) => a.save()));

    return { classCount: classAggregates.length, cohortCount: cohortAggregates.length };
  } catch (err) {
    logger.error('mockExam.service recomputeRankings error:', err);
    throw err;
  }
}

module.exports = {
  computeGradeFromScore,
  recomputeAggregate,
  recomputeRankings,
};
