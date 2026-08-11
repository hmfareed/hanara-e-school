import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Filter,
  UserPlus,
  Eye,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Award,
  Users,
  UserCheck,
  Calendar,
  Download,
  LayoutGrid,
  List,
  RotateCcw,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import BulkImportModal from './BulkImportModal';
import BatchPromotionModal from './BatchPromotionModal';

// Helper function to calculate age from DOB string/date
const calculateAge = (dob) => {
  if (!dob) return 'N/A';
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return 'N/A';
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? `${age} yrs` : 'N/A';
};

const StudentDirectoryPage = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [ageRangeFilter, setAgeRangeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [page, setPage] = useState(1);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  const limit = 12;

  // Convert age range preset to minAge & maxAge params for backend
  const { minAge, maxAge } = useMemo(() => {
    switch (ageRangeFilter) {
      case 'under-5':
        return { minAge: '', maxAge: '4' };
      case '5-8':
        return { minAge: '5', maxAge: '8' };
      case '9-12':
        return { minAge: '9', maxAge: '12' };
      case '13-16':
        return { minAge: '13', maxAge: '16' };
      case '17-plus':
        return { minAge: '17', maxAge: '' };
      default:
        return { minAge: '', maxAge: '' };
    }
  }, [ageRangeFilter]);

  // Fetch available classes for filtering
  const { data: classesData } = useQuery({
    queryKey: ['classesList'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  // Fetch students with active filters & pagination
  const { data: studentsData, isLoading, error, refetch } = useQuery({
    queryKey: ['studentsList', search, classFilter, genderFilter, statusFilter, minAge, maxAge, page],
    queryFn: async () => {
      const params = {
        page,
        limit,
        status: statusFilter,
      };
      if (search) params.search = search;
      if (classFilter) params.class = classFilter;
      if (genderFilter) params.gender = genderFilter;
      if (minAge) params.minAge = minAge;
      if (maxAge) params.maxAge = maxAge;

      const res = await api.get('/students', { params });
      return res.data;
    },
  });

  const students = studentsData?.data || [];
  const meta = studentsData?.meta || {};

  // Compute stat metrics for the active result set or general stats
  const maleCount = useMemo(() => students.filter(s => s.gender === 'male').length, [students]);
  const femaleCount = useMemo(() => students.filter(s => s.gender === 'female').length, [students]);

  // Handle Export to CSV
  const handleExportCSV = () => {
    if (!students.length) return;
    const headers = ['Admission No', 'First Name', 'Last Name', 'Other Names', 'Gender', 'DOB', 'Class', 'Status'];
    const rows = students.map(s => [
      `"${s.admissionNumber || ''}"`,
      `"${s.firstName || ''}"`,
      `"${s.lastName || ''}"`,
      `"${s.otherNames || ''}"`,
      `"${s.gender || ''}"`,
      `"${s.dob ? new Date(s.dob).toISOString().split('T')[0] : ''}"`,
      `"${s.currentClass?.name || 'Unassigned'}"`,
      `"${s.status || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `students_directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetFilters = () => {
    setSearch('');
    setClassFilter('');
    setGenderFilter('');
    setAgeRangeFilter('');
    setStatusFilter('active');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* ─── Header & Top Actions ────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
              <Sparkles size={12} /> HANARA Student Registry
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">Students Directory</h1>
          <p className="text-sm text-emerald-200/80">
            Browse, filter, and manage student profiles, academic status, and records.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            disabled={!students.length}
            className="flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-all border border-white/10 backdrop-blur-md disabled:opacity-50 cursor-pointer"
            title="Export filtered list to CSV"
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>

          {['superadmin', 'admin'].includes(user?.role) && (
            <>
              <button
                onClick={() => setIsPromotionModalOpen(true)}
                className="flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-sm transition-all border border-emerald-500/40 cursor-pointer"
              >
                <Award size={16} />
                <span>Batch Promotion</span>
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-all border border-white/10 backdrop-blur-md cursor-pointer"
              >
                <FileSpreadsheet size={16} />
                <span>Import CSV</span>
              </button>
              <Link
                to="/students/admit"
                className="flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95"
              >
                <UserPlus size={16} />
                <span>Admit Student</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ─── Metric Quick Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</span>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Users size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{meta.total ?? students.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Filtered in current view</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Male Students</span>
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <UserCheck size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{maleCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">On current page</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Female Students</span>
            <div className="h-9 w-9 rounded-xl bg-pink-50 text-pink-700 flex items-center justify-center">
              <UserCheck size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{femaleCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">On current page</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Classes</span>
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Calendar size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{classesData?.length || 0}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Registered grades</p>
        </div>
      </div>

      {/* ─── Advanced Filter & Control Bar ───────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or Adm #..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-all bg-slate-50/50"
            />
          </div>

          {/* Class Filter */}
          <div className="relative">
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 appearance-none font-medium"
            >
              <option value="">All Classes</option>
              {classesData?.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Gender Filter */}
          <div className="relative">
            <select
              value={genderFilter}
              onChange={(e) => {
                setGenderFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 appearance-none font-medium"
            >
              <option value="">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Age Range Filter */}
          <div className="relative">
            <select
              value={ageRangeFilter}
              onChange={(e) => {
                setAgeRangeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 appearance-none font-medium"
            >
              <option value="">All Age Groups</option>
              <option value="under-5">Under 5 Years</option>
              <option value="5-8">5 - 8 Years</option>
              <option value="9-12">9 - 12 Years</option>
              <option value="13-16">13 - 16 Years</option>
              <option value="17-plus">17+ Years</option>
            </select>
            <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 appearance-none font-medium"
            >
              <option value="active">Status: Active</option>
              <option value="graduated">Status: Graduated</option>
              <option value="withdrawn">Status: Withdrawn</option>
              <option value="all">Status: All Statuses</option>
            </select>
            <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* View Switcher & Reset */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold uppercase tracking-wider">Layout:</span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <List size={14} />
                <span>Table</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1 px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutGrid size={14} />
                <span>Grid</span>
              </button>
            </div>
          </div>

          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 py-1.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      {/* ─── Main Content Display (Table or Grid) ──────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
            <p className="text-sm font-semibold text-slate-500">Loading student directory...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-700 bg-red-50 border-b border-slate-200">
            <p className="font-bold text-base">Error loading students</p>
            <p className="text-sm mt-1">{error.message}</p>
          </div>
        ) : students.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <Users size={40} className="mx-auto text-slate-300 stroke-[1.5]" />
            <p className="font-semibold text-slate-700 text-base">No students found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No registered students match your current search and filter criteria. Try adjusting or resetting the filters.
            </p>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-6">Adm #</th>
                  <th className="py-4 px-6">Student Name</th>
                  <th className="py-4 px-6">Age / DOB</th>
                  <th className="py-4 px-6">Gender</th>
                  <th className="py-4 px-6">Current Class</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => {
                  const ageDisplay = calculateAge(student.dob);
                  return (
                    <tr key={student._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6 font-mono text-xs font-bold text-slate-800">
                        {student.admissionNumber}
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-900">
                        <div className="flex items-center space-x-3">
                          <div className="h-9 w-9 rounded-full bg-emerald-50 border border-emerald-200 flex-shrink-0 flex items-center justify-center text-emerald-800 font-bold text-sm overflow-hidden">
                            {student.photoUrl ? (
                              <img src={student.photoUrl} alt="Avatar" className="h-full w-full object-cover" />
                            ) : (
                              <span>{(student.firstName?.[0] || 'S').toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block">
                              {student.firstName} {student.otherNames ? `${student.otherNames} ` : ''}{student.lastName}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              ID: {student._id.slice(-6)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800">{ageDisplay}</span>
                          <span className="text-[11px] text-slate-400">
                            {student.dob ? new Date(student.dob).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          student.gender === 'male' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                            : 'bg-pink-50 text-pink-700 border border-pink-100'
                        }`}>
                          {student.gender}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200/60">
                          {student.currentClass?.name || 'Unassigned'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          student.status === 'active' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : student.status === 'graduated' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Link
                          to={`/students/${student._id}`}
                          className="inline-flex items-center space-x-1.5 py-1.5 px-3 rounded-xl border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 font-bold text-xs text-slate-700 hover:text-emerald-800 transition-all shadow-sm"
                        >
                          <Eye size={14} />
                          <span>Profile</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid View */
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {students.map((student) => {
              const ageDisplay = calculateAge(student.dob);
              return (
                <div
                  key={student._id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-emerald-300 hover:shadow-lg transition-all flex flex-col justify-between group relative overflow-hidden"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                        {student.admissionNumber}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                        student.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {student.status}
                      </span>
                    </div>

                    <div className="flex flex-col items-center text-center space-y-2 pt-2">
                      <div className="h-16 w-16 rounded-full bg-emerald-100 border-2 border-emerald-200 flex items-center justify-center text-emerald-900 font-extrabold text-xl overflow-hidden shadow-sm">
                        {student.photoUrl ? (
                          <img src={student.photoUrl} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                          <span>{(student.firstName?.[0] || 'S').toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-tight group-hover:text-emerald-800 transition-colors">
                          {student.firstName} {student.otherNames ? `${student.otherNames} ` : ''}{student.lastName}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {student.currentClass?.name || 'Unassigned Class'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="bg-slate-50 rounded-xl p-2">
                        <span className="text-slate-400 text-[10px] block uppercase font-semibold">Age</span>
                        <span className="font-bold text-slate-800">{ageDisplay}</span>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2">
                        <span className="text-slate-400 text-[10px] block uppercase font-semibold">Gender</span>
                        <span className="font-bold text-slate-800 capitalize">{student.gender}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/students/${student._id}`}
                    className="mt-5 w-full flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-emerald-800 text-white font-bold text-xs transition-colors shadow-sm"
                  >
                    <Eye size={14} />
                    <span>View Student Profile</span>
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── Pagination Footer ────────────────────────────────────────────── */}
        {meta.pages > 1 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-500 font-medium">
              Showing page <strong className="text-slate-800">{meta.page}</strong> of <strong className="text-slate-800">{meta.pages}</strong> ({meta.total} total students)
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="flex items-center gap-1 py-1.5 px-3 border border-slate-200 rounded-xl text-slate-600 bg-white hover:bg-slate-50 text-xs font-bold disabled:opacity-40 transition-all cursor-pointer shadow-sm"
              >
                <ChevronLeft size={16} />
                <span>Prev</span>
              </button>
              <button
                disabled={page === meta.pages}
                onClick={() => setPage(page + 1)}
                className="flex items-center gap-1 py-1.5 px-3 border border-slate-200 rounded-xl text-slate-600 bg-white hover:bg-slate-50 text-xs font-bold disabled:opacity-40 transition-all cursor-pointer shadow-sm"
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {isImportModalOpen && (
        <BulkImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImportSuccess={refetch}
        />
      )}
      {isPromotionModalOpen && (
        <BatchPromotionModal
          isOpen={isPromotionModalOpen}
          onClose={() => setIsPromotionModalOpen(false)}
          classes={classesData || []}
          onSuccess={refetch}
        />
      )}
    </div>
  );
};

export default StudentDirectoryPage;
