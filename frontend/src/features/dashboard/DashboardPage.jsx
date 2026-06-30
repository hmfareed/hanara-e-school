import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Users,
  GraduationCap,
  CalendarCheck,
  ChevronRight,
  UserPlus,
} from 'lucide-react';

const DashboardPage = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: async () => {
      const res = await api.get('/dashboard/summary');
      return res.data?.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-44 bg-slate-200 rounded-2xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white border border-slate-200 rounded-2xl p-6">
              <div className="h-6 w-24 bg-slate-200 rounded mb-4"></div>
              <div className="h-8 w-16 bg-slate-300 rounded"></div>
            </div>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 h-64"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700">
        <h4 className="font-bold text-lg">Error loading dashboard</h4>
        <p className="text-sm mt-1">{error.message || 'Please check if the backend server is running.'}</p>
      </div>
    );
  }

  const { totalStudents, totalStaff, attendance, recentAdmissions } = data || {};

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 to-slate-900 text-white p-6 md:p-8 shadow-sm border border-slate-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-800/10 rounded-full blur-2xl transform translate-x-1/3 -translate-y-1/3"></div>
        <div className="relative z-10 space-y-2">
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 uppercase tracking-wider">
            Academic Management
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-100">HANARA Schools Portal</h2>
          <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
            Monitor attendance, manage student records, classes, subjects, and view real-time school activity stats.
          </p>
        </div>
      </div>

      {/* KPI stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Students</span>
            <h3 className="text-3xl font-extrabold text-slate-900">{totalStudents ?? 0}</h3>
            <span className="text-[10px] text-slate-400 block mt-1">Currently enrolled</span>
          </div>
          <div className="h-12 w-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-700">
            <GraduationCap size={24} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Staff</span>
            <h3 className="text-3xl font-extrabold text-slate-900">{totalStaff ?? 0}</h3>
            <span className="text-[10px] text-slate-400 block mt-1">Teachers and support personnel</span>
          </div>
          <div className="h-12 w-12 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-700">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Attendance</span>
            <h3 className="text-3xl font-extrabold text-slate-900">
              {attendance?.rate !== null && attendance?.rate !== undefined ? `${attendance.rate}%` : 'N/A'}
            </h3>
            <span className="text-[10px] text-slate-400 block mt-1">
              {attendance?.totalMarked ?? 0} marked today
            </span>
          </div>
          <div className="h-12 w-12 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-amber-700">
            <CalendarCheck size={24} />
          </div>
        </div>
      </div>

      {/* Attendance Breakdown & Recent Admissions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
              Today's Attendance Stats
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-600">Present</span>
                <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  {attendance?.present ?? 0}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-600">Absent</span>
                <span className="text-sm font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                  {attendance?.absent ?? 0}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-600">Late</span>
                <span className="text-sm font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                  {attendance?.late ?? 0}
                </span>
              </div>
            </div>
          </div>
          <Link
            to="/attendance"
            className="mt-6 flex items-center justify-center space-x-1 py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-xs text-slate-600 transition-colors"
          >
            <span>Go to Attendance Register</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {/* Recent Admissions */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Recent Admissions
            </h3>
            <Link
              to="/students/admit"
              className="flex items-center space-x-1.5 py-1.5 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-sm transition-colors"
            >
              <UserPlus size={14} />
              <span>Admit Student</span>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead>
                <tr className="text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3">Adm #</th>
                  <th className="py-3">Name</th>
                  <th className="py-3">Class</th>
                  <th className="py-3">Date Admitted</th>
                  <th className="py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentAdmissions && recentAdmissions.length > 0 ? (
                  recentAdmissions.map((student) => (
                    <tr key={student._id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 font-mono text-xs font-semibold text-slate-800">
                        {student.admissionNumber}
                      </td>
                      <td className="py-3.5 font-medium text-slate-900 font-sans">
                        {student.firstName} {student.lastName}
                      </td>
                      <td className="py-3.5">
                        <span className="inline-block px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200/50">
                          {student.currentClass?.name || 'Unassigned'}
                        </span>
                      </td>
                      <td className="py-3.5 text-xs text-slate-400">
                        {new Date(student.enrollmentDate).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-3.5 text-right">
                        <Link
                          to={`/students/${student._id}`}
                          className="inline-flex items-center space-x-1 py-1 px-2.5 rounded-lg hover:bg-slate-100 font-semibold text-xs text-slate-600"
                        >
                          <span>View Profile</span>
                          <ChevronRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-xs text-slate-400">
                      No recent admissions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
