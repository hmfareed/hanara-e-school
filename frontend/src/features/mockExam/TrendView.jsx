import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mockExamApi } from './mockExamApi';
import api from '../../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, TrendingUp, Search } from 'lucide-react';

const TrendView = ({ seriesId, onStudentClick }) => {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch JHS 3 classes list
  const { data: classes = [] } = useQuery({
    queryKey: ['jhs3ClassesTrend', seriesId],
    queryFn: async () => {
      const res = await mockExamApi.getSubmissionMatrix(seriesId);
      return res.success ? res.data.classes : [];
    },
  });

  // Fetch Class Students
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['trendStudents', selectedClassId],
    queryFn: async () => {
      const res = await api.get(`/students?classId=${selectedClassId}`);
      return res.data?.success ? res.data.data : [];
    },
    enabled: !!selectedClassId,
  });

  // Fetch student trend
  const { data: trendData = [], isLoading: trendLoading } = useQuery({
    queryKey: ['studentTrend', seriesId, selectedStudentId],
    queryFn: async () => {
      const res = await mockExamApi.getStudentTrend(seriesId, selectedStudentId);
      return res.success ? res.data : [];
    },
    enabled: !!selectedStudentId,
  });

  const activeStudent = students.find((s) => s._id === selectedStudentId);

  // Format Recharts data: remove nulls if any, but show trend.
  // Note: lower aggregate = better WAEC performance! We will invert the YAxis so 6 is at top and 54 at bottom.
  const chartData = trendData
    .filter((d) => d.isComplete && d.aggregate !== null)
    .map((d) => ({
      name: d.series.name,
      aggregate: d.aggregate,
      classPosition: d.classPosition,
      cohortPosition: d.cohortPosition,
    }));

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Cross-Series Trend Performance</h2>
        <p className="text-sm text-slate-500">Track a student's aggregate progress across all mock series.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 border-b border-slate-100 pb-6">
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-500 uppercase">Class</label>
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setSelectedStudentId('');
            }}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Select class...</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-[2]">
          <label className="text-xs font-bold text-slate-500 uppercase">Select student</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            disabled={!selectedClassId}
            className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
          >
            <option value="">Select student...</option>
            {students.map((s) => (
              <option key={s._id} value={s._id}>
                {s.firstName} {s.lastName} ({s.admissionNumber})
              </option>
            ))}
          </select>
        </div>
      </div>

      {trendLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
        </div>
      ) : selectedStudentId ? (
        chartData.length === 0 ? (
          <div className="text-center py-12 text-slate-400 italic">
            Not enough complete series aggregate data to plot a trend chart. Ensure results are submitted.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <TrendingUp className="text-emerald-600" />
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  {activeStudent?.firstName} {activeStudent?.lastName}'s Progress
                </h3>
                <p className="text-xs text-slate-500">Lower aggregate = better score</p>
              </div>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis reversed stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} domain={[6, 54]} />
                  <Tooltip
                    contentStyle={{ background: '#0F172A', borderRadius: '12px', border: 'none', color: '#FFF' }}
                    itemStyle={{ color: '#10B981' }}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="aggregate"
                    stroke="#059669"
                    strokeWidth={3}
                    activeDot={{ r: 8 }}
                    name="Aggregate"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <button
                onClick={() => onStudentClick(selectedStudentId)}
                className="py-3 px-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-center font-bold text-sm text-slate-700 transition-all"
              >
                Go to Detailed Mock Slip
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="text-center py-12 text-slate-400 italic">
          Please select a student from the dropdown above to render their trend chart.
        </div>
      )}
    </div>
  );
};

export default TrendView;
