# HANARA SMS — System Administrator Role Specification

**Module:** Role & Access Management — System Administrator
**Author:** Fareed
**Status:** Draft for build (Antigravity kickoff source)
**Scope:** This document defines the System Administrator role end-to-end — permissions, data models, panel features, API surface, restrictions, and audit requirements — for the HANARA School Management System (MERN stack, Tamale-based private basic school, Nursery–JHS).

---

## 1. Why This Role Exists

Every other role in HANARA answers "what is happening at the school" — grades, attendance, fees, communication. The System Administrator answers a different question: "is the system itself healthy, secure, and correctly configured." He is not an academic authority and should never be positioned as one. His actions should be operational and reversible where possible, heavily logged, and scoped away from academic content.

This separation matters for Ghana Data Protection Act 2012 (Act 843) compliance too — you want a clean answer to "who can see student data" that doesn't collapse into "everyone with an admin-sounding title."

The Head Teacher owns *decisions*. The System Administrator owns *infrastructure*. Where the two roles' permissions might overlap (e.g. account creation), the Head Teacher should request changes through the System Administrator rather than both having direct write access to the same tables — this keeps a single source of accountability.

**Real-world wrinkle:** HANARA's IT specialist also teaches some classes. This is common at a small private school — you don't hire a full-time IT person and a full-time teacher separately when one person can do both. The system needs to model this honestly rather than forcing an artificial choice between "he's an admin" or "he's a teacher." He is both, and the two identities need to stay cleanly separated in what they're allowed to touch, even though they live on the same account.

---

## 2. Role Definition

**Role name in schema:** `system_admin`, with an additional **secondary teaching capacity** rather than a second full role. This is the cleanest way to model "one person, two hats" without duplicating accounts or fighting your own auth system every time he logs in.

**Sits in the same `User` polymorphic collection** as Head Teacher, Teacher, Parent, Accountant, using your existing polymorphic user-to-person linkage pattern. Unlike a pure System Administrator, this account *does* need a linked "Person"/teaching profile — because as a teacher he has a real academic footprint: assigned subjects, classes, gradebook entries, attendance records.

```javascript
// User document shape (extension of existing polymorphic model)
{
  _id: ObjectId,
  email: String,
  passwordHash: String,
  role: "system_admin",
  secondaryCapacities: ["teacher"], // array — supports future combos without a schema change
  isActive: Boolean,
  isSuperAdmin: Boolean, // true only for the founding/primary IT specialist account
  createdAt: Date,
  lastLoginAt: Date,
  twoFactorEnabled: Boolean,
  personRef: ObjectId // ref TeacherProfile — populated because he teaches
}
```

```javascript
// TeacherProfile — same shape as any other teacher, linked via personRef
{
  _id: ObjectId,
  userId: ObjectId, // ref User
  firstName: String,
  lastName: String,
  assignedSubjects: [ObjectId], // ref SubjectAssignment
  assignedClasses: [ObjectId], // ref Class
  employeeId: String,
  isActive: Boolean
}
```

A note on `isSuperAdmin`: if HANARA ever has more than one technical person (e.g. a junior IT assistant later), you'll want a distinction between someone who can manage other system_admin accounts and someone who can't. Build this flag in now even if there's only one admin today — retrofitting a permission tier later is much more painful than adding an unused boolean now.

**Why `secondaryCapacities` as an array rather than a boolean `isTeacher` flag:** it costs nothing extra to build and saves you a migration if another admin later also coaches a club, or a teacher later takes on light IT duties. Small upfront flexibility, no real added complexity.

---

## 3. Permissions Matrix

| Capability | System Admin | Head Teacher | Notes |
|---|---|---|---|
| Create/deactivate user accounts | ✅ Full | ❌ Request only | HT submits a request; Admin executes |
| Assign roles & subject/class links | ✅ Full | 👁️ View only | Ties into `SubjectAssignment` junction |
| Reset passwords | ✅ Full | ❌ | |
| View/edit student grades | ⚠️ Scoped — own assigned classes only | ✅ All classes | See Section 7.1 — teaching capacity, not admin capacity |
| View/edit attendance | ⚠️ Scoped — own assigned classes only | ✅ All classes | Same scoping rule |
| View/edit fee records or waivers | ❌ | ✅ Accountant/HT | Admin sees payment *system* status, not fee *decisions* |
| System settings (academic year, term dates, grading thresholds) | ✅ Full | 👁️ View only | |
| School branding/report card templates | ✅ Full | ✅ Full | Shared — HT may want content control here |
| SMS/integration configuration (mNotify, Hubtel, Paystack keys) | ✅ Full | ❌ | Highest-sensitivity credentials |
| Backup trigger & restore | ✅ Full | ❌ | |
| Audit log access | ✅ Full | 👁️ Own actions only | |
| Data protection requests (export/delete) | ✅ Execute | ✅ Approve | Two-person action — see Section 8 |
| Bulk data export (all students) | ✅ With approval flag | ✅ Approve | Logged as sensitive |

