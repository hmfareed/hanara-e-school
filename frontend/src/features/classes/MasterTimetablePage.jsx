import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Printer,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Users,
  BookOpen,
  MapPin,
  Sparkles,
  Layers,
  GraduationCap,
  X,
  Loader2,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const GES_SUBJECTS = [
  'English Language',
  'Mathematics',
  'Integrated Science',
  'Social Studies',
  'Information & Comm. Tech (ICT)',
  'Religious & Moral Education (RME)',
  'Creative Arts & Design',
  'Ghanaian Language & Culture',
  'Basic Design & Technology (BDT)',
  'French',
  'Physical & Health Education',
  'Our World Our People (OWOP)',
  'Literacy',
  'Numeracy',
];

const PERIOD_TYPES = [
  { value: 'lesson', label: 'Regular Lesson', color: 'bg-emerald-50 border-emerald-200 text-emerald-900 badge-emerald' },
  { value: 'break', label: 'Break / Lunch', color: 'bg-amber-50 border-amber-200 text-amber-900 badge-amber' },
  { value: 'assembly', label: 'Morning Assembly', color: 'bg-indigo-50 border-indigo-200 text-indigo-900 badge-indigo' },
  { value: 'pe_sports', label: 'PE & Sports', color: 'bg-sky-50 border-sky-200 text-sky-900 badge-sky' },
  { value: 'library', label: 'Library Period', color: 'bg-purple-50 border-purple-200 text-purple-900 badge-purple' },
  { value: 'club', label: 'Club / Co-Curricular', color: 'bg-rose-50 border-rose-200 text-rose-900 badge-rose' },
  { value: 'worship', label: 'Worship & Devotion', color: 'bg-teal-50 border-teal-200 text-teal-900 badge-teal' },
];

const DEFAULT_TIME_SLOTS = [
  { start: '07:30 AM', end: '08:00 AM', label: 'Morning Devotion / Assembly' },
  { start: '08:00 AM', end: '08:45 AM', label: 'Period 1' },
  { start: '08:45 AM', end: '09:30 AM', label: 'Period 2' },
  { start: '09:30 AM', end: '10:00 AM', label: 'Snack Break' },
  { start: '10:00 AM', end: '10:45 AM', label: 'Period 3' },
  { start: '10:45 AM', end: '11:30 AM', label: 'Period 4' },
  { start: '11:30 AM', end: '12:15 PM', label: 'Period 5' },
  { start: '12:15 PM', end: '01:00 PM', label: 'Lunch Break' },
  { start: '01:00 PM', end: '01:45 PM', label: 'Period 6' },
  { start: '01:45 PM', end: '02:30 PM', label: 'Period 7' },
  { start: '02:30 PM', end: '03:15 PM', label: 'Period 8 / Clubs' },
];

