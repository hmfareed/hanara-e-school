import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft, User, Phone, CheckCircle, AlertCircle, Ban, Bus, X, Save, MapPin, Pencil, FileDown, Loader2, Receipt, Coins,
} from 'lucide-react';
import DailyFeeConfigModal from './DailyFeeConfigModal';
import EditGuardianModal from './EditGuardianModal';

// ─── Transport Info Modal ──────────────────────────────────────────────────────
const TransportModal = ({ student, onClose, onSaved }) => {
  const transport = student?.transport || {};
  const [usesBus, setUsesBus] = useState(transport.usesBus || false);
  const [selectedBusId, setSelectedBusId] = useState(transport.bus?._id || transport.bus || '');
  const [selectedStop, setSelectedStop] = useState(transport.stop || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: buses = [], isLoading: busesLoading } = useQuery({
    queryKey: ['busesList'],
    queryFn: async () => {
      const res = await api.get('/transport/buses');
      return res.data?.data || [];
    },
    staleTime: 60_000,
  });

  const selectedBus = buses.find((b) => b._id === selectedBusId);
  const stops = selectedBus?.route?.stops
    ? [...selectedBus.route.stops].sort((a, b) => a.order - b.order)
    : [];

  useEffect(() => {
    if (!selectedBusId) { setSelectedStop(''); return; }
    const bus = buses.find((b) => b._id === selectedBusId);
    const stopNames = (bus?.route?.stops || []).map((s) => s.name);
    if (selectedStop && !stopNames.includes(selectedStop)) setSelectedStop('');
  }, [selectedBusId, buses]);

  const handleSave = async () => {
    setError('');
    if (usesBus && !selectedBusId) { setError('Please select a bus.'); return; }
    if (usesBus && !selectedStop) { setError('Please select a stop.'); return; }
    setSaving(true);
    try {
      await api.patch(`/students/${student._id}`, {
        transport: { usesBus, bus: usesBus ? selectedBusId : null, stop: usesBus ? selectedStop : '' },
      });
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save transport info.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <Bus size={18} className="text-emerald-600" />
            <h3 className="font-bold text-base">Update Transport Info</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p className="text-sm font-semibold text-slate-800">Uses School Bus</p>
              <p className="text-xs text-slate-500 mt-0.5">Enable if student requires transport</p>
            </div>
            <button
              type="button"
              onClick={() => setUsesBus((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${usesBus ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${usesBus ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {usesBus && (
            <>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assigned Bus</label>
                {busesLoading ? (
                  <div className="h-10 bg-slate-100 animate-pulse rounded-lg" />
                ) : (
                  <select
                    value={selectedBusId}
                    onChange={(e) => setSelectedBusId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 bg-white"
                  >
                    <option value="">-- Select a bus --</option>
                    {buses.map((b) => (
                      <option key={b._id} value={b._id}>{b.plateNumber}{b.route ? ` · ${b.route.name}` : ''}</option>
                    ))}
                  </select>
                )}
              </div>

              {selectedBusId && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <MapPin size={11} /> Pickup / Drop-off Stop
                  </label>
                  {stops.length > 0 ? (
                    <select
                      value={selectedStop}
                      onChange={(e) => setSelectedStop(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 bg-white"
                    >
                      <option value="">-- Select a stop --</option>
                      {stops.map((s) => (
                        <option key={s.name} value={s.name}>Stop {s.order}: {s.name}{s.approxPickupTime ? ` (${s.approxPickupTime})` : ''}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No stops defined for this bus's route.</p>
                  )}
                </div>
              )}
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
              <AlertCircle size={14} className="flex-shrink-0" />{error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
          >
            <Save size={14} />{saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Edit Profile Modal ────────────────────────────────────────────────────────
const EditProfileModal = ({ student, classes, onClose, onSaved }) => {
  const [form, setForm] = useState({
    firstName: student.firstName || '',
    lastName: student.lastName || '',
    otherNames: student.otherNames || '',
    gender: student.gender || 'male',
    dob: student.dob ? new Date(student.dob).toISOString().slice(0, 10) : '',
    currentClass: student.currentClass?._id || student.currentClass || '',
    medicalNotes: student.medicalNotes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    setError('');
    if (!form.firstName.trim()) { setError('First name is required.'); return; }
    if (!form.lastName.trim()) { setError('Last name is required.'); return; }
    if (!form.dob) { setError('Date of birth is required.'); return; }
    setSaving(true);
    try {
      await api.patch(`/students/${student._id}`, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        otherNames: form.otherNames.trim(),
        gender: form.gender,
        dob: form.dob,
        currentClass: form.currentClass || null,
        medicalNotes: form.medicalNotes.trim(),
      });
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'mt-1.5 block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 bg-white';
  const labelCls = 'block text-[11px] font-bold text-slate-500 uppercase tracking-wider';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <Pencil size={18} className="text-emerald-600" />
            <h3 className="font-bold text-base">Edit Student Profile</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>First Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.firstName} onChange={set('firstName')} className={inputCls} placeholder="e.g. Alhassan" />
            </div>
            <div>
              <label className={labelCls}>Last Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.lastName} onChange={set('lastName')} className={inputCls} placeholder="e.g. Bawumia" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Other Names</label>
            <input type="text" value={form.otherNames} onChange={set('otherNames')} className={inputCls} placeholder="Middle / other names (optional)" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Gender <span className="text-red-500">*</span></label>
              <select value={form.gender} onChange={set('gender')} className={inputCls}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Date of Birth <span className="text-red-500">*</span></label>
              <input type="date" value={form.dob} onChange={set('dob')} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Current Class</label>
            <select value={form.currentClass} onChange={set('currentClass')} className={inputCls}>
              <option value="">— Unassigned —</option>
              {(classes || []).map((cls) => (
                <option key={cls._id} value={cls._id}>{cls.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Medical Notes</label>
            <textarea
              value={form.medicalNotes}
              onChange={set('medicalNotes')}
              rows={3}
              placeholder="Any relevant medical information for staff awareness…"
              className="mt-1.5 block w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 bg-white resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
              <AlertCircle size={14} className="flex-shrink-0" />{error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
          >
            <Save size={14} />{saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main StudentProfilePage ───────────────────────────────────────────────────
const StudentProfilePage = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFeeConfigModal, setShowFeeConfigModal] = useState(false);
  const [downloadingReportCard, setDownloadingReportCard] = useState(false);
  const [selectedGuardianToEdit, setSelectedGuardianToEdit] = useState(null);

  const handleDownloadReportCard = async () => {
    setDownloadingReportCard(true);
    try {
      const yrRes = await api.get('/academic-years');
      const yearsList = yrRes.data?.data || [];
      const currentYr = yearsList.find(y => y.isCurrent)?.name || '2025/2026';

      const response = await api.get(`/grades/student/${id}/report-card/pdf`, {
        params: { academicYear: currentYr, term: '1' },
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      const safeName = `${student?.firstName || 'Student'}_${student?.lastName || ''}`.replace(/\s+/g, '_');
      link.download = `ReportCard_${student?.admissionNumber || safeName}.pdf`;
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error(err);
      alert('Failed to download report card. Please ensure grades have been entered for this student.');
    } finally {
      setDownloadingReportCard(false);
    }
  };

  const { data: student, isLoading, error } = useQuery({
    queryKey: ['studentProfile', id],
    queryFn: async () => {
      const res = await api.get(`/students/${id}`);
      return res.data?.data;
    },
  });

  // Fetch all classes for the class-change dropdown in EditProfileModal
  const { data: classes = [] } = useQuery({
    queryKey: ['classesList'],
    queryFn: async () => (await api.get('/classes')).data?.data || [],
    staleTime: 60_000,
  });

  const { data: attendanceSummary } = useQuery({
    queryKey: ['studentAttendanceSummary', id],
    queryFn: async () => {
      const res = await api.get(`/attendance/student/${id}/summary`);
      return res.data?.data?.summary;
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => await api.post(`/students/${id}/withdraw`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['studentProfile', id] }); },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto animate-pulse">
        <div className="h-32 bg-white rounded-2xl border border-slate-200"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-white rounded-2xl border border-slate-200 md:col-span-2"></div>
          <div className="h-64 bg-white rounded-2xl border border-slate-200"></div>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 max-w-4xl mx-auto">
        <h4 className="font-bold text-lg">Error loading student profile</h4>
        <p className="text-sm mt-1">{error?.message || 'Student not found'}</p>
      </div>
    );
  }

  const {
    admissionNumber, firstName, lastName, otherNames, gender, dob,
    currentClass, guardians, enrollmentDate, status, medicalNotes, transport,
  } = student;

  const handleWithdraw = () => {
    if (window.confirm(`Are you sure you want to withdraw ${firstName} ${lastName}?`)) {
      withdrawMutation.mutate();
    }
  };

  const getStatusBadge = (s) => {
    switch (s) {
      case 'active':    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'withdrawn': return 'bg-red-100 text-red-800 border-red-200';
      case 'graduated': return 'bg-blue-100 text-blue-800 border-blue-200';
      default:          return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const isAdmin = ['superadmin', 'admin'].includes(user?.role);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Fee Config Modal */}
      {showFeeConfigModal && (
        <DailyFeeConfigModal
          student={student}
          onClose={() => setShowFeeConfigModal(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['studentProfile', id] });
            setShowFeeConfigModal(false);
          }}
        />
      )}
      {showTransportModal && (
        <TransportModal
          student={student}
          onClose={() => setShowTransportModal(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['studentProfile', id] });
            setShowTransportModal(false);
          }}
        />
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal
          student={student}
          classes={classes}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['studentProfile', id] });
            queryClient.invalidateQueries({ queryKey: ['students'] });
            setShowEditModal(false);
          }}
        />
      )}

      <div className="flex items-center space-x-3">
        <Link to="/students" className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Student Profile</h2>
          <p className="text-sm text-slate-500 mt-1">Detailed records and compliance checks</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-400 overflow-hidden">
            {student?.photoUrl ? (
              <img
                src={student.photoUrl}
                alt="Student"
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <User size={32} />
            )}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">
              {firstName} {otherNames ? `${otherNames} ` : ''}{lastName}
            </h3>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="inline-flex font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/50">
                {admissionNumber}
              </span>
              <span className="inline-flex text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-100">
                {currentClass?.name || 'Unassigned'}
              </span>
              <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded border capitalize ${getStatusBadge(status)}`}>
                {status}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDownloadReportCard}
            disabled={downloadingReportCard}
            className="flex items-center justify-center space-x-1.5 py-2 px-4 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs shadow-sm transition-colors cursor-pointer disabled:opacity-60"
          >
            {downloadingReportCard ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
            <span>Report Card (PDF)</span>
          </button>
          {isAdmin && (
            <button
              id="edit-profile-btn"
              onClick={() => setShowEditModal(true)}
              className="flex items-center justify-center space-x-1.5 py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-sm transition-colors cursor-pointer"
            >
              <Pencil size={14} />
              <span>Edit Profile</span>
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowTransportModal(true)}
              className="flex items-center justify-center space-x-1.5 py-2 px-4 rounded-xl border border-emerald-200 hover:bg-emerald-50 text-emerald-700 font-bold text-xs shadow-sm transition-colors cursor-pointer"
            >
              <Bus size={14} />
              <span>Update Transport Info</span>
            </button>
          )}
          {status === 'active' && isAdmin && (
            <button
              onClick={handleWithdraw}
              disabled={withdrawMutation.isPending}
              className="flex items-center justify-center space-x-1.5 py-2 px-4 rounded-xl border border-red-200 hover:bg-red-50 text-red-700 font-bold text-xs shadow-sm transition-colors cursor-pointer"
            >
              <Ban size={14} />
              <span>Withdraw Student</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Student Personal Details</h4>
              {isAdmin && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors flex items-center gap-1"
                >
                  <Pencil size={12} /> Edit
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Gender</span>
                <span className="text-slate-800 font-semibold capitalize">{gender}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Date of Birth</span>
                <span className="text-slate-800 font-semibold">{new Date(dob).toLocaleDateString('en-GB')}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Admission Date</span>
                <span className="text-slate-800 font-semibold">{new Date(enrollmentDate).toLocaleDateString('en-GB')}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Bus Services</span>
                <span className="text-slate-800 font-semibold">
                  {transport?.usesBus
                    ? `Uses Bus · ${transport.bus?.plateNumber || ''} (Stop: ${transport.stop})`
                    : 'Does not use bus'}
                </span>
              </div>
            </div>
            {medicalNotes && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <span className="text-amber-800 font-bold text-xs uppercase">Medical Notes</span>
                <p className="text-slate-700 text-xs mt-1 leading-relaxed">{medicalNotes}</p>
              </div>
            )}
          </div>

          {/* Fee Collection Configuration Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Fee Collection Configuration</h4>
              </div>
              {['superadmin', 'admin', 'teacher', 'system_admin'].includes(user?.role) && (
                <button
                  onClick={() => setShowFeeConfigModal(true)}
                  className="text-xs font-semibold text-emerald-700 hover:bg-emerald-50 px-3 py-1 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Pencil size={12} /> Configure Plan
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Collection Plan Category</span>
                <span className="text-slate-900 font-extrabold capitalize text-xs">
                  {student?.dailyFeeConfig?.planType === 'feeding_weekly_bus_daily' ? 'Feeding Weekly (20 GHS/wk) + Bus Daily (5 GHS/day)' :
                   student?.dailyFeeConfig?.planType === 'feeding_only_daily' ? 'Feeding Fee Only (Daily)' :
                   student?.dailyFeeConfig?.planType === 'bus_only_daily' ? 'Transport Bus Fee Only (Daily)' :
                   student?.dailyFeeConfig?.planType === 'feeding_weekly_only' ? 'Feeding Fee Weekly Only (20 GHS/wk)' :
                   student?.dailyFeeConfig?.planType === 'both_weekly' ? 'Both Feeding & Bus (Weekly)' :
                   student?.dailyFeeConfig?.planType === 'exempt' ? 'Fee Exempt' :
                   'Both Feeding & Bus Fee (Daily)'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Feeding Fee</span>
                <span className="text-slate-800 font-bold text-xs capitalize">
                  {student?.dailyFeeConfig?.feedingPlan === 'weekly' ? `Weekly (${student?.dailyFeeConfig?.feedingWeeklyAmount || 20} GHS/week)` :
                   student?.dailyFeeConfig?.feedingPlan === 'exempt' ? 'Exempt' : 'Daily (Standard 4.00 GHS)'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Transport Bus Fee</span>
                <span className="text-slate-800 font-bold text-xs capitalize">
                  {student?.dailyFeeConfig?.busPlan === 'weekly' ? `Weekly (${student?.dailyFeeConfig?.busWeeklyAmount || 25} GHS/week)` :
                   student?.dailyFeeConfig?.busPlan === 'none' ? 'None (Walks)' : 'Daily Fee (Standard 5.00 GHS)'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Rate Overrides</span>
                <span className="text-slate-800 font-semibold text-xs">
                  {student?.dailyFeeConfig?.customFeedingRate ? `Feed: ${student.dailyFeeConfig.customFeedingRate} GHS ` : ''}
                  {student?.dailyFeeConfig?.customBusRate ? `Bus: ${student.dailyFeeConfig.customBusRate} GHS` : ''}
                  {!student?.dailyFeeConfig?.customFeedingRate && !student?.dailyFeeConfig?.customBusRate ? 'Standard School Rates' : ''}
                </span>
              </div>
            </div>

            {student?.dailyFeeConfig?.notes && (
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700">
                <span className="font-bold text-slate-500 uppercase text-[10px] block mb-0.5">Special Fee Instructions:</span>
                {student.dailyFeeConfig.notes}
              </div>
            )}
          </div>

          {/* Transport Details Card */}
          {transport?.usesBus && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Transport Details</h4>
                {isAdmin && (
                  <button onClick={() => setShowTransportModal(true)} className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors">
                    Edit
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Bus Plate</span>
                  <span className="text-slate-800 font-semibold font-mono">{transport.bus?.plateNumber || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Route</span>
                  <span className="text-slate-800 font-semibold">{transport.bus?.route?.name || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Stop</span>
                  <span className="text-slate-800 font-semibold flex items-center gap-1">
                    <MapPin size={12} className="text-emerald-600" />{transport.stop || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Pickup Time</span>
                  <span className="text-slate-800 font-semibold">{transport.bus?.route?.pickupTime || '07:00 AM'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Guardian &amp; Contact Details
              </h4>
            </div>
            {guardians && guardians.length > 0 ? (
              guardians.map((guardian, i) => (
                <div key={guardian._id} className="space-y-4">
                  {i > 0 && <div className="border-t border-slate-100 pt-4"></div>}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Guardian #{i + 1}</span>
                    {isAdmin && (
                      <button
                        onClick={() => setSelectedGuardianToEdit(guardian)}
                        className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                      >
                        <Pencil size={12} />
                        <span>Edit Guardian Profile</span>
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Name</span>
                      <span className="text-slate-800 font-semibold">{guardian.firstName} {guardian.lastName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Relationship</span>
                      <span className="text-slate-800 font-semibold capitalize">{guardian.relationship}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Phone</span>
                      <a href={`tel:${guardian.phone}`} className="text-emerald-700 font-bold hover:underline inline-flex items-center space-x-1">
                        <Phone size={12} />
                        <span>{guardian.phone}</span>
                      </a>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Momo Billing</span>
                      <span className="text-slate-800 font-semibold font-mono">
                        {guardian.momoNumber ? `${guardian.momoNumber} (${guardian.momoProvider})` : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-800 text-xs font-sans">
                    {guardian.consentDataProcessing?.granted ? (
                      <>
                        <CheckCircle size={14} className="flex-shrink-0" />
                        <span>Data Processing Consent Granted (Act 843 compliant)</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={14} className="flex-shrink-0 text-red-600" />
                        <span className="text-red-700">Consent pending or not recorded</span>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">No linked guardians found.</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">
              Attendance Summary
            </h4>
            {attendanceSummary ? (
              <div className="space-y-4 text-center">
                <div className="inline-flex items-center justify-center h-24 w-24 rounded-full border-4 border-emerald-100 bg-emerald-50">
                  <div>
                    <span className="text-2xl font-black text-emerald-800">{attendanceSummary.rate}%</span>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Rate</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-lg border border-emerald-100">
                    <p className="text-slate-400 font-semibold uppercase tracking-wide text-[9px]">Present</p>
                    <p className="text-sm font-bold mt-0.5">{attendanceSummary.present ?? 0}</p>
                  </div>
                  <div className="bg-red-50 text-red-800 p-2.5 rounded-lg border border-red-100">
                    <p className="text-slate-400 font-semibold uppercase tracking-wide text-[9px]">Absent</p>
                    <p className="text-sm font-bold mt-0.5">{attendanceSummary.absent ?? 0}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No attendance history available.</p>
            )}
          </div>
        </div>
      </div>

      <EditGuardianModal
        isOpen={!!selectedGuardianToEdit}
        guardian={selectedGuardianToEdit}
        studentId={id}
        onClose={() => setSelectedGuardianToEdit(null)}
      />
    </div>
  );
};

export default StudentProfilePage;