**Important distinction:** the "scoped" grade/attendance row above is granted through his *teacher* capacity, evaluated against `TeacherProfile.assignedClasses` — not through his `system_admin` role. His admin permissions never grant him blanket access to grades; if he's ever removed from a teaching assignment, that access disappears automatically without anyone having to remember to revoke an admin override.

---

## 4. Core Data Models

### 4.1 SystemSetting (key-value config table)

You've already built the typed wrapper pattern for this — the System Admin panel is essentially the UI layer on top of it.

```javascript
{
  _id: ObjectId,
  key: String, // e.g. "academic_year.current", "grading.bece_pass_threshold"
  value: Mixed,
  valueType: String, // "string" | "number" | "boolean" | "date" | "json"
  category: String, // "academic" | "branding" | "integration" | "security"
  editableBy: [String], // ["system_admin"] or ["system_admin", "head_teacher"]
  lastModifiedBy: ObjectId, // ref User
  lastModifiedAt: Date,
  description: String // shown as tooltip in the panel
}
```

### 4.2 AuditLog

This is the single most important collection in this whole spec. Every sensitive action across the *entire system* — not just Admin actions — should write here.

```javascript
{
  _id: ObjectId,
  actorId: ObjectId, // ref User
  actorRole: String,
  action: String, // "grade.update" | "account.create" | "settings.change" | "backup.restore" | ...
  targetType: String, // "Student" | "User" | "SystemSetting" | "Payment" | ...
  targetId: ObjectId,
  beforeValue: Mixed, // snapshot pre-change, omitted if not applicable
  afterValue: Mixed,
  ipAddress: String,
  timestamp: Date,
  severity: String // "info" | "sensitive" | "critical"
}
```

Index on `actorId`, `targetId`, and `timestamp` — the panel needs to answer "show me everything this person did" and "show me everything that happened to this record" equally fast.

### 4.3 IntegrationHealth

```javascript
{
  _id: ObjectId,
  service: String, // "mnotify_sms" | "hubtel_sms" | "paystack" | "momo_webhook"
  status: String, // "healthy" | "degraded" | "down"
  lastCheckedAt: Date,
  lastSuccessAt: Date,
  lastFailureAt: Date,
  lastFailureReason: String,
  creditsRemaining: Number, // for SMS providers, nullable
  metadata: Mixed
}
```

This gets updated by a scheduled job (cron or a queue worker) that pings each provider's status/balance endpoint, plus updated reactively whenever a webhook fails.

### 4.4 BackupRecord

```javascript
{
  _id: ObjectId,
  type: String, // "daily" | "weekly" | "monthly" | "manual"
  triggeredBy: ObjectId, // ref User, null if automated
  status: String, // "completed" | "failed" | "in_progress"
  fileLocation: String, // storage path/URL
  fileSizeBytes: Number,
  createdAt: Date,
  retentionExpiresAt: Date, // per grandfather-father-son policy
  restoredFrom: Boolean // true if this record represents a restore action, not a backup
}
```

### 4.5 DataProtectionRequest

```javascript
{
  _id: ObjectId,
  requestType: String, // "export" | "delete"
  subjectType: String, // "Student" | "Parent" | "Staff"
  subjectId: ObjectId,
  requestedBy: String, // name/contact of requesting parent/guardian
  approvedBy: ObjectId, // ref User, must be head_teacher or system_admin with isSuperAdmin
  executedBy: ObjectId, // ref User, system_admin
  status: String, // "pending_approval" | "approved" | "executed" | "rejected"
  createdAt: Date,
  executedAt: Date
}
```

---

## 5. Panel Features (Full Breakdown)

### 5.0 Dual-Mode Navigation

