import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  Users, UserPlus, Search, Power, Key, Loader2,
  CheckCircle2, XCircle, ShieldCheck,
} from 'lucide-react';

const ROLE_COLORS = {
  superadmin: 'bg-emerald-100 text-emerald-700',
  admin: 'bg-indigo-100 text-indigo-700',
  teacher: 'bg-amber-100 text-amber-700',
  accountant: 'bg-purple-100 text-purple-700',
  parent: 'bg-cyan-100 text-cyan-700',
  driver: 'bg-teal-100 text-teal-700',
  system_admin: 'bg-rose-100 text-rose-700',
};

const CreateUserModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    email: '',
    phone: '',
    password: '',
    role: 'teacher',
    secondaryCapacities: [],
    isSuperAdmin: false,
  });
  const [saving, setSaving] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/admin/users', form);
      setTempPassword(res.data.data?.tempPassword || '');
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  if (tempPassword) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
          <div className="flex items-center space-x-2 text-emerald-600">
            <CheckCircle2 size={24} />
            <h3 className="text-lg font-bold">Account Created!</h3>
          </div>
          <p className="text-sm text-slate-600">Share this one-time password with the user. They will be required to change it on first login.</p>
          <div className="bg-slate-900 rounded-xl px-4 py-3 font-mono text-emerald-400 text-center text-xl tracking-widest border border-slate-700">
            {tempPassword}
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Create New Account</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><XCircle size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Email *</label>
              <input required type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Phone</label>
              <input type="tel" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Role *</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="teacher">Teacher</option>
                <option value="accountant">Accountant</option>
                <option value="admin">Admin (Head Teacher)</option>
                <option value="parent">Parent</option>
                <option value="driver">Driver</option>
                <option value="system_admin">System Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Temp Password</label>
              <input type="text" placeholder="Auto-generated if empty" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          {form.role === 'system_admin' && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.secondaryCapacities.includes('teacher')}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      secondaryCapacities: e.target.checked ? ['teacher'] : [],
                    })
                  }
                  className="h-4 w-4 text-emerald-600 rounded"
                />
                <span>Also has teaching capacity (grants access to My Classes mode)</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isSuperAdmin}
                  onChange={(e) => setForm({ ...form, isSuperAdmin: e.target.checked })}
                  className="h-4 w-4 text-emerald-600 rounded"
                />
                <span>Super Admin (can create other system_admin accounts)</span>
              </label>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors disabled:opacity-60">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminUsersPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      return (await api.get(`/admin/users?${params}`)).data?.data || [];
    },
    debounce: 300,
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, isActive }) => api.patch(`/admin/users/${id}/status`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const resetPassword = useMutation({
    mutationFn: (id) => api.post(`/admin/users/${id}/reset-password`),
    onSuccess: (res) => {
      alert(`Temporary password: ${res.data.data.tempPassword}`);
    },
  });

  return (
    <div className="space-y-6">
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            setShowCreate(false);
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-rose-600 rounded-xl flex items-center justify-center">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">User & Access Management</h1>
            <p className="text-sm text-slate-500">Create, activate, deactivate, and manage all user accounts</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <UserPlus size={15} />
          <span>New Account</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by email or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Roles</option>
          <option value="system_admin">System Admin</option>
          <option value="admin">Admin (Head Teacher)</option>
          <option value="teacher">Teacher</option>
          <option value="accountant">Accountant</option>
          <option value="parent">Parent</option>
          <option value="driver">Driver</option>
        </select>
      </div>

      {/* User Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Last Login</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {[1, 2, 3, 4, 5].map((j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 bg-slate-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : users.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-semibold text-slate-800">{u.email}</p>
                          {u.phone && <p className="text-xs text-slate-400">{u.phone}</p>}
                          {u.isSuperAdmin && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                              <ShieldCheck size={10} /> Super Admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${ROLE_COLORS[u.role] || 'bg-slate-100 text-slate-600'}`}>
                          {u.role}
                        </span>
                        {u.secondaryCapacities?.length > 0 && (
                          <span className="ml-1 text-[10px] text-slate-400 capitalize">+ {u.secondaryCapacities.join(', ')}</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-500 hidden md:table-cell">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-5 py-4">
                        {u.isActive ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                            <CheckCircle2 size={13} /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-bold text-red-600">
                            <XCircle size={13} /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleStatus.mutate({ id: u._id, isActive: !u.isActive })}
                            className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${
                              u.isActive
                                ? 'border-red-200 text-red-600 hover:bg-red-50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={u.isActive ? 'Deactivate' : 'Activate'}
                          >
                            <Power size={12} />
                            <span>{u.isActive ? 'Deactivate' : 'Activate'}</span>
                          </button>
                          <button
                            onClick={() => resetPassword.mutate(u._id)}
                            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                            title="Reset Password"
                          >
                            <Key size={12} />
                            <span className="hidden sm:inline">Reset PW</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminUsersPage;
