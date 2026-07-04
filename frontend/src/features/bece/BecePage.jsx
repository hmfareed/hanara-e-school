import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Search, Filter, Plus, Edit2, Trash2, Calendar, FileText, Award,
  AlertTriangle, CheckCircle, Calculator, UserCheck, RefreshCw, X,
  Loader2, Info, Users, ClipboardList, ShieldCheck,
} from 'lucide-react';

/* ── tiny stat card ─────────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, colour }) => (
  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-white shadow-sm ${colour}`}>
    <div className="p-2 rounded-lg bg-current/10">
      <Icon size={16} className="opacity-80" />
    </div>
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">{label}</p>
      <p className="text-xl font-black leading-none mt-0.5">{value ?? '—'}</p>
    </div>
  </div>
);

/* ── status badge helper ─────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const map = {
    registered:  'bg-emerald-50 text-emerald-800 border-emerald-200',
    confirmed:   'bg-indigo-50  text-indigo-800  border-indigo-200',
    withdrawn:   'bg-red-50     text-red-800     border-red-200',
    not_started: 'bg-slate-50   text-slate-500   border-slate-200',
  };
  const labels = {
    registered: 'Registered', confirmed: 'Confirmed',
    withdrawn: 'Withdrawn', not_started: 'Not Registered',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${map[status] ?? map.not_started}`}>
      {labels[status] ?? 'Not Registered'}
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   BECE PAGE
═══════════════════════════════════════════════════════════════════════ */
const BecePage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = ['superadmin', 'admin'].includes(user?.role);

  /* ── state ── */
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('1');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedStudentForAggregate, setSelectedStudentForAggregate] = useState(null);

  const [registerModal, setRegisterModal]   = useState({ isOpen: false, student: null });
  const [manageModal,  setManageModal]      = useState({ isOpen: false, record: null });
  const [toast, setToast]                   = useState({ text: '', type: '' });

  const [registerForm, setRegisterForm] = useState({ indexNumber: '', notes: '' });
  const [updateForm,   setUpdateForm]   = useState({ registrationStatus: 'registered', indexNumber: '', notes: '' });
  const [mockForm,     setMockForm]     = useState({ examName: '', aggregate: '', date: '' });

  /* ── queries ── */
  const { data: academicYears = [] } = useQuery({
    queryKey: ['academicYearsList'],
    queryFn: async () => (await api.get('/academic-years')).data?.data || [],
  });

  useEffect(() => {
    if (academicYears.length > 0 && !selectedYear) {
      const active = academicYears.find(y => y.isCurrent) || academicYears[0];
      if (active) setSelectedYear(active.name);
    }
  }, [academicYears, selectedYear]);

  const {
    data: candidatesData = [],
    isLoading: loadingCandidates,
  } = useQuery({
    queryKey: ['beceCandidates', selectedYear],
    queryFn: async () => {
      const res = await api.get('/bece-candidates', { params: { academicYear: selectedYear } });
      return res.data?.data || [];
    },
    enabled: !!selectedYear,
  });

  const { data: aggregateData, isLoading: loadingAggregate, error: aggregateError } = useQuery({
    queryKey: ['beceAggregate', selectedStudentForAggregate?.student?._id, selectedYear, selectedTerm],
    queryFn: async () => {
      const res = await api.get(
        `/bece-candidates/student/${selectedStudentForAggregate.student._id}/aggregate`,
        { params: { academicYear: selectedYear, term: selectedTerm } }
      );
      return res.data?.data;
    },
    enabled: !!selectedStudentForAggregate && !!selectedYear && !!selectedTerm,
  });

  /* ── derived stats ── */
  const totalJhs3      = candidatesData.length;
  const totalRegistered = candidatesData.filter(i => !!i.candidate).length;
  const totalPending   = totalJhs3 - totalRegistered;

  /* ── filtered list ── */
  const filteredCandidates = candidatesData.filter((item) => {
    const name = `${item.student.firstName} ${item.student.lastName} ${item.student.otherNames || ''}`.toLowerCase();
    const matchSearch = name.includes(searchQuery.toLowerCase()) ||
      (item.student.admissionNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

    const isRegistered = !!item.candidate;
    if (statusFilter === 'registered')   return matchSearch && isRegistered;
    if (statusFilter === 'unregistered') return matchSearch && !isRegistered;
    return matchSearch;
  });

  /* ── toast ── */
  const showToast = (text, type = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: '', type: '' }), 4000);
  };

  /* ── mutations ── */
  const registerMutation = useMutation({
    mutationFn: async ({ studentId, payload }) =>
      api.post(`/bece-candidates/${studentId}`, payload),
    onSuccess: () => {
      showToast('Candidate registered successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['beceCandidates'] });
      setRegisterModal({ isOpen: false, student: null });
      setRegisterForm({ indexNumber: '', notes: '' });
    },
    onError: (err) => showToast(err.response?.data?.message || 'Failed to register.', 'error'),
  });

  const updateCandidateMutation = useMutation({
    mutationFn: async ({ candidateId, payload }) =>
      api.patch(`/bece-candidates/${candidateId}`, payload),
    onSuccess: (res) => {
      showToast('Candidate record updated!', 'success');
      queryClient.invalidateQueries({ queryKey: ['beceCandidates'] });
      setManageModal(prev => ({ ...prev, record: res.data?.data }));
    },
    onError: (err) => showToast(err.response?.data?.message || 'Failed to update.', 'error'),
  });

  const removeMockMutation = useMutation({
    mutationFn: async ({ candidateId, index }) =>
      api.delete(`/bece-candidates/${candidateId}/mock/${index}`),
    onSuccess: (res) => {
      showToast('Mock result removed.', 'success');
      queryClient.invalidateQueries({ queryKey: ['beceCandidates'] });
      setManageModal(prev => ({ ...prev, record: res.data?.data }));
    },
    onError: (err) => showToast(err.response?.data?.message || 'Failed to remove.', 'error'),
  });

  /* ── bulk register all unregistered ── */
  const [bulkLoading, setBulkLoading] = useState(false);
  const handleBulkRegister = async () => {
    const unregistered = candidatesData.filter(i => !i.candidate);
    if (unregistered.length === 0) { showToast('All students are already registered.', 'info'); return; }
    if (!window.confirm(`Register all ${unregistered.length} unregistered JHS 3 students? You can update their index numbers individually after.`)) return;

    setBulkLoading(true);
    let ok = 0; let fail = 0;
    for (const item of unregistered) {
      try {
        await api.post(`/bece-candidates/${item.student._id}`, {
          academicYear: selectedYear,
          indexNumber: '',
          notes: 'Bulk registered — index number pending',
        });
        ok++;
      } catch {
        fail++;
      }
    }
    setBulkLoading(false);
    showToast(`Bulk register complete: ${ok} registered${fail ? `, ${fail} failed` : ''}.`, fail ? 'error' : 'success');
    queryClient.invalidateQueries({ queryKey: ['beceCandidates'] });
  };

  /* ── handlers ── */
  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!registerModal.student) return;
    registerMutation.mutate({
      studentId: registerModal.student._id,
      payload: { academicYear: selectedYear, ...registerForm },
    });
  };

  const handleUpdateDetailsSubmit = (e) => {
    e.preventDefault();
    if (!manageModal.record) return;
    updateCandidateMutation.mutate({
      candidateId: manageModal.record._id,
      payload: {
        registrationStatus: updateForm.registrationStatus,
        indexNumber: updateForm.indexNumber,
        notes: updateForm.notes,
      },
    });
  };

  const handleAddMockSubmit = (e) => {
    e.preventDefault();
    if (!manageModal.record || !mockForm.examName || !mockForm.aggregate) return;
    updateCandidateMutation.mutate({
      candidateId: manageModal.record._id,
      payload: {
        mockResult: {
          examName: mockForm.examName,
          aggregate: Number(mockForm.aggregate),
          date: mockForm.date || new Date().toISOString(),
        },
      },
    });
    setMockForm({ examName: '', aggregate: '', date: '' });
  };

  const openManageModal = (record) => {
    setManageModal({ isOpen: true, record });
    setUpdateForm({
      registrationStatus: record.registrationStatus || 'registered',
      indexNumber: record.indexNumber || '',
      notes: record.notes || '',
    });
  };

  /* ══════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast.text && (
        <div className={`fixed bottom-6 right-6 p-4 rounded-xl text-sm flex items-center space-x-2.5 border shadow-lg z-50 animate-bounce ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700'
          : 'bg-indigo-50 border-indigo-200 text-indigo-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span className="font-medium">{toast.text}</span>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Award className="text-emerald-800" size={24} />
            <span>BECE Candidates &amp; Tracker</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage JHS 3 candidate registration, mock performances, and WAEC aggregations
          </p>
        </div>

        {/* Year / Term selectors */}
        <div className="flex items-center space-x-3 bg-white border border-slate-200 rounded-2xl p-2 shadow-sm w-fit self-end">
          <div className="flex items-center space-x-1.5 px-2">
            <Calendar size={14} className="text-slate-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="border-none text-slate-800 text-xs font-semibold focus:ring-0 bg-transparent pr-8 py-1"
            >
              <option value="">Year</option>
              {academicYears.map((yr) => (
                <option key={yr._id} value={yr.name}>{yr.name}</option>
              ))}
            </select>
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center space-x-1.5 px-2">
            <RefreshCw size={14} className="text-slate-400" />
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="border-none text-slate-800 text-xs font-semibold focus:ring-0 bg-transparent pr-8 py-1"
            >
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="3">Term 3</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      {selectedYear && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={Users}         label="Total JHS 3"  value={totalJhs3}      colour="text-slate-700" />
          <StatCard icon={ShieldCheck}   label="Registered"   value={totalRegistered} colour="text-emerald-700" />
          <StatCard icon={ClipboardList} label="Pending"      value={totalPending}    colour="text-amber-700" />
        </div>
      )}

      {/* ── Two-Panel Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT: Candidate List */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[620px]">

          {/* Controls bar */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or admission number…"
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-1.5">
                <Filter size={13} className="text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
                >
                  <option value="all">All JHS 3</option>
                  <option value="registered">Registered</option>
                  <option value="unregistered">Not Registered</option>
                </select>
              </div>

              {/* Bulk Register */}
              {isAdmin && totalPending > 0 && (
                <button
                  id="bulk-register-btn"
                  onClick={handleBulkRegister}
                  disabled={bulkLoading}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {bulkLoading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  Register All ({totalPending})
                </button>
              )}
            </div>
          </div>

          {/* Roster Table */}
          <div className="flex-1 overflow-y-auto">
            {loadingCandidates ? (
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <Loader2 className="animate-spin text-emerald-700" size={28} />
                <p className="text-xs text-slate-400">Loading JHS 3 student list…</p>
              </div>
            ) : !selectedYear ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                <Calendar size={32} className="mb-2 text-slate-300" />
                Select an academic year to view candidates.
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400 max-w-sm mx-auto">
                <UserCheck size={36} className="text-slate-300 mb-2" />
                <p className="text-xs font-semibold">No students found</p>
                <p className="text-[11px] mt-0.5">
                  Adjust the filter, or check that JHS 3 students are enrolled in the system.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead>
                  <tr className="sticky top-0 bg-white border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Index #</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCandidates.map((item) => {
                    const isRegistered = !!item.candidate;
                    const isSelected   = selectedStudentForAggregate?.student?._id === item.student._id;
                    return (
                      <tr
                        key={item.student._id}
                        onClick={() => setSelectedStudentForAggregate(item)}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50/60'
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">
                            {item.student.firstName} {item.student.lastName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {item.student.admissionNumber}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-600">
                          {item.student.currentClass?.name || 'JHS 3'}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                          {item.candidate?.indexNumber || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <StatusBadge status={item.candidate?.registrationStatus || 'not_started'} />
                        </td>
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          {isRegistered ? (
                            <button
                              type="button"
                              onClick={() => openManageModal(item.candidate)}
                              className="inline-flex items-center space-x-1 py-1 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[10px] transition-colors cursor-pointer"
                            >
                              <Edit2 size={10} /><span>Manage</span>
                            </button>
                          ) : isAdmin ? (
                            <button
                              type="button"
                              onClick={() => setRegisterModal({ isOpen: true, student: item.student })}
                              className="inline-flex items-center space-x-1 py-1 px-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] transition-colors cursor-pointer"
                            >
                              <Plus size={10} /><span>Register</span>
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT: Aggregate Calculator */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[620px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
              <Calculator size={14} className="text-emerald-700" />
              <span>BECE Aggregate Calculator</span>
            </h3>
            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-bold font-mono">
              WAEC 9-Point Scale
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {!selectedStudentForAggregate ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 max-w-xs mx-auto">
                <Calculator size={48} className="text-slate-200 mb-3" />
                <p className="text-xs font-bold text-slate-500">No Student Selected</p>
                <p className="text-[11px] mt-1">
                  Click a student row on the left to view their WAEC grade breakdown and computed aggregate.
                </p>
              </div>
            ) : loadingAggregate ? (
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <Loader2 className="animate-spin text-emerald-700" size={28} />
                <p className="text-xs text-slate-400">Computing WAEC grades and aggregate…</p>
              </div>
            ) : aggregateError ? (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                <p className="font-bold flex items-center space-x-1.5">
                  <AlertTriangle size={14} /><span>Failed to load aggregate</span>
                </p>
                <p className="mt-1">{aggregateError.response?.data?.message || aggregateError.message}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Student info card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      {selectedStudentForAggregate.student.firstName}{' '}
                      {selectedStudentForAggregate.student.lastName}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Adm #: {selectedStudentForAggregate.student.admissionNumber} &middot;{' '}
                      {selectedStudentForAggregate.student.currentClass?.name || 'JHS 3'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Index #:{' '}
                      <span className="font-mono font-bold text-slate-800">
                        {selectedStudentForAggregate.candidate?.indexNumber || 'Not Registered'}
                      </span>
                    </p>
                  </div>
                  {/* Aggregate badge */}
                  <div className="text-center bg-white border border-slate-200 p-2.5 rounded-xl shadow-sm min-w-[70px]">
                    <div className="text-2xl font-black text-emerald-900 leading-none">
                      {aggregateData?.aggregate != null ? aggregateData.aggregate : '—'}
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                      Aggregate
                    </div>
                  </div>
                </div>

                {/* Warning */}
                {aggregateData?.warning && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-[11px] flex items-start space-x-2">
                    <Info size={14} className="flex-shrink-0 mt-0.5 text-amber-600" />
                    <span>{aggregateData.warning}</span>
                  </div>
                )}

                {/* Core subjects */}
                <div>
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Required Core Subjects (Sum of All 4)</span>
                    <span className="text-[9px] font-medium">Lower grade = better</span>
                  </h5>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                    {aggregateData?.coreGrades?.length > 0 ? (
                      aggregateData.coreGrades.map((g) => (
                        <div key={g.code} className="flex items-center justify-between px-3 py-2 text-xs">
                          <div className="font-semibold text-slate-700">
                            {g.subject}{' '}
                            <span className="text-[9px] text-slate-400 font-mono">({g.code})</span>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="text-[11px] text-slate-400">Score: {g.totalScore}%</span>
                            <span className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center font-bold font-mono text-emerald-800 text-xs">
                              {g.waecGrade}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-[11px] text-slate-400">
                        No core subject grades entered for this period.
                      </div>
                    )}
                  </div>
                </div>

                {/* Elective subjects */}
                <div>
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Elective Subjects (Best 2 Included)</span>
                    <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                      Highlighted = Selected
                    </span>
                  </h5>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                    {aggregateData?.electiveGrades?.length > 0 ? (
                      aggregateData.electiveGrades.map((g) => {
                        const isBest = aggregateData.bestElectives?.some(be => be.code === g.code);
                        return (
                          <div
                            key={g.code}
                            className={`flex items-center justify-between px-3 py-2 text-xs ${isBest ? 'bg-emerald-50/40' : ''}`}
                          >
                            <div className={`font-semibold ${isBest ? 'text-emerald-900 font-bold' : 'text-slate-600'}`}>
                              {g.subject}{' '}
                              <span className="text-[9px] text-slate-400 font-mono">({g.code})</span>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="text-[11px] text-slate-400">Score: {g.totalScore}%</span>
                              <span className={`w-6 h-6 rounded-md flex items-center justify-center font-bold font-mono text-xs border ${
                                isBest
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-sm'
                                  : 'bg-slate-50 text-slate-500 border-slate-200'
                              }`}>
                                {g.waecGrade}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-[11px] text-slate-400">
                        No elective subject grades entered for this period.
                      </div>
                    )}
                  </div>
                </div>

                {/* Legend */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[10px] text-slate-500 leading-relaxed">
                  <div className="font-bold text-slate-600 mb-1">WAEC BECE Scale</div>
                  WAEC uses grades 1 (best) to 9 (fail). A perfect aggregate of{' '}
                  <strong className="text-emerald-900">6</strong> means grade 1 in all 4 core + 2 best electives.
                  Maximum aggregate is <strong className="text-red-800">54</strong>.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ REGISTER CANDIDATE MODAL ══════════════════════════════════════ */}
      {registerModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center space-x-2">
                <UserCheck size={16} className="text-emerald-700" />
                <span>Register BECE Candidate</span>
              </h3>
              <button onClick={() => setRegisterModal({ isOpen: false, student: null })} className="text-slate-400 hover:text-slate-600 transition">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Candidate</span>
                <div className="font-semibold text-slate-800">
                  {registerModal.student?.firstName} {registerModal.student?.lastName}
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {registerModal.student?.admissionNumber}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  WAEC Index Number
                </label>
                <input
                  type="text"
                  value={registerForm.indexNumber}
                  onChange={(e) => setRegisterForm({ ...registerForm, indexNumber: e.target.value })}
                  placeholder="e.g. 0010203045 (can be added later)"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  rows={2}
                  value={registerForm.notes}
                  onChange={(e) => setRegisterForm({ ...registerForm, notes: e.target.value })}
                  placeholder="e.g. Registered April, special accommodations requested"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRegisterModal({ isOpen: false, student: null })}
                  className="px-4 py-2 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="flex items-center space-x-1.5 py-2 px-5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {registerMutation.isPending && <Loader2 size={12} className="animate-spin" />}
                  <span>Complete Registration</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MANAGE CANDIDATE MODAL ════════════════════════════════════════ */}
      {manageModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center space-x-2">
                <Award size={16} className="text-emerald-700" />
                <span>Manage Candidate</span>
              </h3>
              <button onClick={() => setManageModal({ isOpen: false, record: null })} className="text-slate-400 hover:text-slate-600 transition">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-6 flex-1">

              {/* Update details form */}
              {isAdmin ? (
                <form onSubmit={handleUpdateDetailsSubmit} className="space-y-4 pb-6 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registration Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Registration Status</label>
                      <select
                        value={updateForm.registrationStatus}
                        onChange={(e) => setUpdateForm({ ...updateForm, registrationStatus: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-white"
                      >
                        <option value="registered">Registered</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="withdrawn">Withdrawn</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">WAEC Index Number</label>
                      <input
                        type="text"
                        value={updateForm.indexNumber}
                        onChange={(e) => setUpdateForm({ ...updateForm, indexNumber: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Notes</label>
                    <input
                      type="text"
                      value={updateForm.notes}
                      onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={updateCandidateMutation.isPending}
                      className="flex items-center space-x-1.5 py-1.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                    >
                      {updateCandidateMutation.isPending && <Loader2 size={12} className="animate-spin" />}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="pb-6 border-b border-slate-100 space-y-1">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registration Details (Read-only)</h4>
                  <div className="text-sm font-semibold text-slate-800">Index Number: {manageModal.record?.indexNumber || '—'}</div>
                  <div className="text-xs text-slate-500">
                    Status: {manageModal.record?.registrationStatus} &middot; Notes: {manageModal.record?.notes || 'None'}
                  </div>
                </div>
              )}

              {/* Mock results */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mock Examination Performance</h4>

                {/* Add mock form */}
                {isAdmin && (
                  <form
                    onSubmit={handleAddMockSubmit}
                    className="bg-slate-50 border border-slate-200 p-4 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
                  >
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Exam Name *</label>
                      <input
                        type="text"
                        value={mockForm.examName}
                        onChange={(e) => setMockForm({ ...mockForm, examName: e.target.value })}
                        placeholder="e.g. Mock 1 / Pre-BECE"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Aggregate (6–54) *</label>
                      <input
                        type="number"
                        min={6} max={54}
                        value={mockForm.aggregate}
                        onChange={(e) => setMockForm({ ...mockForm, aggregate: e.target.value })}
                        placeholder="e.g. 14"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={updateCandidateMutation.isPending}
                      className="py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer h-[34px]"
                    >
                      Record Score
                    </button>
                  </form>
                )}

                {/* Mock list */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-2.5 px-4">Exam</th>
                        <th className="py-2.5 px-4 text-center font-mono">Aggregate</th>
                        <th className="py-2.5 px-4">Date</th>
                        {isAdmin && <th className="py-2.5 px-4 text-center w-20">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {manageModal.record?.mockResults?.length > 0 ? (
                        manageModal.record.mockResults.map((mock, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-4 font-semibold text-slate-800">{mock.examName}</td>
                            <td className="py-2.5 px-4 font-mono font-bold text-center text-emerald-800">{mock.aggregate}</td>
                            <td className="py-2.5 px-4 text-slate-400">
                              {mock.date ? new Date(mock.date).toLocaleDateString('en-GB') : '—'}
                            </td>
                            {isAdmin && (
                              <td className="py-2.5 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm('Remove this mock result?')) {
                                      removeMockMutation.mutate({ candidateId: manageModal.record._id, index: idx });
                                    }
                                  }}
                                  className="text-red-500 hover:text-red-700 transition font-bold cursor-pointer"
                                >
                                  Delete
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={isAdmin ? 4 : 3} className="py-6 text-center text-slate-400 text-xs">
                            No mock examinations recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end flex-shrink-0">
              <button
                type="button"
                onClick={() => setManageModal({ isOpen: false, record: null })}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BecePage;
