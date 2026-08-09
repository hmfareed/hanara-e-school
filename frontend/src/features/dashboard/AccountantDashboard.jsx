import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  GraduationCap,
  TrendingUp,
  Receipt,
  FileText,
  CreditCard,
  ClipboardList,
  Search,
  Filter,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  AlertCircle
} from 'lucide-react';

const GHS = (n) =>
  new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n ?? 0);

const STATUS_BADGES = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold',
  partial: 'bg-amber-50 text-amber-700 border-amber-200 font-semibold',
  unpaid: 'bg-slate-100 text-slate-600 border-slate-200 font-semibold',
};

const AccountantDashboard = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // 1. Fetch dashboard/summary
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['accountantSummary'],
    queryFn: async () => {
      const res = await api.get('/dashboard/summary');
      return res.data?.data;
    },
  });

  // 2. Fetch classes list for the dropdown filter
  const { data: classes } = useQuery({
    queryKey: ['classesList'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-20 bg-slate-200 rounded-2xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white border border-slate-200 rounded-2xl p-6"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 h-96"></div>
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 h-64"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700">
        <h4 className="font-bold text-lg">Error loading Accountant Dashboard</h4>
        <p className="text-sm mt-1">{error.message || 'Please check if the backend server is running.'}</p>
      </div>
    );
  }

  const { totalStudents, paidStudents, owingStudents, students = [] } = dashboardData || {};

  const getUserName = () => {
    if (user?.refStaff) {
      const title = user.refStaff.title ? `${user.refStaff.title} ` : '';
      return `${title}${user.refStaff.firstName}`.trim();
    }
    return user?.email ? user.email.split('@')[0] : 'Accountant';
  };

  // Filter students based on search query, class, and status
  const filteredStudents = students.filter((student) => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const searchMatch =
      fullName.includes(search.toLowerCase()) ||
      (student.admissionNumber && student.admissionNumber.toLowerCase().includes(search.toLowerCase()));

    const classMatch = !classFilter || student.currentClass?._id === classFilter;
    const statusMatch = !statusFilter || student.status === statusFilter;

    return searchMatch && classMatch && statusMatch;
  });

  // Client-side pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  const quickActions = [
    {
      name: 'Fee Structures',
      description: 'Define termly fees for classes',
      path: '/fees?tab=structures',
      icon: Receipt,
      bgColor: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    },
    {
      name: 'Generate Invoices',
      description: 'Issue bills to class lists',
      path: '/fees?tab=invoices',
      icon: FileText,
      bgColor: 'bg-indigo-50 border-indigo-100 text-indigo-700',
    },
    {
      name: 'Payment Records',
      description: 'Record manual or view transactions',
      path: '/fees?tab=payments',
      icon: CreditCard,
      bgColor: 'bg-amber-50 border-amber-100 text-amber-700',
    },
    {
      name: 'Daily Collections',
      description: 'Perform end-of-day reconciliation',
      path: '/fees?tab=daily',
      icon: ClipboardList,
      bgColor: 'bg-rose-50 border-rose-100 text-rose-700',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 pb-2 border-b border-slate-100">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
            Welcome back, {getUserName()}
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Monitor invoices, fee statuses, and school collections today.
          </p>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shadow-sm select-none">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </span>
        </div>
      </div>

      {/* KPI stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Active Students */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-150 hover:-translate-y-0.5">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Students</span>
            <h3 className="text-3xl font-extrabold text-slate-900">{totalStudents ?? 0}</h3>
            <span className="text-[10px] text-slate-400 block mt-1">Currently enrolled</span>
          </div>
          <div className="h-12 w-12 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-700 shadow-inner">
            <GraduationCap size={24} />
          </div>
        </div>

        {/* Fully Paid Students */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-150 hover:-translate-y-0.5">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fully Paid</span>
            <h3 className="text-3xl font-extrabold text-emerald-600">{paidStudents ?? 0}</h3>
            <span className="text-[10px] text-slate-400 block mt-1">Students with zero balance</span>
          </div>
          <div className="h-12 w-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 shadow-inner">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Owing Students */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-150 hover:-translate-y-0.5">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Owing Fees</span>
            <h3 className="text-3xl font-extrabold text-rose-600">{owingStudents ?? 0}</h3>
            <span className="text-[10px] text-slate-400 block mt-1">Outstanding invoice balances</span>
          </div>
          <div className="h-12 w-12 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center text-rose-700 shadow-inner">
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      {/* Main Sections: Student List & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Student Fee Tracker List */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-3 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Student Fee Registry</h3>
              <p className="text-xs text-slate-500 mt-0.5">Overview of individual student term balances</p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or adm #..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
              />
            </div>

            <div className="relative">
              <select
                value={classFilter}
                onChange={(e) => {
                  setClassFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 appearance-none"
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.name}
                  </option>
                ))}
              </select>
              <Filter size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-slate-800 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 appearance-none"
              >
                <option value="">All Fee Statuses</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="unpaid">Unpaid</option>
              </select>
              <Filter size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Student Fees Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead>
                <tr className="text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-2">Class</th>
                  <th className="py-3 px-2 text-right">Invoiced</th>
                  <th className="py-3 px-2 text-right">Paid</th>
                  <th className="py-3 px-2 text-right">Balance</th>
                  <th className="py-3 px-2 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedStudents.length > 0 ? (
                  paginatedStudents.map((student) => (
                    <tr key={student._id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-medium text-slate-900">
                        <div>
                          <p className="font-bold text-slate-800">
                            {student.firstName} {student.lastName}
                          </p>
                          <span className="text-[10px] font-mono text-slate-400">
                            {student.admissionNumber}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200/50">
                          {student.currentClass?.name || 'Unassigned'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-slate-700">
                        {GHS(student.amountDue)}
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-emerald-600">
                        {GHS(student.amountPaid)}
                      </td>
                      <td className={`py-3 px-2 text-right font-bold ${student.balance > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                        {GHS(student.balance)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full border capitalize ${STATUS_BADGES[student.status] || STATUS_BADGES.unpaid}`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/students/${student._id}`}
                          className="inline-flex items-center space-x-1 py-1 px-2.5 rounded-lg hover:bg-slate-100 font-bold text-xs text-slate-600"
                        >
                          <span>Profile</span>
                          <ChevronRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">
                      No students found matching the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-xs text-slate-500 font-medium">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredStudents.length)} of {filteredStudents.length} students
              </span>
              <div className="flex items-center space-x-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-slate-600 font-bold">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions Side Deck */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
              Finance Quick Actions
            </h3>
            <div className="space-y-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.name}
                    to={action.path}
                    className="flex items-center space-x-3.5 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all duration-150 group"
                  >
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border shadow-inner ${action.bgColor}`}>
                      <Icon size={16} />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-800 transition-colors">
                        {action.name}
                      </p>
                      <span className="text-[10px] text-slate-400 font-medium block truncate">
                        {action.description}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Extra Help Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex items-start space-x-3">
              <AlertCircle size={18} className="text-emerald-700 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">Financial Integrity</h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  Fee structures, invoices, and manual recording should remain reconciled at the end of every active session. Webhook transactions are processed automatically in real-time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountantDashboard;
