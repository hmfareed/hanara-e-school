full architecture and flow












Yes. The cleanest way to build this is to treat GPS attendance as a server-side location verification system, not simply as “the teacher's browser says they are at school.”
For your school, I would structure it around branches → assigned staff → attendance rules → GPS geofence → check-in/check-out records.
One important point first: browser GPS is not perfectly exact. The device reports a position plus an accuracy estimate, and high-accuracy mode can improve results but may take longer and consume more battery. Geolocation also requires HTTPS and user permission. GitHub
So don't make the rule “latitude must exactly equal the school's latitude.” Instead, use a geofence radius + GPS accuracy validation.
1. Your school's attendance structure
You effectively have two permanent attendance locations:
Branch	Classes	Attendance Location
Zogbeli	Nursery → Primary 4	Zogbeli GPS geofence
Vittin	Primary 5 → JHS 3	Vittin GPS geofence


Each teacher should have a permanent branchId.
For example:
Teacher
 ├── branchId: zogbeli
 ├── assignedClasses: Nursery 2, Primary 1
 └── attendanceEnabled: true
Another teacher:
Teacher
 ├── branchId: vittin
 ├── assignedClasses: Primary 6
 └── attendanceEnabled: true
The teacher does not choose the branch when checking in.
The system already knows their branch.
That is important because otherwise a Zogbeli teacher could potentially select Vittin manually.
2. Admin GPS configuration
Your Super Admin/Admin should have:
Settings → Attendance → Branch Locations
Then:
Zogbeli
Branch Name
Zogbeli Branch

Address
Zogbeli, Tamale

Latitude
[ 9.xxxxx ]

Longitude
[-0.xxxxx ]

Geofence Radius
[ 100 ] meters

GPS Accuracy Requirement
[ 50 ] meters

Check-in
Enabled

Check-out
Enabled
And:
Vittin
Branch Name
Vittin Branch

Address
Vittin, Tamale

Latitude
[ 9.xxxxx ]

Longitude
[-0.xxxxx ]

Geofence Radius
[ 100 ] meters

GPS Accuracy Requirement
[ 50 ] meters

Check-in
Enabled

Check-out
Enabled
I recommend initially using something around 75–150 meters depending on the physical size of each school compound.
Don't blindly use 10 meters. GPS on ordinary phones can fluctuate considerably.
3. How the admin should configure the GPS
Don't make the admin manually type coordinates.
Give them a "Set Location From My Device" button.
The flow:
Admin opens Zogbeli Branch
        ↓
Clicks "Configure GPS"
        ↓
Map opens
        ↓
Admin goes physically to school
        ↓
Clicks "Use My Current Location"
        ↓
System requests GPS permission
        ↓
System obtains coordinates
        ↓
Shows marker on map
        ↓
Admin adjusts marker if necessary
        ↓
Admin selects geofence radius
        ↓
Preview geofence circle
        ↓
"Save Location"
For example:
             ZOGBELI SCHOOL
                    ●
             ┌───────────────┐
             │               │
             │   SCHOOL      │
             │   COMPOUND    │
             │       ●       │
             │               │
             └───────────────┘
                  100m
                geofence
The admin should see:
Location accuracy: 8 meters

GPS status: Good

Geofence radius: 100 meters

Then:
Save Branch Location
4. Don't store just latitude and longitude
Your branch location should have a proper configuration object.
Something like:
BranchLocation
--------------------------
id
branchId
latitude
longitude
radiusMeters
maxGpsAccuracyMeters
enabled
createdAt
updatedAt
configuredBy
Example:
{
  "branchId": "zogbeli",
  "latitude": 9.XXXXXX,
  "longitude": -0.XXXXXX,
  "radiusMeters": 100,
  "maxGpsAccuracyMeters": 50,
  "enabled": true
}
The important values are:
latitude
School's latitude.
longitude
School's longitude.
radiusMeters
How far from the configured point a teacher may be.
maxGpsAccuracyMeters
How inaccurate a GPS reading you're willing to accept.
5. The actual check-in experience
The teacher's dashboard should have an attendance card.
For example:
┌──────────────────────────────────┐
│       TODAY'S ATTENDANCE         │
│                                  │
│  Monday, August 17               │
│                                  │
│  Zogbeli Branch                  │
│                                  │
│  Check-in                        │
│  Not checked in                  │
│                                  │
│      [ CHECK IN ]                │
│                                  │
│  Location required               │
└──────────────────────────────────┘
Teacher taps:
CHECK IN
Then:
Checking your location...
The browser requests GPS.
Use something equivalent to:
navigator.geolocation.getCurrentPosition(
  success,
  error,
  {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  }
);
maximumAge: 0 is useful here because you don't want an old cached location being treated as the teacher's current location, while enableHighAccuracy: true asks the device for its best available result. GitHub
6. Never let the frontend decide whether the teacher is inside the school
This is extremely important.
The frontend can calculate/display:
"You appear to be 43m away."

