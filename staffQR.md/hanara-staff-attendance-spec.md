# HANARA SMS — Staff Attendance Module

| | |
|---|---|
| **System** | HANARA SMS (MERN Stack School Management System) |
| **Module** | Staff Attendance |
| **Stack** | React, Node.js/Express, MongoDB, Mongoose, Socket.io |
| **Context** | Ghana Education Service (GES) schools, Tamale, Ghana |
| **Compliance** | Ghana Data Protection Act, 2012 (Act 843) |

---

## 1. Overall Architecture

This module plugs into HANARA SMS the same way the existing Accountant and Mock Exam modules do — as a self-contained feature area with its own Mongoose collections, its own Express route group, and its own dashboard pages, wired into the existing role and permission system rather than introducing a parallel one.

```
                    HANARA SMS
                         │
           ┌─────────────┴─────────────┐
           │                           │
     Admin Dashboard             Staff Portal
           │
           ▼
   STAFF ATTENDANCE MODULE
           │
   ┌────────┴────────┐
   │                 │
QR Scanner       Attendance API
   │                 │
   └────────┬────────┘
            ▼
      Authentication
            │
            ▼
       Validation Engine
            │
   ┌────────┼─────────┐
   │        │         │
 Staff    Device    Location
 Verify   Verify     Verify
   │        │         │
   └────────┼─────────┘
            ▼
    MongoDB (Attendance Collections)
            │
   ┌────────┴────────┐
   │                 │
Attendance       Audit Logs
 Reports
```

Where relevant, this module reuses patterns already locked in for HANARA rather than inventing new ones:

- The **immutable-event + correction-log** pattern from the Accountant module's submission workflow governs how attendance records are corrected (see §20).
- **Socket.io** real-time delivery, already used for Accountant submissions, powers the live "Today's Attendance" dashboard (§13) as scans happen.
- The **System Administrator dual-capacity model** (`secondaryCapacities`) applies here too — an IT specialist who also teaches is still a single staff record with one attendance credential, not two.

---

## 2. Staff Registration

When an administrator creates a staff account (or edits an existing one), the following fields apply:

```
CREATE STAFF

First Name
Last Name
Staff ID
Email
Phone
Department
Position
Employment Type
Date Joined
Profile Photo
Status
```

Example:

```
Staff ID: HAN-2026-00421
Name: Abdul Rahman
Department: Mathematics
Position: Teacher
Status: Active
```

On creation, the system automatically generates a unique attendance credential tied to that staff document's `_id`. This should hook into the existing `Staff` collection rather than creating a duplicate identity — attendance is a capability on an existing staff record, not a new type of user.

---

## 3. Staff QR Credential

Personal information is never encoded directly into the QR.

```
Staff
   ↓
Generate secure random credential (crypto.randomBytes)
   ↓
Hash credential (bcrypt or SHA-256) before storing in MongoDB
   ↓
Generate QR image from the raw credential
```

The QR encodes an opaque token, something like:

```
HAN_ATT_7F9A2C8E...
```

MongoDB stores only the hash — never the raw credential — mirroring how HANARA already handles auth secrets elsewhere in the system.

**Staff profile (attendance panel):**

```
┌──────────────────────────────────────┐
│ STAFF PROFILE                        │
│                                      │
│       [ PHOTO ]                      │
│                                      │
│ Abdul Rahman                         │
│ HAN-2026-00421                       │
│ Mathematics Department               │
│ Mathematics Teacher                  │
│                                      │
│ Attendance Credential                │
│                                      │
│        ████████████                  │
│        ██ QR CODE ██                 │
│        ████████████                  │
│                                      │
│ [Download QR] [Regenerate QR]        │
└──────────────────────────────────────┘
```

If a QR is compromised, the admin can revoke and regenerate it. Revocation should immediately invalidate the old credential hash — there's no grace period.

---

## 4. Attendance Kiosk

A dedicated, low-interaction screen — this is the single most important UI in the module, since it's what staff face every morning.

```
┌────────────────────────────────────────────┐
│           TAMALE MODEL SCHOOL              │
│                                            │
│              STAFF ATTENDANCE              │
│                                            │
│          ┌──────────────────────┐          │
│          │                      │          │
│          │     CAMERA VIEW      │          │
│          │                      │          │
│          │      Scan QR         │          │
│          │                      │          │
│          └──────────────────────┘          │
│                                            │
│           Please scan your ID               │
│                                            │
│        Tuesday, 11 August 2026             │
│                08:04 AM                    │
└────────────────────────────────────────────┘
```

