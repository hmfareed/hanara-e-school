import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Palette,
  Shield,
  Users,
  UserCheck,
  UserPlus,
  Sparkles,
  Shuffle,
  Download,
  Search,
  Filter,
  X,
  Check,
  ChevronRight,
  AlertCircle,
  GraduationCap,
  Award,
  Crown,
  Layers,
  ArrowRight,
  RefreshCw,
  Plus,
  Trash2,
} from 'lucide-react';

const SECTION_CONFIG = {
  Red: {
    name: 'Red Section',
    color: 'Red',
    bgLight: 'bg-rose-50',
    bgBadge: 'bg-rose-100 text-rose-800 border-rose-200',
    border: 'border-rose-200',
    borderActive: 'border-rose-500 ring-4 ring-rose-500/20',
    primary: 'bg-rose-600 hover:bg-rose-700 text-white',
    gradient: 'from-rose-500 to-red-600',
    bannerGradient: 'from-rose-600 to-red-700',
    text: 'text-rose-700',
    darkText: 'text-rose-950',
    accentColor: '#e11d48',
    glow: 'shadow-rose-500/20',
    motto: 'Strength, Passion & Courage',
  },
  Yellow: {
    name: 'Yellow Section',
    color: 'Yellow',
    bgLight: 'bg-amber-50',
    bgBadge: 'bg-amber-100 text-amber-800 border-amber-200',
    border: 'border-amber-200',
    borderActive: 'border-amber-500 ring-4 ring-amber-500/20',
    primary: 'bg-amber-500 hover:bg-amber-600 text-white',
    gradient: 'from-amber-400 to-yellow-500',
    bannerGradient: 'from-amber-500 to-yellow-600',
    text: 'text-amber-700',
    darkText: 'text-amber-950',
    accentColor: '#d97706',
    glow: 'shadow-amber-500/20',
    motto: 'Brilliance, Honor & Optimism',
  },
  Green: {
    name: 'Green Section',
    color: 'Green',
    bgLight: 'bg-emerald-50',
    bgBadge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    border: 'border-emerald-200',
    borderActive: 'border-emerald-500 ring-4 ring-emerald-500/20',
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    gradient: 'from-emerald-500 to-green-600',
    bannerGradient: 'from-emerald-600 to-teal-700',
    text: 'text-emerald-700',
    darkText: 'text-emerald-950',
    accentColor: '#059669',
    glow: 'shadow-emerald-500/20',
    motto: 'Growth, Harmony & Resilience',
  },
  Blue: {
    name: 'Blue Section',
    color: 'Blue',
    bgLight: 'bg-sky-50',
    bgBadge: 'bg-sky-100 text-sky-800 border-sky-200',
    border: 'border-sky-200',
    borderActive: 'border-sky-500 ring-4 ring-sky-500/20',
    primary: 'bg-sky-600 hover:bg-sky-700 text-white',
    gradient: 'from-sky-500 to-blue-600',
    bannerGradient: 'from-sky-600 to-blue-700',
    text: 'text-sky-700',
    darkText: 'text-sky-950',
    accentColor: '#0284c7',
    glow: 'shadow-sky-500/20',
    motto: 'Wisdom, Loyalty & Excellence',
  },
};