But the server must make the final decision.
OWASP specifically recommends not trusting client-side controls and performing security/authorization decisions server-side. OWASP Cheat Sheet Series
So the flow should be:
Teacher Device
      ↓
Get GPS
      ↓
Send coordinates to API
      ↓
Authentication verification
      ↓
Find teacher
      ↓
Find teacher's assigned branch
      ↓
Find branch GPS configuration
      ↓
Calculate distance
      ↓
Validate GPS accuracy
      ↓
Validate attendance rules
      ↓
Create attendance record
7. How distance should actually be calculated
Don't compare:
teacherLatitude === schoolLatitude
That's wrong.
Use the Haversine distance formula to calculate the distance between:
teacher latitude/longitude
and
school latitude/longitude
For example:
School:
Lat  = 9.123456
Lng  = -0.123456

Teacher:
Lat  = 9.123800
Lng  = -0.123700

Distance:
42 meters
If:
distance <= configuredRadius
then the teacher is geographically inside the attendance zone.
8. But there's another important validation
Suppose:
School radius = 100m
Teacher distance = 80m
GPS accuracy = ±150m
You shouldn't confidently accept that.
The phone is basically saying:
"I'm somewhere around here, with roughly 150m uncertainty."

So I'd use:
distance <= radius
AND
accuracy <= maxGpsAccuracy
Example:
Distance: 54m
Accuracy: 12m
Radius: 100m
Maximum Accuracy: 50m

✓ PASS
But:
Distance: 54m
Accuracy: 120m
Radius: 100m
Maximum Accuracy: 50m

✗ REJECT
This makes your system much more reliable.
9. Add a GPS quality state
Instead of simply saying "GPS failed", give the teacher useful feedback.
Excellent
GPS accuracy: 8m
✓ Location verified
Acceptable
GPS accuracy: 32m
✓ Location verified
Poor
GPS accuracy: 94m

Your GPS signal is too weak.
Move outdoors or to an area with better GPS signal.
[ TRY AGAIN ]
Outside branch
You are outside your assigned school location.

Distance from Zogbeli:
1.4 km

You must be within 100m of the school to check in.
10. Teacher branch assignment is critical
Your database relationship should look roughly like:
School
 │
 ├── Branch: Zogbeli
 │     │
 │     ├── Nursery
 │     ├── KG
 │     ├── Primary 1
 │     ├── Primary 2
 │     ├── Primary 3
 │     └── Primary 4
 │
 └── Branch: Vittin
       │
       ├── Primary 5
       ├── Primary 6
       ├── JHS 1
       ├── JHS 2
       └── JHS 3
And:
Teacher
   ↓
TeacherAssignment
   ↓
Branch
So when the teacher checks in:
teacherId
    ↓
teacher.branchId
    ↓
branch.location
    ↓
GPS validation
The teacher doesn't get to select the location.
11. Check-in time rules
You should also create an attendance policy.
For example:
School Attendance Policy

Check-in opens:
6:00 AM

Expected arrival:
7:30 AM

Late after:
7:45 AM

Check-in closes:
10:00 AM
Then:
6:00 – 7:29
    Present

7:30 – 7:44
    Present

7:45+
    Late
You can make this configurable.
12. Full check-in flow
Here's the complete flow I'd implement.
TEACHER LOGS IN
       ↓
System loads teacher profile
       ↓
Find assigned branch
       ↓
Find today's attendance
       ↓
