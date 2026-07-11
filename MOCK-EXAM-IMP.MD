# HANARA SMS — JHS 3 Mock Exam Module Specification

**Module:** Assessment — Mock Exam Entry & Reporting (JHS 3 / BECE Candidates)
**Author:** Fareed
**Status:** Draft for build (Antigravity kickoff source)
**Depends on:** `SubjectAssignment`, `TeacherProfile`, `System Administrator` role spec (dual-capacity model), existing BECE 9-point grading engine

---

## 1. Design Principle

Mock exams simulate BECE conditions for JHS 3 candidates. They are **not** part of the regular termly CA/exam pipeline (30/70 weighting) and must never touch official report cards. Keeping this as a fully separate collection set — reusing only the grading *logic*, not the data tables — means a bad mock score can never accidentally leak into a student's real academic record, and mock data can be wiped/archived independently each BECE cycle without any risk to permanent records.

**Workflow shape, as confirmed:**
1. JHS 3 subject teachers enter scores for their own subject only.
2. Once a teacher submits a subject's scores, that subject becomes visible in a dedicated **"JHS 3 Mock"** section on the System Administrator and Head Teacher panels.
3. Aggregates, rankings, and PDF slips are generated once enough subjects are in.

---

## 2. Data Models

### 2.1 MockExamSeries

Series count varies year to year, so this is a plain configurable collection, not a hardcoded enum. The Head Teacher or System Admin creates a new series whenever the school schedules one.

```javascript
{
  _id: ObjectId,
  name: String,            // "Mock 1", "Mock 2", "March Mock" — free text
  academicYear: String,    // "2025/2026"
  order: Number,           // sequence for trend charts, set at creation
  status: String,          // "open" | "closed"
  createdBy: ObjectId,     // ref User (system_admin or head_teacher)
  createdAt: Date,
  closedAt: Date
}
```

### 2.2 MockSubjectEntry

Tracks each class-subject's submission status within a series — this is the row that drives the "appears in Admin/HT panel once submitted" behavior.

```javascript
{
  _id: ObjectId,
  seriesId: ObjectId,      // ref MockExamSeries
  classId: ObjectId,       // ref Class (JHS 3 stream, e.g. "JHS 3A")
  subjectId: ObjectId,     // ref Subject
  teacherId: ObjectId,     // ref User — who entered it
  isCore: Boolean,         // English, Math, Science, Social Studies = true
  status: String,          // "draft" | "submitted" | "reopened"
  studentCount: Number,    // total students expected
  enteredCount: Number,    // scores actually entered so far
  submittedAt: Date,
  reopenedBy: ObjectId,    // ref User, set if HT/Admin unlocks after submit
  reopenedAt: Date
}
```

### 2.3 MockExamResult

One row per student per subject per series — the actual scores.

```javascript
{
  _id: ObjectId,
  seriesId: ObjectId,
  subjectEntryId: ObjectId, // ref MockSubjectEntry
  studentId: ObjectId,
  classId: ObjectId,
  subjectId: ObjectId,
  rawScore: Number,         // 0–100
  grade: Number,            // 1–9, computed via existing BECE grading engine
  enteredBy: ObjectId,
  enteredAt: Date,
  updatedAt: Date
}
```

### 2.4 MockAggregate

Computed, not manually entered. Recalculated whenever a relevant `MockExamResult` changes, but only marked final once all required subjects are in.

```javascript
{
  _id: ObjectId,
  seriesId: ObjectId,
  studentId: ObjectId,
  classId: ObjectId,
  coreGrades: [{ subjectId: ObjectId, grade: Number }],       // all 4 core
  electiveGrades: [{ subjectId: ObjectId, grade: Number }],   // all electives taken
  bestElectivesUsed: [{ subjectId: ObjectId, grade: Number }],// best 2 of electives
  aggregate: Number,        // sum of 4 core + best 2 elective grades (6–30, lower is better)
  classPosition: Number,
  cohortPosition: Number,   // across all JHS 3 streams
  isComplete: Boolean,      // true once all 4 core + at least 2 electives are submitted
  computedAt: Date
}
```

---

## 3. Entry Workflow (Teacher Side)

1. Teacher opens **"Mock Exams"** from their normal Teacher dashboard — scoped to `TeacherProfile.assignedClasses` ∩ JHS 3, exactly like the dual-capacity scoping already defined for the System Admin's teaching side.
2. Selects the active `MockExamSeries` and their subject/class combination — this auto-creates or loads the relevant `MockSubjectEntry` in `status: "draft"`.
3. Bulk score entry grid: one row per student, raw score 0–100. Grade (1–9) computes live as they type, using the existing grading engine.
4. Teacher can save as draft repeatedly — partial entry is fine, `enteredCount` tracks progress.
5. **Submit** button — enabled only once `enteredCount === studentCount`. This flips `MockSubjectEntry.status` to `"submitted"`, stamps `submittedAt`, and is the exact trigger that makes this subject appear in the Admin/HT "JHS 3 Mock" section.
6. After submission, the teacher's grid becomes read-only. If a correction is needed, they cannot self-reopen — this mirrors the existing lock/unlock pattern from the System Admin spec, and requires a Head Teacher or System Admin to reopen it (`status: "reopened"`), which is logged.

---

