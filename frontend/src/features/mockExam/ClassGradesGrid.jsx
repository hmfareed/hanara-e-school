import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mockExamApi } from './mockExamApi';
import { Loader2, Table } from 'lucide-react';

const ClassGradesGrid = ({ seriesId }) => {
  const [selectedClassId, setSelectedClassId] = useState('');

  // Fetch JHS 3 classes list
  const { data: classes = [] } = useQuery({
    queryKey: ['jhs3ClassesGrid', seriesId],
    queryFn: async () => {
      const res = await mockExamApi.getSubmissionMatrix(seriesId);
      return res.success ? res.data.classes : [];
    },
  });

  // Fetch Class grades grid
  const { data: gridData, isLoading } = useQuery({
    queryKey: ['classGradesGrid', seriesId, selectedClassId],
    queryFn: async () => {
      const res = await mockExamApi.getClassGradesGrid(seriesId, selectedClassId);
      return res.success ? res.data : null;
    },
    enabled: !!seriesId && !!selectedClassId,
  });

  const { subjects = [], rows = [] } = gridData || {};

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Class Score Sheets</h2>
          <p className="text-sm text-slate-500">View provisional mock exam grades for all subjects in a class side-by-side.</p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-sm font-semibold text-slate-500">Select Class:</span>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-805 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Select class...</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedClassId ? (
        <div className="text-center py-12 text-slate-400 italic">
          Please select a class from the dropdown above to view the grades grid sheet.
        </div>
      ) : isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-500 bg-slate-50/50 uppercase select-none">
                <th className="py-3 px-4">Index / Adm No</th>
                <th className="py-3 px-4">Student Name</th>
                {subjects.map((sub) => (
                  <th key={sub._id} className="py-3 px-4 text-center" title={sub.name}>
                    {sub.code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {rows.map((row) => (
                <tr key={row.studentId} className="hover:bg-slate-50/30">
                  <td className="py-3.5 px-4 font-semibold text-slate-550">
                    {row.admissionNumber}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-805">
                    {row.name}
                  </td>
                  {subjects.map((sub) => {
                    const grade = row.grades[sub._id];
                    const isNa = grade === 'N/A';
                    return (
                      <td key={sub._id} className="py-2.5 px-3 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-bold border text-xs ${
                          isNa
                            ? 'bg-slate-50 text-slate-400 border-slate-100'
                            : grade === 9
                            ? 'bg-red-50 text-red-600 border-red-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        }`}>
                          {grade}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={2 + subjects.length} className="py-8 text-center text-slate-400 italic">
                    No active students found in this class.
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

export default ClassGradesGrid;
