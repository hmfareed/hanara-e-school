import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  BookOpen,
  Plus,
  Copy,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  FileText,
  Search,
  Filter,
  Pencil,
  Trash2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

const LessonPlansPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [notification, setNotification] = useState({ text: '', type: '' });

  // Form State
  const [form, setForm] = useState({
    weekNumber: 1,
    classId: '',
    subjectId: '',
    topic: '',
    subTopic: '',
    objectives: '',
    teacherActivities: '',
    studentActivities: '',
    teachingMaterials: '',
    assessment: '',
    homework: '',
    status: 'draft',
  });

  // Fetch Teacher Classes
  const { data: classes = [] } = useQuery({
    queryKey: ['myTeacherClassesList'],
    queryFn: async () => {
      const res = await api.get('/teachers/my-classes');
      return res.data?.data || [];
    },
  });

  // Fetch Lesson Plans
  const { data: lessonPlans = [], isLoading } = useQuery({
    queryKey: ['lessonPlansList', selectedClass, selectedSubject],
    queryFn: async () => {
      const params = {};
      if (selectedClass) params.classId = selectedClass;
      if (selectedSubject) params.subjectId = selectedSubject;
      const res = await api.get('/lesson-plans', { params });
      return res.data?.data || [];
    },
  });

  // Create / Update Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingPlan) {
        return await api.put(`/lesson-plans/${editingPlan._id}`, payload);
      }
      return await api.post('/lesson-plans', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessonPlansList'] });
      setIsModalOpen(false);
      setEditingPlan(null);
      resetForm();
      setNotification({ text: 'Lesson plan saved successfully!', type: 'success' });
      setTimeout(() => setNotification({ text: '', type: '' }), 5000);
    },
    onError: (err) => {
      setNotification({ text: err.response?.data?.message || 'Failed to save lesson plan.', type: 'error' });
    },
  });

  // Duplicate Mutation
  const duplicateMutation = useMutation({
    mutationFn: async (planId) => {
      return await api.post(`/lesson-plans/${planId}/duplicate`);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['lessonPlansList'] });
      setNotification({ text: res.data?.message || 'Duplicated lesson plan successfully!', type: 'success' });
      setTimeout(() => setNotification({ text: '', type: '' }), 5000);
    },
    onError: (err) => {
      setNotification({ text: err.response?.data?.message || 'Failed to duplicate lesson plan.', type: 'error' });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (planId) => {
      return await api.delete(`/lesson-plans/${planId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessonPlansList'] });
      setNotification({ text: 'Lesson plan deleted.', type: 'success' });
      setTimeout(() => setNotification({ text: '', type: '' }), 4000);
    },
  });

  const resetForm = () => {
    setForm({
      weekNumber: 1,
      classId: classes[0]?._id || '',
      subjectId: '',
      topic: '',
      subTopic: '',
      objectives: '',
      teacherActivities: '',
      studentActivities: '',
      teachingMaterials: '',
      assessment: '',
      homework: '',
      status: 'draft',
    });
  };

  const handleOpenCreate = () => {
    setEditingPlan(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan) => {
    setEditingPlan(plan);
    setForm({
      weekNumber: plan.weekNumber || 1,
      classId: plan.class?._id || plan.class || '',
      subjectId: plan.subject?._id || plan.subject || '',
      topic: plan.topic || '',
      subTopic: plan.subTopic || '',
      objectives: plan.objectives || '',
      teacherActivities: plan.teacherActivities || '',
      studentActivities: plan.studentActivities || '',
      teachingMaterials: plan.teachingMaterials || '',
      assessment: plan.assessment || '',
      homework: plan.homework || '',
      status: plan.status || 'draft',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.topic || !form.objectives || !form.classId) {
      setNotification({ text: 'Please fill in all required fields.', type: 'error' });
      return;
    }

    saveMutation.mutate({
      classId: form.classId,
      subjectId: form.subjectId || (classes[0] ? classes[0]._id : null),
      weekNumber: Number(form.weekNumber) || 1,
      topic: form.topic,
      subTopic: form.subTopic,
      objectives: form.objectives,
      teacherActivities: form.teacherActivities,
      studentActivities: form.studentActivities,
      teachingMaterials: form.teachingMaterials,
      assessment: form.assessment,
      homework: form.homework,
      status: form.status,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Bar Hero ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            Weekly Lesson Planner
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create, duplicate, and manage weekly lesson plans with objectives, TLMs, and activities.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          Create New Lesson Plan
        </button>
      </div>

      {/* ── Feedback Notification ── */}
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

      {/* ── Class Filter Bar ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between gap-4">
        <div className="w-full sm:w-64">
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

        <span className="text-xs font-bold text-slate-400">
          {lessonPlans.length} Lesson Plans Created
        </span>
      </div>

      {/* ── Lesson Plans Grid ── */}
      {isLoading ? (
        <div className="h-64 bg-white rounded-3xl border border-slate-200 p-6 animate-pulse"></div>
      ) : lessonPlans.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-900 text-base">No Lesson Plans Logged</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click "Create New Lesson Plan" to add your weekly teaching objectives, activities, and materials.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {lessonPlans.map((plan) => (
            <div
              key={plan._id}
              className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-indigo-600 text-white text-[11px] font-black rounded-lg">
                      Week {plan.weekNumber}
                    </span>
                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-bold rounded-md">
                      {plan.class?.name || 'Class'}
                    </span>
                    <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-bold rounded-md">
                      {plan.subject?.name || 'Subject'}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-lg">{plan.topic}</h3>
                  {plan.subTopic && <p className="text-xs text-slate-500 font-medium">Sub-topic: {plan.subTopic}</p>}
                </div>

                <span
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase ${
                    plan.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : plan.status === 'submitted'
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {plan.status}
                </span>
              </div>

              {/* Objectives Summary */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-xs">
                <p className="font-bold text-slate-700">Objectives:</p>
                <p className="text-slate-600 leading-relaxed line-clamp-2">{plan.objectives}</p>
              </div>

              {/* Materials & Homework */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1">
                <div>
                  <span className="font-bold text-slate-700">TLMs:</span> {plan.teachingMaterials || 'Standard Class Tools'}
                </div>
                <div>
                  <span className="font-bold text-slate-700">Homework:</span> {plan.homework || 'None'}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <button
                  onClick={() => duplicateMutation.mutate(plan._id)}
                  disabled={duplicateMutation.isPending}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
                  title="Duplicate this plan for next week"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Duplicate for Week {plan.weekNumber + 1}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(plan)}
                    className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(plan._id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CREATE / EDIT LESSON PLAN MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl h-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                {editingPlan ? 'Edit Lesson Plan' : 'Create Weekly Lesson Plan'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg bg-white/10 text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Week Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={form.weekNumber}
                    onChange={(e) => setForm({ ...form, weekNumber: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Class <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.classId}
                    onChange={(e) => setForm({ ...form, classId: e.target.value })}
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
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted for Approval</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Topic <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Algebraic Expressions"
                    value={form.topic}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sub-topic</label>
                  <input
                    type="text"
                    placeholder="e.g. Expansion & Factoring"
                    value={form.subTopic}
                    onChange={(e) => setForm({ ...form, subTopic: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Lesson Objectives <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="By the end of the lesson, students will be able to..."
                  value={form.objectives}
                  onChange={(e) => setForm({ ...form, objectives: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teacher Activities</label>
                  <textarea
                    rows={2}
                    placeholder="Steps teacher will take during presentation..."
                    value={form.teacherActivities}
                    onChange={(e) => setForm({ ...form, teacherActivities: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  ></textarea>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Student Activities</label>
                  <textarea
                    rows={2}
                    placeholder="Group work, discussions, individual tasks..."
                    value={form.studentActivities}
                    onChange={(e) => setForm({ ...form, studentActivities: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  ></textarea>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teaching Materials (TLMs)</label>
                  <input
                    type="text"
                    placeholder="Charts, Flashcards, Math sets..."
                    value={form.teachingMaterials}
                    onChange={(e) => setForm({ ...form, teachingMaterials: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assessment Strategy</label>
                  <input
                    type="text"
                    placeholder="Oral questions, Class Exercise..."
                    value={form.assessment}
                    onChange={(e) => setForm({ ...form, assessment: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Homework Task</label>
                  <input
                    type="text"
                    placeholder="Worksheet exercise Q1-Q5..."
                    value={form.homework}
                    onChange={(e) => setForm({ ...form, homework: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
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
                  disabled={saveMutation.isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save Lesson Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonPlansPage;