Is teacher already checked in?
       │
       ├── YES → Show check-in time
       │
       └── NO
             ↓
        Teacher taps CHECK IN
             ↓
        Request GPS permission
             ↓
        Get fresh GPS location
             ↓
        Validate GPS accuracy
             ↓
        Send coordinates to server
             ↓
        Server finds assigned branch
             ↓
        Calculate distance
             ↓
        Is teacher inside geofence?
             │
        ┌────┴─────┐
       YES         NO
        ↓           ↓
   Check time    Reject
   rules           ↓
        ↓       "You are
   Create       outside..."
   attendance
        ↓
   CHECKED IN
13. The attendance record
Don't simply store:
teacherId
date
status
Store the evidence around the attendance action.
Something like:
Attendance
-------------------------------
id
teacherId
branchId
date
checkInTime
checkOutTime

checkInLatitude
checkInLongitude
checkInAccuracy
checkInDistance

checkOutLatitude
checkOutLongitude
checkOutAccuracy
checkOutDistance

checkInStatus
checkOutStatus

attendanceStatus

checkInDeviceId
checkOutDeviceId

createdAt
updatedAt
For example:
Teacher:
Mr. Mohammed

Branch:
Zogbeli

Date:
2026-08-17

Check-in:
07:24:31

GPS:
9.xxxxxx, -0.xxxxxx

Accuracy:
11m

Distance from school:
38m

Status:
PRESENT
That gives the admin an audit trail.
14. Check-out flow
The same concept should apply to check-out.
Teacher's dashboard:
┌──────────────────────────────────┐
│       TODAY'S ATTENDANCE         │
│                                  │
│  ✓ Checked in                    │
│    7:24 AM                       │
│                                  │
│  Working time                    │
│    7h 42m                        │
│                                  │
│       [ CHECK OUT ]              │
└──────────────────────────────────┘
Teacher taps:
CHECK OUT
Then:
Getting your location...
GPS is obtained.
Server validates:
Teacher identity
      ↓
Assigned branch
      ↓
Current GPS
      ↓
Distance
      ↓
GPS accuracy
      ↓
Check-out rules
      ↓
Create check-out
Then:
✓ Checked out successfully

Check-out time
3:18 PM

Total working time
7h 54m
15. Don't allow check-out without check-in
Server rule:
if attendance.checkInTime == null
    reject checkout
Message:
You cannot check out because you have not checked in today.

16. Don't allow multiple check-ins
Likewise:
if attendance.checkInTime != null
    reject check-in
Show:
You already checked in today at 7:24 AM.

17. Don't allow checkout twice
if attendance.checkOutTime != null
    reject checkout
18. What happens if a teacher leaves the school?
This is an important architectural decision.
Do not continuously track teachers throughout the day just because they checked in.
For attendance, you normally only need location verification at:
CHECK-IN
      ↓
CHECK-OUT
So the system doesn't need to track their movement during the day.
That is simpler, more privacy-conscious and significantly reduces battery/network usage.
19. Handling teachers working at the wrong branch
Suppose:
Teacher:
Primary 2 Teacher

Assigned:
Zogbeli
They are physically at Vittin.
The system detects:
Assigned branch:
Zogbeli

Current location:
Vittin

Distance:
~X km
Reject:
Check-in unavailable

Your assigned attendance location is Zogbeli Branch. You are currently outside the permitted attendance area.

If a teacher is temporarily moved to another branch, admin should change their assignment before attendance, or create a temporary assignment.
20. Temporary branch assignment
This will become very useful later.
Suppose:
Mrs. A
normally → Zogbeli
But on Monday:
Admin assigns her temporarily → Vittin
Don't change her permanent branch.
Create:
AttendanceLocationOverride
Example:
Teacher:
Mrs. A

Permanent Branch:
Zogbeli

Temporary Branch:
Vittin

Start:
2026-08-18

End:
2026-08-20

Reason:
Staff coverage
Then the attendance engine uses:
temporary assignment
       ↓
if exists
       ↓
use temporary branch
       ↓
otherwise
       ↓
use permanent branch
21. Admin attendance dashboard
Your admin should get a page like:
Today's Attendance
                 TODAY
─────────────────────────────────────

Total Teachers       48
Checked In           42
Late                  4
Absent                2
Checked Out           37
─────────────────────────────────────

