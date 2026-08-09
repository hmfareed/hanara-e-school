import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  BookOpen,
  Users,
  Check,
  X,
  Sparkles,
  MapPin,
  ChevronRight,
  Filter,
} from 'lucide-react';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TeacherTimetablePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedDay, setSelectedDay] = useState('Monday');
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    class: '',
    subject: '',
    day: 'Monday',
    startTime: '08:00 AM',
    endTime: '09:00 AM',
    topic: '',
    room: '',
  });

  // Fetch teacher's assigned classes
  const { data: myClasses = [] } = useQuery({
    queryKey: ['myTeacherClasses'],
    queryFn: async () => {
      const res = await api.get('/teachers/my-classes');
      return res.data?.data || [];
    },
  });

  // Fetch teacher's custom timetable
  const { data: timetableSlots = [], isLoading } = useQuery({
    queryKey: ['teacherTimetable'],
    queryFn: async () => {
      const res = await api.get('/teachers/timetable');
      return res.data?.data || [];
    },
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/teachers/timetable', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['teacherTimetable']);
      queryClient.invalidateQueries(['teacherDashboardSummary']);
      queryClient.invalidateQueries(['myClassDetails']);
      closeModal();
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await api.put(`/teachers/timetable/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['teacherTimetable']);
      queryClient.invalidateQueries(['teacherDashboardSummary']);
      queryClient.invalidateQueries(['myClassDetails']);
      closeModal();
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/teachers/timetable/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['teacherTimetable']);
      queryClient.invalidateQueries(['teacherDashboardSummary']);
      queryClient.invalidateQueries(['myClassDetails']);
    },
  });

  const openCreateModal = () => {
    setEditingSlot(null);
    setFormData({
      class: myClasses[0]?._id || '',
      subject: '',
      day: selectedDay,
      startTime: '08:00 AM',
      endTime: '09:00 AM',
      topic: '',
      room: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (slot) => {
    setEditingSlot(slot);
    setFormData({
      class: slot.class?._id || slot.class || '',
      subject: slot.subject || '',
      day: slot.day || selectedDay,
      startTime: slot.startTime || '08:00 AM',
      endTime: slot.endTime || '09:00 AM',
      topic: slot.topic || '',
      room: slot.room || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSlot(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.class || !formData.subject) {
      alert('Please select a class and enter a subject name');
      return;
    }

    if (editingSlot) {
      updateMutation.mutate({ id: editingSlot._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Filter slots for active day & class
  const filteredSlots = timetableSlots.filter((slot) => {
    const matchesDay = slot.day === selectedDay;
    const matchesClass = selectedClassId === 'all' || (slot.class?._id || slot.class) === selectedClassId;
    return matchesDay && matchesClass;
  });

  return (
    <div className="space-y-6 pb-12 font-sans select-none">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Class Timetable Manager</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Create and customize your weekly schedule per class. Updates reflect live on your dashboard.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-[#044e3a] hover:bg-[#033b2c] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition cursor-pointer self-start sm:self-center"
        >
          <Plus className="w-4 h-4" /> Add Timetable Slot
        </button>
      </div>

      {/* ── Filters Row: Class Pills & Day Selector ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
        {/* Class Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider pr-2 flex-shrink-0">
            Class Filter:
          </span>
          <button
            onClick={() => setSelectedClassId('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
              selectedClassId === 'all'
                ? 'bg-[#044e3a] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            All Classes ({myClasses.length})
          </button>
          {myClasses.map((cls) => (
            <button
              key={cls._id}
              onClick={() => setSelectedClassId(cls._id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                selectedClassId === cls._id
                  ? 'bg-[#044e3a] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {cls.name}
            </button>
          ))}
        </div>

        {/* Day Pills Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2 border-t border-slate-100">
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = selectedDay === day;
            const countForDay = timetableSlots.filter((s) => s.day === day).length;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`py-3 px-2 rounded-2xl text-center font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  isSelected
                    ? 'bg-[#e6f4ea] border border-emerald-300 text-[#044e3a] shadow-2xs'
                    : 'bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="text-xs font-extrabold">{day}</span>
                <span className={`text-[10px] ${isSelected ? 'text-emerald-800 font-extrabold' : 'text-slate-400'}`}>
                  {countForDay} {countForDay === 1 ? 'Slot' : 'Slots'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Timetable Slots List for Active Day ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-700" />
            {selectedDay}'s Schedule
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            Showing {filteredSlots.length} timetable entries
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-20 bg-slate-100 rounded-2xl"></div>
            <div className="h-20 bg-slate-100 rounded-2xl"></div>
          </div>
        ) : filteredSlots.length === 0 ? (
          <div className="p-10 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-3">
            <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
            <h4 className="font-bold text-slate-800 text-sm">No Timetable Slots Created for {selectedDay}</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click the button below to add your first teaching period slot for this day.
            </p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-[#044e3a] text-white font-bold text-xs rounded-xl"
            >
              Add Slot for {selectedDay}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSlots.map((slot) => (
              <div
                key={slot._id}
                className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-emerald-200 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  {/* Time Badge */}
                  <div className="bg-[#e6f4ea] text-[#044e3a] p-3 rounded-2xl min-w-[120px] text-center flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">PERIOD</span>
                    <span className="text-xs font-black text-slate-900 my-0.5">
                      {slot.startTime} – {slot.endTime}
                    </span>
                  </div>

                  {/* Slot Details */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-md uppercase">
                        {slot.class?.name || 'Class'}
                      </span>
                      {slot.room && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                          <MapPin className="w-3 h-3" /> {slot.room}
                        </span>
                      )}
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-base">{slot.subject}</h4>
                    {slot.topic && <p className="text-xs text-slate-500 font-medium">Topic: {slot.topic}</p>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => openEditModal(slot)}
                    className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition"
                    title="Edit Slot"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this timetable slot?')) {
                        deleteMutation.mutate(slot._id);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                    title="Delete Slot"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create / Edit Slot Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-extrabold text-slate-900 text-lg">
                {editingSlot ? 'Edit Timetable Slot' : 'Add Timetable Slot'}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Class Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Assigned Class *
                </label>
                <select
                  value={formData.class}
                  onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select Class...</option>
                  {myClasses.map((cls) => (
                    <option key={cls._id} value={cls._id}>
                      {cls.name} ({cls.studentCount} Students)
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Subject Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics, English Language, ICT"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Day of Week */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Day of Week *
                </label>
                <select
                  value={formData.day}
                  onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start & End Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Start Time *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 08:00 AM"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    End Time *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 09:00 AM"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Topic / Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Lesson Topic / Objective (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Algebraic Expressions & Factors"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Room */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Classroom / Lab (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Room 4B, ICT Lab"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2.5 bg-[#044e3a] hover:bg-[#033b2c] text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingSlot
                    ? 'Update Slot'
                    : 'Save Timetable Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherTimetablePage;
