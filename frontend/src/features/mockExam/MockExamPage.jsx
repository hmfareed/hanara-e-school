import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { mockExamApi } from './mockExamApi';
import TeacherMockEntryView from './TeacherMockEntryView';
import AdminMockPanel from './AdminMockPanel';
import Skeleton from '../../components/Skeleton';
import { ShieldAlert, BookOpen, Lock } from 'lucide-react';

const MockExamPage = () => {
  const { user, isJHS3Teacher } = useAuth();
  const [selectedSeriesId, setSelectedSeriesId] = useState('');

  const isAdminOrHT = ['superadmin', 'admin', 'system_admin'].includes(user?.role);
  const isTeacher = user?.role === 'teacher';
  const isBlockedTeacher = isTeacher && !isJHS3Teacher;

  const { data: seriesList = [], isLoading, refetch } = useQuery({
    queryKey: ['mockSeriesList'],
    queryFn: async () => {
      const res = await mockExamApi.getSeries();
      return res.success ? res.data : [];
    },
    enabled: !isBlockedTeacher,
  });

  // Default to active series
  React.useEffect(() => {
    if (seriesList.length > 0 && !selectedSeriesId) {
      const openSeries = seriesList.find(s => s.status === 'open');
      if (openSeries) {
        setSelectedSeriesId(openSeries._id);
      } else {
        setSelectedSeriesId(seriesList[0]._id);
      }
    }
  }, [seriesList, selectedSeriesId]);

  // Gate: teachers who don't teach JHS 3 should not access this page at all
  if (isBlockedTeacher) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center space-y-5">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <Lock size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900">Mock Exams — JHS 3 Only</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Mock exam entry is restricted to teachers assigned to a <strong>JHS 3</strong> class.
              If you believe this is a mistake, please contact the school administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Page header skeleton */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton.Circle size="w-14 h-14" />
            <div className="space-y-2">
              <Skeleton.Line width="w-40" height="h-6" />
              <Skeleton.Line width="w-64" height="h-4" />
            </div>
          </div>
          <Skeleton.Box w="w-48" h="h-10" rounded="rounded-xl" />
        </div>
        {/* Series / content area skeleton */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <Skeleton.Line width="w-36" height="h-5" />
            <Skeleton.Box w="w-32" h="h-8" rounded="rounded-xl" />
          </div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-4 py-2">
              <Skeleton.Circle size="w-8 h-8" />
              <Skeleton.Line width="w-48" height="h-4" />
              <Skeleton.Line width="w-24" height="h-4" className="ml-auto" />
              <Skeleton.Box w="w-20" h="h-8" rounded="rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">JHS 3 Mock Exams</h1>
            <p className="text-sm text-slate-500">Isolate, track, and grade mock exam preparations</p>
          </div>
        </div>

        {seriesList.length > 0 ? (
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-slate-600">Exam Series:</span>
            <select
              value={selectedSeriesId}
              onChange={(e) => setSelectedSeriesId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {seriesList.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.academicYear}) {s.status === 'closed' ? '🔒' : '🔓'}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {selectedSeriesId === 'manage' && isAdminOrHT ? (
        <AdminMockPanel
          seriesList={seriesList}
          selectedSeriesId={selectedSeriesId}
          setSelectedSeriesId={setSelectedSeriesId}
          onRefresh={refetch}
          initialTab="series"
        />
      ) : seriesList.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center max-w-xl mx-auto space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
            <ShieldAlert size={24} />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800 text-lg">No Mock Exam Series Found</h3>
            <p className="text-sm text-slate-600">
              An administrator or head teacher needs to create a mock exam series before scoring can start.
            </p>
          </div>
          {isAdminOrHT && (
            <button
              onClick={() => setSelectedSeriesId('manage')}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm text-sm transition-all"
            >
              Create Exam Series
            </button>
          )}
        </div>
      ) : (
        <>
          {isAdminOrHT ? (
            <AdminMockPanel
              seriesList={seriesList}
              selectedSeriesId={selectedSeriesId}
              setSelectedSeriesId={setSelectedSeriesId}
              onRefresh={refetch}
            />
          ) : isTeacher ? (
            <TeacherMockEntryView seriesId={selectedSeriesId} />
          ) : (
            <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200 text-center">
              Access denied. You do not have permissions to view this page.
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MockExamPage;
