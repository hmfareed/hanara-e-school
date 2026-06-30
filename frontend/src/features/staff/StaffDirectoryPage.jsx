import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Search, Plus, Edit, ChevronLeft, ChevronRight,
  KeyRound, RefreshCw, CheckCircle2, XCircle, Clock,
  Copy, Check, Users, UserCheck, AlertTriangle,
} from 'lucide-react';

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

/* ─── Waitlist Panel ─── */
const WaitlistPanel = () => {
  const queryClient = useQueryClient();

  const { data: waitlistData, isLoading } = useQuery({
    queryKey: ['staffWaitlist'],
    queryFn: async () => {
      const res = await api.get('/staff/waitlist');
      return res.data?.data || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: (userId) => api.post(`/staff/waitlist/${userId}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffWaitlist'] });
      queryClient.invalidateQueries({ queryKey: ['staffList'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (userId) => api.post(`/staff/waitlist/${userId}/reject`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staffWaitlist'] }),
  });

  const pending = waitlistData || [];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center space-x-3">
        <div className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
          <Clock size={15} className="text-amber-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Registration Waitlist</h3>
          <p className="text-xs text-slate-500">Staff who have registered and are awaiting your approval</p>
        </div>
        {pending.length > 0 && (
          <span className="ml-auto bg-amber-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
            {pending.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="p-10 flex flex-col items-center justify-center space-y-3">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-emerald-800 border-t-transparent" />
          <p className="text-xs text-slate-400">Loading waitlist…</p>
        </div>
      ) : pending.length === 0 ? (
        <div className="p-10 text-center">
          <UserCheck size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-400">No pending registrations</p>
          <p className="text-xs text-slate-300 mt-1">All caught up! No staff are waiting for approval.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {pending.map((user) => {
            const staff = user.refStaff || {};
            const isApproving = approveMutation.isPending && approveMutation.variables === user._id;
            const isRejecting = rejectMutation.isPending && rejectMutation.variables === user._id;

            return (
              <div key={user._id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {(staff.firstName?.[0] || '?').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {staff.firstName} {staff.lastName}
                    </p>
                    <p className="text-xs text-slate-500 font-mono">{user.email}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="inline-block px-2 py-0.5 rounded border text-[10px] font-semibold capitalize bg-amber-50 text-amber-700 border-amber-200">
                        {staff.role || user.role}
                      </span>
                      {staff.qualification && (
                        <span className="text-[10px] text-slate-400">{staff.qualification}</span>
                      )}
                    </div>
                    {staff.role === 'teacher' && staff.classesAssigned && staff.classesAssigned.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1 items-center">
                        <span className="text-[10px] text-slate-500 font-semibold mr-1">Requested Classes:</span>
                        {staff.classesAssigned.map((c) => (
                          <span key={c._id || c} className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-750 rounded text-[10px] font-medium">
                            {c.name || c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 sm:flex-shrink-0">
                  <button
                    onClick={() => approveMutation.mutate(user._id)}
                    disabled={isApproving || isRejecting}
                    className="flex items-center space-x-1.5 py-2 px-3.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                  >
                    {isApproving
                      ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      : <CheckCircle2 size={13} />}
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate(user._id)}
                    disabled={isApproving || isRejecting}
                    className="flex items-center space-x-1.5 py-2 px-3.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 disabled:opacity-50 text-red-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    {isRejecting
                      ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                      : <XCircle size={13} />}
                    <span>Reject</span>
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

const TABS = [
  { id: 'directory', label: 'Staff Directory', Icon: Users },
  { id: 'waitlist',  label: 'Waitlist',         Icon: Clock  },
];

const StaffDirectoryPage = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';

  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const [activeTab, setActiveTab] = useState('directory');
  const limit = 10;

  const { data: staffData, isLoading, error } = useQuery({
    queryKey: ['staffList', search, page],
    queryFn: async () => {
      const params = { page, limit };
      if (search) params.search = search;
      const res = await api.get('/staff', { params });
      return res.data;
    },
    enabled: activeTab === 'directory',
  });

  // Live waitlist count badge in tab
  const { data: waitlistData } = useQuery({
    queryKey: ['staffWaitlist'],
    queryFn: async () => {
      const res = await api.get('/staff/waitlist');
      return res.data?.data || [];
    },
    enabled: isSuperAdmin,
  });
  const waitlistCount = waitlistData?.length || 0;

  const staffList = staffData?.data || [];
  const meta = staffData?.meta || {};

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'teacher':    return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'accountant': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'driver':     return 'bg-blue-100 text-blue-800 border-blue-200';
      default:           return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

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

      {/* ── Registration Code Panel (superadmin only) ── */}
      {isSuperAdmin && <RegistrationCodePanel />}

      {/* ── Tabs (superadmin only sees waitlist tab) ── */}
      {isSuperAdmin && (
        <div className="flex items-center space-x-1 bg-slate-100 rounded-xl p-1 w-fit">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center space-x-2 py-2 px-4 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === id
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={14} />
              <span>{label}</span>
              {id === 'waitlist' && waitlistCount > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {waitlistCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Waitlist Tab ── */}
      {activeTab === 'waitlist' && isSuperAdmin && <WaitlistPanel />}

      {/* ── Directory Tab ── */}
      {activeTab === 'directory' && (
        <>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="relative max-w-md">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff by name or email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800"
              />
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
                        <th className="py-4 px-6">Contact Info</th>
                        <th className="py-4 px-6">Status</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {staffList.length > 0 ? (
                        staffList.map((member) => (
                          <tr key={member._id} className="hover:bg-slate-50/50">
                            <td className="py-4 px-6 font-medium text-slate-900 font-sans">
                              {member.firstName} {member.otherNames ? `${member.otherNames} ` : ''} {member.lastName}
                            </td>
                            <td className="py-4 px-6 capitalize">
                              <span className={`inline-block px-2.5 py-0.5 rounded border text-xs font-medium ${getRoleBadge(member.role)}`}>
                                {member.role}
                              </span>
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
                              <Link
                                to={`/staff/edit/${member._id}`}
                                className="inline-flex items-center space-x-1 py-1.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 font-semibold text-xs text-slate-600 transition-colors"
                              >
                                <Edit size={12} />
                                <span>Edit</span>
                              </Link>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="py-12 text-center text-sm text-slate-400">
                            No staff members found matching search query.
                          </td>
                        </tr>
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
        </>
      )}
    </div>
  );
};

export default StaffDirectoryPage;