ZOGBELI
Teachers: 25
Present: 23
Late: 1
Absent: 1

VITTIN
Teachers: 23
Present: 19
Late: 3
Absent: 1
Then a teacher table:
Teacher       Branch      Check-in    Status     Check-out
────────────────────────────────────────────────────────────
Mr. Adams     Zogbeli    7:18 AM     Present    3:20 PM
Mrs. Sarah    Zogbeli    7:52 AM     Late       3:15 PM
Mr. John      Vittin     7:29 AM     Present    —
Mrs. Ama      Vittin     —           Absent     —
22. Attendance details
When admin clicks a teacher:
Mr. Adams
Primary 3 Teacher
Zogbeli Branch
Show:
CHECK-IN

Time
7:18:42 AM

Location
Zogbeli Branch

Distance
23 meters

GPS Accuracy
9 meters

Coordinates
9.xxxxx, -0.xxxxx

Verification
✓ GPS Verified
And:
CHECK-OUT

Time
3:20:12 PM

Distance
31 meters

GPS Accuracy
12 meters

Verification
✓ GPS Verified
23. Put the location on a map
This would make the admin experience much better.
Show:
        Zogbeli School
             ●
          ┌─────┐
        /         \
       /   100m    \
      |  geofence   |
       \           /
        \_________/

             ●
        Teacher location
The admin can visually see:
School location
Geofence boundary
Teacher check-in location
Teacher check-out location
24. Attendance status architecture
I'd use these statuses:
PENDING
PRESENT
LATE
ABSENT
CHECKED_OUT
INCOMPLETE
REJECTED
But I would separate attendance status from verification status.
For example:
attendanceStatus:
PRESENT

checkInVerification:
GPS_VERIFIED

checkOutVerification:
GPS_VERIFIED
That is much cleaner.
25. Rejected attendance attempts
You should actually log failed attempts.
Suppose a teacher tries to check in from home.
Don't just throw away the request.
Create:
AttendanceAttempt
Example:
Teacher:
Mr. John

Attempt:
Check-in

Time:
7:10 AM

Assigned Branch:
Vittin

Distance:
4.8 km

GPS Accuracy:
13m

Result:
REJECTED

Reason:
OUTSIDE_GEOFENCE
This is extremely useful for administration.
26. Other rejection reasons
Define standard codes:
GPS_PERMISSION_DENIED
GPS_UNAVAILABLE
GPS_TIMEOUT
GPS_ACCURACY_TOO_LOW
OUTSIDE_GEOFENCE
NOT_ASSIGNED_TO_BRANCH
ALREADY_CHECKED_IN
ALREADY_CHECKED_OUT
CHECKOUT_WITHOUT_CHECKIN
ATTENDANCE_NOT_OPEN
ATTENDANCE_CLOSED
ACCOUNT_DISABLED
Then your UI can translate those into friendly messages.
27. Recommended database architecture
At minimum:
users
teachers
branches
classes
teacher_assignments

attendance_settings
branch_locations

attendance_records
attendance_attempts

attendance_overrides
attendance_audit_logs
Relationships:
branches
   │
   ├──── branch_locations
   │
   ├──── classes
   │
   └──── teachers
             │
             └──── teacher_assignments
                       │
                       └──── attendance_records
28. Branch structure
I'd actually make branches first-class entities.
branches
-------------------
id
name
code
address
status
createdAt
updatedAt
Records:
Zogbeli
code: ZOG
Vittin
code: VIT
Then classes reference branches:
classes
-------------------
id
name
branchId
level
status
So:
Nursery 1 → ZOG
Nursery 2 → ZOG
KG 1      → ZOG
KG 2      → ZOG
Primary 1 → ZOG
...
Primary 4 → ZOG

Primary 5 → VIT
Primary 6 → VIT
JHS 1     → VIT
JHS 2     → VIT
JHS 3     → VIT
29. Teacher assignment
Don't necessarily derive the teacher's branch purely from the class every time.
Give the teacher an explicit assignment:
teacher_assignments
-------------------------
id
teacherId
branchId
startDate
endDate
isPrimary
status
This gives you flexibility.
For example:
Teacher
   ↓
