import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Search, Filter, UserPlus, Eye, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import BulkImportModal from './BulkImportModal';

const StudentDirectoryPage = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const limit = 10;

  const { data: classesData } = useQuery({
    queryKey: ['classesList'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  const { data: studentsData, isLoading, error, refetch } = useQuery({
    queryKey: ['studentsList', search, classFilter, genderFilter, page],
    queryFn: async () => {
      const params = {
        page,
        limit,
        status: 'active',
      };
      if (search) params.search = search;
      if (classFilter) params.class = classFilter;
      if (genderFilter) params.gender = genderFilter;

      const res = await api.get('/students', { params });
      return res.data;
    },
  });

  const students = studentsData?.data || [];
  const meta = studentsData?.meta || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Student Directory</h2>
          <p className="text-sm text-slate-500 mt-1">Manage and view all registered students</p>
        </div>
        {['superadmin', 'admin'].includes(user?.role) && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm shadow-sm transition-colors border border-slate-200 cursor-pointer"
            >
              <FileSpreadsheet size={16} />
              <span>Import CSV</span>
            </button>
            <Link
              to="/students/admit"
              className="flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm shadow-sm transition-colors"
            >
              <UserPlus size={16} />
              <span>Admit Student</span>
            </Link>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or adm #..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800"
          />
        </div>

        <div className="relative">
          <select
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setPage(1);
            }}
            className="w-full pl-4 pr-10 py-2 border border-slate-200 rounded-xl text-slate-800 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 appearance-none"
          >
            <option value="">All Classes</option>
            {classesData?.map((cls) => (
              <option key={cls._id} value={cls._id}>
                {cls.name}
              </option>
            ))}
          </select>
          <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value);
              setPage(1);
            }}
            className="w-full pl-4 pr-10 py-2 border border-slate-200 rounded-xl text-slate-800 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 appearance-none"
          >
            <option value="">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <button
          onClick={() => {
            setSearch('');
            setClassFilter('');
            setGenderFilter('');
            setPage(1);
          }}
          className="py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-semibold transition-colors"
        >
          Reset Filters
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-800 border-t-transparent"></div>
            <p className="text-sm font-semibold text-slate-400">Loading student directory...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-700 bg-red-50 border-b border-slate-200">
            <p className="font-bold text-base">Error loading students</p>
            <p className="text-sm mt-1">{error.message}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-4 px-6">Adm #</th>
                    <th className="py-4 px-6">Full Name</th>
                    <th className="py-4 px-6">Gender</th>
                    <th className="py-4 px-6">Current Class</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.length > 0 ? (
                    students.map((student) => (
                      <tr key={student._id} className="hover:bg-slate-50/50">
                        <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-800">
                          {student.admissionNumber}
                        </td>
                        <td className="py-4 px-6 font-medium text-slate-900 font-sans">
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center text-slate-400 overflow-hidden">
                              {student.photoUrl ? (
                                <img src={student.photoUrl} alt="Avatar" className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-xs font-bold font-sans text-slate-500">{(student.firstName?.[0] || '').toUpperCase()}</span>
                              )}
                            </div>
                            <span>
                              {student.firstName} {student.otherNames ? `${student.otherNames} ` : ''} {student.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 capitalize">{student.gender}</td>
                        <td className="py-4 px-6">
                          <span className="inline-block px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-100 font-sans">
                            {student.currentClass?.name || 'Unassigned'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wide">
                            {student.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <Link
                            to={`/students/${student._id}`}
                            className="inline-flex items-center space-x-1 py-1.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 font-semibold text-xs text-slate-600 transition-colors"
                          >
                            <Eye size={12} />
                            <span>View Profile</span>
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-sm text-slate-400">
                        No students found matching the filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {meta.pages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Showing page {meta.page} of {meta.pages} ({meta.total} total students)
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
      {isImportModalOpen && (
        <BulkImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImportSuccess={refetch}
        />
      )}
    </div>
  );
};

export default StudentDirectoryPage;