export default function MasterTimetablePage() {
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState('class'); // 'class' | 'teacher' | 'room'
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedDayFilter, setSelectedDayFilter] = useState('all');

  // Modal States
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);

  // Toast feedback
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Form State for Slot
  const [slotForm, setSlotForm] = useState({
    class: '',
    teacher: '',
    subject: '',
    day: 'Monday',
    startTime: '08:00 AM',
    endTime: '08:45 AM',
    periodType: 'lesson',
    room: '',
    topic: '',
    allowClashOverride: false,
  });

  const [clashWarning, setClashWarning] = useState(null);

  // Clone Form State
  const [cloneForm, setCloneForm] = useState({
    sourceClassId: '',
    targetClassId: '',
  });

  // Fetch Classes
  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ['allClassesTimetable'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  // Fetch Staff/Teachers
  const { data: staffList = [] } = useQuery({
    queryKey: ['allTeachersTimetable'],
    queryFn: async () => {
      const res = await api.get('/staff');
      return res.data?.data || [];
    },
  });

  // Set default class once loaded
  React.useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0]._id);
    }
  }, [classes, selectedClassId]);

  // Fetch Master Timetable Slots
  const { data: masterSlots = [], isLoading: loadingSlots } = useQuery({
    queryKey: [
      'masterTimetableSlots',
      viewMode === 'class' ? selectedClassId : null,
      viewMode === 'teacher' ? selectedTeacherId : null,
      viewMode === 'room' ? selectedRoom : null,
      selectedDayFilter,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (viewMode === 'class' && selectedClassId) params.append('classId', selectedClassId);
      if (viewMode === 'teacher' && selectedTeacherId) params.append('teacherId', selectedTeacherId);
      if (viewMode === 'room' && selectedRoom) params.append('room', selectedRoom);
      if (selectedDayFilter !== 'all') params.append('day', selectedDayFilter);

      const res = await api.get(`/timetables/master?${params.toString()}`);
      return res.data?.data || [];
    },
    enabled: !!(selectedClassId || selectedTeacherId || selectedRoom || viewMode),
  });

  // Mutations
  const createSlotMutation = useMutation({
    mutationFn: (payload) => api.post('/timetables/slot', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterTimetableSlots'] });
      setIsSlotModalOpen(false);
      showToast('Timetable period scheduled successfully');
    },
    onError: (err) => {
      if (err.response?.status === 409) {
        setClashWarning(err.response?.data?.message || 'Schedule conflict detected.');
      } else {
        showToast(err.response?.data?.message || 'Failed to create slot', 'error');
      }
    },
  });

  const updateSlotMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/timetables/slot/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterTimetableSlots'] });
      setIsSlotModalOpen(false);
      setEditingSlot(null);
      showToast('Timetable period updated successfully');
    },
    onError: (err) => {
      if (err.response?.status === 409) {
        setClashWarning(err.response?.data?.message || 'Schedule conflict detected.');
      } else {
        showToast(err.response?.data?.message || 'Failed to update slot', 'error');
      }
    },
  });

  const deleteSlotMutation = useMutation({
    mutationFn: (id) => api.delete(`/timetables/slot/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterTimetableSlots'] });
      showToast('Period slot removed from schedule');
    },
    onError: (err) => showToast(err.response?.data?.message || 'Failed to delete slot', 'error'),
  });

  const cloneMutation = useMutation({
    mutationFn: (payload) => api.post('/timetables/clone-class', payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['masterTimetableSlots'] });
      setIsCloneModalOpen(false);
      showToast(res.data?.message || 'Schedule cloned successfully');
    },
    onError: (err) => showToast(err.response?.data?.message || 'Failed to clone schedule', 'error'),
  });

  const handleOpenAdd = (day = 'Monday', timeSlot = null) => {
    setEditingSlot(null);
    setClashWarning(null);
    setSlotForm({
      class: selectedClassId || (classes[0]?._id || ''),
      teacher: '',
      subject: '',
      day,
      startTime: timeSlot?.start || '08:00 AM',
      endTime: timeSlot?.end || '08:45 AM',
      periodType: 'lesson',
      room: '',
      topic: '',
      allowClashOverride: false,
    });
    setIsSlotModalOpen(true);
  };

  const handleOpenEdit = (slot) => {
    setEditingSlot(slot);
    setClashWarning(null);
    setSlotForm({
      class: slot.class?._id || slot.class || '',
      teacher: slot.teacher?._id || slot.teacher || '',
      subject: slot.subject || '',
      day: slot.day || 'Monday',
      startTime: slot.startTime || '08:00 AM',
      endTime: slot.endTime || '08:45 AM',
      periodType: slot.periodType || 'lesson',
      room: slot.room || '',
      topic: slot.topic || '',
      allowClashOverride: false,
    });
    setIsSlotModalOpen(true);
  };

  const handleSaveSlot = (e) => {
    e.preventDefault();
    if (editingSlot) {
      updateSlotMutation.mutate({ id: editingSlot._id, payload: slotForm });
    } else {
      createSlotMutation.mutate(slotForm);
    }
  };

  // Group slots by day
  const slotsByDay = useMemo(() => {
    const map = {};
    DAYS_OF_WEEK.forEach((d) => (map[d] = []));
    masterSlots.forEach((slot) => {
      if (map[slot.day]) {
        map[slot.day].push(slot);
      }
    });
    // Sort each day by startTime
    Object.keys(map).forEach((d) => {
      map[d].sort((a, b) => (a.startTime > b.startTime ? 1 : -1));
    });
    return map;
  }, [masterSlots]);

  const selectedClassObj = classes.find((c) => c._id === selectedClassId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-800 text-white flex items-center justify-center shadow-md">
              <Calendar size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Master Class Timetable & Scheduling
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Design weekly schedules across classes, detect double-booking conflicts, and publish rosters
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleOpenAdd()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md transition-colors"
          >
            <Plus size={16} />
            <span>Add Period Slot</span>
          </button>

          <button
            onClick={() => {
              setCloneForm({ sourceClassId: selectedClassId, targetClassId: '' });
              setIsCloneModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-sm transition-colors"
          >
            <Copy size={15} />
            <span>Clone to Stream</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-sm transition-colors"
          >
            <Printer size={15} />
            <span>Print View</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toast && (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-bold animate-fade-in ${
            toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Filter / View Mode Bar */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* View Mode Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setViewMode('class')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'class' ? 'bg-emerald-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            By Class Stream
          </button>
          <button
            onClick={() => setViewMode('teacher')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'teacher' ? 'bg-emerald-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            By Teacher
          </button>
          <button
            onClick={() => setViewMode('room')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'room' ? 'bg-emerald-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            By Room / Lab
          </button>
        </div>

        {/* Dynamic Target Dropdown based on viewMode */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {viewMode === 'class' && (
            <div className="flex items-center gap-2 w-full md:w-64">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Class:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-700"
              >
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.level?.displayName || 'Grade'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {viewMode === 'teacher' && (
            <div className="flex items-center gap-2 w-full md:w-72">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Teacher:</span>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-700"
              >
                <option value="">Select a teacher...</option>
                {staffList.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.firstName} {t.lastName} ({t.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {viewMode === 'room' && (
            <div className="flex items-center gap-2 w-full md:w-64">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Room:</span>
              <input
                type="text"
                placeholder="e.g. Science Lab, ICT Center..."
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
          )}
        </div>
      </div>

      {/* Weekly Schedule Grid */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <span>Weekly Schedule</span>
              {selectedClassObj && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  {selectedClassObj.name}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Click "+ Add" on any day column to schedule a period slot
            </p>
          </div>
          <div className="text-xs font-bold text-slate-500">
            {masterSlots.length} Scheduled Periods
          </div>
        </div>

        {loadingSlots ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="animate-spin text-emerald-800" size={32} />
            <span className="text-xs font-bold">Loading weekly timetable...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            {DAYS_OF_WEEK.map((day) => {
              const daySlots = slotsByDay[day] || [];
              return (
                <div key={day} className="flex flex-col min-h-[500px]">
                  {/* Day Column Header */}
                  <div className="p-3.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-black text-xs text-slate-800 uppercase tracking-wider">{day}</span>
                    <button
                      onClick={() => handleOpenAdd(day)}
                      className="w-6 h-6 rounded-lg bg-white border border-slate-200 hover:bg-emerald-800 hover:text-white flex items-center justify-center text-slate-600 transition-colors shadow-xs"
                      title={`Add period on ${day}`}
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {/* Period Slots List */}
                  <div className="p-3 space-y-2.5 flex-1 bg-slate-50/40">
                    {daySlots.length === 0 ? (
                      <div className="h-40 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 rounded-2xl text-slate-400">
                        <Clock size={20} className="mb-1 text-slate-300" />
                        <span className="text-[11px] font-semibold">No periods</span>
                        <button
                          onClick={() => handleOpenAdd(day)}
                          className="mt-1.5 text-[10px] text-emerald-700 font-bold hover:underline"
                        >
                          + Add slot
                        </button>
                      </div>
                    ) : (
                      daySlots.map((slot) => {
                        const typeMeta = PERIOD_TYPES.find((p) => p.value === slot.periodType) || PERIOD_TYPES[0];
                        return (
                          <div
                            key={slot._id}
                            className={`p-3.5 rounded-2xl border transition-all hover:shadow-md group relative ${typeMeta.color}`}
                          >
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <span className="text-[10px] font-black uppercase tracking-wider opacity-75">
                                {slot.startTime} – {slot.endTime}
                              </span>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenEdit(slot)}
                                  className="w-5 h-5 rounded-md bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-700 hover:text-emerald-800"
                                >
                                  <Edit3 size={11} />
                                </button>
                                <button
                                  onClick={() => deleteSlotMutation.mutate(slot._id)}
                                  className="w-5 h-5 rounded-md bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-700 hover:text-rose-700"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>

                            <p className="font-black text-xs leading-snug">{slot.subject}</p>

                            {slot.teacher && (
                              <p className="text-[11px] font-medium opacity-80 mt-1 flex items-center gap-1">
                                <Users size={12} />
                                <span>
                                  {slot.teacher.firstName} {slot.teacher.lastName}
                                </span>
                              </p>
                            )}

                            {slot.room && (
                              <p className="text-[10px] font-semibold opacity-70 mt-0.5 flex items-center gap-1">
                                <MapPin size={11} />
                                <span>{slot.room}</span>
                              </p>
                            )}

                            {slot.topic && (
                              <p className="text-[10px] italic opacity-75 mt-1 border-t border-current/10 pt-1">
                                "{slot.topic}"
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Slot Modal */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                  <Calendar size={16} />
                </div>
                <h3 className="font-bold text-sm">
                  {editingSlot ? 'Edit Timetable Period' : 'Schedule Timetable Period'}
                </h3>
              </div>
              <button
                onClick={() => setIsSlotModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="p-6 space-y-4">
              {/* Conflict Alert in Modal */}
              {clashWarning && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-black">
                    <AlertTriangle size={16} className="text-amber-700" />
                    <span>Scheduling Conflict Detected</span>
                  </div>
                  <p>{clashWarning}</p>
                  <label className="flex items-center gap-2 pt-1 font-bold text-[11px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={slotForm.allowClashOverride}
                      onChange={(e) =>
                        setSlotForm((p) => ({ ...p, allowClashOverride: e.target.checked }))
                      }
                      className="accent-amber-700 rounded"
                    />
                    <span>Force schedule anyway (Override clash warning)</span>
                  </label>
                </div>
              )}

              {/* Class & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Class Stream</label>
                  <select
                    value={slotForm.class}
                    onChange={(e) => setSlotForm((p) => ({ ...p, class: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-700"
                    required
                  >
                    {classes.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Subject / Activity</label>
                  <input
                    type="text"
                    list="ges-subject-options"
                    placeholder="e.g. Mathematics"
                    value={slotForm.subject}
                    onChange={(e) => setSlotForm((p) => ({ ...p, subject: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-700"
                    required
                  />
                  <datalist id="ges-subject-options">
                    {GES_SUBJECTS.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Teacher & Period Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Teacher Assigned</label>
                  <select
                    value={slotForm.teacher}
                    onChange={(e) => setSlotForm((p) => ({ ...p, teacher: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-700"
                  >
                    <option value="">No teacher assigned</option>
                    {staffList.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.firstName} {t.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Period Type</label>
                  <select
                    value={slotForm.periodType}
                    onChange={(e) => setSlotForm((p) => ({ ...p, periodType: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-700"
                  >
                    {PERIOD_TYPES.map((pt) => (
                      <option key={pt.value} value={pt.value}>
                        {pt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Day & Room */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Day of Week</label>
                  <select
                    value={slotForm.day}
                    onChange={(e) => setSlotForm((p) => ({ ...p, day: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Room / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Science Lab, Room 3A"
                    value={slotForm.room}
                    onChange={(e) => setSlotForm((p) => ({ ...p, room: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>

              {/* Start Time & End Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Start Time</label>
                  <input
                    type="text"
                    placeholder="08:00 AM"
                    value={slotForm.startTime}
                    onChange={(e) => setSlotForm((p) => ({ ...p, startTime: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase">End Time</label>
                  <input
                    type="text"
                    placeholder="08:45 AM"
                    value={slotForm.endTime}
                    onChange={(e) => setSlotForm((p) => ({ ...p, endTime: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Preset Time Slots Quick Picker */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Quick Time Slot Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_TIME_SLOTS.slice(0, 6).map((ts) => (
                    <button
                      type="button"
                      key={ts.label}
                      onClick={() =>
                        setSlotForm((p) => ({ ...p, startTime: ts.start, endTime: ts.end }))
                      }
                      className="px-2 py-1 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 rounded-md text-[10px] font-semibold text-slate-700 transition-colors"
                    >
                      {ts.start}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic / Description */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Topic / Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Algebra & Linear Equations"
                  value={slotForm.topic}
                  onChange={(e) => setSlotForm((p) => ({ ...p, topic: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 outline-none"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSlotModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSlotMutation.isPending || updateSlotMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-2"
                >
                  {createSlotMutation.isPending || updateSlotMutation.isPending ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  <span>{editingSlot ? 'Save Changes' : 'Add Slot'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clone Class Timetable Modal */}
      {isCloneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Copy size={16} className="text-emerald-400" />
                <h3 className="font-bold text-sm">Clone Timetable to Another Stream</h3>
              </div>
              <button
                onClick={() => setIsCloneModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                cloneMutation.mutate(cloneForm);
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Source Class</label>
                <select
                  value={cloneForm.sourceClassId}
                  onChange={(e) => setCloneForm((p) => ({ ...p, sourceClassId: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  required
                >
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase">Target Class (Recipient)</label>
                <select
                  value={cloneForm.targetClassId}
                  onChange={(e) => setCloneForm((p) => ({ ...p, targetClassId: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  required
                >
                  <option value="">Select target class stream...</option>
                  {classes
                    .filter((c) => c._id !== cloneForm.sourceClassId)
                    .map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  All weekly periods from the source class will be replicated to the target class stream.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCloneModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cloneMutation.isPending || !cloneForm.targetClassId}
                  className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-2"
                >
                  {cloneMutation.isPending ? <Loader2 className="animate-spin" size={14} /> : <Copy size={14} />}
                  <span>Clone Schedule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
