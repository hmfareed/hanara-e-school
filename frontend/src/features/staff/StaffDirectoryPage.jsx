import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Skeleton from '../../components/Skeleton';
import {
  Search, Plus, Edit, ChevronLeft, ChevronRight,
  KeyRound, RefreshCw, CheckCircle2, XCircle, Clock,
  Copy, Check, Users, UserCheck, AlertTriangle, Trash2, QrCode,
} from 'lucide-react';
import StaffQrModal from '../attendance/StaffQrModal';

/* ─── small helper: copy to clipboard ─── */
const useCopy = () => {
  const [copied, setCopied] = useState(false);
  const copy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return { copied, copy };
};

/* ─── Registration Code Banner ─── */
const RegistrationCodePanel = () => {
  const queryClient = useQueryClient();
  const { copied, copy } = useCopy();

  const { data: codeData, isLoading: codeLoading } = useQuery({
    queryKey: ['registrationCode'],
    queryFn: async () => {
      const res = await api.get('/staff/registration-code');
      return res.data;
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => api.post('/staff/registration-code'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['registrationCode'] }),
  });

  const activeCode = codeData?.data?.code || null;
  const isGenerating = generateMutation.isPending;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
            <KeyRound size={18} className="text-emerald-700" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Staff Registration Code</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Share this code with new staff so they can register. The code remains active and can be used by multiple staff members until a new one is generated.
            </p>
          </div>
        </div>

        <button
          onClick={() => generateMutation.mutate()}
          disabled={isGenerating}
          className="flex items-center space-x-2 py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-bold text-sm shadow-sm transition-colors cursor-pointer flex-shrink-0"
        >
          {isGenerating
            ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            : <RefreshCw size={14} />}
          <span>{activeCode ? 'Regenerate Code' : 'Generate Code'}</span>
        </button>
      </div>

      {codeLoading ? (
        <div className="mt-4 flex items-center space-x-2 text-xs text-slate-400">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
          <span>Loading current code…</span>
        </div>
      ) : activeCode ? (
        <div className="mt-4 flex items-center space-x-3">
          <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3">
            <span className="font-mono text-3xl font-extrabold tracking-[0.35em] text-emerald-800 select-all">
              {activeCode}
            </span>
          </div>
          <button
            onClick={() => copy(activeCode)}
            title="Copy code"
            className="h-11 w-11 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={15} />}
          </button>
          <span className="text-xs text-slate-400">
            {copied ? 'Copied!' : 'Click to copy'}
          </span>
        </div>
      ) : (
        <div className="mt-4 flex items-center space-x-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle size={14} className="flex-shrink-0" />
          <span>No active registration code. Generate one to allow new staff to register.</span>
        </div>
      )}

      {generateMutation.isError && (
        <p className="mt-2 text-xs text-red-600">
          {generateMutation.error?.response?.data?.message || 'Failed to generate code.'}
        </p>
      )}
    </div>
  );
};