Because this account carries two hats, the UI should make that explicit rather than merging everything into one confusing menu. On login, he lands on the System Admin dashboard by default, with a clearly labeled switch — something like a toggle or tab at the top of the screen reading **"Admin Panel" / "My Classes"** — that takes him into the ordinary Teacher interface scoped to his `assignedClasses`. This isn't just cosmetic: it reinforces that grading and attendance happen through the *teacher* surface, using the same components every other teacher sees, not through some special admin-only gradebook. One account, two clearly separated workspaces.

### 5.1 Dashboard (landing screen)
- System health tiles: API status, database connection status, last successful backup timestamp, storage used vs. limit
- Integration status strip: SMS credits remaining, last SMS batch delivery rate, last Paystack webhook received timestamp
- Recent critical audit log entries (last 10, filtered to `severity: critical`)
- Active user count by role, with a quick link to accounts flagged inactive 30+ days

### 5.2 User & Access Management
- Searchable/filterable user table (by role, status, last login)
- Create account flow: role selection, linked person profile (for teachers/parents), auto-generated temp password with forced reset on first login
- Deactivate/reactivate toggle (soft delete only — never hard-delete a user tied to academic records)
- Password reset action (generates reset link, does not display the new password to the admin)
- Role/subject/class assignment editor, wired to `SubjectAssignment`
- Bulk import for start-of-year account creation (CSV upload → staged review → confirm)

### 5.3 System Settings
- Grouped by category (Academic, Branding, Integration, Security) matching `SystemSetting.category`
- Academic: current academic year, term start/end dates, BECE aggregate threshold, CA/exam weighting (30/70)
- Branding: school logo upload, report card color scheme, letterhead template
- Integration: API keys for mNotify/Hubtel/Paystack — masked in the UI (show last 4 characters only), with a "reveal" action that is itself logged
- Security: session timeout duration, password policy, 2FA enforcement toggle

### 5.4 Integration Monitor
- Per-service card: current status, uptime over last 7/30 days, credits/balance where applicable
- SMS delivery log: batch sent, delivered, failed counts, with drill-down to failed recipient numbers
- Payment webhook log: incoming events, matched/unmatched status, manual "reconcile" action for a payment that shows as received in Paystack but not reflected in the student's fee record
- Manual "test connection" button per integration

### 5.5 Backup & Restore
- Backup history table (type, date, size, status)
- "Run backup now" action, disabled/queued if one is already in progress
- Restore flow: select backup point → confirmation modal showing what will be overwritten → second confirmation requiring the admin to type the school name → execute
- Retention policy display (grandfather-father-son visualized as a simple timeline, not just a list)

### 5.6 Audit Log Viewer
- Filterable by actor, action type, target, date range, severity
- Every row expandable to show before/after value diff
- Export to CSV for compliance reporting (this export action itself gets logged)

### 5.7 Data Protection Center
- Queue of pending export/delete requests
- Approve/reject workflow requiring a second authorized user (System Admin cannot both submit and approve the same request — see Section 8)
- Execution log tied to `DataProtectionRequest`

---

## 6. API Endpoint Surface

```
POST   /api/admin/users                     — create account
PATCH  /api/admin/users/:id/status           — activate/deactivate
POST   /api/admin/users/:id/reset-password   — trigger reset
PATCH  /api/admin/users/:id/assignments      — update subject/class links

GET    /api/admin/settings                   — list all settings (filtered by category)
PATCH  /api/admin/settings/:key              — update a setting (writes AuditLog)

GET    /api/admin/integrations/status        — current health snapshot
POST   /api/admin/integrations/:service/test — manual connection test
POST   /api/admin/integrations/payments/reconcile/:paymentId

GET    /api/admin/backups                    — list backup history
POST   /api/admin/backups/run                — trigger manual backup
POST   /api/admin/backups/:id/restore         — restore (requires confirmation token)

GET    /api/admin/audit-logs                 — query with filters
GET    /api/admin/audit-logs/export           — CSV export

POST   /api/admin/data-requests               — submit request
PATCH  /api/admin/data-requests/:id/approve
PATCH  /api/admin/data-requests/:id/execute
```

Every route under `/api/admin/*` should sit behind a single middleware that checks `role === "system_admin"`, and every mutating route should write to `AuditLog` automatically via a shared post-action hook rather than each controller remembering to log manually — that's the kind of thing that gets forgotten under deadline pressure and quietly breaks your compliance story.

