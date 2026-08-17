import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { mockExamApi } from './mockExamApi';
import { Plus, Lock, Calendar, Trash, Loader2 } from 'lucide-react';

const MockSeriesManager = ({ seriesList, onRefresh, selectedSeriesId, setSelectedSeriesId }) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [order, setOrder] = useState('');

  // Create Series Mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await mockExamApi.createSeries(data);
    },
    onSuccess: (res) => {
      setName('');
      setAcademicYear('');
      setOrder('');
      queryClient.invalidateQueries({ queryKey: ['mockSeriesList'] });
      if (res?.data?._id && setSelectedSeriesId) {
        setSelectedSeriesId(res.data._id);
      }
      if (onRefresh) onRefresh();
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Error creating series');
    },
  });

  // Close Series Mutation
  const closeMutation = useMutation({
    mutationFn: async (id) => {
      return await mockExamApi.closeSeries(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mockSeriesList'] });
      if (onRefresh) onRefresh();
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Error closing series');
    },
  });

  // Delete Series Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await mockExamApi.deleteSeries(id);
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['mockSeriesList'] });
      if (selectedSeriesId === deletedId && setSelectedSeriesId) {
        setSelectedSeriesId('');
      }
      if (onRefresh) onRefresh();
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Error deleting series');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !academicYear.trim() || order === '') {
      alert('Please fill in all fields.');
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      academicYear: academicYear.trim(),
      order: Number(order),
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Create Series Form */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6 lg:col-span-1 h-fit">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Create Series</h2>
          <p className="text-sm text-slate-500">Add a new mock exam series for this academic year.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Series Name</label>
            <input
              type="text"
              placeholder="e.g. Mock 1, Mock 2, March Mock"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-805 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Academic Year</label>
            <input
              type="text"
              placeholder="e.g. 2025/2026"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-805 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Order / Sequence Number</label>
            <input
              type="number"
              placeholder="e.g. 1, 2"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-805 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full flex items-center justify-center space-x-1.5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm"
          >
            {createMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            <span>Create Mock Series</span>
          </button>
        </form>
      </div>

      {/* Series List & Actions */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6 lg:col-span-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Existing Mock Series</h2>
          <p className="text-sm text-slate-500">Track status and close active series to freeze scoring entry grids.</p>
        </div>

        <div className="space-y-4">
          {seriesList.map((s) => (
            <div
              key={s._id}
              className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-slate-800 text-base">{s.name}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    s.status === 'open'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {s.status === 'open' ? 'Open' : 'Closed'}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-xs text-slate-500">
                  <span className="flex items-center space-x-1">
                    <Calendar size={12} />
                    <span>Academic Year: {s.academicYear}</span>
                  </span>
                  <span>Sequence Order: {s.order}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {s.status === 'open' && (
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to close this mock series? This locks all score grids and aggregates.')) {
                        closeMutation.mutate(s._id);
                      }
                    }}
                    className="flex items-center space-x-1 px-3 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-sm transition-all"
                  >
                    <Lock size={12} />
                    <span>Close Series</span>
                  </button>
                )}
                {s.status === 'closed' && (
                  <span className="text-xs font-bold text-slate-400 mr-2">
                    Closed on {new Date(s.closedAt).toLocaleDateString()}
                  </span>
                )}
                <button
                  onClick={() => {
                    if (window.confirm(`⚠️ Are you sure you want to delete mock series "${s.name}"? This will permanently delete all student scores and aggregate rankings for this series.`)) {
                      deleteMutation.mutate(s._id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="flex items-center space-x-1 px-3 py-2 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition-all disabled:opacity-50"
                  title="Delete series"
                >
                  <Trash size={12} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}

          {seriesList.length === 0 && (
            <div className="text-center py-8 text-slate-400 italic">
              No series available. Create one using the form on the left.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MockSeriesManager;
