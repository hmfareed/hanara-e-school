import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Skeleton from '../../components/Skeleton';
import {
  FileText,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  Users,
  Search,
  BookOpen,
  Filter,
  ChevronRight,
  ClipboardList,
} from 'lucide-react';

const AssignmentsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeScoringAssignment, setActiveScoringAssignment] = useState(null);

  // Form State
  const [form, setForm] = useState({
    title: '',
    topic: '',
    classId: '',
    subjectId: '',
    dueDate: '',
    maxMarks: 10,
  });

  // Score Entry Modal State
  const [scoringGrid, setScoringGrid] = useState([]);
  const [notification, setNotification] = useState({ text: '', type: '' });

  // 1. Fetch Teacher Classes
  const { data: classes = [] } = useQuery({
    queryKey: ['myTeacherClassesList'],
    queryFn: async () => {
      const res = await api.get('/teachers/my-classes');
      return res.data?.data || [];
    },
  });

  // 2. Fetch Assignments
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['offlineAssignments', selectedClass, selectedSubject],
    queryFn: async () => {
      const params = {};
      if (selectedClass) params.classId = selectedClass;
      if (selectedSubject) params.subjectId = selectedSubject;
      const res = await api.get('/offline-assignments', { params });
      return res.data?.data || [];
    },
  });

  // 3. Create Assignment Mutation
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      return await api.post('/offline-assignments', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offlineAssignments'] });
      setIsCreateModalOpen(false);
      setForm({ title: '', topic: '', classId: '', subjectId: '', dueDate: '', maxMarks: 10 });
      setNotification({ text: 'Offline assignment recorded successfully!', type: 'success' });
      setTimeout(() => setNotification({ text: '', type: '' }), 5000);
    },
    onError: (err) => {
      setNotification({ text: err.response?.data?.message || 'Failed to record assignment.', type: 'error' });
    },
  });

  // 4. Save Scores Mutation
  const saveScoresMutation = useMutation({
    mutationFn: async ({ assignmentId, scores }) => {
      return await api.put(`/offline-assignments/${assignmentId}/scores`, { scores });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offlineAssignments'] });
      setActiveScoringAssignment(null);
      setNotification({ text: 'Assignment scores saved successfully!', type: 'success' });
      setTimeout(() => setNotification({ text: '', type: '' }), 5000);
    },
    onError: (err) => {
      setNotification({ text: err.response?.data?.message || 'Failed to save scores.', type: 'error' });
    },
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.classId || !form.dueDate) {
      setNotification({ text: 'Please fill in all required fields.', type: 'error' });
      return;
    }
    createMutation.mutate({
      title: form.title,
      topic: form.topic,
      classId: form.classId,
      subjectId: form.subjectId || (classes[0] ? classes[0]._id : null),
      dueDate: form.dueDate,
      maxMarks: Number(form.maxMarks) || 10,
    });
  };

  const handleOpenScoring = async (assignment) => {
    setActiveScoringAssignment(assignment);
    try {
      const res = await api.get(`/offline-assignments/${assignment._id}`);
      const detailed = res.data?.data;
      if (detailed?.studentScores) {
        setScoringGrid(
          detailed.studentScores.map((item) => ({
            studentId: item.student?._id || item.student,
            name: item.student ? `${item.student.firstName} ${item.student.lastName}` : 'Student',
            admissionNumber: item.student?.admissionNumber || '',
            score: item.score || 0,
            remarks: item.remarks || '',
          }))
        );
      }
    } catch (error) {
      console.error('Failed to load assignment details:', error);
    }
  };

  const handleScoreChange = (studentId, field, val) => {
    setScoringGrid((prev) =>
      prev.map((row) => (row.studentId === studentId ? { ...row, [field]: val } : row))
    );
  };

  const handleSaveScoresSubmit = () => {
    if (!activeScoringAssignment) return;
    saveScoresMutation.mutate({
      assignmentId: activeScoringAssignment._id,
      scores: scoringGrid,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pb-12">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton.Line width="w-56" height="h-7" />
            <Skeleton.Line width="w-80" height="h-4" />
          </div>
          <Skeleton.Box w="w-44" h="h-10" rounded="rounded-xl" />
        </div>
        <div className="flex gap-3">
          <Skeleton.Box w="w-48" h="h-10" rounded="rounded-xl" />
          <Skeleton.Box w="w-48" h="h-10" rounded="rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <Skeleton.Line width="w-48" height="h-5" />
              <Skeleton.Line width="w-32" height="h-4" />
              <div className="flex gap-2 pt-2">
                <Skeleton.Box w="w-24" h="h-8" rounded="rounded-xl" />
                <Skeleton.Box w="w-24" h="h-8" rounded="rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Bar Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-500" />
            Offline Assignments Tracker
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Keep track of physical assignments given to your classes and record student marks.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          Record New Assignment
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
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-center gap-4">
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
          {assignments.length} Total Assignments Recorded
        </span>
      </div>

      {/* ── Assignments List ── */}
      {isLoading ? (
        <div className="h-64 bg-white rounded-3xl border border-slate-200 p-6 animate-pulse"></div>
      ) : assignments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-900 text-base">No Offline Assignments Logged Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click "Record New Assignment" to log a homework task, class exercise, or project given to your students.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignments.map((item) => (
            <div
              key={item._id}
              className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-md">
                      {item.class?.name || 'Class'}
                    </span>
                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md">
                      {item.subject?.name || 'Subject'}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">{item.title}</h3>
                  {item.topic && <p className="text-xs text-slate-500">Topic: {item.topic}</p>}
                </div>

                <span className="px-3 py-1 bg-amber-50 text-amber-800 text-xs font-bold rounded-xl border border-amber-100">
                  Max: {item.maxMarks} Marks
                </span>
              </div>

              <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-3 text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Given: {new Date(item.dateGiven).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1 font-semibold text-rose-600">
                  <Clock className="w-3.5 h-3.5" />
                  Due: {new Date(item.dueDate).toLocaleDateString()}
                </span>
              </div>

              <button
                onClick={() => handleOpenScoring(item)}
                className="w-full py-2.5 bg-slate-50 hover:bg-indigo-600 hover:text-white text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition flex items-center justify-center gap-2"
              >
                <ClipboardList className="w-4 h-4" /> Log / Edit Student Scores
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── CREATE ASSIGNMENT MODAL ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                Record Offline Assignment
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Assignment Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Weekly Algebra Worksheet 1"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Topic / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Quadratic Equations & Factoring"
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Class <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.classId}
                    onChange={(e) => setForm({ ...form, classId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold text-slate-800"
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
                  <label className="block font-bold text-slate-700 mb-1">Maximum Marks</label>
                  <input
                    type="number"
                    value={form.maxMarks}
                    onChange={(e) => setForm({ ...form, maxMarks: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Due Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-bold text-slate-800"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {createMutation.isPending ? 'Saving...' : 'Record Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SCORE ENTRY DRAWER MODAL ── */}
      {activeScoringAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-xl h-full max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">{activeScoringAssignment.title}</h3>
                <p className="text-xs text-indigo-300">
                  Class: {activeScoringAssignment.class?.name} • Max Marks: {activeScoringAssignment.maxMarks}
                </p>
              </div>
              <button
                onClick={() => setActiveScoringAssignment(null)}
                className="p-1.5 rounded-lg bg-white/10 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500">
                Student Marks Log ({scoringGrid.length} Students)
              </h4>

              <div className="space-y-3">
                {scoringGrid.map((row) => (
                  <div
                    key={row.studentId}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{row.name}</p>
                      <p className="text-[10px] font-mono text-slate-400">{row.admissionNumber}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        max={activeScoringAssignment.maxMarks}
                        min={0}
                        value={row.score}
                        onChange={(e) => handleScoreChange(row.studentId, 'score', e.target.value)}
                        className="w-16 p-1.5 bg-white border border-slate-200 rounded-xl font-bold text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-slate-400 font-bold">/ {activeScoringAssignment.maxMarks}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setActiveScoringAssignment(null)}
                className="px-4 py-2 bg-white border border-slate-200 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveScoresSubmit}
                disabled={saveScoresMutation.isPending}
                className="px-5 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                {saveScoresMutation.isPending ? 'Saving Scores...' : 'Save Assignment Marks'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentsPage;
