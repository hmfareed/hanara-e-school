import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getStaffGreeting } from '../../utils/greetingUtils';
import Skeleton from '../../components/Skeleton';
import {
  Users,
  CalendarCheck,
  UserCheck,
  BookOpen,
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Megaphone,
  Cake,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';

const LEADERSHIP_QUOTES = [
  "Leadership is not about being in charge. It is about taking care of those in your charge.",
  "A leader is one who knows the way, goes the way, and shows the way.",
  "The function of leadership is to produce more leaders, not more followers.",
  "Great leaders inspire people to have confidence in themselves.",
  "Leadership is the capacity to translate vision into reality.",
  "Before you are a leader, success is all about growing yourself. When you become a leader, success is all about growing others.",
  "To lead people, walk behind them.",
  "Inspiring minds, shaping character, and leading by example every day.",
  "Excellence is never an accident; it is always the result of high intention, sincere effort, and intelligent execution.",
  "True leadership lies in guiding others to success and bringing out the very best in them.",
];

const DashboardPage = () => {
  const { user } = useAuth();
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [fadeQuote, setFadeQuote] = useState(true);

  // 5-second leadership quote rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setFadeQuote(false);
      setTimeout(() => {
        setQuoteIndex((prev) => (prev + 1) % LEADERSHIP_QUOTES.length);
        setFadeQuote(true);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: async () => {
      const res = await api.get('/dashboard/summary');
      return res.data?.data;
    },
    refetchOnMount: 'always',
    staleTime: 5 * 60 * 1000,      // 5 minutes
    refetchInterval: 2 * 60 * 1000, // 2 minutes
  });

  const getUserName = () => {
    if (user?.refStaff) {
      const title = user.refStaff.title ? `${user.refStaff.title} ` : 'Sir ';
      const last = user.refStaff.lastName || '';
      return `${title}${user.refStaff.firstName} ${last}`.trim();
    }
    return user?.name || user?.email?.split('@')[0] || 'Teacher';
  };

  const isInitialLoading = isLoading || (!data && isFetching);

  if (isInitialLoading) {
    return (
      <div className="space-y-6">
        {/* Hero banner skeleton */}
        <Skeleton.HeroBanner className="min-h-[11rem]" />
        {/* 4 stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(i => <Skeleton.StatCard key={i} />)}
        </div>
        {/* 2-column middle row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
            <Skeleton.Line width="w-40" height="h-5" />
            {[1, 2, 3, 4].map(i => <Skeleton.ListItem key={i} />)}
          </div>
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
            <Skeleton.Line width="w-40" height="h-5" />
            {[1, 2, 3, 4].map(i => <Skeleton.ListItem key={i} />)}
          </div>
        </div>
        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
              <Skeleton.Line width="w-32" height="h-5" />
              {[1, 2, 3].map(j => <Skeleton.ListItem key={j} />)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700">
        <h4 className="font-bold text-lg">Error loading dashboard</h4>
        <p className="text-sm mt-1">{error.message || 'Please check if the backend server is running.'}</p>
      </div>
    );
  }

  const {
    totalStudents = 0,
    todayClassesCount = 0,
    attendance = {},
    pendingAttendanceClasses = [],
    myClasses = [],
    recentAdmissions = [],
    recentAnnouncements = [],
    pendingMockEntries = 0,
    upcomingBirthdays = [],
  } = data || {};

  const presentCount = attendance?.present ?? 0;
  const absentCount = attendance?.absent ?? 0;
  const lateCount = attendance?.late ?? 0;
  const totalMarked = attendance?.totalMarked ?? 0;
  const overallRate = attendance?.rate ?? 0;

  // Calculate SVG stroke offset for real rate percentage
  const circumference = 251.2;
  const strokeOffset = circumference - (circumference * overallRate) / 100;

  return (
    <div className="space-y-6">
      {/* ── Top Header Banner Card ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-50 via-emerald-50/40 to-teal-50/60 border border-slate-200/80 p-6 md:p-8 shadow-2xs">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              {getStaffGreeting(user, getUserName())} 👋
            </h1>
            <div className={`transition-all duration-300 min-h-[40px] flex items-center ${fadeQuote ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
              <p className="text-sm text-slate-600 italic font-medium leading-relaxed">
                "{LEADERSHIP_QUOTES[quoteIndex]}"
              </p>
            </div>
          </div>

          {/* Action Card: Real Attendance Alert */}
          <div className="bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-2xl p-4 md:p-5 shadow-xs shrink-0 max-w-md w-full xl:w-auto">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {todayClassesCount} {todayClassesCount === 1 ? 'class' : 'classes'} active
              </h3>
              <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                <Calendar size={16} />
              </div>
            </div>

            {pendingAttendanceClasses.length > 0 ? (
              <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl p-3 mb-3.5 flex items-center space-x-2.5 text-xs text-amber-950 font-semibold">
                <AlertCircle size={16} className="text-amber-700 shrink-0" />
                <span>
                  Attendance pending for{' '}
                  <strong className="font-extrabold text-amber-950">
                    {pendingAttendanceClasses.map((c) => c.name).join(', ')}
                  </strong>.
                </span>
              </div>
            ) : (
              <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-xl p-3 mb-3.5 flex items-center space-x-2.5 text-xs text-emerald-950 font-semibold">
                <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                <span>Attendance has been marked for today!</span>
              </div>
            )}

            <Link
              to="/attendance"
              className="w-full inline-flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-[#046a4e] hover:bg-[#03523d] text-white font-bold text-xs shadow-sm transition-all duration-150 active:scale-98"
            >
              <UserCheck size={16} />
              <span>Take Attendance</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI Stats Grid Row (4 Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Card 1: Classes Count */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 block">Active Classes</span>
            <h2 className="text-3xl font-black text-slate-900">{todayClassesCount}</h2>
            <span className="text-xs font-bold text-emerald-700 block mt-1">Classrooms & Streams</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shrink-0">
            <BookOpen size={22} />
          </div>
        </div>

        {/* Card 2: Active Students */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 block">Total Students</span>
            <h2 className="text-3xl font-black text-slate-900">{totalStudents}</h2>
            <span className="text-xs text-slate-400 font-medium block mt-1">
              {user?.role === 'teacher' ? 'Across assigned classes' : 'Total enrolled students'}
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
        </div>

        {/* Card 3: Pending Mock Entries / Grade Items */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 block">Pending Results / Entries</span>
            <h2 className="text-3xl font-black text-slate-900">{pendingMockEntries}</h2>
            <span className="text-xs font-semibold text-amber-600 block mt-1">Need verification</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <FileText size={22} />
          </div>
        </div>

        {/* Card 4: Attendance Rate Today */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 block">Today's Attendance Rate</span>
            <h2 className="text-3xl font-black text-slate-900">{overallRate}%</h2>
            <span className="text-xs font-bold text-purple-700 block mt-1">{totalMarked} students marked</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
            <CalendarCheck size={22} />
          </div>
        </div>
      </div>

      {/* ── Middle Row: Classes List, Attendance Overview, Upcoming Birthdays ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real Assigned Classes */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <BookOpen size={18} className="text-emerald-700" />
              <span>{user?.role === 'teacher' ? 'Assigned Classes' : 'Classes Overview'}</span>
            </h3>
            <Link to="/classes" className="text-xs font-bold text-slate-600 hover:text-emerald-800 bg-slate-100 hover:bg-slate-200/70 px-2.5 py-1 rounded-lg transition-colors">
              Manage Classes
            </Link>
          </div>

          <div className="space-y-2.5">
            {myClasses.length > 0 ? (
              myClasses.map((c) => (
                <div key={c._id} className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900">{c.name}</h4>
                    <p className="text-[11px] font-medium text-slate-500">{c.stage}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold text-slate-600">{c.studentCount} students</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {c.attendanceRate}% Att.
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 font-medium">
                No active classes found in the system.
              </div>
            )}
          </div>
        </div>

        {/* Attendance Overview */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <CalendarCheck size={18} className="text-emerald-700" />
                <span>Attendance Overview</span>
              </h3>
            </div>

            {/* Circular Donut Chart */}
            <div className="relative flex items-center justify-center my-4">
              <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="12" fill="transparent" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#059669"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={isNaN(strokeOffset) ? circumference : strokeOffset}
                  strokeLinecap="round"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-slate-900 leading-none">{overallRate}%</span>
                <span className="text-[11px] font-semibold text-slate-400 mt-0.5">Overall</span>
              </div>
            </div>

            {/* Attendance Legend */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center space-x-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
                  <span className="text-slate-600">Present Today</span>
                </div>
                <span className="text-slate-900 font-bold">{presentCount}</span>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center space-x-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                  <span className="text-slate-600">Absent Today</span>
                </div>
                <span className="text-slate-900 font-bold">{absentCount}</span>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center space-x-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>
                  <span className="text-slate-600">Late Today</span>
                </div>
                <span className="text-slate-900 font-bold">{lateCount}</span>
              </div>
            </div>
          </div>

          <Link
            to="/attendance"
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-2xl border border-slate-200/90 hover:bg-slate-50 font-bold text-xs text-slate-700 transition-colors"
          >
            <UserCheck size={15} />
            <span>Open Attendance Register</span>
          </Link>
        </div>

        {/* Upcoming Student Birthdays */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Cake size={18} className="text-emerald-600" />
                <span>Upcoming Birthdays</span>
              </h3>
            </div>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {upcomingBirthdays.length > 0 ? (
                upcomingBirthdays.map((item) => (
                  <div key={item._id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center space-x-2.5">
                      <div className="h-8 w-8 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0 overflow-hidden">
                        {item.photoUrl ? (
                          <img src={item.photoUrl} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                          <span>{item.firstName[0]}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{item.firstName} {item.lastName}</p>
                        <span className="text-[10px] text-slate-400 font-semibold">{item.currentClass?.name || 'Unassigned'}</span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                      {item.daysToBirthday === 0 ? 'Today 🎉' : item.daysToBirthday === 1 ? 'Tomorrow 🎂' : `${item.daysToBirthday} days left`}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center space-y-1 text-xs text-slate-400 font-medium">
                  <Cake size={20} className="mx-auto text-slate-300 mb-1" />
                  <p>No student birthdays in the next 3 days.</p>
                </div>
              )}
            </div>
          </div>

          <Link
            to="/students"
            className="w-full flex items-center justify-center py-2.5 px-4 rounded-2xl border border-slate-200/90 hover:bg-slate-50 font-bold text-xs text-slate-700 transition-colors"
          >
            View Student Directory
          </Link>
        </div>
      </div>

      {/* ── Bottom Row: 2 Cards (Recent Enrolled Students, Broadcast Messages) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Recent Admissions / Activity */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-2xs space-y-3 md:col-span-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recent Enrolled Students</h3>
            <Link to="/students" className="text-[11px] font-bold text-emerald-700">View All</Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead>
                <tr className="text-slate-400 font-semibold border-b border-slate-100">
                  <th className="py-2.5">Adm #</th>
                  <th className="py-2.5">Student Name</th>
                  <th className="py-2.5">Class</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentAdmissions.length > 0 ? (
                  recentAdmissions.map((student) => (
                    <tr key={student._id} className="hover:bg-slate-50/60">
                      <td className="py-3 font-mono font-bold text-slate-900">{student.admissionNumber}</td>
                      <td className="py-3 font-semibold text-slate-900">{student.firstName} {student.lastName}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200/60">
                          {student.currentClass?.name || 'Unassigned'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Link to={`/students/${student._id}`} className="inline-flex items-center space-x-1 font-bold text-emerald-700 hover:underline">
                          <span>View Profile</span>
                          <ChevronRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-xs text-slate-400">
                      No recent student activity found in the system.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 2: Recent Broadcast Messages */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-2xs space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5 uppercase tracking-wider">
                <Megaphone size={14} className="text-emerald-700" />
                <span>Recent Broadcasts</span>
              </h3>
              <Link to="/sms" className="text-[11px] font-bold text-emerald-700">View All</Link>
            </div>

            <div className="space-y-2.5">
              {recentAnnouncements.length > 0 ? (
                recentAnnouncements.map((ann, idx) => (
                  <div key={idx} className="bg-slate-50/70 border border-slate-100 rounded-xl p-2.5 space-y-1">
                    <p className="text-xs font-semibold text-slate-800 line-clamp-2">{ann.message}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[9px] font-semibold text-slate-400">
                        {new Date(ann.createdAt).toLocaleDateString('en-GB')}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 uppercase">
                        {ann.status || 'Sent'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                  <MessageSquare size={18} className="mx-auto text-slate-300 mb-1" />
                  <p>No recent broadcast messages found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