// ─── Modal: Assign Teacher to Section ──────────────────────────────────────────
const AssignTeacherModal = ({ isOpen, onClose, teachers = [], onAssigned }) => {
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedColor, setSelectedColor] = useState('Red');
  const [selectedRole, setSelectedRole] = useState('House Master');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedStaffId) {
      setError('Please select a staff member.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/sections/assign-teacher', {
        staffId: selectedStaffId,
        colorSection: selectedColor,
        sectionRole: selectedRole,
      });
      onAssigned();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to assign teacher.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Crown size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Assign Teacher to Section</h3>
              <p className="text-xs text-slate-500">Designate house masters, mistresses & patrons</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Select Teacher / Staff <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedStaffId}
              onChange={(e) => {
                setSelectedStaffId(e.target.value);
                const t = teachers.find((x) => x._id === e.target.value);
                if (t?.colorSection) setSelectedColor(t.colorSection);
                if (t?.sectionRole) setSelectedRole(t.sectionRole);
              }}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 bg-white"
              required
            >
              <option value="">-- Choose teacher --</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.fullName || `${t.firstName} ${t.lastName}`} {t.colorSection ? `(Currently: ${t.colorSection})` : '(No Section)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Color Section <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {Object.keys(SECTION_CONFIG).map((c) => {
                const isSelected = selectedColor === c;
                const cfg = SECTION_CONFIG[c];
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                      isSelected
                        ? `${cfg.bgBadge} ${cfg.borderActive} shadow-md`
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full shadow-inner"
                      style={{ backgroundColor: cfg.accentColor }}
                    />
                    <span className="font-bold text-xs">{c}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Section Role / Title
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 bg-white"
            >
              <option value="House Master">House Master</option>
              <option value="House Mistress">House Mistress</option>
              <option value="Patron">Patron</option>
              <option value="Assistant">Assistant Patron</option>
              <option value="Member">Section Member</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-60 shadow-sm"
            >
              {loading ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Check size={16} />}
              <span>Save Assignment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Modal: Batch Assign Students ─────────────────────────────────────────────
const BatchAssignStudentsModal = ({ isOpen, onClose, onAssigned }) => {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedColor, setSelectedColor] = useState('Red');
  const [search, setSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: classes = [] } = useQuery({
    queryKey: ['classesListForSectionAssign'],
    queryFn: async () => (await api.get('/classes')).data?.data || [],
  });

  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['studentsForBatchAssign', selectedClassId, search],
    queryFn: async () => {
      const params = { limit: 150 };
      if (selectedClassId) params.class = selectedClassId;
      if (search) params.search = search;
      const res = await api.get('/students', { params });
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  const students = studentsData || [];

  const handleToggleSelect = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((s) => s._id));
    }
  };

  const handleSave = async () => {
    if (selectedStudentIds.length === 0) {
      setError('Please select at least one student.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/sections/assign-students', {
        studentIds: selectedStudentIds,
        colorSection: selectedColor,
      });
      onAssigned();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to batch assign students.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] border border-slate-200 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <UserPlus size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Batch Assign Students to Section</h3>
              <p className="text-xs text-slate-500">Select students and assign them to Red, Yellow, Green, or Blue</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section Picker */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Target Section <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {Object.keys(SECTION_CONFIG).map((c) => {
                const isSelected = selectedColor === c;
                const cfg = SECTION_CONFIG[c];
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                      isSelected
                        ? `${cfg.bgBadge} ${cfg.borderActive} shadow-md`
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full shadow-inner"
                      style={{ backgroundColor: cfg.accentColor }}
                    />
                    <span className="font-bold text-xs">{c}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Filter by Class
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Search Students
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Name or admission number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>
            </div>
          </div>

          {/* Student List Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden mt-3">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={students.length > 0 && selectedStudentIds.length === students.length}
                  onChange={handleSelectAll}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span>Select All ({students.length} students)</span>
              </label>
              <span className="text-xs text-slate-500 font-semibold">
                Selected: <strong className="text-emerald-700">{selectedStudentIds.length}</strong>
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
              {studentsLoading ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading student roster…</div>
              ) : students.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No students found matching filter.</div>
              ) : (
                students.map((s) => {
                  const isChecked = selectedStudentIds.includes(s._id);
                  const currentSection = s.colorSection;
                  const currentCfg = currentSection ? SECTION_CONFIG[currentSection] : null;
                  return (
                    <div
                      key={s._id}
                      onClick={() => handleToggleSelect(s._id)}
                      className={`px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition ${
                        isChecked ? 'bg-emerald-50/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 pointer-events-none"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            {s.firstName} {s.otherNames ? `${s.otherNames} ` : ''}{s.lastName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">{s.admissionNumber} · {s.currentClass?.name || 'Unassigned Class'}</p>
                        </div>
                      </div>
                      <div>
                        {currentSection ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentCfg?.bgBadge || 'bg-slate-100 text-slate-700'}`}>
                            {currentSection}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            Unassigned
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <span className="text-xs text-slate-500">
            {selectedStudentIds.length} student{selectedStudentIds.length === 1 ? '' : 's'} will be moved to <strong>{selectedColor} Section</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || selectedStudentIds.length === 0}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50 shadow-sm"
            >
              {loading ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Check size={16} />}
              <span>Assign to {selectedColor}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main ColorSectionsPage Component ─────────────────────────────────────────
const ColorSectionsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSectionView, setSelectedSectionView] = useState('All'); // 'All' | 'Red' | 'Yellow' | 'Green' | 'Blue' | 'Unassigned'
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [showAssignTeacherModal, setShowAssignTeacherModal] = useState(false);
  const [showBatchAssignModal, setShowBatchAssignModal] = useState(false);
  const [autoBalancing, setAutoBalancing] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const isAdmin = ['superadmin', 'admin', 'system_admin'].includes(user?.role);

  // Fetch summary of all sections
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['colorSectionsSummary'],
    queryFn: async () => {
      const res = await api.get('/sections/summary');
      return res.data?.data;
    },
  });

  // Fetch single section details if viewing a specific section
  const { data: sectionDetailData, isLoading: detailLoading } = useQuery({
    queryKey: ['colorSectionDetail', selectedSectionView, search, classFilter],
    queryFn: async () => {
      const params = {};
      if (search) params.search = search;
      if (classFilter) params.class = classFilter;
      const res = await api.get(`/sections/${selectedSectionView}`, { params });
      return res.data?.data;
    },
    enabled: selectedSectionView !== 'All',
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classesListSummary'],
    queryFn: async () => (await api.get('/classes')).data?.data || [],
  });

  const sections = summaryData?.sections || [];
  const unassigned = summaryData?.unassigned || { totalStudents: 0, maleStudents: 0, femaleStudents: 0 };
  const totalActive = summaryData?.totalActiveStudents || 0;
  const availableTeachers = summaryData?.availableTeachers || [];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['colorSectionsSummary'] });
    if (selectedSectionView !== 'All') {
      queryClient.invalidateQueries({ queryKey: ['colorSectionDetail', selectedSectionView] });
    }
  };

  const handleAutoBalance = async (redistributeAll = false) => {
    if (
      !window.confirm(
        redistributeAll
          ? 'Are you sure you want to redistribute ALL active students equally across the 4 color sections?'
          : 'Are you sure you want to automatically distribute all UNASSIGNED students evenly across the 4 color sections?'
      )
    ) {
      return;
    }
    setAutoBalancing(true);
    try {
      const res = await api.post('/sections/auto-balance', { redistributeAll });
      setActionMessage({ type: 'success', text: res.data?.message || 'Students balanced successfully!' });
      handleRefresh();
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err) {
      setActionMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to auto-balance sections.' });
    } finally {
      setAutoBalancing(false);
    }
  };

  const handleExportSectionRoster = (studentsToExport, sectionName) => {
    if (!studentsToExport || studentsToExport.length === 0) return;
    const headers = ['Admission No', 'First Name', 'Last Name', 'Gender', 'Class', 'Color Section', 'Status'];
    const rows = studentsToExport.map((s) => [
      `"${s.admissionNumber || ''}"`,
      `"${s.firstName || ''}"`,
      `"${s.lastName || ''}"`,
      `"${s.gender || ''}"`,
      `"${s.currentClass?.name || 'Unassigned'}"`,
      `"${s.colorSection || 'Unassigned'}"`,
      `"${s.status || 'active'}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hanara_${sectionName.toLowerCase()}_section_roster.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Assign Teacher Modal */}
      <AssignTeacherModal
        isOpen={showAssignTeacherModal}
        onClose={() => setShowAssignTeacherModal(false)}
        teachers={availableTeachers}
        onAssigned={() => {
          handleRefresh();
          setActionMessage({ type: 'success', text: 'Teacher successfully assigned to section!' });
          setTimeout(() => setActionMessage(null), 4000);
        }}
      />

      {/* Batch Assign Students Modal */}
      <BatchAssignStudentsModal
        isOpen={showBatchAssignModal}
        onClose={() => setShowBatchAssignModal(false)}
        onAssigned={() => {
          handleRefresh();
          setActionMessage({ type: 'success', text: 'Students assigned to section successfully!' });
          setTimeout(() => setActionMessage(null), 4000);
        }}
      />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 md:p-8 rounded-3xl text-white shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 via-amber-400 to-emerald-400 flex items-center justify-center text-white shadow-lg">
              <Palette size={24} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Hanara Color Sections</h1>
              <p className="text-slate-300 text-xs md:text-sm">
                Red · Yellow · Green · Blue — Student Representation & House Leadership
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRefresh}
            title="Refresh statistics"
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <RefreshCw size={16} />
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => setShowAssignTeacherModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer border border-white/15"
              >
                <Crown size={14} className="text-amber-400" />
                <span>Assign Teacher</span>
              </button>
              <button
                onClick={() => setShowBatchAssignModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-md"
              >
                <UserPlus size={14} />
                <span>Batch Assign Students</span>
              </button>
            </>
          )}
        </div>
      </div>

      {actionMessage && (
        <div
          className={`flex items-center gap-3 p-4 rounded-2xl border text-sm font-medium animate-fadeIn ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {actionMessage.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* 4 Major Color Section Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {['Red', 'Yellow', 'Green', 'Blue'].map((colorKey) => {
          const cfg = SECTION_CONFIG[colorKey];
          const sec = sections.find((s) => s.name === colorKey) || {
            name: colorKey,
            totalStudents: 0,
            maleStudents: 0,
            femaleStudents: 0,
            patrons: [],
          };
          const percentage = totalActive > 0 ? Math.round((sec.totalStudents / totalActive) * 100) : 0;
          const isSelected = selectedSectionView === colorKey;

          return (
            <div
              key={colorKey}
              onClick={() => setSelectedSectionView(selectedSectionView === colorKey ? 'All' : colorKey)}
              className={`group relative bg-white rounded-3xl border transition-all duration-300 overflow-hidden cursor-pointer shadow-sm hover:shadow-xl ${
                isSelected ? `${cfg.borderActive} shadow-lg scale-[1.02]` : `${cfg.border} hover:border-slate-300`
              }`}
            >
              {/* Top Banner Gradient */}
              <div className={`h-3 w-full bg-gradient-to-r ${cfg.gradient}`} />

              <div className="p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md font-black text-lg"
                      style={{ backgroundColor: cfg.accentColor }}
                    >
                      <Shield size={22} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-lg text-slate-900 group-hover:text-slate-800">
                        {cfg.name}
                      </h3>
                      <p className="text-[11px] font-semibold text-slate-400">{cfg.motto}</p>
                    </div>
                  </div>
                </div>

                {/* Main Stat Number */}
                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <span className="text-3xl font-black text-slate-900 tracking-tight">
                      {sec.totalStudents}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold ml-1.5">Students</span>
                  </div>
                  <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full border ${cfg.bgBadge}`}>
                    {percentage}% of School
                  </span>
                </div>

                {/* Gender Ratio Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span>Boys: {sec.maleStudents}</span>
                    <span>Girls: {sec.femaleStudents}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${sec.totalStudents ? (sec.maleStudents / sec.totalStudents) * 100 : 50}%` }}
                      className="bg-indigo-500 transition-all duration-500"
                      title={`Male: ${sec.maleStudents}`}
                    />
                    <div
                      style={{ width: `${sec.totalStudents ? (sec.femaleStudents / sec.totalStudents) * 100 : 50}%` }}
                      className="bg-rose-400 transition-all duration-500"
                      title={`Female: ${sec.femaleStudents}`}
                    />
                  </div>
                </div>

                {/* Assigned Patrons / Teachers List */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Crown size={12} className="text-amber-500" />
                      Leadership & Patrons
                    </span>
                    <span className="text-[11px] font-bold text-slate-600">{sec.patrons?.length || 0}</span>
                  </div>

                  {sec.patrons && sec.patrons.length > 0 ? (
                    <div className="space-y-1.5">
                      {sec.patrons.map((patron) => (
                        <div
                          key={patron._id}
                          className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/80 transition"
                        >
                          {patron.photoUrl ? (
                            <img
                              src={patron.photoUrl}
                              alt={patron.firstName}
                              className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 text-white text-xs font-bold flex items-center justify-center">
                              {patron.firstName?.charAt(0) || 'T'}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 truncate">{patron.fullName}</p>
                            <p className="text-[10px] text-slate-500 truncate">{patron.sectionRole || 'Patron'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-1">No patrons assigned yet.</p>
                  )}
                </div>

                {/* View Details Button */}
                <div className="pt-2">
                  <button
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      isSelected ? cfg.primary : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>{isSelected ? 'Viewing Roster' : 'View Section Roster'}</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Unassigned Students Info Banner & Auto-Balance Bar */}
      {unassigned.totalStudents > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-amber-900">
                {unassigned.totalStudents} Student{unassigned.totalStudents === 1 ? '' : 's'} Not Yet In A Color Section
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                {unassigned.maleStudents} boys and {unassigned.femaleStudents} girls need color section assignment.
              </p>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => handleAutoBalance(false)}
                disabled={autoBalancing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Shuffle size={14} />
                <span>{autoBalancing ? 'Balancing…' : 'Auto-Distribute Unassigned'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Section View Tabs and Roster Explorer */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden space-y-6">
        {/* Navigation Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 border-b border-slate-100">
          {/* Section Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
            <button
              onClick={() => setSelectedSectionView('All')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                selectedSectionView === 'All'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Layers size={14} />
              <span>All Sections ({totalActive})</span>
            </button>

            {['Red', 'Yellow', 'Green', 'Blue'].map((c) => {
              const cfg = SECTION_CONFIG[c];
              const sec = sections.find((s) => s.name === c);
              const isSelected = selectedSectionView === c;
              return (
                <button
                  key={c}
                  onClick={() => setSelectedSectionView(c)}
                  className={`px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                    isSelected ? `${cfg.primary} shadow-md` : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.accentColor }} />
                  <span>{c} ({sec?.totalStudents || 0})</span>
                </button>
              );
            })}

            {unassigned.totalStudents > 0 && (
              <button
                onClick={() => setSelectedSectionView('Unassigned')}
                className={`px-3.5 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
                  selectedSectionView === 'Unassigned'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                }`}
              >
                Unassigned ({unassigned.totalStudents})
              </button>
            )}
          </div>

          {/* Search & Export Actions */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-56">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 bg-slate-50 focus:bg-white transition"
              />
            </div>

            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>

            {selectedSectionView !== 'All' && sectionDetailData?.students && (
              <button
                onClick={() => handleExportSectionRoster(sectionDetailData.students, selectedSectionView)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
                title="Export CSV"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}
          </div>
        </div>

        {/* Section View Content */}
        <div className="px-6 pb-6">
          {selectedSectionView === 'All' ? (
            /* All Sections Class Distribution Breakdown */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Class Level Distribution Overview</h3>
                  <p className="text-xs text-slate-500">Student enrollment across Red, Yellow, Green, and Blue for every class</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((cls) => {
                  const redCount = sections.find((s) => s.name === 'Red')?.classBreakdown?.[cls.name] || 0;
                  const yellowCount = sections.find((s) => s.name === 'Yellow')?.classBreakdown?.[cls.name] || 0;
                  const greenCount = sections.find((s) => s.name === 'Green')?.classBreakdown?.[cls.name] || 0;
                  const blueCount = sections.find((s) => s.name === 'Blue')?.classBreakdown?.[cls.name] || 0;
                  const classTotal = redCount + yellowCount + greenCount + blueCount;

                  return (
                    <div key={cls._id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">{cls.name}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full">
                          {classTotal} Students
                        </span>
                      </div>

                      {/* 4-color grid count */}
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="p-2 rounded-xl bg-rose-50 border border-rose-200">
                          <p className="text-xs font-extrabold text-rose-700">{redCount}</p>
                          <p className="text-[10px] font-semibold text-rose-600">Red</p>
                        </div>
                        <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
                          <p className="text-xs font-extrabold text-amber-700">{yellowCount}</p>
                          <p className="text-[10px] font-semibold text-amber-600">Yellow</p>
                        </div>
                        <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                          <p className="text-xs font-extrabold text-emerald-700">{greenCount}</p>
                          <p className="text-[10px] font-semibold text-emerald-600">Green</p>
                        </div>
                        <div className="p-2 rounded-xl bg-sky-50 border border-sky-200">
                          <p className="text-xs font-extrabold text-sky-700">{blueCount}</p>
                          <p className="text-[10px] font-semibold text-sky-600">Blue</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Specific Section Roster Table */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <span>{selectedSectionView} Section Roster</span>
                    {selectedSectionView !== 'Unassigned' && (
                      <span className={`text-xs px-2.5 py-0.5 rounded-full border ${SECTION_CONFIG[selectedSectionView]?.bgBadge}`}>
                        {sectionDetailData?.total || 0} Students
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Boys: {sectionDetailData?.maleTotal || 0} · Girls: {sectionDetailData?.femaleTotal || 0}
                  </p>
                </div>
              </div>

              {detailLoading ? (
                <div className="p-12 text-center text-xs text-slate-400">Loading student roster…</div>
              ) : !sectionDetailData?.students || sectionDetailData.students.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No students found in {selectedSectionView} section matching filter criteria.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                      <tr>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Adm Number</th>
                        <th className="py-3 px-4">Gender</th>
                        <th className="py-3 px-4">Class</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sectionDetailData.students.map((student) => (
                        <tr key={student._id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2.5">
                            {student.photoUrl ? (
                              <img
                                src={student.photoUrl}
                                alt={student.firstName}
                                className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                                {student.firstName?.charAt(0) || 'S'}
                              </div>
                            )}
                            <span>{student.firstName} {student.otherNames ? `${student.otherNames} ` : ''}{student.lastName}</span>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-600">
                            {student.admissionNumber}
                          </td>
                          <td className="py-3 px-4 capitalize text-slate-600">
                            {student.gender}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md font-semibold text-[11px]">
                              {student.currentClass?.name || 'Unassigned'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px] uppercase">
                              {student.status || 'Active'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ColorSectionsPage;
