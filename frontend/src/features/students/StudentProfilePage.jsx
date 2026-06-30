import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, User, Phone, CheckCircle, AlertCircle, Ban } from 'lucide-react';

const StudentProfilePage = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const queryClient = useQueryClient();

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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
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
          <div className="h-16 w-16 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-400">
            <User size={32} />
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

        {status === 'active' && ['superadmin', 'admin'].includes(user?.role) && (
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
                  {transport?.usesBus ? `Uses Bus (Stop: ${transport.stop})` : 'Does not use bus'}
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