Built as a dedicated route in the React app (e.g. `/attendance/kiosk`), designed to run unattended on:

- Tablet
- School reception computer
- Android phone
- Laptop
- Dedicated touchscreen

It should require its own lightweight device-level auth (see §9) rather than a normal staff login session, since it sits in a public area of the school.

---

## 5. The Verification Process

When a QR is scanned at the kiosk:

```
SCAN QR
   ↓
Decode credential (client-side, from camera)
   ↓
POST to backend
   ↓
Verify credential hash
   ↓
Find staff document
   ↓
Check staff status (Active/Inactive)
   ↓
Check school/tenant context
   ↓
Check attendance session (is one currently open?)
   ↓
Check device authorization
   ↓
Check location (optional)
   ↓
Determine CHECK-IN / CHECK-OUT
   ↓
Write attendance_record + attendance_event (transaction)
   ↓
Emit Socket.io event to admin dashboard
   ↓
Return result to kiosk
```

The frontend never decides whether a scan is a check-in or check-out — that's a server-side determination based on the day's existing records for that staff member. This mirrors the "frontend never trusts client state" rule already applied to HANARA's grading and submission workflows.

---

## 6. Attendance States

Proper state machines, not booleans.

**Record states:**

```
NOT_STARTED
     ↓
CHECKED_IN
     ↓
CHECKED_OUT
```

**Event states:**

```
CHECK_IN
CHECK_OUT
REJECTED
```

**Example — first scan:**

```
✓ CHECK-IN SUCCESSFUL

Abdul Rahman
Mathematics Teacher

08:03:21 AM

Good morning, Abdul.
Have a productive day!
```

**Example — second scan:**

```
✓ CHECK-OUT SUCCESSFUL

Abdul Rahman
Mathematics Teacher

Check-in: 08:03 AM
Check-out: 04:17 PM

Total: 8h 14m
```

**Example — invalid scan:**

```
✕ ACCESS DENIED

QR credential is invalid or revoked.

Please contact administration.
```

---

## 7. Attendance Sessions

Rather than allowing scanning 24/7, an administrator defines attendance sessions per day.

```
MORNING ATTENDANCE
────────────────────────────
Date: 11 Aug 2026
Opens: 06:00 AM
Closes: 10:00 AM

Late after: 08:00 AM

Status: ACTIVE
```

```
06:00 – 07:59    PRESENT
08:00 – 10:00    LATE
After 10:00      SESSION CLOSED
```

Supports either a single daily check-in/check-out, or split sessions:

```
Morning Check-in
Morning Check-out

Afternoon Check-in
Afternoon Check-out
```

For most Ghanaian basic and senior high schools, a single daily session is likely the right default, with the split-session option available for schools that need it (e.g. boarding schools with separate morning/afternoon duty registers).

---

## 8. Late Attendance

Calculated automatically, never entered manually:

```
Expected arrival: 08:00 AM
Actual arrival:   08:17 AM

Status: LATE
Late by: 17 minutes
```

---

## 9. Authorized Devices

Every kiosk/scanner must be a registered, authorized device — this prevents someone from copying the kiosk URL and scanning from an unauthorized location.

```
Attendance Devices

DEVICE-001
Main Reception
Android Tablet
ACTIVE

DEVICE-002
Staff Entrance
Windows PC
ACTIVE

DEVICE-003
Administration Block
Tablet
ACTIVE
```

```
QR
 ↓
API
 ↓
Device ID (from device auth token, not user input)
 ↓
Is device authorized?
 ↓
YES → continue
NO  → reject
```

---

## 10. Location Verification

Registered devices can optionally have a fixed location for extra security.

```
School Campus
Latitude: 9.4075
Longitude: -0.8533

Allowed radius:
150 metres
```

The scanner sends `device_id`, `latitude`, `longitude`; the server checks whether the request falls within the permitted radius. This should be **configurable per device**, not global — GPS accuracy indoors (common in Ghanaian school buildings with limited signal) can be unreliable, so some schools may want it off entirely while others (e.g. schools with a history of proxy check-ins) want it strictly enforced.

