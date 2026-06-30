import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Layers, BookOpen, UserCheck, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';

/* ─────────────────── tiny reusable confirm dialog ─────────────────── */
const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in">
    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 space-y-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 p-2 bg-red-50 rounded-xl">
          <AlertTriangle size={20} className="text-red-500" />
        </div>
        <div>
          <p className="font-bold text-slate-900 text-sm">Confirm Deletion</p>
          <p className="text-slate-500 text-xs mt-1">{message}</p>
        </div>
      </div>
      <div className="flex justify-end space-x-2 pt-2">
        <button
          onClick={onCancel}
          className="py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-xs text-slate-600 cursor-pointer transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="py-2 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer transition-colors"
        >
          Yes, Delete
        </button>
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────────── */

const ClassesPage = () => {
  const [activeTab, setActiveTab] = useState('classes');

  /* ── modal visibility ── */
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  /* ── edit targets (null = create mode, object = edit mode) ── */
  const [editingClass, setEditingClass] = useState(null);
  const [editingSubject, setEditingSubject] = useState(null);
  const [editingAssignment, setEditingAssignment] = useState(null);

  /* ── delete confirm ── */
  const [deleteTarget, setDeleteTarget] = useState(null); // { type, id, label }

  const queryClient = useQueryClient();

  /* ── queries ── */
  const { data: classes } = useQuery({ queryKey: ['classesList'], queryFn: async () => (await api.get('/classes')).data?.data || [] });
  const { data: levels } = useQuery({ queryKey: ['levelsList'], queryFn: async () => (await api.get('/classes/levels')).data?.data || [] });
  const { data: subjects } = useQuery({ queryKey: ['subjectsList'], queryFn: async () => (await api.get('/classes/subjects')).data?.data || [] });
  const { data: assignments } = useQuery({ queryKey: ['assignmentsList'], queryFn: async () => (await api.get('/classes/assignments')).data?.data || [] });
  const { data: teachers } = useQuery({ queryKey: ['teachersList'], queryFn: async () => (await api.get('/staff?role=teacher')).data?.data || [] });
  const { data: academicYears } = useQuery({ queryKey: ['academicYearsList'], queryFn: async () => (await api.get('/academic-years')).data?.data || [] });

  const activeAcademicYear = academicYears?.find((y) => y.isCurrent) || academicYears?.[0] || null;
  const academicYearId = activeAcademicYear?._id || '';

  /* ── forms ── */
  const [classForm, setClassForm] = useState({ name: '', levelId: '', classTeacherId: '', capacity: 40 });
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', appliesToLevels: [], type: 'subject' });
  const [assignmentForm, setAssignmentForm] = useState({ classId: '', subjectId: '', teacherId: '' });

  /* ── helpers to open modals ── */
  const openCreateClass = () => {
    setEditingClass(null);
    setClassForm({ name: '', levelId: '', classTeacherId: '', capacity: 40 });
    setShowClassModal(true);
  };

  const openEditClass = (cls) => {
    setEditingClass(cls);
    setClassForm({
      name: cls.name,
      levelId: cls.level?._id || cls.level || '',
      classTeacherId: cls.classTeacher?._id || cls.classTeacher || '',
      capacity: cls.capacity || 40,
    });
    setShowClassModal(true);
  };

  const openCreateSubject = () => {
    setEditingSubject(null);
    setSubjectForm({ name: '', code: '', appliesToLevels: [], type: 'subject' });
    setShowSubjectModal(true);
  };

  const openEditSubject = (subj) => {
    setEditingSubject(subj);
    setSubjectForm({
      name: subj.name,
      code: subj.code,
      appliesToLevels: subj.appliesToLevels?.map((l) => l._id || l) || [],
      type: subj.type || 'subject',
    });
    setShowSubjectModal(true);
  };

  const openCreateAssignment = () => {
    setEditingAssignment(null);
    setAssignmentForm({ classId: '', subjectId: '', teacherId: '' });
    setShowAssignmentModal(true);
  };

  const openEditAssignment = (ass) => {
    setEditingAssignment(ass);
    setAssignmentForm({
      classId: ass.class?._id || ass.class || '',
      subjectId: ass.subject?._id || ass.subject || '',
      teacherId: ass.teacher?._id || ass.teacher || '',
    });
    setShowAssignmentModal(true);
  };

  /* ── mutations : create ── */
  const createClassMutation = useMutation({
    mutationFn: async (payload) => await api.post('/classes', payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['classesList'] }); setShowClassModal(false); },
  });

  const createSubjectMutation = useMutation({
    mutationFn: async (payload) => await api.post('/classes/subjects', payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subjectsList'] }); setShowSubjectModal(false); },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (payload) => await api.post('/classes/assignments', payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['assignmentsList'] }); setShowAssignmentModal(false); },
  });

  /* ── mutations : update ── */
  const updateClassMutation = useMutation({
    mutationFn: async ({ id, payload }) => await api.put(`/classes/${id}`, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['classesList'] }); setShowClassModal(false); },
  });

  const updateSubjectMutation = useMutation({
    mutationFn: async ({ id, payload }) => await api.put(`/classes/subjects/${id}`, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subjectsList'] }); setShowSubjectModal(false); },
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ id, payload }) => await api.put(`/classes/assignments/${id}`, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['assignmentsList'] }); setShowAssignmentModal(false); },
  });

  /* ── mutations : delete ── */
  const deleteClassMutation = useMutation({
    mutationFn: async (id) => await api.delete(`/classes/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['classesList'] }); setDeleteTarget(null); },
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: async (id) => await api.delete(`/classes/subjects/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subjectsList'] }); setDeleteTarget(null); },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id) => await api.delete(`/classes/assignments/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['assignmentsList'] }); setDeleteTarget(null); },
  });

  /* ── submit handlers ── */
  const handleClassSubmit = (e) => {
    e.preventDefault();
    if (editingClass) {
      updateClassMutation.mutate({ id: editingClass._id, payload: classForm });
    } else {
      createClassMutation.mutate({ ...classForm, academicYearId });
    }
  };

  const handleSubjectSubmit = (e) => {
    e.preventDefault();
    if (editingSubject) {
      updateSubjectMutation.mutate({ id: editingSubject._id, payload: subjectForm });
    } else {
      createSubjectMutation.mutate(subjectForm);
    }
  };

  const handleAssignmentSubmit = (e) => {
    e.preventDefault();
    if (editingAssignment) {
      updateAssignmentMutation.mutate({ id: editingAssignment._id, payload: assignmentForm });
    } else {
      createAssignmentMutation.mutate({ ...assignmentForm, academicYearId });
    }
  };

  const handleLevelCheckbox = (levelId) => {
    const selected = [...subjectForm.appliesToLevels];
    if (selected.includes(levelId)) {
      setSubjectForm({ ...subjectForm, appliesToLevels: selected.filter((id) => id !== levelId) });
    } else {
      setSubjectForm({ ...subjectForm, appliesToLevels: [...selected, levelId] });
    }
  };

  /* ── confirm delete action ── */
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'class') deleteClassMutation.mutate(deleteTarget.id);
    else if (deleteTarget.type === 'subject') deleteSubjectMutation.mutate(deleteTarget.id);
    else if (deleteTarget.type === 'assignment') deleteAssignmentMutation.mutate(deleteTarget.id);
  };

  const isPendingClass = createClassMutation.isPending || updateClassMutation.isPending;
  const isPendingSubject = createSubjectMutation.isPending || updateSubjectMutation.isPending;
  const isPendingAssignment = createAssignmentMutation.isPending || updateAssignmentMutation.isPending;

  /* ── action button style ── */
  const actionBtn = 'p-1.5 rounded-lg transition-colors cursor-pointer';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Academic Structure</h2>
        <p className="text-sm text-slate-500 mt-1">Configure classes, assign subjects, and map class teachers</p>
      </div>

      {/* ── no active academic year warning ── */}
      {academicYears && !activeAcademicYear && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <span>
            <strong>No academic year found.</strong> Please create and activate an academic year before adding classes.
          </span>
        </div>
      )}
      {activeAcademicYear && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs font-semibold w-fit">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
          Active Year: {activeAcademicYear.name}
        </div>
      )}

      {/* ── tabs ── */}
      <div className="flex border-b border-slate-200">
        {[
          { key: 'classes', icon: <Layers size={16} />, label: 'Classes' },
          { key: 'subjects', icon: <BookOpen size={16} />, label: 'Subjects / Strands' },
          { key: 'assignments', icon: <UserCheck size={16} />, label: 'Subject Assignments' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center space-x-2 py-3 px-6 font-bold text-sm border-b-2 transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'border-emerald-800 text-emerald-800'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ════════════════ CLASSES TAB ════════════════ */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={openCreateClass}
              className="flex items-center space-x-1.5 py-2 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Create Class Stream</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-6">Class Name</th>
                  <th className="py-4 px-6">Grade Level</th>
                  <th className="py-4 px-6">Class Teacher</th>
                  <th className="py-4 px-6">Capacity</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classes?.length > 0 ? (
                  classes.map((cls) => (
                    <tr key={cls._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-900">{cls.name}</td>
                      <td className="py-4 px-6">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs text-slate-700 font-sans">
                          {cls.level?.displayName || cls.level || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-800 font-medium font-sans">
                        {cls.classTeacher ? `${cls.classTeacher.firstName} ${cls.classTeacher.lastName}` : 'Not Assigned'}
                      </td>
                      <td className="py-4 px-6 font-mono text-xs">{cls.capacity} students max</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => openEditClass(cls)}
                            className={`${actionBtn} text-slate-400 hover:text-emerald-700 hover:bg-emerald-50`}
                            title="Edit class"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: 'class', id: cls._id, label: cls.name })}
                            className={`${actionBtn} text-slate-400 hover:text-red-600 hover:bg-red-50`}
                            title="Delete class"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-400">No classes configured.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════ SUBJECTS TAB ════════════════ */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={openCreateSubject}
              className="flex items-center space-x-1.5 py-2 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Create Subject</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-6">Subject Code</th>
                  <th className="py-4 px-6">Subject Name</th>
                  <th className="py-4 px-6">Type</th>
                  <th className="py-4 px-6">Applicable Grade Levels</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjects?.length > 0 ? (
                  subjects.map((subj) => (
                    <tr key={subj._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-mono text-xs font-bold text-slate-800">{subj.code}</td>
                      <td className="py-4 px-6 font-semibold text-slate-900 font-sans">{subj.name}</td>
                      <td className="py-4 px-6 capitalize">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                          subj.type === 'strand' ? 'bg-amber-100 border-amber-200 text-amber-800' : 'bg-blue-100 border-blue-200 text-blue-800'
                        }`}>
                          {subj.type}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-500 font-sans">
                        {subj.appliesToLevels?.map((l) => l.displayName || l).join(', ') || 'All'}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => openEditSubject(subj)}
                            className={`${actionBtn} text-slate-400 hover:text-emerald-700 hover:bg-emerald-50`}
                            title="Edit subject"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: 'subject', id: subj._id, label: subj.name })}
                            className={`${actionBtn} text-slate-400 hover:text-red-600 hover:bg-red-50`}
                            title="Delete subject"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-400">No subjects configured.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════ ASSIGNMENTS TAB ════════════════ */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={openCreateAssignment}
              className="flex items-center space-x-1.5 py-2 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Assign Subject Teacher</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-6">Class</th>
                  <th className="py-4 px-6">Subject</th>
                  <th className="py-4 px-6">Assigned Teacher</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments?.length > 0 ? (
                  assignments.map((ass) => (
                    <tr key={ass._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-900">{ass.class?.name || ass.class}</td>
                      <td className="py-4 px-6 font-semibold text-slate-800 font-sans">
                        {ass.subject?.name || ass.subject}{' '}
                        <span className="text-xs text-slate-400 font-mono">({ass.subject?.code})</span>
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-700 font-sans">
                        {ass.teacher ? `${ass.teacher.firstName} ${ass.teacher.lastName}` : 'Not Assigned'}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => openEditAssignment(ass)}
                            className={`${actionBtn} text-slate-400 hover:text-emerald-700 hover:bg-emerald-50`}
                            title="Edit assignment"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: 'assignment', id: ass._id, label: `${ass.class?.name} — ${ass.subject?.name}` })}
                            className={`${actionBtn} text-slate-400 hover:text-red-600 hover:bg-red-50`}
                            title="Delete assignment"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-12 text-center text-slate-400">No subject-teacher assignments recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════ CLASS MODAL ════════════════ */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-6">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
              {editingClass ? 'Edit Class Stream' : 'Create Class Stream'}
            </h3>
            <form onSubmit={handleClassSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700">Class Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Primary 1 Gold"
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Grade Level</label>
                <select
                  required
                  value={classForm.levelId}
                  onChange={(e) => setClassForm({ ...classForm, levelId: e.target.value })}
                  className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="">Select Level</option>
                  {levels?.map((lvl) => (
                    <option key={lvl._id} value={lvl._id}>{lvl.displayName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Class Teacher</label>
                <select
                  value={classForm.classTeacherId}
                  onChange={(e) => setClassForm({ ...classForm, classTeacherId: e.target.value })}
                  className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="">Select Class Teacher</option>
                  {teachers?.map((t) => (
                    <option key={t._id} value={t._id}>{t.firstName} {t.lastName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Capacity</label>
                <input
                  type="number"
                  min={1}
                  value={classForm.capacity}
                  onChange={(e) => setClassForm({ ...classForm, capacity: Number(e.target.value) })}
                  className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-xs text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPendingClass}
                  className="py-2 px-4 rounded-xl bg-[#116a4c] hover:bg-[#0b4f38] text-white font-bold text-xs cursor-pointer disabled:opacity-60"
                >
                  {isPendingClass ? 'Saving…' : editingClass ? 'Update Class' : 'Save Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════ SUBJECT MODAL ════════════════ */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-6">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
              {editingSubject ? 'Edit Subject / Strand' : 'Create Subject / Strand'}
            </h3>
            <form onSubmit={handleSubjectSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Subject Name</label>
                  <input
                    type="text"
                    required
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PRI-MAT"
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                    className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Type</label>
                <select
                  value={subjectForm.type}
                  onChange={(e) => setSubjectForm({ ...subjectForm, type: e.target.value })}
                  className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="subject">Subject (e.g. Mathematics, English)</option>
                  <option value="strand">Thematic Strand (KG & Nursery themes)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Applicable Grade Levels</label>
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  {levels?.map((lvl) => (
                    <div key={lvl._id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`lvl-${lvl._id}`}
                        checked={subjectForm.appliesToLevels.includes(lvl._id)}
                        onChange={() => handleLevelCheckbox(lvl._id)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-800"
                      />
                      <label htmlFor={`lvl-${lvl._id}`} className="text-xs font-semibold text-slate-700 font-sans cursor-pointer">
                        {lvl.displayName}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-xs text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPendingSubject}
                  className="py-2 px-4 rounded-xl bg-[#116a4c] hover:bg-[#0b4f38] text-white font-bold text-xs cursor-pointer disabled:opacity-60"
                >
                  {isPendingSubject ? 'Saving…' : editingSubject ? 'Update Subject' : 'Save Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════ ASSIGNMENT MODAL ════════════════ */}
      {showAssignmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-6">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
              {editingAssignment ? 'Edit Subject Assignment' : 'Assign Subject Teacher'}
            </h3>
            <form onSubmit={handleAssignmentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700">Class Stream</label>
                <select
                  required
                  value={assignmentForm.classId}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, classId: e.target.value })}
                  className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="">Select Class</option>
                  {classes?.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Subject</label>
                <select
                  required
                  value={assignmentForm.subjectId}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, subjectId: e.target.value })}
                  className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="">Select Subject</option>
                  {subjects?.map((s) => (
                    <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Teacher</label>
                <select
                  required
                  value={assignmentForm.teacherId}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, teacherId: e.target.value })}
                  className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="">Select Teacher</option>
                  {teachers?.map((t) => (
                    <option key={t._id} value={t._id}>{t.firstName} {t.lastName}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAssignmentModal(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-xs text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPendingAssignment}
                  className="py-2 px-4 rounded-xl bg-[#116a4c] hover:bg-[#0b4f38] text-white font-bold text-xs cursor-pointer disabled:opacity-60"
                >
                  {isPendingAssignment ? 'Saving…' : editingAssignment ? 'Update Assignment' : 'Save Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════ DELETE CONFIRM ════════════════ */}
      {deleteTarget && (
        <ConfirmDialog
          message={`Are you sure you want to delete "${deleteTarget.label}"? This action cannot be undone.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default ClassesPage;
