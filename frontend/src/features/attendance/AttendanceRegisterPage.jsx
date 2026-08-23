import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Skeleton from '../../components/Skeleton';
import {
  ClipboardList,
  Check,
  AlertCircle,
  Save,
  Calendar,
  CheckSquare,
  XCircle,
  Clock,
  Search,
  Filter,
  History,
  UserCheck,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

const AttendanceRegisterPage = () => {
  const { user, activeMode: systemActiveMode } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const urlClassId = searchParams.get('classId');

  const [activeMode, setActiveMode] = useState('register'); // 'register' | 'history'
  const [selectedClass, setSelectedClass] = useState(urlClassId || '');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [register, setRegister] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });

  // History Filter States
  const [historyFilterMode, setHistoryFilterMode] = useState('date'); // 'date' | 'range' | 'presets'
  const [historySpecificDate, setHistorySpecificDate] = useState(new Date().toISOString().split('T')[0]);
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const [historyTimeframe, setHistoryTimeframe] = useState('last_week'); // 'yesterday', 'last_week', 'last_month', 'term'
  const [historySearch, setHistorySearch] = useState('');

  const isTeacherOnly = user?.role === 'teacher' || (user?.role === 'system_admin' && systemActiveMode === 'teacher');
  const currentUserId = (user?.id || user?._id)?.toString();
  const currentStaffId = (user?.refStaff?._id || user?.refStaff)?.toString();

  const { data: rawClasses = [], isLoading: classesLoading } = useQuery({
    queryKey: ['attendanceClassesList', user?.role, currentUserId, currentStaffId, systemActiveMode],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  const availableClasses = React.useMemo(() => {
    if (!rawClasses || rawClasses.length === 0) return [];
    if (['superadmin', 'admin'].includes(user?.role) || (user?.role === 'system_admin' && systemActiveMode === 'admin')) {
      return rawClasses;
    }
    // For teachers: only classes where they are the designated formTeacher or classTeacher
    return rawClasses.filter((cls) => {
      const ftId = (cls.formTeacher?._id || cls.formTeacher)?.toString();
      const ctId = (cls.classTeacher?._id || cls.classTeacher)?.toString();
      return (currentUserId && ftId === currentUserId) || (currentStaffId && (ctId === currentStaffId || ftId === currentStaffId));
    });
  }, [rawClasses, user?.role, systemActiveMode, currentUserId, currentStaffId]);

  useEffect(() => {
    if (availableClasses.length > 0) {
      if (!selectedClass || !availableClasses.some((c) => c._id === selectedClass)) {
        setSelectedClass(availableClasses[0]._id);
      }
    } else {
      setSelectedClass('');
    }
  }, [availableClasses, selectedClass]);

  // Query Daily Attendance Register
  const { data: registerData, isLoading, error } = useQuery({
    queryKey: ['attendanceRegister', selectedClass, selectedDate],
    queryFn: async () => {
      if (!selectedClass) return null;
      const res = await api.get(`/attendance?class=${selectedClass}&date=${selectedDate}`);
      return res.data?.data;
    },
    enabled: !!selectedClass && activeMode === 'register',
  });

  // Query Attendance History
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: [
      'attendanceHistory',
      selectedClass,
      historyFilterMode,
      historySpecificDate,
      historyDateFrom,
      historyDateTo,
      historyTimeframe,
      historySearch,
    ],
    queryFn: async () => {
      if (!selectedClass) return null;
      const params = { classId: selectedClass, search: historySearch };
      if (historyFilterMode === 'date') {
        params.date = historySpecificDate;
      } else if (historyFilterMode === 'range') {
        if (historyDateFrom) params.from = historyDateFrom;
        if (historyDateTo) params.to = historyDateTo;
      } else {
        params.timeframe = historyTimeframe;
      }
      const res = await api.get('/attendance/history', { params });
      return res.data?.data;
    },
    enabled: !!selectedClass && activeMode === 'history',
  });

  useEffect(() => {
    if (registerData?.register) {
      setRegister(
        registerData.register.map((item) => ({
          studentId: item.student._id,
          name: `${item.student.firstName} ${item.student.lastName}`,
          admissionNumber: item.student.admissionNumber,
          gender: item.student.gender,
          photoUrl: item.student.photoUrl,
          status: item.status || 'present',
          notes: item.notes || '',
        }))
      );
    }
  }, [registerData]);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/attendance/bulk', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceRegister'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceHistory'] });
      queryClient.invalidateQueries({ queryKey: ['teacherDashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      setMessage({ text: 'Attendance register saved successfully! Dashboard & parent portal updated.', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    },
    onError: (err) => {
      setMessage({ text: err.response?.data?.message || err.message || 'Failed to save attendance.', type: 'error' });
    },
  });

  const handleStatusChange = (studentId, status) => {
    setRegister((prev) =>
      prev.map((item) => (item.studentId === studentId ? { ...item, status } : item))
    );
  };

  const handleNotesChange = (studentId, notes) => {
    setRegister((prev) =>
      prev.map((item) => (item.studentId === studentId ? { ...item, notes } : item))
    );
  };

  const handleMarkAll = (status) => {
    setRegister((prev) => prev.map((item) => ({ ...item, status })));
  };

  const handleSave = () => {
    if (!selectedClass) {
      setMessage({ text: 'Please select a class first.', type: 'error' });
      return;
    }
    if (register.length === 0) {
      setMessage({ text: 'No students found in this class to save.', type: 'error' });
      return;
    }

    const targetCls = (availableClasses || []).find((c) => c._id === selectedClass);
    const termId = targetCls?.academicYear?.terms?.[0]?._id || null;

    const dateObj = new Date(selectedDate);
    dateObj.setHours(0, 0, 0, 0);

    const payload = {
      classId: selectedClass,
      date: dateObj.toISOString(),
      termId: termId || null,
      records: register.map((r) => ({
        studentId: r.studentId,
        status: r.status || 'present',
        notes: r.notes || '',
      })),
    };

    saveMutation.mutate(payload);
  };

  if (classesLoading) {
    return (
      <div className="space-y-6 pb-12">
        {/* Header skeleton */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton.Line width="w-64" height="h-7" />
            <Skeleton.Line width="w-80" height="h-4" />
          </div>
          <Skeleton.Box w="w-52" h="h-11" rounded="rounded-2xl" />
        </div>
        {/* Class + date selector bar */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row gap-4">
            <Skeleton.Box w="w-full" h="h-10" rounded="rounded-xl" />
            <Skeleton.Box w="w-48" h="h-10" rounded="rounded-xl" />
          </div>
        </div>
        {/* Register table skeleton */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex gap-6">
            {[1, 2, 3, 4].map(i => <Skeleton.Line key={i} width="w-24" height="h-3.5" />)}
          </div>
          {Array.from({ length: 12 }).map((_, i) => <Skeleton.TableRow key={i} cols={5} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Bar & Mode Switcher ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-indigo-600" />
            Class Attendance Register
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Record daily student attendance, prevent duplicates, and view attendance history logs.
          </p>
        </div>

        {/* Register vs History Selector */}
        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl self-start sm:self-center">
          <button
            onClick={() => setActiveMode('register')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeMode === 'register' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mark Daily Register
          </button>
          <button
            onClick={() => setActiveMode('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              activeMode === 'history' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Attendance History
          </button>
        </div>
      </div>

      {/* ── Notification Feedback Message ── */}
      {message.text && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Empty State / Not Form Teacher Guard */}
      {availableClasses.length === 0 && !classesLoading && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-amber-900 flex items-start gap-4 shadow-xs">
          <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-base text-amber-950">
              {isTeacherOnly ? 'No Form Class Assigned' : 'No Classes Found'}
            </h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              {isTeacherOnly
                ? 'Attendance registration is reserved exclusively for designated Form Teachers for their assigned classes. Your account is not currently assigned as the Form Teacher for any class. If you are supposed to take attendance for a class, please contact your school administrator to assign you as the Form Teacher under Classes & Subjects.'
                : 'There are no active classes found in the system. Please create classes under Classes & Subjects first.'}
            </p>
          </div>
        </div>
      )}

      {/* MODE 1: DAILY REGISTER */}
      {activeMode === 'register' && availableClasses.length > 0 && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Select Class <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {availableClasses.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.name} ({cls.level?.displayName || 'Basic'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Attendance Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-end justify-between sm:justify-end gap-2">
              <button
                onClick={() => handleMarkAll('present')}
                className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-xl border border-emerald-200 transition"
              >
                All Present
              </button>
              <button
                onClick={() => handleMarkAll('absent')}
                className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs rounded-xl border border-rose-200 transition"
              >
                All Absent
              </button>
            </div>
          </div>

          {/* Register Sheet Table */}
          {isLoading ? (
            <div className="h-64 bg-white rounded-3xl border border-slate-200 p-6 animate-pulse"></div>
          ) : register.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="font-bold text-sm">No active students found in this class.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base">
                  Roll Call List ({register.length} Students)
                </h3>

                <button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saveMutation.isPending ? 'Saving Register...' : 'Save Attendance Register'}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                      <th className="p-3.5 rounded-l-xl">Student</th>
                      <th className="p-3.5">Adm No</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 rounded-r-xl">Teacher Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {register.map((st) => (
                      <tr key={st.studentId} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 flex items-center gap-3">
                          {st.photoUrl ? (
                            <img src={st.photoUrl} alt={st.name} className="w-9 h-9 rounded-xl object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm">
                              {st.name.charAt(0)}
                            </div>
                          )}
                          <span className="font-bold text-slate-900">{st.name}</span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-600">{st.admissionNumber}</td>
                        <td className="p-3.5 text-center">
                          <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                            {['present', 'absent', 'late', 'excused'].map((statusOption) => {
                              const isSelected = st.status === statusOption;
                              let colorCls = 'text-slate-600 hover:text-slate-900';
                              if (isSelected) {
                                if (statusOption === 'present') colorCls = 'bg-emerald-600 text-white font-extrabold shadow-xs';
                                else if (statusOption === 'absent') colorCls = 'bg-rose-600 text-white font-extrabold shadow-xs';
                                else if (statusOption === 'late') colorCls = 'bg-amber-500 text-white font-extrabold shadow-xs';
                                else if (statusOption === 'excused') colorCls = 'bg-indigo-600 text-white font-extrabold shadow-xs';
                              }
                              return (
                                <button
                                  key={statusOption}
                                  onClick={() => handleStatusChange(st.studentId, statusOption)}
                                  className={`px-3 py-1.5 rounded-lg text-[11px] capitalize transition ${colorCls}`}
                                >
                                  {statusOption}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <input
                            type="text"
                            placeholder="Optional note..."
                            value={st.notes}
                            onChange={(e) => handleNotesChange(st.studentId, e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: ATTENDANCE HISTORY */}
      {activeMode === 'history' && availableClasses.length > 0 && (
        <div className="space-y-6">
          {/* History Controls Bar */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
              {/* Class Selector */}
              <div className="lg:col-span-3">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Class
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-700"
                >
                  {availableClasses.map((cls) => (
                    <option key={cls._id} value={cls._id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter Mode & Calendar Controls */}
              <div className="lg:col-span-6 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Date Filter
                  </label>
                  <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setHistoryFilterMode('date')}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        historyFilterMode === 'date'
                          ? 'bg-white text-emerald-800 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Calendar Date
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryFilterMode('range')}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        historyFilterMode === 'range'
                          ? 'bg-white text-emerald-800 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Date Range
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryFilterMode('presets')}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        historyFilterMode === 'presets'
                          ? 'bg-white text-emerald-800 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Presets
                    </button>
                  </div>
                </div>

                {/* Specific Calendar Date Picker */}
                {historyFilterMode === 'date' && (
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Calendar className="w-4 h-4 text-emerald-700 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="date"
                        value={historySpecificDate}
                        onChange={(e) => setHistorySpecificDate(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(historySpecificDate || new Date());
                        d.setDate(d.getDate() - 1);
                        setHistorySpecificDate(d.toISOString().split('T')[0]);
                      }}
                      className="px-2.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                      title="Previous Day"
                    >
                      ← Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistorySpecificDate(new Date().toISOString().split('T')[0])}
                      className="px-2.5 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition-colors"
                      title="Today"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(historySpecificDate || new Date());
                        d.setDate(d.getDate() + 1);
                        setHistorySpecificDate(d.toISOString().split('T')[0]);
                      }}
                      className="px-2.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                      title="Next Day"
                    >
                      Next →
                    </button>
                  </div>
                )}

                {/* Custom Date Range Pickers */}
                {historyFilterMode === 'range' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="date"
                        placeholder="From Date"
                        value={historyDateFrom}
                        onChange={(e) => setHistoryDateFrom(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>
                    <div>
                      <input
                        type="date"
                        placeholder="To Date"
                        value={historyDateTo}
                        onChange={(e) => setHistoryDateTo(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>
                  </div>
                )}

                {/* Preset Timeframes */}
                {historyFilterMode === 'presets' && (
                  <select
                    value={historyTimeframe}
                    onChange={(e) => setHistoryTimeframe(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-700"
                  >
                    <option value="yesterday">Yesterday</option>
                    <option value="last_week">Last 7 Days (Last Week)</option>
                    <option value="last_month">Last 30 Days (Last Month)</option>
                    <option value="term">Current Term</option>
                  </select>
                )}
              </div>

              {/* Student Search */}
              <div className="lg:col-span-3">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Search Student
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search student name or adm no..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* History Metrics & Table */}
          {historyLoading ? (
            <div className="h-64 bg-white rounded-3xl border border-slate-200 p-6 animate-pulse"></div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-1">
                  <p className="text-2xl font-black text-emerald-700">
                    {historyData?.summary?.present || 0}
                  </p>
                  <p className="text-xs font-bold text-emerald-800">Present Count</p>
                </div>
                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 space-y-1">
                  <p className="text-2xl font-black text-rose-700">
                    {historyData?.summary?.absent || 0}
                  </p>
                  <p className="text-xs font-bold text-rose-800">Absent Count</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-1">
                  <p className="text-2xl font-black text-amber-700">
                    {historyData?.summary?.late || 0}
                  </p>
                  <p className="text-xs font-bold text-amber-800">Late Count</p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-1">
                  <p className="text-2xl font-black text-indigo-700">
                    {historyData?.summary?.rate || 100}%
                  </p>
                  <p className="text-xs font-bold text-indigo-800">Overall Rate</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                      <th className="p-3.5 rounded-l-xl">Date</th>
                      <th className="p-3.5">Student</th>
                      <th className="p-3.5">Adm No</th>
                      <th className="p-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {(historyData?.records || []).map((rec) => (
                      <tr key={rec._id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 font-bold text-slate-700">
                          {new Date(rec.date).toLocaleDateString()}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">
                          {rec.student?.firstName} {rec.student?.lastName}
                        </td>
                        <td className="p-3.5 font-mono text-slate-500">
                          {rec.student?.admissionNumber}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg uppercase ${
                              rec.status === 'present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rec.status === 'absent'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendanceRegisterPage;
