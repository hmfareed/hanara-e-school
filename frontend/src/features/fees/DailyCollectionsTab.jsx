import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { DollarSign, Bus, Award, AlertCircle, Calendar, Filter, Loader2, ArrowRight } from 'lucide-react';

const DailyCollectionsTab = () => {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [classFilter, setClassFilter] = useState('');

  const { data: classes } = useQuery({
    queryKey: ['classesListCollections'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  const { data: summaryData, isLoading, error, refetch } = useQuery({
    queryKey: ['dailyCollectionsSummary', startDate, endDate, classFilter],
    queryFn: async () => {
      const params = { startDate, endDate };
      if (classFilter) params.classId = classFilter;
      const res = await api.get('/fees/daily-register/summary', { params });
      return res.data?.data;
    },
  });

  useEffect(() => {
    refetch();
  }, [startDate, endDate, classFilter, refetch]);

  const totals = summaryData?.totals || { totalCollected: 0, feedingTotal: 0, busTotal: 0, unpaidCount: 0 };
  const classSummaries = summaryData?.classSummaries || [];
  const unpaidStudents = summaryData?.unpaidStudents || [];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center gap-1">
            <Calendar size={12} /> Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center gap-1">
            <Calendar size={12} /> End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center gap-1">
            <Filter size={12} /> Class
          </label>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white min-w-[160px]"
          >
            <option value="">All Classes</option>
            {classes?.map((cls) => (
              <option key={cls._id} value={cls._id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 flex flex-col items-center justify-center space-y-3">
          <Loader2 size={24} className="animate-spin text-emerald-800" />
          <p className="text-sm font-semibold text-slate-400">Loading daily collections summary...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          Failed to load daily collections data.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Totals Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block mb-1">
                Total Collection
              </span>
              <div className="flex items-baseline gap-1 text-slate-900">
                <span className="text-2xl font-black">{totals.totalCollected.toFixed(2)}</span>
                <span className="text-xs font-bold text-slate-400">GHS</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block mb-1">
                Feeding Total
              </span>
              <div className="flex items-baseline gap-1 text-slate-900">
                <span className="text-2xl font-black">{totals.feedingTotal.toFixed(2)}</span>
                <span className="text-xs font-bold text-slate-400">GHS</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block mb-1">
                Transport Total
              </span>
              <div className="flex items-baseline gap-1 text-slate-900">
                <span className="text-2xl font-black">{totals.busTotal.toFixed(2)}</span>
                <span className="text-xs font-bold text-slate-400">GHS</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm border-l-4 border-l-red-500">
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block mb-1">
                Unpaid Students
              </span>
              <span className="text-2xl font-black text-red-600">{totals.unpaidCount}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Class Summaries Table */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Collections by Class
              </h3>
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-3.5 px-6">Class</th>
                      <th className="py-3.5 px-6">Feeding</th>
                      <th className="py-3.5 px-6">Bus</th>
                      <th className="py-3.5 px-6">Present Unpaid</th>
                      <th className="py-3.5 px-6">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classSummaries.length > 0 ? (
                      classSummaries.map((cls) => (
                        <tr key={cls.className} className="hover:bg-slate-50/20">
                          <td className="py-3.5 px-6 font-bold text-slate-900">{cls.className}</td>
                          <td className="py-3.5 px-6 font-semibold">{cls.feeding.toFixed(2)} GHS</td>
                          <td className="py-3.5 px-6 font-semibold">{cls.bus.toFixed(2)} GHS</td>
                          <td className="py-3.5 px-6">
                            {cls.unpaidCount > 0 ? (
                              <span className="inline-flex px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-bold">
                                {cls.unpaidCount} unpaid
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">All paid</span>
                            )}
                          </td>
                          <td className="py-3.5 px-6 font-black text-emerald-800">
                            {cls.total.toFixed(2)} GHS
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-slate-400">
                          No daily fee registers submitted in this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Unpaid Students List */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Unpaid Students Details ({unpaidStudents.length})
              </h3>
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 max-h-[360px] overflow-y-auto space-y-2">
                {unpaidStudents.length > 0 ? (
                  unpaidStudents.map((stud) => (
                    <div
                      key={`${stud.studentId}-${stud.date}`}
                      className="border border-slate-100 rounded-xl p-3 bg-red-50/30 flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{stud.fullName}</div>
                        <div className="text-slate-400 font-mono mt-0.5">{stud.admissionNumber}</div>
                        <div className="text-slate-500 font-semibold mt-1">{stud.class}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold">
                          Unpaid
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono mt-1.5">
                          {new Date(stud.date).toLocaleDateString('en-GH', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400 italic text-xs">
                    No present students are unpaid. Excellent!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyCollectionsTab;