---

## 11. Anti-Proxy Attendance

Staff shouldn't be able to send a QR screenshot to a colleague to "check them in." Three configurable security levels:

```
Standard
Staff QR + Authorized scanner

Secure
Staff QR + Authorized scanner + Location verification

High security
Staff QR + Authorized scanner + Location + Staff photo displayed after scan
```

**Example — high security scan:**

```
SCAN

        ↓

┌─────────────────────────────┐
│       ✓ VERIFIED            │
│                             │
│       [ STAFF PHOTO ]       │
│                             │
│       Abdul Rahman          │
│       HAN-2026-00421        │
│                             │
│       CHECK-IN              │
│       08:03 AM              │
└─────────────────────────────┘
```

Displaying the staff photo lets whoever is nearby the kiosk (a receptionist, a security officer, or just other staff) visually confirm the person scanning matches the account — a cheap and effective anti-proxy check that needs no extra hardware.

---

## 12. Audit Logs

Every scan attempt is recorded — successful, late, or rejected.

```
ATTENDANCE LOG

Timestamp
Staff
Event
Device
Location
Result
Reason
```

Example:

```
Time    Staff    Event       Result
07:58   Abdul    Check-in    Success
08:13   Mary     Check-in    Success
08:17   John     Check-in    Late
09:04   Unknown  Check-in    Rejected
16:12   Abdul    Check-out   Success
```

This is the record of truth if there's ever a dispute about whether someone was present.

---

## 13. Admin Dashboard

A dedicated **Staff Attendance** page in the existing HANARA admin dashboard, updated live via Socket.io as scans come in — the same real-time pattern already used for Accountant submissions.

**Top cards:**

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Present  │ │ Late     │ │ Absent   │ │ Working  │
│   142    │ │    18    │ │    31    │ │   137    │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

**Today's Attendance:**

```
Today's Attendance

Search staff...

[Department ▼] [Status ▼] [Date ▼]

Staff               Check-in    Check-out    Status

Abdul Rahman        07:58       16:14        ✓ Present
Mary Adams          08:12       --           • Working
John Mensah         08:23       --           • Late
Ibrahim Salifu      --          --           • Absent
```

---

## 14. Staff Attendance Profile

Clicking into an individual staff member's attendance record:

```
ABDUL RAHMAN
HAN-2026-00421

Attendance Rate
94.8%

This Month
────────────────────────────

Present       18
Late           2
Absent         1
Leave          1

Average Check-in
07:58 AM

Average Check-out
04:13 PM
```

With a calendar view:

```
August 2026

Mon Tue Wed Thu Fri
 3   4   5   6   7
 ✓   ✓   ✓   L   ✓

10  11  12  13  14
 ✓   ✓   -   -   -
```

---

## 15. Reports

**Daily report:**

```
11 August 2026

Total Staff: 191
Present: 142
Late: 18
Absent: 31
On Leave: 8
```

**Monthly report:**

```
August 2026

Staff       Present   Late   Absent   Rate

Abdul       18        2      1        94.8%
Mary        19        1      0        100%
John        16        4      2        88.9%
```

Export options:

```
[Export Excel]
[Export PDF]
```

---

## 16. Database Design (MongoDB / Mongoose)

Separate collections, consistent with how HANARA already separates `MockExamSeries`/`MockExamResult` from the regular gradebook, and Accountant submissions from the main fee ledger.

**Collections:**

- `users`
- `staff`
- `attendanceSessions`
- `attendanceRecords`
- `attendanceEvents`
- `attendanceDevices`
- `attendanceCredentials`
- `departments`
- `workSchedules`
- `holidays`
- `leaveRequests`

**`attendanceRecords`**

```js
{
  _id,
  staffId,        // ref: Staff
  date,
  sessionId,      // ref: AttendanceSession
  checkInAt,
  checkOutAt,
  checkInStatus,  // PRESENT | LATE
  checkOutStatus,
  totalMinutes,
  createdAt,
  updatedAt
}
```

**`attendanceEvents`**

```js
{
  _id,
  staffId,        // ref: Staff
  deviceId,       // ref: AttendanceDevice
  eventType,      // CHECK_IN | CHECK_OUT | REJECTED
  timestamp,
  latitude,
  longitude,
  ipAddress,
  result,
  failureReason,
  metadata
}
```

