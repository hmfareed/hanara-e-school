import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mockExamApi } from './mockExamApi';
import api from '../../services/api';
import { Loader2, Award } from 'lucide-react';

const RankingsView = ({ seriesId, onStudentClick }) => {
  const [selectedClassId, setSelectedClassId] = useState('');

  // Fetch JHS 3 classes list
  const { data: classes = [] } = useQuery({
    queryKey: ['jhs3Classes', seriesId],
    queryFn: async () => {
      // Find JHS 3 classes via submission matrix (since it returns class details already)
      const res = await mockExamApi.getSubmissionMatrix(seriesId);
      return res.success ? res.data.classes : [];
    },
  });

  // Fetch rankings
  const { data: rankings = [], isLoading } = useQuery({
    queryKey: ['mockRankings', seriesId, selectedClassId],
    queryFn: async () => {
      const res = await mockExamApi.getRankings(seriesId, selectedClassId);
      return res.success ? res.data : [];
    },
    enabled: !!seriesId,
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Class & Cohort Rankings</h2>
          <p className="text-sm text-slate-500">Ranks complete students by total mock aggregate score (lower = better).</p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-sm font-semibold text-slate-500">Filter Class:</span>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">All JHS 3 Classes</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-500 uppercase bg-slate-50/50">
                <th className="py-3 px-4 w-16">Rank</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Admission No</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Class Pos</th>
                <th className="py-3 px-4">Cohort Pos</th>
                <th className="py-3 px-4">Aggregate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {rankings.map((row, idx) => (
                <tr
                  key={row._id}
                  onClick={() => onStudentClick(row.studentId?._id)}
                  className="hover:bg-slate-50/70 cursor-pointer transition-all"
                >
                  <td className="py-3.5 px-4 font-bold text-slate-700">
                    {idx + 1}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800 hover:text-emerald-600 hover:underline">
                    {row.studentId?.firstName} {row.studentId?.lastName}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">{row.studentId?.admissionNumber}</td>
                  <td className="py-3.5 px-4 text-slate-600">{row.classId?.name}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">
                    {row.classPosition || '—'}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-750">
                    {row.cohortPosition || '—'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center justify-center bg-emerald-50 text-emerald-800 font-bold px-3 py-1 rounded-xl border border-emerald-100">
                      {row.aggregate}
                    </span>
                  </td>
                </tr>
              ))}
              {rankings.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    No complete student aggregates found yet. Ensure scores are submitted across 4 cores and at least 2 electives.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RankingsView;