## 4. Admin / Head Teacher Side — "JHS 3 Mock" Section

This is a shared view available to both `system_admin` and `head_teacher` roles.

### 4.1 Submission Matrix
A table: rows = JHS 3 subjects (core + electives), columns = classes/streams. Each cell shows submission status (pending / submitted, with teacher name and timestamp). This is the at-a-glance view of "who's submitted, who hasn't" — genuinely useful two days before a reporting deadline.

### 4.2 Student Drill-Down
Click into any student to see their full mock result card for the series: all submitted subject scores/grades, running aggregate (marked "provisional" if not all required subjects are in yet, "final" once `isComplete: true`), and class/cohort position once final.

### 4.3 Reopen Action
Head Teacher or System Admin can reopen a submitted subject for correction — this writes to `AuditLog` at `severity: sensitive`, same pattern as the grade-unlock action defined in the System Admin spec.

### 4.4 Trend View
Per-student and per-class aggregate movement across series (Mock 1 → Mock 2 → Mock 3), so declining or improving performance is visible before the actual BECE.

---

## 5. PDF Result Slip

Generated per student, on demand or in bulk per class, once a series is far enough along to be meaningful (typically once `isComplete` for that student, though Admin/HT can force-generate a partial slip if needed).

**Slip contents:**
- School header/branding (pulled from `SystemSetting` — reuses the branding config from the System Admin panel)
- Student name, class, series name, academic year
- Table of subjects: subject name, raw score, grade
- Aggregate score, with core/elective breakdown clearly separated
- Class position and cohort position (omitted if not yet final)
- Trend line/table if prior series exist for this student
- Generated timestamp and "This is a mock assessment, not an official BECE result" disclaimer — small but important, so a slip never gets mistaken for a real WAEC document

**Generation approach:** built with the same PDF generation pattern already used for other HANARA documents — a template-driven layout rather than one-off code per slip, so report card and mock slip styling stay visually consistent.

**Bulk generation:** a single action from the class drill-down generates a zipped batch of slips for the whole class — useful for parents' meetings where the school hands out all mock results at once.

---

## 6. API Endpoint Surface

```
POST   /api/mock-exams/series                          — create series (admin/HT)
GET    /api/mock-exams/series                           — list series
PATCH  /api/mock-exams/series/:id/close                 — close series

GET    /api/mock-exams/:seriesId/my-entries              — teacher's own subject/class combos
POST   /api/mock-exams/:seriesId/entries/:entryId/scores — bulk save scores (draft)
PATCH  /api/mock-exams/:seriesId/entries/:entryId/submit — teacher finalizes
PATCH  /api/mock-exams/:seriesId/entries/:entryId/reopen — admin/HT only, logged

GET    /api/mock-exams/:seriesId/matrix                  — submission status matrix (admin/HT)
GET    /api/mock-exams/:seriesId/students/:studentId      — full result + aggregate
GET    /api/mock-exams/:seriesId/rankings                 — class/cohort positions
GET    /api/mock-exams/:seriesId/trend/:studentId          — cross-series trend

POST   /api/mock-exams/:seriesId/students/:studentId/slip  — generate single PDF
POST   /api/mock-exams/:seriesId/classes/:classId/slips     — bulk generate (zip)
```

Every route under `/api/mock-exams/*` checks the requester's role and, for teacher routes, cross-checks `TeacherProfile.assignedClasses` — same enforcement pattern as the rest of the system, no special-cased bypass for admin accounts.

---

## 7. Permissions Summary

| Action | JHS3 Subject Teacher | Head Teacher | System Admin |
|---|---|---|---|
| Create/close mock series | ❌ | ✅ | ✅ |
| Enter/edit own subject scores (pre-submit) | ✅ | ❌ | ✅ (if teaching capacity applies) |
| Submit own subject | ✅ | ❌ | ✅ (if teaching capacity applies) |
| Edit scores post-submission | ❌ | ❌ (must reopen first) | ❌ (must reopen first) |
| Reopen a submitted subject | ❌ | ✅ | ✅ |
| View submission matrix | ❌ (own subject only) | ✅ Full | ✅ Full |
| View student aggregates/rankings | ❌ (own subject only) | ✅ Full | ✅ Full |
| Generate PDF slips | ❌ | ✅ | ✅ |

If the System Admin himself teaches a JHS 3 subject, his entry follows the exact same teacher-side rules and UI as any other teacher — no shortcuts through the admin panel — consistent with the dual-capacity boundary already established for his role.

---

## 8. Suggested Build Order

1. `MockExamSeries` + `MockSubjectEntry` collections, series create/close endpoints
2. Teacher-side entry grid: score input, draft save, submit action
3. `MockExamResult` writes + live grade computation via existing grading engine
4. Admin/HT "JHS 3 Mock" section: submission matrix + student drill-down
5. `MockAggregate` computation job (triggered on result save, recalculates core/elective/aggregate/isComplete)
6. Ranking computation (class + cohort position)
7. Reopen flow + audit logging
8. PDF slip generation (single, then bulk/zip)
9. Trend view across series (last, since it depends on 2+ series existing with real data)

This order gets teachers entering real scores early, and pushes the more polish-heavy pieces (trend charts, bulk PDFs) to the end once the core data pipeline is proven.