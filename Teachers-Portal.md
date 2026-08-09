Teacher Portal Development Plan
Module 1: Teacher Dashboard

This is only a summary page.

It does not own data. It displays information from other modules.

Dashboard Widgets
1. Welcome Card

Load from authenticated teacher.

Teacher Name
Profile Picture
Employee ID
Role
Current Academic Year
Current Term
Current Date

API

GET /teacher/profile
2. Today's Classes

Instead of manually adding classes, fetch today's timetable.

Example

Today

8:00 English
JHS 2A

10:00 ICT
JHS 3B

1:00 Mathematics
JHS 1A

Button

Take Attendance

Should automatically open that class attendance.

3. Attendance Summary

Display

Classes Today

Attendance Completed

Pending Attendance

Students Present

Students Absent

Late

This updates immediately after attendance is submitted.

4. Assignments

Show

Assignments Due

Ungraded

Awaiting Submission

Recently Submitted
5. Pending Results

Display

Subjects awaiting scores

Classes pending

Submission deadline
6. Notifications

Only notifications relevant to this teacher.

Example

Principal announcement

New timetable

Parent message

Student submitted assignment

Exam deadline
7. Recent Messages

Latest conversations

Parent

Student

Headmaster

Admin

Unread badge.

Module 2: My Classes

This becomes the teacher's workspace.

When teacher clicks

JHS 2A

Open

Overview

Students

Attendance

Results

Assignments

Lesson Notes

Resources

Behaviour

Reports

Everything happens inside this class.

Class Overview

Show

Class Name

Subject

Number of Students

Class Average

Attendance %

Upcoming Lesson

Recent Activities
Module 3: Student List

Table

Photo

Admission Number

Student Name

Gender

Attendance %

Average Score

Status

Actions

Search

Filter

Sort

Pagination

When opening one student

Show

Personal Details

Guardian

Attendance History

Results

Assignments

Behaviour

Medical Alert

Notes

Teacher cannot edit sensitive information.

Only authorized fields.

Module 4: Attendance

Probably the most important module.

Workflow

Teacher clicks

Attendance

Choose

Academic Year

Term

Date

Class

Subject

System loads students.

□ Present

□ Absent

□ Late

□ Excused

Teacher clicks Save.

Backend

Validate

Save

Prevent duplicate attendance

Calculate percentages

Update dashboard

Update parent portal

Update admin dashboard

Update student profile

Attendance History

Teacher can view

Yesterday

Last Week

Last Month

Term

Academic Year

Search by student.

Module 5: Results

Teacher chooses

Term

Exam

Subject

Class

System loads students.

Teacher enters

Class Score

Exam Score

Project

Practical

Remarks

Backend calculates

Total

Average

Grade

Position

Remarks

Automatically.

Validation

Marks cannot exceed maximum

No duplicate entries

Autosave every few seconds

Draft mode

Submit mode

Lock after approval
Module 6: Assignments

Teacher clicks

New Assignment

Form

Title

Description

Class

Subject

Due Date

Maximum Marks

Attachment

Students receive immediately.

Teacher sees

Assigned

Submitted

Late

Missing

Can grade directly.

Module 7: Lesson Plans

Teacher creates

Week

Subject

Topic

Objectives

Activities

Teaching Materials

Assessment

Homework

Can duplicate last week's lesson.

Module 8: Behaviour Records

Teacher records

Excellent

Warning

Misconduct

Commendation

Parent Meeting

Suspension Recommendation

History remains.

Visible to Admin.

Module 9: Resources

Upload

PDF

PowerPoint

Word

Image

Video

Assign resource to

Class

Subject

Topic

Students can access immediately.

Module 10: Messaging

Teacher chats with

Parents

Students

Admin

Headmaster

Teachers

Features

Read receipts

Typing indicator

Attachments

Search

Pinned messages

Mute

Archive
Module 11: Reports

Teacher generates

Attendance Report

Performance Report

Assignment Report

Behaviour Report

Class Summary

Export

PDF

Excel

CSV
Module 12: Teacher Settings
Profile

Change Password

Notification Preferences

Theme

Language

Signature

Teaching Preferences
Real-Time Events

Everything should stay synchronized through events. For example:

Attendance
Teacher clicks Save
        │
        ▼
Attendance saved
        │
        ├── Dashboard refreshes
        ├── Student attendance updates
        ├── Parent notified
        ├── Admin statistics update
        ├── Attendance percentage recalculated
        └── Teacher attendance card updates
Results
Teacher submits marks
        │
        ▼
Results table updates
        │
        ├── Grade calculated
        ├── Student profile updated
        ├── Parent sees results
        ├── Admin sees completion %
        └── Dashboard pending results reduced
Assignments
Student uploads assignment
        │
        ▼
Teacher notification
        │
        ├── Assignment counter increases
        ├── Dashboard updates
        ├── Parent notified (optional)
        └── Submission status changes
Development Order

To keep the project stable and avoid rework, I recommend this sequence:

Teacher Dashboard (connect all summary cards to live data)
My Classes
Student Management within classes
Attendance (including history and reports)
Results & Grading
Assignments
Lesson Plans
Resources
Behaviour Records
Messaging
Reports
Settings & Notifications

This order ensures that every new module plugs into the previous ones, giving you a fully functional teacher portal rather than isolated pages.