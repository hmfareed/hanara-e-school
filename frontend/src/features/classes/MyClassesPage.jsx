import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Skeleton from '../../components/Skeleton';
import {
  Users,
  UserCheck,
  ClipboardCheck,
  BookOpen,
  FileText,
  FolderOpen,
  Award,
  BarChart3,
  LayoutDashboard,
  Search,
  Clock,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Trophy,
  Megaphone,
  Briefcase,
  Calendar,
  Check,
  Plus,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Edit3,
} from 'lucide-react';

import TeacherStudentDetailModal from '../students/TeacherStudentDetailModal';

/* ── Circular SVG Gauge Component for Active Class Workspace ── */
const CircularGauge = ({ percentage, color = '#10b981', size = 52, strokeWidth = 5 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
    </div>
  );
};

const MyClassesPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedDay, setSelectedDay] = useState('Tue Aug 6');

  // Fetch list of all classes assigned to teacher
  const { data: myClasses = [], isLoading: classesLoading } = useQuery({
    queryKey: ['myTeacherClasses'],
    queryFn: async () => {
      const res = await api.get('/teachers/my-classes');
      return res.data?.data || [];
    },
  });

  // Selected Class ID
  const selectedClassId = classId || (myClasses.length > 0 ? myClasses[0]._id : null);
  const activeClassObj = myClasses.find((c) => c._id === selectedClassId) || myClasses[0];

  // Fetch details for selected class
  const { data: classWorkspaceData, isLoading: detailsLoading } = useQuery({
    queryKey: ['myClassDetails', selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return null;
      const res = await api.get(`/teachers/my-classes/${selectedClassId}`);
      return res.data?.data;
    },
    enabled: !!selectedClassId,
    staleTime: 5 * 60 * 1000,
  });

  // Pending tasks for selected class
  const { data: pendingTasksData } = useQuery({
    queryKey: ['classPendingTasks', selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return null;
      const res = await api.get(`/teachers/my-classes/${selectedClassId}/pending-tasks`);
      return res.data?.data;
    },
    enabled: !!selectedClassId,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const pendingTasks = pendingTasksData?.tasks || [];
  const pendingCount = pendingTasksData?.total ?? 0;
  const urgentCount = pendingTasksData?.urgent ?? 0;

  // Fetch timetable slots for selected class
  const { data: classTimetable = [] } = useQuery({
    queryKey: ['myClassTimetable', selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return [];
      const res = await api.get(`/teachers/timetable?classId=${selectedClassId}`);
      return res.data?.data || [];
    },
    enabled: !!selectedClassId,
  });

  const { classDetails = {}, students = [], subjects = [], upcomingLessons = [], recentActivities = [] } =
    classWorkspaceData || {};

  // Check if current loaded data matches the selected class
  const isDataMatching = classDetails._id === selectedClassId;
  const activeClassName = isDataMatching && classDetails.name ? classDetails.name : activeClassObj?.name || 'Class';
  const activeStudentCount = isDataMatching ? students.length : activeClassObj?.studentCount || 0;
  const activeCapacity = isDataMatching ? classDetails.capacity : activeClassObj?.capacity || 40;

  // Filter students based on search term
  const filteredStudents = students.filter(
    (s) =>
      s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.admissionNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'students', label: 'Students' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'results', label: 'Results & CA' },
    { id: 'assignments', label: 'Assignments' },
    { id: 'lesson-notes', label: 'Lesson Notes' },
    { id: 'resources', label: 'Resources' },
    { id: 'behaviour', label: 'Behavior' },
  ];

  const daysOfWeek = [
    { day: 'Mon', date: 'Aug 5', key: 'Mon Aug 5', checked: true },
    { day: 'Tue', date: 'Aug 6', key: 'Tue Aug 6', checked: true },
    { day: 'Wed', date: 'Aug 7', key: 'Wed Aug 7', checked: false },
    { day: 'Thu', date: 'Aug 8', key: 'Thu Aug 8', checked: false },
    { day: 'Fri', date: 'Aug 9', key: 'Fri Aug 9', checked: false },
    { day: 'Sat', date: 'Aug 10', key: 'Sat Aug 10', checked: false },
  ];

  if (classesLoading) {
    return (
      <div className="space-y-6 pb-12">
        {/* Page header */}
        <Skeleton.Line width="w-40" height="h-8" />
        {/* Class pill cards row */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="min-w-[200px] bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2 shrink-0">
              <Skeleton.Line width="w-28" height="h-4" />
              <Skeleton.Line width="w-20" height="h-3" />
            </div>
          ))}
        </div>
        {/* Detail panel */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-5">
          <div className="flex gap-3 border-b border-slate-100 pb-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton.Box key={i} w="w-24" h="h-9" rounded="rounded-xl" />)}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton.StatCard key={i} />)}
          </div>
          <div className="space-y-1">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton.TableRow key={i} cols={5} />)}
          </div>
        </div>
      </div>
    );
  }

  if (myClasses.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto">
          <BookOpen className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">No Assigned Classes Found</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          You are currently not assigned as a form teacher or subject teacher for active classes. Please contact the administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Classes</h1>
      </div>

      {/* ── Class Cards Row (Selector Pills) ── */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
        {myClasses.map((cls) => {
          const isSelected = cls._id === selectedClassId;
          return (
            <button
              key={cls._id}
              onClick={() => {
                navigate(`/my-classes/${cls._id}`);
              }}
              className={`p-3.5 rounded-2xl flex items-center justify-between min-w-[200px] gap-4 transition-all duration-200 text-left flex-shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-[#044e3a] text-white shadow-md shadow-emerald-950/20 scale-[1.01]'
                  : 'bg-white border border-slate-200/90 text-slate-800 hover:bg-slate-50 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl flex items-center justify-center ${
                    isSelected ? 'bg-emerald-600/40 text-emerald-200' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-snug">{cls.name}</h4>
                  <p className={`text-xs ${isSelected ? 'text-emerald-100/80' : 'text-slate-500'}`}>
                    {cls.studentCount || 20} Students
                  </p>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-emerald-200' : 'text-slate-400'}`} />
            </button>
          );
        })}
      </div>

      {/* ── Active Class Banner Card ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#02382a] via-[#044e3a] to-[#023326] text-white p-6 md:p-8 shadow-xl border border-emerald-900/40">
        {/* Decorative Geometric Watermark Pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10 pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left info */}
          <div className="space-y-3">
            <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[10px] font-black uppercase tracking-wider">
              ACTIVE CLASS
            </span>

            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              {activeClassName} Workspace
            </h2>

            <p className="text-xs md:text-sm text-emerald-100/80 flex flex-wrap items-center gap-2 md:gap-3 font-medium">
              <span>Class Capacity: {activeCapacity} Students</span>
              <span>•</span>
              <span>Enrolled: {activeStudentCount} Students</span>
              <span>•</span>
              <span>Subjects Taught: {isDataMatching ? subjects.length : (activeClassObj?.subjectCount || 1)}</span>
            </p>
          </div>

          {/* Right Metrics Cards (2 Gauges) */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-4">
            {/* Metric 1: Attendance */}
            <div className="bg-black/25 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-4 min-w-[200px]">
              <CircularGauge percentage={isDataMatching ? (classDetails.attendanceRate || 100) : 100} color="#10b981" size={54} strokeWidth={5} />
              <div>
                <p className="text-2xl font-black text-white">{isDataMatching ? (classDetails.attendanceRate || 100) : 100}%</p>
                <p className="text-xs font-bold text-slate-200">Attendance</p>
                <p className="text-[10px] font-medium text-emerald-200/60">This Term</p>
              </div>
            </div>

            {/* Metric 2: Class Average */}
            <div className="bg-black/25 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-4 min-w-[200px]">
              <CircularGauge percentage={isDataMatching ? (classDetails.classAverageScore || 83) : 83} color="#818cf8" size={54} strokeWidth={5} />
              <div>
                <p className="text-2xl font-black text-white">{isDataMatching ? (classDetails.classAverageScore || 83) : 83}%</p>
                <p className="text-xs font-bold text-slate-200">Class Average</p>
                <p className="text-[10px] font-medium text-emerald-200/60">Term Score</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 Quick Stat Cards Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Enrolled Students */}
        <div className="p-5 bg-[#f0fdf4] rounded-2xl border border-emerald-100/90 shadow-2xs flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-3xl font-black text-slate-900">{activeStudentCount}</p>
            <p className="text-xs font-bold text-slate-600">Enrolled Students</p>
            <button
              onClick={() => setActiveTab('students')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition flex items-center gap-1 pt-1"
            >
              View all students &rarr;
            </button>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Term Attendance */}
        <div className="p-5 bg-[#f5f3ff] rounded-2xl border border-purple-100/90 shadow-2xs flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-3xl font-black text-slate-900">{isDataMatching ? (classDetails.attendanceRate || 100) : 100}%</p>
            <p className="text-xs font-bold text-slate-600">Term Attendance</p>
            <button
              onClick={() => setActiveTab('attendance')}
              className="text-xs font-bold text-purple-700 hover:text-purple-800 transition flex items-center gap-1 pt-1"
            >
              View attendance &rarr;
            </button>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-100/80 text-purple-600 flex items-center justify-center flex-shrink-0">
            <ClipboardCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Term Score Average */}
        <div className="p-5 bg-[#fff7ed] rounded-2xl border border-orange-100/90 shadow-2xs flex items-center justify-between gap-4">
          <div className="space-y-1">
            {isDataMatching && !classDetails.gradesEntered ? (
              <p className="text-3xl font-black text-slate-400">—</p>
            ) : (
              <p className="text-3xl font-black text-slate-900">
                {isDataMatching ? (classDetails.classAverageScore || 0) : 0}%
              </p>
            )}
            <p className="text-xs font-bold text-slate-600">Term Score Average</p>
            {isDataMatching && !classDetails.gradesEntered ? (
              <p className="text-[11px] text-slate-400 font-medium pt-1">No grades entered yet</p>
            ) : (
              <button
                onClick={() => setActiveTab('results')}
                className="text-xs font-bold text-orange-700 hover:text-orange-800 transition flex items-center gap-1 pt-1"
              >
                View results &rarr;
              </button>
            )}
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-100/80 text-orange-600 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Pending Tasks */}
        <div
          className={`p-5 rounded-2xl border shadow-2xs flex items-center justify-between gap-4 cursor-pointer transition-all ${
            urgentCount > 0
              ? 'bg-[#fff1f2] border-rose-200/90 hover:border-rose-300'
              : 'bg-[#eff6ff] border-blue-100/90 hover:border-blue-200'
          }`}
          onClick={() => setShowTaskPanel((v) => !v)}
        >
          <div className="space-y-1">
            <p className={`text-3xl font-black ${urgentCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {pendingCount}
            </p>
            <p className="text-xs font-bold text-slate-600">Pending Tasks</p>
            <p className={`text-xs font-bold pt-1 flex items-center gap-1 ${
              urgentCount > 0 ? 'text-rose-600' : 'text-blue-700'
            }`}>
              {urgentCount > 0 ? <AlertTriangle className="w-3 h-3" /> : null}
              {urgentCount > 0 ? `${urgentCount} urgent` : 'View tasks'}
              {showTaskPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
            urgentCount > 0 ? 'bg-rose-100/80 text-rose-600' : 'bg-blue-100/80 text-blue-600'
          }`}>
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ── Pending Tasks Panel ─────────────────────────────────── */}
      {showTaskPanel && pendingTasks.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              Action Required — {pendingCount} Pending Task{pendingCount !== 1 ? 's' : ''}
            </h3>
            <button onClick={() => setShowTaskPanel(false)} className="text-xs text-slate-400 hover:text-slate-600 font-bold">Dismiss</button>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingTasks.map((task) => {
              const isUrgent = task.type === 'urgent';
              const isWarning = task.type === 'warning';
              return (
                <div key={task.id} className={`flex items-start gap-4 px-5 py-4 ${
                  isUrgent ? 'bg-rose-50/50' : isWarning ? 'bg-amber-50/50' : 'bg-slate-50/30'
                }`}>
                  <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isUrgent ? 'bg-rose-100 text-rose-600' : isWarning ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {task.icon === 'clipboard' ? <ClipboardCheck className="w-4 h-4" /> :
                     task.icon === 'edit' ? <Edit3 className="w-4 h-4" /> :
                     <BarChart3 className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isUrgent && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">Urgent</span>
                      )}
                      {isWarning && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Action Needed</span>
                      )}
                      <p className="text-sm font-bold text-slate-900">{task.title}</p>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>
                  </div>
                  <button
                    onClick={() => { setActiveTab(task.tab); setShowTaskPanel(false); }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 ${
                      isUrgent ? 'bg-rose-600 text-white hover:bg-rose-700' :
                      isWarning ? 'bg-amber-500 text-white hover:bg-amber-600' :
                      'bg-slate-800 text-white hover:bg-slate-900'
                    }`}
                  >
                    {task.action}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {showTaskPanel && pendingTasks.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-bold text-emerald-800">All caught up! No pending tasks for this class.</p>
        </div>
      )}

      {/* ── Navigation Tabs ── */}
      <div className="border-b border-slate-200">
        <div className="flex items-center gap-8 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 text-sm transition-all duration-150 flex-shrink-0 font-bold ${
                  isActive
                    ? 'border-b-2 border-[#044e3a] text-[#044e3a] font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content Area ── */}
      {detailsLoading ? (
        <div className="h-64 bg-white rounded-3xl border border-slate-200/80 p-6 animate-pulse"></div>
      ) : (
        <div>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column (2 Cols) */}
              <div className="lg:col-span-2 space-y-6">
                {/* Upcoming Class Lessons */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-900 text-base">Upcoming Class Lessons</h3>
                    <button
                      onClick={() => navigate('/timetable')}
                      className="px-3.5 py-1.5 border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl transition"
                    >
                      View Timetable
                    </button>
                  </div>

                  {/* Lesson Card */}
                  {classTimetable.length > 0 ? (
                    <div className="space-y-2">
                      {classTimetable.slice(0, 2).map((slot, idx) => (
                        <div
                          key={slot._id || idx}
                          className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-4">
                            {/* Green Date Badge Box */}
                            <div className="bg-[#e6f4ea] text-[#044e3a] p-3 rounded-2xl min-w-[72px] text-center flex flex-col items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                                {slot.day ? slot.day.slice(0, 3).toUpperCase() : 'TODAY'}
                              </span>
                              <span className="text-sm font-black leading-none my-0.5 text-slate-900">
                                {slot.startTime}
                              </span>
                            </div>

                            {/* Lesson Info */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-500">
                                  {slot.startTime} – {slot.endTime}
                                </span>
                                {idx === 0 && (
                                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-extrabold rounded-md">
                                    Next Lesson
                                  </span>
                                )}
                              </div>
                              <h4 className="font-extrabold text-slate-900 text-base">{slot.subject}</h4>
                              {slot.topic && <p className="text-xs text-slate-500 font-medium">Topic: {slot.topic}</p>}
                            </div>
                          </div>

                          <button
                            onClick={() => navigate('/timetable')}
                            className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition self-start sm:self-center flex items-center gap-1"
                          >
                            Edit Schedule &rarr;
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        {/* Green Date Badge Box */}
                        <div className="bg-[#e6f4ea] text-[#044e3a] p-3 rounded-2xl min-w-[72px] text-center flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">TUE</span>
                          <span className="text-2xl font-black leading-none my-0.5 text-slate-900">08</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">AUG</span>
                        </div>

                        {/* Lesson Info */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-500">08:00 AM - 09:00 AM</span>
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-extrabold rounded-md">
                              Next Lesson
                            </span>
                          </div>
                          <h4 className="font-extrabold text-slate-900 text-base">Computing</h4>
                          <p className="text-xs text-slate-500 font-medium">Topic: Algebraic Expressions & Factors</p>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate('/timetable')}
                        className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition self-start sm:self-center flex items-center gap-1"
                      >
                        Add Timetable Slot &rarr;
                      </button>
                    </div>
                  )}
                </div>

                {/* This Week's Schedule */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                  <h3 className="font-extrabold text-slate-900 text-base">This Week's Schedule</h3>

                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                    {daysOfWeek.map((d) => {
                      const isSelected = selectedDay === d.key;
                      return (
                        <div
                          key={d.key}
                          onClick={() => setSelectedDay(d.key)}
                          className={`p-3 rounded-2xl text-center cursor-pointer transition flex flex-col items-center justify-between min-h-[90px] ${
                            isSelected
                              ? 'bg-[#e6f4ea] border border-emerald-300 text-[#044e3a] font-bold shadow-2xs'
                              : 'bg-slate-50/70 border border-slate-100 text-slate-600 hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold">{d.day}</p>
                            <p className={`text-xs ${isSelected ? 'font-black text-slate-900' : 'text-slate-500'}`}>
                              {d.date}
                            </p>
                          </div>
                          {d.checked && (
                            <div
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] mt-2 ${
                                isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-white'
                              }`}
                            >
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column (1 Col) */}
              <div className="space-y-6">
                {/* Recent Class Activities */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-900 text-base">Recent Class Activities</h3>
                    <span className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer">View All</span>
                  </div>

                  <div className="space-y-4">
                    {/* Activity 1 */}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-slate-900 text-xs truncate">Daily Attendance Marked</h4>
                          <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">10 mins ago</span>
                        </div>
                        <p className="text-xs text-slate-500">20 students recorded for today.</p>
                      </div>
                    </div>

                    {/* Activity 2 */}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-slate-900 text-xs truncate">Continuous Assessment Score Updated</h4>
                          <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">Yesterday</span>
                        </div>
                        <p className="text-xs text-slate-500">Class Score 1 entries recorded for Mathematics.</p>
                      </div>
                    </div>

                    {/* Activity 3 */}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-slate-900 text-xs truncate">Offline Assignment Logged</h4>
                          <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">2 days ago</span>
                        </div>
                        <p className="text-xs text-slate-500">Assignment "Homework 3" issued to all students.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                  <h3 className="font-extrabold text-slate-900 text-base">Quick Actions</h3>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Action 1: Take Attendance */}
                    <button
                      onClick={() => navigate(`/attendance?classId=${selectedClassId}`)}
                      className="p-4 rounded-2xl bg-[#e6f4ea] hover:bg-emerald-100/70 transition flex flex-col items-center justify-center text-center gap-2 border border-emerald-100 cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center group-hover:scale-105 transition">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 leading-snug">Take Attendance</span>
                    </button>

                    {/* Action 2: Add Assignment */}
                    <button
                      onClick={() => setActiveTab('assignments')}
                      className="p-4 rounded-2xl bg-[#f3e8ff] hover:bg-purple-100/70 transition flex flex-col items-center justify-center text-center gap-2 border border-purple-100 cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center group-hover:scale-105 transition">
                        <FileText className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 leading-snug">Add Assignment</span>
                    </button>

                    {/* Action 3: Add Lesson Note */}
                    <button
                      onClick={() => setActiveTab('lesson-notes')}
                      className="p-4 rounded-2xl bg-[#e0f2fe] hover:bg-blue-100/70 transition flex flex-col items-center justify-center text-center gap-2 border border-blue-100 cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center group-hover:scale-105 transition">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 leading-snug">Add Lesson Note</span>
                    </button>

                    {/* Action 4: Post Announcement */}
                    <button
                      onClick={() => navigate('/messages')}
                      className="p-4 rounded-2xl bg-[#ffedd5] hover:bg-orange-100/70 transition flex flex-col items-center justify-center text-center gap-2 border border-orange-100 cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center group-hover:scale-105 transition">
                        <Megaphone className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 leading-snug">Post Announcement</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STUDENTS */}
          {activeTab === 'students' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="font-bold text-slate-900 text-lg">Class Roster ({students.length})</h3>
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search student by name or adm no..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                      <th className="p-3.5 rounded-l-xl">Student</th>
                      <th className="p-3.5">Adm No</th>
                      <th className="p-3.5">Gender</th>
                      <th className="p-3.5">Attendance %</th>
                      <th className="p-3.5">Average Score</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 rounded-r-xl text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredStudents.map((st) => (
                      <tr key={st._id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 flex items-center gap-3">
                          {st.photoUrl ? (
                            <img src={st.photoUrl} alt={st.fullName} className="w-9 h-9 rounded-xl object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
                              {st.firstName?.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900">{st.fullName}</p>
                            <p className="text-[11px] text-slate-400">Guardian: {st.guardianPhone || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-slate-600">{st.admissionNumber}</td>
                        <td className="p-3.5 capitalize">{st.gender}</td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-[11px]">
                            {st.attendanceRate}%
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 bg-purple-50 text-purple-700 font-bold rounded-lg text-[11px]">
                            {st.averageScore}%
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full uppercase">
                            {st.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => setSelectedStudentId(st._id)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-[#044e3a] hover:text-white text-emerald-800 font-semibold rounded-xl transition text-[11px]"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Class Attendance Register</h3>
                  <p className="text-xs text-slate-500">Daily roll call & record management for {classDetails.name}</p>
                </div>
                <button
                  onClick={() => navigate(`/attendance?classId=${selectedClassId}`)}
                  className="px-4 py-2.5 bg-[#044e3a] hover:bg-[#033b2c] text-white font-bold text-xs rounded-xl shadow-2xs"
                >
                  Open Full Attendance Sheet
                </button>
              </div>

              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                <UserCheck className="w-10 h-10 text-emerald-700 mx-auto" />
                <h4 className="font-bold text-slate-900 text-base">Class Register Ready</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Click below to record or update attendance for {classDetails.name} students for today.
                </p>
                <button
                  onClick={() => navigate(`/attendance?classId=${selectedClassId}`)}
                  className="px-5 py-2.5 bg-[#044e3a] text-white font-bold text-xs rounded-xl"
                >
                  Mark Daily Register
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: RESULTS */}
          {activeTab === 'results' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Results & Continuous Assessment (CA)</h3>
                  <p className="text-xs text-slate-500">CA Weight: 40% (Class Score + Assignment) • Exam Weight: 60%</p>
                </div>
                <button
                  onClick={() => navigate('/grades')}
                  className="px-4 py-2.5 bg-[#044e3a] hover:bg-[#033b2c] text-white font-bold text-xs rounded-xl shadow-2xs"
                >
                  Open Grade Entry Sheet
                </button>
              </div>

              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                <ClipboardCheck className="w-10 h-10 text-emerald-700 mx-auto" />
                <h4 className="font-bold text-slate-900 text-base">Continuous Assessment Breakdown</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Enter CS1 (10), CS2 (10), CS3 (5), CS4 (5) and AS1 (10), AS2 (10), AS3 (5), AS4 (5) alongside Exam Score (100).
                </p>
                <button
                  onClick={() => navigate('/grades')}
                  className="px-5 py-2.5 bg-[#044e3a] text-white font-bold text-xs rounded-xl"
                >
                  Launch Score Entry Grid
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: ASSIGNMENTS */}
          {activeTab === 'assignments' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Offline Assignments Log</h3>
                  <p className="text-xs text-slate-500">Track physical assignments given to {classDetails.name}</p>
                </div>
                <button className="px-4 py-2.5 bg-[#044e3a] text-white font-bold text-xs rounded-xl flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Record New Assignment
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Weekly English Essay: Environmental Conservation</h4>
                    <p className="text-xs text-slate-500">Given on Aug 1, 2026 • Max Marks: 20</p>
                  </div>
                  <span className="px-3 py-1 bg-amber-50 text-amber-800 text-xs font-semibold rounded-xl">
                    Pending Grading
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: LESSON NOTES */}
          {activeTab === 'lesson-notes' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Weekly Lesson Plans</h3>
                  <p className="text-xs text-slate-500">Lesson objectives, activities & teaching materials</p>
                </div>
                <button className="px-4 py-2.5 bg-[#044e3a] text-white font-bold text-xs rounded-xl flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Create Lesson Plan
                </button>
              </div>
              <p className="text-xs text-slate-500 italic">No lesson plans logged yet for this week.</p>
            </div>
          )}

          {/* TAB 7: RESOURCES */}
          {activeTab === 'resources' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Class Learning Resources</h3>
                  <p className="text-xs text-slate-500">PDFs, PowerPoint slides, and reference materials</p>
                </div>
                <button className="px-4 py-2.5 bg-[#044e3a] text-white font-bold text-xs rounded-xl flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Upload Resource
                </button>
              </div>
              <p className="text-xs text-slate-500 italic">No resource files attached to this class yet.</p>
            </div>
          )}

          {/* TAB 8: BEHAVIOUR */}
          {activeTab === 'behaviour' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Student Behaviour & Conduct Log</h3>
                  <p className="text-xs text-slate-500">Record commendations, warnings, and misconduct entries</p>
                </div>
                <button className="px-4 py-2.5 bg-[#044e3a] text-white font-bold text-xs rounded-xl flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Log Conduct Entry
                </button>
              </div>
              <p className="text-xs text-slate-500 italic">No disciplinary or commendation records logged for this class.</p>
            </div>
          )}
        </div>
      )}

      {/* Student Detail Drawer Modal */}
      {selectedStudentId && (
        <TeacherStudentDetailModal
          studentId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
        />
      )}
    </div>
  );
};

export default MyClassesPage;