Primary branch = Zogbeli
If they change schools/branches next academic year, you create a new assignment rather than destroying historical records.
30. Attendance configuration
I'd have:
attendance_settings
--------------------------
id
schoolId

checkInEnabled
checkOutEnabled

checkInStartTime
checkInEndTime

lateAfterTime

checkOutStartTime
checkOutEndTime

requireGps
requireHighAccuracy

maxGpsAccuracyMeters

createdAt
updatedAt
Then branch-specific configuration lives separately.
31. Important: GPS isn't a security boundary by itself
A determined person can potentially manipulate location information on some devices. Therefore, don't design the system around the assumption that GPS is impossible to spoof.
Your security model should be:
Authentication
+
Teacher/branch authorization
+
GPS
+
Accuracy validation
+
Server-side distance calculation
+
Timestamp
+
Device/session information
+
Audit log
OWASP recommends treating client-side controls as bypassable and enforcing important security decisions on the server. OWASP Cheat Sheet Series
For a school attendance system, that is a much more realistic model than pretending GPS alone is tamper-proof.
32. Device/session layer
I'd also keep a registered-device concept.
For example:
teacher_devices
----------------------
id
teacherId
deviceName
platform
lastUsedAt
status
registeredAt
Don't use a device identifier as authentication by itself—OWASP explicitly warns against relying on spoofable device identifiers. Use your normal authenticated account/session and treat device information as an additional signal. OWASP Cheat Sheet Series
33. Complete architecture
Your final system can look like this:
                         SCHOOL MANAGEMENT SYSTEM
                                   │
             ┌─────────────────────┴─────────────────────┐
             │                                           │
        ADMIN PORTAL                                TEACHER PORTAL
             │                                           │
             │                                           │
      Attendance Settings                         Today's Attendance
             │                                           │
             ├──────────────┐                            │
             │              │                            │
         Zogbeli          Vittin                         │
             │              │                            │
             ↓              ↓                            ↓
       GPS Location     GPS Location               CHECK IN
       + Radius         + Radius                       │
             │              │                           ↓
             └──────────────┬────────────────── GPS API
                            │                           │
                            ↓                           ↓
                       ATTENDANCE API
                            │
              ┌─────────────┼─────────────┐
              │             │             │
          Auth Check    Branch Check   GPS Check
              │             │             │
              └─────────────┼─────────────┘
                            ↓
                     Distance Engine
                            │
                     ┌──────┴──────┐
                     │             │
                  ACCEPT        REJECT
                     │             │
                     ↓             ↓
                Attendance      Attempt Log
                  Record
                     │
                     ↓
               ADMIN DASHBOARD
34. The exact check-in algorithm
I'd make the backend essentially work like this:
1. Authenticate teacher

2. Retrieve teacher profile

3. Check account status

4. Determine today's branch:
      temporary assignment?
          YES → temporary branch
          NO  → permanent branch

5. Retrieve branch GPS configuration

6. Validate attendance schedule

7. Validate submitted coordinates

8. Validate GPS accuracy

9. Calculate distance from branch coordinates

10. Compare distance against geofence radius

11. Check whether today's attendance record exists

12. If valid:
       create/update attendance

13. Determine:
       PRESENT or LATE

14. Save:
       coordinates
       accuracy
       distance
       timestamp
       branch
       device/session metadata

15. Return successful response
35. Check-out algorithm
1. Authenticate teacher

2. Retrieve today's attendance

3. Confirm check-in exists

4. Confirm check-out doesn't already exist

5. Determine assigned branch

6. Get fresh GPS

7. Validate GPS accuracy

8. Calculate distance

9. Validate geofence

10. Validate check-out time

11. Save check-out information

12. Calculate working duration

13. Return success
36. Working hours calculation
After checkout:
Check-in:
7:22 AM

Check-out:
3:18 PM

Total:
7h 56m
Store the raw timestamps.
Don't store only the calculated hours.
Calculate it from:
checkOutTime - checkInTime
That allows corrections and reporting later.
37. Admin GPS configuration should have a test mode
This is something I'd definitely include.
When admin configures Zogbeli:
GPS Configuration

✓ Location captured

Latitude:
9.xxxxx

Longitude:
-0.xxxxx

Accuracy:
7m

