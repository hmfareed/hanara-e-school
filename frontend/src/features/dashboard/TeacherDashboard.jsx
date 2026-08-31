import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getStaffGreeting } from '../../utils/greetingUtils';
import Skeleton from '../../components/Skeleton';
import {
  Calendar,
  Users,
  FileText,
  MessageSquare,
  UserCheck,
  Plus,
  ClipboardList,
  Volume2,
  BookOpenCheck,
  Clock,
  Cake,
  Sparkles,
  ChevronRight,
  GraduationCap,
  Award,
  Receipt,
  Fingerprint,
  MapPin,
  ShieldCheck,
  LogIn,
  LogOut,
  CheckCircle2,
} from 'lucide-react';

const TEACHER_QUOTES = [
  "Teaching is the one profession that creates all other professions.",
  "Education is the most powerful weapon which you can use to change the world.",
  "The influence of a good teacher can never be erased.",
  "Students don't care how much you know until they know how much you care.",
  "To teach is to touch a life forever.",
  "Every child deserves a champion—an adult who will never give up on them.",
  "Excellence is not a skill, it is an attitude.",
  "Inspiring minds, shaping futures, one lesson at a time.",
];

function formatTimeAMPM(timeStr) {
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${m} ${ampm}`;
}

const TeacherDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quoteIndex, setQuoteIndex] = useState(0);
  const [fadeQuote, setFadeQuote] = useState(true);

  // Rotating quote interval (5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setFadeQuote(false);
      setTimeout(() => {
        setQuoteIndex((prev) => (prev + 1) % TEACHER_QUOTES.length);
        setFadeQuote(true);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const { data: dashboardData, isLoading, isFetching } = useQuery({
    queryKey: ['teacherDashboardSummary'],
    queryFn: async () => {
      try {
        const res = await api.get('/teachers/dashboard-summary');
        if (res.data?.data) return res.data.data;
      } catch (err) {}
      try {
        const res = await api.get('/teachers/profile');
        if (res.data?.data) return { profile: res.data.data };
      } catch (err) {}
      return null;
    },
    staleTime: 5 * 60 * 1000,      // 5 minutes — avoids refetch on every nav
    refetchInterval: 2 * 60 * 1000, // 2 minutes — reasonable polling cadence
  });

  // Query teacher's own attendance status for today
  const { data: attendanceData } = useQuery({
    queryKey: ['staffMyStatus'],
    queryFn: async () => {
      try {
        const res = await api.get('/staff-attendance/my-status');
        return res.data?.data;
      } catch (err) {
        return null;
      }
    },
    staleTime: 60 * 1000,
  });

  const todayAttendance = attendanceData?.today || null;
  const hasCheckedIn = !!todayAttendance?.checkInTime;
  const hasCheckedOut = !!todayAttendance?.checkOutTime;

  // Only show full-page skeleton on absolute first load with no data
  const isInitialLoading = isLoading && !dashboardData;

  if (isInitialLoading) {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto">
        {/* Row 1: Hero + Today card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs space-y-4">
            <Skeleton.Line width="w-64" height="h-8" />
            <Skeleton.Line width="w-48" height="h-4" />
            <div className="mt-4 pt-3.5 border-t border-slate-100">
              <Skeleton.Line width="w-80" height="h-4" />
            </div>
          </div>
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex justify-between">
              <div className="space-y-2">
                <Skeleton.Line width="w-28" height="h-3" />
                <Skeleton.Line width="w-44" height="h-5" />
              </div>
              <Skeleton.Circle size="w-12 h-12" />
            </div>
            <Skeleton.Box h="h-14" rounded="rounded-2xl" />
            <Skeleton.Box h="h-10" rounded="rounded-2xl" />
          </div>
        </div>

        {/* Row 2: 4 stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(i => <Skeleton.StatCard key={i} />)}
        </div>

        {/* Row 3: Timetable + Attendance + My Classes */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
            <Skeleton.Line width="w-36" height="h-5" />
            {[1, 2, 3, 4].map(i => <Skeleton.Box key={i} h="h-11" rounded="rounded-2xl" />)}
          </div>
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
            <Skeleton.Line width="w-40" height="h-5" className="mb-6" />
            <div className="flex gap-5">
              <Skeleton.Circle size="w-28 h-28" />
              <div className="flex-1 space-y-3 mt-2">
                <Skeleton.Box h="h-9" rounded="rounded-xl" />
                <Skeleton.Box h="h-9" rounded="rounded-xl" />
                <Skeleton.Box h="h-9" rounded="rounded-xl" />
              </div>
            </div>
          </div>
          <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
            <Skeleton.Line width="w-28" height="h-5" />
            {[1, 2, 3].map(i => <Skeleton.ListItem key={i} />)}
          </div>
        </div>

        {/* Row 4: 4 bottom cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
              <Skeleton.Line width="w-32" height="h-5" />
              {[1, 2, 3].map(j => <Skeleton.ListItem key={j} />)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const teacherName =
    dashboardData?.profile?.fullName ||
    (user?.refStaff
      ? `${user.refStaff.title ? user.refStaff.title + ' ' : ''}${user.refStaff.firstName || ''} ${user.refStaff.lastName || ''}`.trim()
      : null) ||
    user?.name ||
    user?.email?.split('@')[0] ||
    'Teacher';
  const myClasses = dashboardData?.myClasses || [];
  const todaysClasses = dashboardData?.todaysClasses || [];
  const todaysTimetable = dashboardData?.todaysTimetable || [];
  const attendanceSummary = dashboardData?.attendanceSummary || {};
  const myClassesStudentSum = myClasses.reduce((sum, c) => sum + (c.studentCount || 0), 0);
  const totalStudents = (typeof dashboardData?.totalStudents === 'number' && dashboardData.totalStudents > 0)
    ? dashboardData.totalStudents
    : (myClassesStudentSum > 0 ? myClassesStudentSum : (dashboardData?.totalStudents ?? 0));
  const assignmentsSummary = dashboardData?.assignmentsSummary || {};
  const pendingResultsSummary = dashboardData?.pendingResultsSummary || {};

  const recentActivities = dashboardData?.recentActivities || [];
  const assignmentsList = dashboardData?.assignmentsList || [];
  const pendingResultsList = dashboardData?.pendingResultsList || [];
  const announcementsList = dashboardData?.announcements || [];
  const upcomingBirthdays = dashboardData?.upcomingBirthdays || [];

  const pendingAttendanceClass = todaysClasses.find((c) => !c.isAttendanceMarked);
  const completedAttendanceCount = todaysClasses.filter((c) => c.isAttendanceMarked).length;
  const classesCount = attendanceSummary.classesTodayCount || myClasses.length;

  return (
    <div className="flex flex-col gap-6 pb-12 font-sans text-slate-800 select-none max-w-[1600px] mx-auto">

      {/* ── ROW 1: DYNAMIC HERO GREETING, GPS ATTENDANCE & SCHEDULE ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">

        {/* Welcome Card (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 md:p-7 border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[170px]">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight flex items-center gap-2">
              {getStaffGreeting(user, teacherName)} 👋
            </h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
              Welcome back to your teaching portal
            </p>
          </div>

          {/* Rotating Quote Container */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className={`transition-all duration-300 ${fadeQuote ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
              <p className="text-xs md:text-sm text-slate-500 font-medium italic max-w-xl">
                "{TEACHER_QUOTES[quoteIndex]}"
              </p>
            </div>
          </div>
        </div>

        {/* My Daily Attendance & GPS Card (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">My Daily Attendance</span>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5 mt-0.5">
                <Fingerprint size={18} className="text-[#78282E]" />
                {hasCheckedOut
                  ? 'Completed Today'
                  : hasCheckedIn
                  ? 'Checked In'
                  : 'Check-In Pending'}
              </h3>
            </div>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
              <MapPin size={11} /> 150m GPS Geofence
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
            {!hasCheckedIn ? (
              <p className="text-xs font-semibold text-slate-600 leading-snug">
                You have not checked in today. Please verify your GPS location to record attendance.
              </p>
            ) : !hasCheckedOut ? (
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  In at <span className="text-emerald-700">{formatTimeAMPM(todayAttendance.checkInTime)}</span>
                  {todayAttendance.branch && <span className="text-slate-500">({todayAttendance.branch})</span>}
                </span>
                {todayAttendance.geofenceVerified && (
                  <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                    <ShieldCheck size={13} /> GPS Verified
                    {todayAttendance.distanceFromSchool != null && ` (${todayAttendance.distanceFromSchool}m)`}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  In: {formatTimeAMPM(todayAttendance.checkInTime)} &nbsp;·&nbsp; Out: {formatTimeAMPM(todayAttendance.checkOutTime)}
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  {Math.floor((todayAttendance.totalMinutes || 0) / 60)}h {(todayAttendance.totalMinutes || 0) % 60}m
                </span>
              </div>
            )}
          </div>

          <div>
            {!hasCheckedIn ? (
              <button
                onClick={() => navigate('/staff/check-in')}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-xs rounded-2xl border-none cursor-pointer flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <LogIn size={16} />
                <span>Check In with GPS</span>
              </button>
            ) : !hasCheckedOut ? (
              <button
                onClick={() => navigate('/staff/check-in')}
                className="w-full py-3 px-4 bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white font-bold text-xs rounded-2xl border-none cursor-pointer flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <LogOut size={16} />
                <span>Check Out for Today</span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/staff/check-in')}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl border border-slate-200 cursor-pointer flex items-center justify-center gap-2 transition-all duration-200"
              >
                <Clock size={16} />
                <span>View Attendance Log</span>
              </button>
            )}
          </div>
        </div>

        {/* Classes Today Action Card (3 Cols) */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Student Classes</span>
              <h3 className="text-base font-extrabold text-slate-900">{classesCount} classes today</h3>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-[#781A1A] shadow-2xs">
              <Calendar size={20}/>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <p className="text-xs font-semibold text-slate-700 leading-snug truncate">
              {classesCount === 0 ? (
                <>No classes assigned.</>
              ) : pendingAttendanceClass ? (
                <>Pending: <strong className="font-extrabold text-[#781A1A]">{pendingAttendanceClass.className}</strong></>
              ) : completedAttendanceCount > 0 ? (
                <>Attendance completed! 🎉</>
              ) : (
                <>Attendance not marked.</>
              )}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => navigate('/attendance')}
              className="py-3 px-4 bg-[#4A1C20] hover:bg-[#781A1A] text-white font-bold text-xs rounded-2xl border-none cursor-pointer flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <UserCheck size={16}/>
              <span>Student Register</span>
            </button>
          </div>
        </div>

      </div>

      {/* ── ROW 2: POLISHED STAT CARDS (4 EQUAL COLS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* Stat 1: Today's Classes */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 shadow-2xs">
            <BookOpenCheck size={22} className="text-[#047857]"/>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Today's Classes</p>
            <h3 className="text-2xl font-black text-slate-900 leading-none mb-1">{classesCount}</h3>
            <p className="text-[11px] font-bold text-[#047857] truncate max-w-[140px]">
              {todaysTimetable[0] ? `Next: ${todaysTimetable[0].class?.name || 'Class'} - ${todaysTimetable[0].startTime}` : 'Schedule active'}
            </p>
          </div>
        </div>

        {/* Stat 2: Students Today */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 shadow-2xs">
            <Users size={22} className="text-blue-600"/>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Students</p>
            <h3 className="text-2xl font-black text-slate-900 leading-none mb-1">{totalStudents}</h3>
            <p className="text-[11px] font-medium text-slate-400">Across assigned classes</p>
          </div>
        </div>

        {/* Stat 3: Assignments to Grade */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 shadow-2xs">
            <ClipboardList size={22} className="text-amber-600"/>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Assignments to Grade</p>
            <h3 className="text-2xl font-black text-slate-900 leading-none mb-1">{assignmentsSummary.pendingGrading || 0}</h3>
            <p className="text-[11px] font-bold text-amber-600">Pending review</p>
          </div>
        </div>

        {/* Stat 4: Pending Results */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs">
            <FileText size={22} className="text-purple-600"/>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Pending Results</p>
            <h3 className="text-2xl font-black text-slate-900 leading-none mb-1">{pendingResultsSummary.pendingClassesCount || 0} Classes</h3>
            <p className="text-[11px] font-bold text-purple-600">Score entry status</p>
          </div>
        </div>

      </div>

      {/* ── ROW 3: TIMETABLE + ATTENDANCE + MY CLASSES (5 : 4 : 3 COLS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Today's Timetable (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Calendar size={17} className="text-[#781A1A]"/>
                Today's Timetable
              </h3>
              <button
                onClick={() => navigate('/timetable')}
                className="text-[11px] font-bold text-[#781A1A] hover:bg-rose-50 border border-rose-100 px-3 py-1 rounded-xl transition-colors cursor-pointer"
              >
                Full Schedule
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {todaysTimetable.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-8 text-center">No timetable slots logged for today.</p>
              ) : (
                todaysTimetable.slice(0, 5).map((slot, idx) => (
                  <div
                    key={slot._id || idx}
                    className={`flex items-center px-3.5 py-2.5 border rounded-2xl transition-all ${
                      idx === 0
                        ? 'bg-rose-50/70 border-rose-200/80 shadow-2xs'
                        : 'bg-slate-50/70 border-slate-100'
                    }`}
                  >
                    <span className={`text-[11px] font-mono w-32 shrink-0 ${idx === 0 ? 'text-[#781A1A] font-extrabold' : 'text-slate-500'}`}>
                      {slot.startTime} – {slot.endTime}
                    </span>
                    <span className={`text-xs flex-1 ${idx === 0 ? 'font-black text-slate-900' : 'font-bold text-slate-800'}`}>
                      {slot.subject}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg ${
                        idx === 0
                          ? 'text-white bg-[#4A1C20]'
                          : 'text-[#781A1A] bg-rose-50 border border-rose-100'
                      }`}
                    >
                      {slot.class?.name || 'Class'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Attendance Overview (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <UserCheck size={17} className="text-[#047857]"/>
              Attendance Overview
            </h3>
          </div>

          <div className="flex items-center justify-between gap-4 my-auto">
            {/* Donut Chart — shows actual rate or "Not Marked" state */}
            <div className="relative w-28 h-28 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="4.5"/>
                {attendanceSummary.hasAttendanceData && (
                  <circle
                    cx="18" cy="18" r="15.915"
                    fill="transparent"
                    stroke="#10b981"
                    strokeWidth="4.5"
                    strokeDasharray={`${attendanceSummary.attendanceRate} ${100 - (attendanceSummary.attendanceRate || 0)}`}
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">
                {attendanceSummary.hasAttendanceData ? (
                  <>
                    <span className="text-xl font-black text-slate-900 leading-none">
                      {attendanceSummary.attendanceRate}%
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">Overall</span>
                  </>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 leading-snug uppercase tracking-wider">Not<br/>Marked</span>
                )}
              </div>
            </div>

            {/* Legend List */}
            <div className="flex flex-col gap-2.5 flex-1">
              <div className="flex items-center justify-between text-xs p-1.5 rounded-xl bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"/>
                  <span className="text-slate-600 font-bold">Present</span>
                </div>
                <span className="font-black text-slate-900">{attendanceSummary.studentsPresent || 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs p-1.5 rounded-xl bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"/>
                  <span className="text-slate-600 font-bold">Absent</span>
                </div>
                <span className="font-black text-slate-900">{attendanceSummary.studentsAbsent || 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs p-1.5 rounded-xl bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"/>
                  <span className="text-slate-600 font-bold">Late</span>
                </div>
                <span className="font-black text-slate-900">{attendanceSummary.studentsLate || 0}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigate('/attendance')}
              className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs font-extrabold text-slate-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <UserCheck size={15} className="text-slate-500"/>
              <span>Attendance</span>
            </button>
            <button
              onClick={() => navigate('/fees/daily-register')}
              className="flex-1 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl text-xs font-extrabold text-emerald-800 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Receipt size={15} className="text-emerald-700"/>
              <span>Fee Collection</span>
            </button>
          </div>
        </div>

        {/* My Classes (3 Cols) */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">My Classes</h3>
              <button onClick={() => navigate('/my-classes')} className="text-[11px] font-bold text-[#781A1A] hover:underline cursor-pointer bg-none border-none p-0">
                View All
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {myClasses.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">No active classes assigned yet.</p>
              ) : (
                myClasses.slice(0, 3).map((cls) => (
                  <div key={cls._id} className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-[#781A1A] shrink-0 font-bold">
                        <BookOpenCheck size={17}/>
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-slate-900 leading-tight">{cls.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{cls.subjectName || 'Core Subjects'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                        <Users size={12}/> {cls.studentCount || 0}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-[#4A1C20] text-white text-[10px] font-black flex items-center justify-center border-2 border-rose-100">
                        {cls.attendanceRate || 100}%
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/my-classes')}
            className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs font-extrabold text-slate-700 transition-colors cursor-pointer"
          >
            Manage My Classes
          </button>
        </div>

      </div>

      {/* ── ROW 4: BOTTOM 4 EQUAL COLS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Col 1: Recent Student Activity */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">Recent Student Activity</h3>
              {recentActivities.length > 0 && (
                <button className="text-[11px] font-bold text-[#781A1A] hover:underline cursor-pointer bg-none border-none p-0">View All</button>
              )}
            </div>

            {recentActivities.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center justify-center space-y-1 text-slate-400">
                <p className="text-xs font-medium italic">No recent student activity logged yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {recentActivities.map((act, idx) => (
                  <div key={act._id || idx} className="flex items-start gap-2.5">
                    {act.photoUrl ? (
                      <img src={act.photoUrl} alt={act.title} className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"/>
                    ) : act.type === 'attendance' ? (
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 size={14}/>
                      </div>
                    ) : act.type === 'grade' ? (
                      <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        <Award size={14}/>
                      </div>
                    ) : act.type === 'assignment' ? (
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        <ClipboardList size={14}/>
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-rose-100 text-[#781A1A] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        <UserCheck size={14}/>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-slate-900 truncate">{act.title}</p>
                        <span className="text-[10px] text-slate-400 shrink-0">{act.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{act.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Col 2: Assignments */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">Assignments</h3>
              <button onClick={() => navigate('/assignments')} className="text-[11px] font-bold text-[#781A1A] hover:underline cursor-pointer bg-none border-none p-0">View All</button>
            </div>

            {assignmentsList.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center justify-center space-y-1 text-slate-400">
                <p className="text-xs font-medium italic">No assignments currently set.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {assignmentsList.map((asg) => (
                  <div key={asg._id} className="p-3 bg-slate-50/80 border border-slate-100 rounded-2xl flex items-center justify-between gap-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#781A1A] flex items-center justify-center shrink-0">
                      <ClipboardList size={16}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{asg.title}</p>
                      <p className="text-[10px] text-slate-400 truncate">{asg.class?.name || 'Class'} • Due: {asg.dueDate ? new Date(asg.dueDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-slate-900">{asg.submittedCount || 0}/{asg.totalStudents || 0}</p>
                      <p className="text-[10px] font-bold text-[#781A1A]">Submitted</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/assignments')}
            className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs font-extrabold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={15} className="text-[#781A1A]"/>
            <span>Create New Assignment</span>
          </button>
        </div>

        {/* Col 3: Pending Results */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">Pending Results</h3>
              <button onClick={() => navigate('/grades')} className="text-[11px] font-bold text-[#781A1A] hover:underline cursor-pointer bg-none border-none p-0">View All</button>
            </div>

            {pendingResultsList.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center justify-center space-y-1 text-slate-400">
                <p className="text-xs font-medium italic">No pending results awaiting entry.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {pendingResultsList.map((res) => (
                  <div key={res._id} className="p-3 bg-slate-50/80 border border-slate-100 rounded-2xl flex items-center justify-between gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <FileText size={16}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{res.subject?.name || 'Subject'}</p>
                      <p className="text-[10px] text-slate-400 truncate">{res.class?.name || 'Class'}</p>
                    </div>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg shrink-0">Pending</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/grades')}
            className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs font-extrabold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileText size={15} className="text-slate-500"/>
            <span>Enter Grade Results</span>
          </button>
        </div>

        {/* Col 4: Announcements & Upcoming Birthdays Stacked */}
        <div className="flex flex-col gap-6">

          {/* Announcements Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all duration-300 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Volume2 size={15} className="text-sky-500"/>
                  Announcements
                </h3>
              </div>

              {announcementsList.length === 0 ? (
                <div className="py-4 text-center text-slate-400">
                  <p className="text-xs font-medium italic">No announcements yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {announcementsList.map((anc) => (
                    <div key={anc._id} className="p-2.5 bg-sky-50/80 border border-sky-150 rounded-2xl flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Volume2 size={14}/>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900">{anc.title}</p>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{anc.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Birthdays Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all duration-300 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Cake size={15} className="text-pink-500"/>
                  Upcoming Birthdays
                </h3>
              </div>

              {upcomingBirthdays.length === 0 ? (
                <div className="py-4 text-center text-slate-400">
                  <p className="text-xs font-medium italic">No upcoming birthdays this week.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {upcomingBirthdays.map((bday) => (
                    <div key={bday._id} className="flex items-center justify-between gap-2 p-1.5 rounded-2xl hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {bday.photoUrl ? (
                          <img src={bday.photoUrl} alt={bday.fullName} className="w-7 h-7 rounded-full object-cover shrink-0"/>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-pink-100 text-pink-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {bday.fullName.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{bday.fullName}</p>
                          <p className="text-[10px] text-slate-400 truncate">{bday.className}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-pink-700 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-lg shrink-0">
                        {bday.daysAway === 0 ? 'Today 🎉' : bday.dobDate}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default TeacherDashboard;