/* ─── Pending Staff Approvals / Waitlist Panel ─── */
const StaffWaitlistPanel = () => {
  const queryClient = useQueryClient();
  const [notification, setNotification] = useState({ text: '', type: '' });

  const { data: waitlistData, isLoading } = useQuery({
    queryKey: ['staffWaitlist'],
    queryFn: async () => {
      const res = await api.get('/staff/waitlist');
      return res.data?.data || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: (userId) => api.post(`/staff/waitlist/${userId}/approve`),
    onSuccess: (res) => {
      setNotification({ text: res.data?.message || 'Staff approved successfully!', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['staffWaitlist'] });
      queryClient.invalidateQueries({ queryKey: ['staffList'] });
      setTimeout(() => setNotification({ text: '', type: '' }), 4000);
    },
    onError: (err) => {
      setNotification({ text: err.response?.data?.message || 'Failed to approve staff.', type: 'error' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (userId) => api.post(`/staff/waitlist/${userId}/reject`),
    onSuccess: (res) => {
      setNotification({ text: res.data?.message || 'Registration rejected.', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['staffWaitlist'] });
      queryClient.invalidateQueries({ queryKey: ['staffList'] });
      setTimeout(() => setNotification({ text: '', type: '' }), 4000);
    },
    onError: (err) => {
      setNotification({ text: err.response?.data?.message || 'Failed to reject registration.', type: 'error' });
    },
  });

  const waitlist = waitlistData || [];
  if (!isLoading && waitlist.length === 0) return null;

  return (
    <div className="bg-amber-50/70 border-2 border-amber-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-start space-x-3">
          <div className="h-10 w-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center flex-shrink-0">
            <Clock size={20} className="text-amber-800 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-amber-950 uppercase tracking-wide">
                Pending Staff Registrations (Waitlist)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500 text-white shadow-xs">
                {waitlist.length} {waitlist.length === 1 ? 'Applicant' : 'Applicants'}
              </span>
            </div>
            <p className="text-xs text-amber-800/80 mt-0.5">
              Review and approve newly registered staff accounts before granting system access and subject assignments.
            </p>
          </div>
        </div>
      </div>

      {notification.text && (
        <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {notification.text}
        </div>
      )}

      {isLoading ? (
        <div className="p-4 flex items-center justify-center space-x-2 text-xs text-amber-800 font-semibold">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-700 border-t-transparent" />
          <span>Loading pending waitlist…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {waitlist.map((item) => {
            const staff = item.refStaff || {};
            const isActing = approveMutation.isPending || rejectMutation.isPending;
            return (
              <div key={item._id} className="bg-white border border-amber-200/80 rounded-xl p-4 shadow-xs flex flex-col justify-between space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="h-10 w-10 rounded-full bg-amber-100 border border-amber-200 flex-shrink-0 flex items-center justify-center text-amber-800 font-black text-sm">
                    {staff.firstName ? staff.firstName[0].toUpperCase() : item.email[0].toUpperCase()}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {staff.firstName ? `${staff.title ? staff.title + ' ' : ''}${staff.firstName} ${staff.lastName || ''}` : item.email}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono truncate">{item.email}</p>
                    {staff.phone && <p className="text-[11px] text-slate-400">{staff.phone}</p>}
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                      {staff.role || item.role}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => approveMutation.mutate(item._id)}
                    disabled={isActing}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 size={13} />
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Reject registration for ${staff.firstName || item.email}?`)) {
                        rejectMutation.mutate(item._id);
                      }
                    }}
                    disabled={isActing}
                    className="py-1.5 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <XCircle size={13} />
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════ */

const StaffDirectoryPage = () => {
  const { user } = useAuth();
  const isAdmin = ['superadmin', 'admin', 'system_admin'].includes(user?.role);
  const isSuperAdmin = ['superadmin', 'admin', 'system_admin'].includes(user?.role);

  const [search, setSearch] = useState('');
  const [colorSectionFilter, setColorSectionFilter] = useState('');
  const [page, setPage]     = useState(1);
  const limit = 10;

  const queryClient = useQueryClient();
  const [staffToFire, setStaffToFire] = useState(null);
  const [selectedStaffForQr, setSelectedStaffForQr] = useState(null);

  const fireMutation = useMutation({
    mutationFn: (id) => api.delete(`/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffList'] });
      setStaffToFire(null);
    },
  });

  const { data: staffData, isLoading, error } = useQuery({
    queryKey: ['staffList', search, colorSectionFilter, page],
    queryFn: async () => {
      const params = { page, limit };
      if (search) params.search = search;
      if (colorSectionFilter) params.colorSection = colorSectionFilter;
      const res = await api.get('/staff', { params });
      return res.data;
    },
  });

  const rawStaffList = staffData?.data || [];
  const staffList = rawStaffList.filter((s) => s && s.firstName && s.firstName.trim().length > 0);
  const meta = staffData?.meta || {};

  const getRoleBadge = (role) => {
    switch (role) {
      case 'superadmin':
      case 'headteacher': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'admin':      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'teacher':    return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'accountant': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'driver':     return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cleaner':    return 'bg-teal-100 text-teal-800 border-teal-200';
      default:           return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton.Line width="w-40" height="h-6" />
            <Skeleton.Line width="w-72" height="h-4" />
          </div>
          <Skeleton.Box w="w-40" h="h-10" rounded="rounded-xl" />
        </div>
        <div className="flex gap-3">
          <Skeleton.Box w="w-full" h="h-10" rounded="rounded-xl" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex gap-6">
            {[1, 2, 3, 4, 5].map(i => <Skeleton.Line key={i} width="w-20" height="h-3.5" />)}
          </div>
          {Array.from({ length: 10 }).map((_, i) => <Skeleton.TableRow key={i} cols={6} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Staff Directory</h2>
          <p className="text-sm text-slate-500 mt-1">Manage school employees, teachers, and system access</p>
        </div>
        <Link
          to="/staff/new"
          className="flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm shadow-sm transition-colors"
        >
          <Plus size={16} />
          <span>Add Staff Member</span>
        </Link>
      </div>

      {/* ── Registration Code Panel (superadmin, admin & system_admin) ── */}
      {isAdmin && <RegistrationCodePanel />}

      {/* ── Pending Staff Registrations / Waitlist Panel ── */}
      {isAdmin && <StaffWaitlistPanel />}

      {/* ── Directory ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search staff by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800"
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={colorSectionFilter}
            onChange={(e) => { setColorSectionFilter(e.target.value); setPage(1); }}
            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800"
          >
            <option value="">All Color Sections</option>
            <option value="Red">Red Section</option>
            <option value="Yellow">Yellow Section</option>
            <option value="Green">Green Section</option>
            <option value="Blue">Blue Section</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-800 border-t-transparent" />
            <p className="text-sm font-semibold text-slate-400">Loading staff directory...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-700 bg-red-50 border-b border-slate-200">
            <p className="font-bold text-base">Error loading staff list</p>
            <p className="text-sm mt-1">{error.message}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-4 px-6">Name</th>
                    <th className="py-4 px-6">Role</th>
                    <th className="py-4 px-6">Color Section</th>
                    <th className="py-4 px-6">Base Salary</th>
                    <th className="py-4 px-6">Contact Info</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffList.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-sm text-slate-400">
                        No staff members found matching search query.
                      </td>
                    </tr>
                  ) : (
                    staffList.map((member) => {
                      const colorSec = member.colorSection;
                      const secBadge = colorSec === 'Red'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : colorSec === 'Yellow'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : colorSec === 'Green'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : colorSec === 'Blue'
                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200';

                      const isSelfOrHead =
                        member._id === user?.refStaff ||
                        member._id === user?.refStaff?._id ||
                        member.role === 'superadmin';

                      return (
                        <tr key={member._id} className="hover:bg-slate-50/50">
                          <td className="py-4 px-6 font-medium text-slate-900 font-sans">
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center text-slate-400 overflow-hidden">
                                {member.photoUrl ? (
                                  <img
                                    src={member.photoUrl}
                                    alt="Avatar"
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <span className="text-xs font-bold font-sans text-slate-500">
                                    {(member.firstName?.[0] || 'T').toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <span>
                                {member.firstName} {member.otherNames ? `${member.otherNames} ` : ''} {member.lastName}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6 capitalize">
                            <span className={`inline-block px-2.5 py-0.5 rounded border text-xs font-medium ${getRoleBadge(member.role)}`}>
                              {member.role === 'superadmin' ? 'headteacher' : member.role}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            {colorSec ? (
                              <div className="flex flex-col gap-0.5">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border w-fit ${secBadge}`}>
                                  <span className={`w-2 h-2 rounded-full ${colorSec === 'Red' ? 'bg-red-500' : colorSec === 'Yellow' ? 'bg-amber-400' : colorSec === 'Green' ? 'bg-emerald-500' : 'bg-sky-500'}`} />
                                  {colorSec}
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold pl-1">
                                  {member.sectionRole || 'Patron'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">None</span>
                            )}
                          </td>
                          <td className="py-4 px-6 font-bold text-emerald-800 text-xs">
                            {(member.baseSalary || 0) > 0 ? `${(member.baseSalary).toFixed(2)} GHS` : 'Not Set (1,800)'}
                          </td>
                          <td className="py-4 px-6">
                            <p className="text-slate-800 font-mono text-xs">{member.phone}</p>
                            <p className="text-slate-400 text-xs truncate max-w-[200px]">{member.email}</p>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              member.employmentStatus === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {member.employmentStatus}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => setSelectedStaffForQr(member)}
                                className="inline-flex items-center space-x-1 py-1.5 px-3 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 font-semibold text-xs text-emerald-800 transition-colors cursor-pointer"
                                title="Staff QR Code Credential"
                              >
                                <QrCode size={12} />
                                <span>QR Pass</span>
                              </button>
                              <Link
                                to={`/staff/edit/${member._id}`}
                                className="inline-flex items-center space-x-1 py-1.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 font-semibold text-xs text-slate-600 transition-colors"
                              >
                                <Edit size={12} />
                                <span>Edit</span>
                              </Link>
                              {isSuperAdmin && (
                                <button
                                  onClick={() => setStaffToFire(member)}
                                  disabled={isSelfOrHead}
                                  title={
                                    (member._id === user?.refStaff || member._id === user?.refStaff?._id)
                                      ? "You cannot fire yourself"
                                      : member.role === 'superadmin'
                                      ? "Cannot fire the headteacher"
                                      : "Fire staff member"
                                  }
                                  className={`inline-flex items-center space-x-1 py-1.5 px-3 rounded-lg border font-semibold text-xs transition-colors cursor-pointer ${
                                    isSelfOrHead
                                      ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed opacity-50'
                                      : 'border-red-200 bg-white hover:bg-red-50 text-red-600 hover:border-red-300'
                                  }`}
                                >
                                  <Trash2 size={12} />
                                  <span>Fire</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                  </table>
                </div>

                {meta.pages > 1 && (
                  <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      Showing page {meta.page} of {meta.pages} ({meta.total} total staff)
                    </span>
                    <div className="flex space-x-2">
                      <button
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                        className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        disabled={page === meta.pages}
                        onClick={() => setPage(page + 1)}
                        className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

      {/* ── Confirmation Modal ── */}
      {staffToFire && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-start space-x-4">
              <div className="h-12 w-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">Fire Staff Member</h3>
                <p className="text-sm text-slate-500 mt-2 break-words">
                  Are you sure you want to fire <span className="font-semibold text-slate-800">{staffToFire.firstName} {staffToFire.lastName}</span>? This will permanently disable their login account and delete their staff record. This action cannot be undone.
                </p>
              </div>
            </div>
            
            {fireMutation.isError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-red-700 text-xs">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{fireMutation.error?.response?.data?.message || 'Failed to fire staff member.'}</span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                onClick={() => { setStaffToFire(null); fireMutation.reset(); }}
                disabled={fireMutation.isPending}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => fireMutation.mutate(staffToFire._id)}
                disabled={fireMutation.isPending}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {fireMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Sacking...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Fire Staff</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Staff QR Modal */}
      {selectedStaffForQr && (
        <StaffQrModal
          staff={selectedStaffForQr}
          isOpen={!!selectedStaffForQr}
          onClose={() => setSelectedStaffForQr(null)}
        />
      )}
    </div>
  );
};

export default StaffDirectoryPage;