Radius:
100m

             [ TEST LOCATION ]

             [ SAVE CONFIGURATION ]
Admin clicks Test Location.
The system verifies:
Current location
        ↓
Zogbeli coordinates
        ↓
Distance = 18m
        ↓
Radius = 100m
        ↓
✓ Configuration valid
This prevents the admin from accidentally saving the wrong location.
38. Add location configuration history
Don't overwrite GPS configuration without history.
Store:
branch_location_history
-------------------------
id
branchId
latitude
longitude
radiusMeters
changedBy
reason
createdAt
If someone changes Zogbeli's location later, you can determine:
Who changed it?

When?

What was the old location?

What is the new location?

That's very useful for auditing.
39. Recommended UI structure
Admin
Settings
   │
   └── Attendance
         │
         ├── General
         │
         ├── Branch Locations
         │      ├── Zogbeli
         │      └── Vittin
         │
         ├── Time Rules
         │
         ├── GPS Rules
         │
         └── Audit Logs
Teacher
Dashboard
   │
   └── Attendance
         │
         ├── Today's Attendance
         ├── Check In
         ├── Check Out
         └── Attendance History
40. One improvement I'd strongly recommend
Don't call it simply "GPS Attendance."
Internally, design it as:
Location-Verified Attendance

Because GPS is only one part of the verification process.
Your system is really verifying:
WHO?
Teacher account

WHERE?
Assigned branch

WHEN?
Attendance schedule

HOW ACCURATE?
GPS accuracy

HOW FAR?
Distance from branch

WHAT ACTION?
Check-in / Check-out

WHAT HAPPENED?
Attendance + audit record
That gives you a much stronger architecture.
41. Your final real-world flow
For your exact school:
Morning — Zogbeli teacher
Teacher opens portal
        ↓
System sees:
Primary 2 Teacher
        ↓
Assigned branch:
Zogbeli
        ↓
Teacher taps CHECK IN
        ↓
GPS acquired
        ↓
Distance from Zogbeli:
43m
        ↓
Allowed radius:
100m
        ↓
GPS accuracy:
12m
        ↓
✓ VERIFIED
        ↓
7:24 AM
        ↓
PRESENT
Morning — same teacher at Vittin
Teacher taps CHECK IN
        ↓
GPS acquired
        ↓
Distance from Zogbeli:
4.7km
        ↓
Allowed:
100m
        ↓
✗ REJECTED
Afternoon
Teacher taps CHECK OUT
        ↓
GPS acquired
        ↓
Distance:
38m
        ↓
Accuracy:
10m
        ↓
✓ VERIFIED
        ↓
3:17 PM
        ↓
Working duration:
7h 53m
Vittin teacher
Exactly the same process, except their authorized geofence is Vittin.
The architecture I'd build for your existing system
Since you already have the school management system and teacher portal, I would not build this as a separate attendance application.
Add an attendance module with these layers:
                    ATTENDANCE MODULE
                           │
       ┌───────────────────┼───────────────────┐
       ↓                   ↓                   ↓
  Configuration        Attendance          Reporting
       │                   │                   │
       ├─ Branch GPS       ├─ Check-in        ├─ Daily
       ├─ Radius           ├─ Check-out       ├─ Monthly
       ├─ GPS accuracy     ├─ Validation      ├─ Teacher
       ├─ Time rules       ├─ Late            ├─ Branch
       └─ Overrides        └─ Attempts        └─ Export
                           │
                           ↓
                    VERIFICATION ENGINE
                           │
                 ┌─────────┼─────────┐
                 ↓         ↓         ↓
              Identity   Location   Time
                 │         │         │
                 └─────────┼─────────┘
                           ↓
                      ATTENDANCE DB
And importantly, the branch GPS coordinates should be configured once by the admin and reused by every teacher assigned to that branch. The teacher should never manually enter or choose coordinates.
For the browser/PWA implementation, use HTTPS, request explicit location permission, request a fresh high-accuracy position, and send the position plus its reported accuracy to your backend. GitHub
If you're building this with the same architecture as your existing teacher portal, the next step should be to define the exact database schema, API endpoints, backend validation logic, frontend attendance states, and admin/teacher UI screens so you can implement the entire module without having to redesign it later.

GitHubOWASP Cheat Sheet Series