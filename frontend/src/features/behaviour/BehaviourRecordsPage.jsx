import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Award,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  Users,
  Search,
  Filter,
  AlertTriangle,
  ShieldAlert,
  PhoneCall,
  Ban,
  Trash2,
} from 'lucide-react';

const BehaviourRecordsPage = () => {
  const { user, activeMode } = useAuth();
  const queryClient = useQueryClient();

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState({ text: '', type: '' });

  // Form State
  const [form, setForm] = useState({
    classId: '',
    studentId: '',
    category: 'commendation',
    title: '',
    description: '',
    actionTaken: '',
  });

  // Fetch Classes for Behaviour logging (all classes for admins/headteacher, or teacher-assigned classes)
  const isAdmin = ['superadmin', 'admin'].includes(user?.role) || (user?.role === 'system_admin' && activeMode === 'admin');
  const { data: classes = [] } = useQuery({
    queryKey: ['behaviourClassesList', isAdmin, user?._id || user?.id, activeMode],
    queryFn: async () => {
      if (isAdmin) {
        const res = await api.get('/classes');
        return res.data?.data || [];
      }
      const res = await api.get('/teachers/my-classes');
      const list = res.data?.data || [];
      if (list.length === 0) {
        const fallbackRes = await api.get('/classes');
        return fallbackRes.data?.data || [];
      }
      return list;
    },
  });

  // Fetch Students for selected form class
  const { data: classStudents = [] } = useQuery({
    queryKey: ['classStudentsForBehaviour', form.classId],
    queryFn: async () => {
      if (!form.classId) return [];
      const res = await api.get(`/students?class=${form.classId}&status=active&limit=200`);
      return res.data?.data || [];
    },
    enabled: !!form.classId,
  });

  // Fetch Behaviour Records
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['behaviourRecordsList', selectedClass, selectedCategory],
    queryFn: async () => {
      const params = {};
      if (selectedClass) params.classId = selectedClass;
      if (selectedCategory) params.category = selectedCategory;
      const res = await api.get('/behaviour-records', { params });
      return res.data?.data || [];
    },
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      return await api.post('/behaviour-records', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['behaviourRecordsList'] });
      setIsModalOpen(false);
      resetForm();
      setNotification({ text: 'Behaviour record logged successfully!', type: 'success' });
      setTimeout(() => setNotification({ text: '', type: '' }), 5000);
    },
    onError: (err) => {
      setNotification({ text: err.response?.data?.message || 'Failed to log record.', type: 'error' });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await api.delete(`/behaviour-records/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['behaviourRecordsList'] });
      setNotification({ text: 'Record deleted.', type: 'success' });
      setTimeout(() => setNotification({ text: '', type: '' }), 4000);
    },
  });

  const resetForm = () => {
    setForm({
      classId: classes[0]?._id || '',
      studentId: '',
      category: 'commendation',
      title: '',
      description: '',
      actionTaken: '',
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.classId || !form.studentId || !form.title || !form.description) {
      setNotification({ text: 'Please fill in all required fields.', type: 'error' });
      return;
    }

    createMutation.mutate({
      classId: form.classId,
      studentId: form.studentId,
      category: form.category,
      title: form.title,
      description: form.description,
      actionTaken: form.actionTaken,
    });
  };

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'commendation':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg flex items-center gap-1"><Award className="w-3.5 h-3.5 text-emerald-600" /> Commendation</span>;
      case 'warning':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-lg flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Warning</span>;
      case 'misconduct':
        return <span className="px-2.5 py-1 bg-rose-100 text-rose-800 text-[11px] font-bold rounded-lg flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> Misconduct</span>;
      case 'parent_meeting':
        return <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 text-[11px] font-bold rounded-lg flex items-center gap-1"><PhoneCall className="w-3.5 h-3.5 text-indigo-600" /> Parent Meeting</span>;
      case 'suspension_recommendation':
        return <span className="px-2.5 py-1 bg-purple-100 text-purple-800 text-[11px] font-bold rounded-lg flex items-center gap-1"><Ban className="w-3.5 h-3.5 text-purple-600" /> Suspension Rec.</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs">{cat}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Bar Hero ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Award className="w-6 h-6 text-indigo-600" />
            Student Behaviour & Disciplinary Records
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Record student commendations, misconduct warnings, parent meeting recommendations, and suspension logs.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          Log Conduct Entry
        </button>
      </div>

      {/* ── Notification Feedback ── */}
      {notification.text && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          {notification.text}
        </div>
      )}

      {/* ── Filters Bar ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white"
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls._id} value={cls._id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white"
          >
            <option value="">All Categories</option>
            <option value="commendation">Commendations</option>
            <option value="warning">Warnings</option>
            <option value="misconduct">Misconduct</option>
            <option value="parent_meeting">Parent Meeting</option>
            <option value="suspension_recommendation">Suspension Rec.</option>
          </select>
        </div>

        <div className="flex items-center justify-end text-xs font-bold text-slate-400">
          {records.length} Records Found
        </div>
      </div>

      {/* ── Conduct Log Cards ── */}
      {isLoading ? (
        <div className="h-64 bg-white rounded-3xl border border-slate-200 p-6 animate-pulse"></div>
      ) : records.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <Award className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-900 text-base">No Behaviour Records Logged</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click "Log Conduct Entry" to record student praise, warnings, or administrative conduct entries.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((rec) => (
            <div
              key={rec._id}
              className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-start justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                {rec.student?.photoUrl ? (
                  <img
                    src={rec.student.photoUrl}
                    alt={rec.student.firstName}
                    className="w-12 h-12 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-base">
                    {rec.student?.firstName ? rec.student.firstName.charAt(0) : 'S'}
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900 text-base">
                      {rec.student?.firstName} {rec.student?.lastName}
                    </h3>
                    <span className="text-xs font-mono text-slate-500">
                      ({rec.student?.admissionNumber})
                    </span>
                    {getCategoryBadge(rec.category)}
                  </div>

                  <h4 className="font-bold text-xs text-slate-800 pt-0.5">{rec.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{rec.description}</p>

                  {rec.actionTaken && (
                    <p className="text-xs font-semibold text-indigo-600 pt-1">
                      Action Taken: {rec.actionTaken}
                    </p>
                  )}

                  <p className="text-[11px] text-slate-400 pt-1 flex items-center gap-2">
                    <span>Date: {new Date(rec.date).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>Logged by: {rec.teacher?.email}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => deleteMutation.mutate(rec._id)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition self-end sm:self-start"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── RECORD CONDUCT MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-400" />
                Log Student Behaviour Record
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg bg-white/10 text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Class <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.classId}
                    onChange={(e) => setForm({ ...form, classId: e.target.value, studentId: '' })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="">Select Class</option>
                    {classes.map((cls) => (
                      <option key={cls._id} value={cls._id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Student <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.studentId}
                    onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                    disabled={!form.classId}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 disabled:opacity-50"
                  >
                    <option value="">Select Student</option>
                    {classStudents.map((st) => (
                      <option key={st._id} value={st._id}>
                        {st.firstName} {st.lastName} ({st.admissionNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Record Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="commendation">🌟 Commendation / Praise</option>
                  <option value="warning">⚠️ Warning / Reprimand</option>
                  <option value="misconduct">🚨 Misconduct Log</option>
                  <option value="parent_meeting">📞 Parent Meeting Recommendation</option>
                  <option value="suspension_recommendation">🚫 Suspension Recommendation</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Title / Subject <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Excellent Lab Leadership / Class Disruption"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Description / Incident Details <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Detailed description of student's conduct..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                ></textarea>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Action Taken / Recommendation</label>
                <input
                  type="text"
                  placeholder="e.g. Parent notified via phone call / Verbal warning issued"
                  value={form.actionTaken}
                  onChange={(e) => setForm({ ...form, actionTaken: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {createMutation.isPending ? 'Saving...' : 'Log Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BehaviourRecordsPage;