---

## 7. Hard Restrictions (Explicitly Out of Scope for This Role)

These aren't oversights — they're deliberate boundaries that keep the audit trail meaningful and keep academic authority where it belongs.

### 7.1 The Teaching Exception

Since he genuinely teaches some classes, he **can** enter grades and mark attendance — but only for the specific classes/subjects listed in his own `TeacherProfile.assignedClasses`, through the exact same Teacher UI and API routes every other teacher uses. He should not have a special "admin override" path into the gradebook. Concretely:

- The gradebook/attendance routes check `assignedClasses` regardless of whether the requester also happens to be `system_admin` — the admin role grants zero extra reach into academic records.
- If he tries to open a class he doesn't teach, he's blocked exactly like any other teacher would be, full stop — no silent bypass "because he's the admin."
- Every grade/attendance action he takes logs to `AuditLog` with `actorRole: "system_admin"` **and** a `actingAs: "teacher"` field, so a compliance review can immediately tell these apart from his infrastructure actions instead of them blending into one undifferentiated admin activity stream.

### 7.2 Everything Else Stays Restricted

- **No grade entry or editing outside his own assigned classes.** For any other class, the same rule applies as before: the actual teacher or Head Teacher makes the change; he can unlock a record past its edit window, and that unlock is logged as a sensitive action.
- **No attendance marking outside his own assigned classes.**
- **No fee waivers or manual fee adjustments.** He can reconcile a *payment record* against a *webhook event* (a technical sync issue), but he cannot forgive or alter a fee amount.
- **No curriculum or report card content edits** beyond the template/branding layer.
- **No unilateral data deletion.** Every delete tied to `DataProtectionRequest` needs the two-person approval flow in Section 8.
- **No visibility into parent-teacher messaging content** — he can see delivery *status* of SMS batches, not the substance of communications, unless a specific dispute requires escalated access (which should itself be a logged, time-boxed exception).
- **No self-assignment of new classes.** He cannot add himself to `assignedClasses` through the admin panel — that assignment has to come from the Head Teacher, the same way any teacher's timetable is set. This closes the obvious loophole where "System Admin can edit subject/class links" would otherwise let him quietly expand his own teaching (and therefore grading) reach.

---

## 8. Two-Person Rule for Destructive/Sensitive Actions

For a school system, a few actions are dangerous enough that no single account — including the System Admin's — should be able to do them alone:

1. **Student data deletion** (Act 843 "right to erasure" requests): requires Head Teacher approval before the System Admin executes.
2. **Full database restore from backup**: requires a secondary confirmation step (typing the school name) — this isn't a second human necessarily, but it's a deliberate friction point against fat-fingered restores.
3. **Revealing masked integration API keys**: allowed solo, but always logged at `severity: critical`.
4. **Creating another `system_admin` account**: only an account with `isSuperAdmin: true` can do this.

---

## 9. Security Requirements Specific to This Role

- **2FA should be mandatory** for `system_admin` accounts, not just optional — this account has the widest blast radius in the system.
- **Session timeout shorter than other roles** (e.g. 30 minutes idle vs. 2 hours for teachers) given the sensitivity of what's accessible.
- **IP logging on every login**, surfaced in a "recent admin logins" widget so anomalies are visible without digging through raw logs.
- **API keys for third-party integrations should never be stored in plaintext** — encrypt at rest, decrypt only server-side when making the actual API call, never return the decrypted value to the frontend except in the deliberate masked "reveal" flow.

---

## 10. Suggested Build Order (for Antigravity Phases)

1. `system_admin` role + auth middleware + polymorphic User extension, including `secondaryCapacities` and the linked `TeacherProfile`
2. AuditLog collection + shared logging hook wired into existing mutation routes (including the `actingAs` field for dual-role actions)
3. User & Access Management panel (highest daily-use value)
4. SystemSetting collection + Settings panel
5. IntegrationHealth monitoring (scheduled job + dashboard cards)
6. BackupRecord + backup/restore flow
7. DataProtectionRequest + two-person approval workflow
8. Dashboard tying all health signals together (build last, since it depends on everything above existing)

This order front-loads the pieces that give you (as the actual IT specialist) visibility and control early, and leaves the polish/dashboard for once the underlying data is actually flowing.