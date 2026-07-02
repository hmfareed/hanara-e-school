import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft, User, Phone, CheckCircle, AlertCircle, Ban, Bus, X, Save, MapPin,
} from 'lucide-react';

// ─── Transport Info Modal ──────────────────────────────────────────────────────
const TransportModal = ({ student, onClose, onSaved }) => {
  const transport = student?.transport || {};
  const [usesBus, setUsesBus] = useState(transport.usesBus || false);
  const [selectedBusId, setSelectedBusId] = useState(transport.bus?._id || transport.bus || '');
  const [selectedStop, setSelectedStop] = useState(transport.stop || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Fetch all buses (populated with route)
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

  // When bus selection changes, reset stop if current stop isn't in new bus's route
  useEffect(() => {
    if (!selectedBusId) {
      setSelectedStop('');
      return;
    }
    const bus = buses.find((b) => b._id === selectedBusId);
    const stopNames = (bus?.route?.stops || []).map((s) => s.name);
    if (selectedStop && !stopNames.includes(selectedStop)) {
      setSelectedStop('');
    }
  }, [selectedBusId, buses]);

  const handleSave = async () => {
    setError('');
    if (usesBus && !selectedBusId) {
      setError('Please select a bus.');
      return;
    }
    if (usesBus && !selectedStop) {
      setError('Please select a stop.');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/students/${student._id}`, {
        transport: {
          usesBus,
          bus: usesBus ? selectedBusId : null,
          stop: usesBus ? selectedStop : '',
        },
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
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <Bus size={18} className="text-emerald-600" />
            <h3 className="font-bold text-base">Update Transport Info</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Toggle: uses bus */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p className="text-sm font-semibold text-slate-800">Uses School Bus</p>
              <p className="text-xs text-slate-500 mt-0.5">Enable if student requires transport</p>
            </div>
            <button
              type="button"
              onClick={() => setUsesBus((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                usesBus ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                  usesBus ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {usesBus && (
            <>
              {/* Bus selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Assigned Bus
                </label>
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
                      <option key={b._id} value={b._id}>
                        {b.plateNumber}{b.route ? ` · ${b.route.name}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Stop selector */}
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
                        <option key={s.name} value={s.name}>
                          Stop {s.order}: {s.name}{s.approxPickupTime ? ` (${s.approxPickupTime})` : ''}
                        </option>
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
              <AlertCircle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
          >
            <Save size={14} />
            {saving ? 'Saving…' : 'Save Changes'}
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

  const { data: student, isLoading, error } = useQuery({
    queryKey: ['studentProfile', id],
    queryFn: async () => {
      const res = await api.get(`/students/${id}`);
      return res.data?.data;
    },
  });

  const { data: attendanceSummary } = useQuery({
    queryKey: ['studentAttendanceSummary', id],
    queryFn: async () => {
      const res = await api.get(`/attendance/student/${id}/summary`);
      return res.data?.data?.summary;
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      return await api.post(`/students/${id}/withdraw`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentProfile', id] });
    },
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
    admissionNumber,
    firstName,
    lastName,
    otherNames,
    gender,
    dob,
    currentClass,
    guardians,
    enrollmentDate,
    status,
    medicalNotes,
    transport,
  } = student;

  const handleWithdraw = () => {
    if (window.confirm(`Are you sure you want to withdraw ${firstName} ${lastName}?`)) {
      withdrawMutation.mutate();
    }
  };

  const getStatusBadge = (s) => {
    switch (s) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'withdrawn':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'graduated':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const isAdmin = ['superadmin', 'admin'].includes(user?.role);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Transport Modal */}
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
              <img src={student.photoUrl} alt="Student" className="h-full w-full object-cover" />
            ) : (
              <User size={32} />
            )}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">
              {firstName} {otherNames ? `${otherNames} ` : ''} {lastName}
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
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">
              Student Personal Details
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Gender</span>
                <span className="text-slate-800 font-semibold capitalize">{gender}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Date of Birth</span>
                <span className="text-slate-800 font-semibold">
                  {new Date(dob).toLocaleDateString('en-GB')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Admission Date</span>
                <span className="text-slate-800 font-semibold">
                  {new Date(enrollmentDate).toLocaleDateString('en-GB')}
                </span>
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

          {/* Transport Details Card */}
          {transport?.usesBus && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Transport Details</h4>
                {isAdmin && (
                  <button
                    onClick={() => setShowTransportModal(true)}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Bus Plate</span>
                  <span className="text-slate-800 font-semibold font-mono">
                    {transport.bus?.plateNumber || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Route</span>
                  <span className="text-slate-800 font-semibold">
                    {transport.bus?.route?.name || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Stop</span>
                  <span className="text-slate-800 font-semibold flex items-center gap-1">
                    <MapPin size={12} className="text-emerald-600" />
                    {transport.stop || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Pickup Time</span>
                  <span className="text-slate-800 font-semibold">
                    {transport.bus?.route?.pickupTime || '07:00 AM'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">
              Guardian & Contact Details
            </h4>
            {guardians && guardians.length > 0 ? (
              guardians.map((guardian, i) => (
                <div key={guardian._id} className="space-y-4">
                  {i > 0 && <div className="border-t border-slate-100 pt-4"></div>}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Name</span>
                      <span className="text-slate-800 font-semibold">
                        {guardian.firstName} {guardian.lastName}
                      </span>
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
                  <span className="text-2xl font-black text-emerald-850">
                    {attendanceSummary.attendanceRate !== null && attendanceSummary.attendanceRate !== undefined
                      ? `${attendanceSummary.attendanceRate}%`
                      : 'N/A'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-medium">
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
    </div>
  );
};

export default StudentProfilePage;