**`attendanceCredentials`**

```js
{
  _id,
  staffId,        // ref: Staff
  credentialHash,
  status,         // ACTIVE | REVOKED
  issuedAt,
  expiresAt,
  revokedAt
}
```

---

## 17. API Design (Express)

```
POST   /api/attendance/scan
GET    /api/attendance/today
GET    /api/attendance/staff/:id
GET    /api/attendance/reports
GET    /api/attendance/events
POST   /api/attendance/sessions
PATCH  /api/attendance/sessions/:id
POST   /api/attendance/devices
PATCH  /api/attendance/devices/:id
POST   /api/staff/:id/qr/regenerate
POST   /api/staff/:id/qr/revoke
```

**The core endpoint:**

```
POST /api/attendance/scan
```

Request:

```json
{
  "credential": "QR_TOKEN",
  "deviceId": "DEVICE-001",
  "latitude": 9.4075,
  "longitude": -0.8533
}
```

Server flow (wrapped in a Mongoose transaction where the record and event are written together):

```
Authenticate request (device token)
       ↓
Validate device
       ↓
Validate credential
       ↓
Find staff
       ↓
Check staff status
       ↓
Check session
       ↓
Check location
       ↓
Determine event
       ↓
Write attendance record
       ↓
Write audit event
       ↓
Emit Socket.io update
       ↓
Return response
```

---

## 18. Security Rules

Non-negotiable, in line with the security posture already established for HANARA's Accountant and grading modules:

**Never:**

- ✕ Trust staff ID from the frontend
- ✕ Trust check-in/check-out status from the frontend
- ✕ Store passwords or PII inside the QR
- ✕ Allow unlimited scanning
- ✕ Allow unregistered devices
- ✕ Allow direct database manipulation of attendance records

**Always:**

- ✓ HTTPS
- ✓ Random, hashed credentials
- ✓ Server-side validation of every field
- ✓ Rate limiting on `/api/attendance/scan`
- ✓ Authorized devices only
- ✓ Full audit logging
- ✓ Role-based access control
- ✓ Credential revocation support
- ✓ Mongoose transactions for record+event writes
- ✓ Timezone-aware timestamps (Africa/Accra, GMT, no DST)

---

## 19. Roles

Builds on HANARA's existing role system rather than introducing a new one — including the dual-capacity model already specced for the System Administrator.

**Super Admin**
- Manage attendance
- Manage devices
- Configure sessions
- Generate reports
- View audit logs
- Regenerate QR credentials

**Admin**
- View attendance
- Manage staff attendance
- Generate reports
- Manage QR credentials

**Attendance Officer** *(new, scoped role — could be a `secondaryCapacity` on an existing staff account, e.g. a receptionist)*
- Scan QR (via kiosk device auth)
- View today's attendance
- Correct attendance with authorization

**Staff**
- View own attendance
- View attendance history
- View working hours
- View attendance statistics

Staff can never modify their own attendance record — read-only access only, same as the existing HANARA principle that students/staff never self-attest data that feeds into official records.

---

## 20. Manual Corrections

Legitimate situations happen — "I checked in but the scanner was offline."

An administrator can correct a record, but **never silently**. This follows the same immutable-event + correction-log pattern already locked in for the Accountant module's submission workflow: the original event stays untouched, and a correction is layered on top of it with full attribution.

```
Original:
08:17 AM

Correction:
08:02 AM

Reason:
Scanner malfunction

Changed by:
Admin John

Changed at:
08:30 AM
```

That correction is written to the audit log alongside the original event — never as an in-place overwrite.

---

## 21. Offline Mode

Particularly relevant for Ghanaian schools, where connectivity can be unreliable — this is a genuinely valuable feature rather than a nice-to-have.

The kiosk (as a PWA or lightweight local cache) can temporarily store attendance events client-side when offline:

```
Internet unavailable

✓ Attendance recorded locally

Pending synchronization: 4
```

On reconnect:

```
Local device
     ↓
Sync API
     ↓
Server (re-validates every event)
     ↓
MongoDB
```

The server re-validates every synced event and de-duplicates against `attendanceEvents` before writing — a device coming back online should never be able to create duplicate check-ins for the same staff member on the same day.
