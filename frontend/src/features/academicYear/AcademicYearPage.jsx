import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  CalendarDays, Plus, Trash2, Star, ChevronRight, CheckCircle2,
  AlertTriangle, BookOpen, Palmtree, CalendarCheck, X, Pencil,
  GripVertical, ArrowLeft,
} from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────────── */
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const toInputDate = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';
const EVENT_TYPES = [
  { value: 'holiday', label: 'Public Holiday',  icon: Palmtree,     color: 'text-rose-500',   bg: 'bg-rose-50 border-rose-200',   dot: 'bg-rose-500' },
  { value: 'exam',    label: 'Exam Day',         icon: BookOpen,     color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200',   dot: 'bg-blue-500' },
  { value: 'event',   label: 'School Event',     icon: CalendarCheck,color: 'text-emerald-600',bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
];
const getEventMeta = (type) => EVENT_TYPES.find(e => e.value === type) || EVENT_TYPES[2];

const TERM_DEFAULTS = [
  { name: 'Term 1', startDate: '', endDate: '', events: [] },
  { name: 'Term 2', startDate: '', endDate: '', events: [] },
  { name: 'Term 3', startDate: '', endDate: '', events: [] },
];

/* ─── Mini Calendar ───────────────────────────────────────── */
const MiniCalendar = ({ term }) => {
  if (!term.startDate || !term.endDate) return null;

  const start = new Date(term.startDate);
  const end   = new Date(term.endDate);

  // Collect months in range
  const months = [];
  let cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cur <= lastMonth) {
    months.push(new Date(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  // cap at 4 months for compactness
  const visibleMonths = months.slice(0, 4);

  const eventMap = {};
  (term.events || []).forEach(ev => {
    const key = new Date(ev.date).toISOString().slice(0, 10);
    eventMap[key] = ev.type;
  });

  const isInTerm = (d) => d >= start && d <= end;

  return (
    <div className="mt-4 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Term Calendar Preview</p>
      <div className="flex flex-wrap gap-4">
        {visibleMonths.map((monthStart) => {
          const year  = monthStart.getFullYear();
          const month = monthStart.getMonth();
          const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const blanks = Array(firstDay).fill(null);
          const days   = Array.from({ length: daysInMonth }, (_, i) => i + 1);

          return (
            <div key={`${year}-${month}`} className="bg-white border border-slate-200 rounded-xl p-3 min-w-[200px]">
              <p className="text-[10px] font-bold text-slate-600 mb-2 text-center">
                {monthStart.toLocaleString('en-GB', { month: 'long', year: 'numeric' })}
              </p>
              <div className="grid grid-cols-7 gap-px text-center">
                {['S','M','T','W','T','F','S'].map((d,i) => (
                  <div key={i} className="text-[9px] text-slate-400 font-semibold pb-1">{d}</div>
                ))}
                {blanks.map((_, i) => <div key={`b${i}`} />)}
                {days.map(day => {
                  const date  = new Date(year, month, day);
                  const key   = date.toISOString().slice(0, 10);
                  const inTerm = isInTerm(date);
                  const evType = eventMap[key];
                  const isStart = date.toDateString() === start.toDateString();
                  const isEnd   = date.toDateString() === end.toDateString();
                  let cls = 'w-6 h-6 flex items-center justify-center text-[10px] rounded-full mx-auto ';
                  if (evType === 'holiday') cls += 'bg-rose-500 text-white font-bold';
                  else if (evType === 'exam') cls += 'bg-blue-500 text-white font-bold';
                  else if (evType === 'event') cls += 'bg-emerald-500 text-white font-bold';
                  else if (isStart || isEnd) cls += 'bg-slate-800 text-white font-bold';
                  else if (inTerm) cls += 'bg-slate-100 text-slate-700';
                  else cls += 'text-slate-300';

                  return (
                    <div key={day} className="py-px">
                      <div className={cls} title={evType ? `${evType}: ${key}` : ''}>
                        {day}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-1">
        {[
          { dot: 'bg-slate-800', label: 'Term start/end' },
          { dot: 'bg-slate-100 border border-slate-300', label: 'School day' },
          { dot: 'bg-rose-500', label: 'Holiday' },
          { dot: 'bg-blue-500', label: 'Exam day' },
          { dot: 'bg-emerald-500', label: 'Event' },
        ].map(({ dot, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-full inline-block ${dot}`} />
            <span className="text-[10px] text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Event Row ───────────────────────────────────────────── */
const EventRow = ({ ev, onChange, onRemove }) => {
  const meta = getEventMeta(ev.type);
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border ${meta.bg} group`}>
      <input
        type="date"
        value={toInputDate(ev.date)}
        onChange={e => onChange({ ...ev, date: e.target.value })}
        className="flex-shrink-0 text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400"
      />
      <input
        type="text"
        value={ev.name}
        placeholder="Event name…"
        onChange={e => onChange({ ...ev, name: e.target.value })}
        className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400"
      />
      <select
        value={ev.type}
        onChange={e => onChange({ ...ev, type: e.target.value })}
        className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400"
      >
        {EVENT_TYPES.map(t => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={onRemove}
        className="p-1 rounded text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
};

/* ─── Term Block ──────────────────────────────────────────── */
const TermBlock = ({ term, index, onChange, onRemove, canRemove }) => {
  const addEvent = () => {
    onChange({
      ...term,
      events: [...term.events, { date: '', name: '', type: 'event', _tempId: Date.now() }],
    });
  };

  const updateEvent = (i, updated) => {
    const events = [...term.events];
    events[i] = updated;
    onChange({ ...term, events });
  };

  const removeEvent = (i) => {
    const events = term.events.filter((_, idx) => idx !== i);
    onChange({ ...term, events });
  };

  const sortedEvents = [...(term.events || [])].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date) - new Date(b.date);
  });

  const termColors = [
    'from-violet-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Term Header */}
      <div className={`bg-gradient-to-r ${termColors[index % 3]} px-5 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-white/80" />
          <span className="font-bold text-white text-sm">{term.name}</span>
          {term.startDate && term.endDate && (
            <span className="text-white/70 text-xs ml-2">
              {fmt(term.startDate)} → {fmt(term.endDate)}
            </span>
          )}
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-white/60 hover:text-white p-1 rounded transition-colors"
            title="Remove term"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Start Date</label>
            <input
              type="date"
              required
              value={toInputDate(term.startDate)}
              onChange={e => onChange({ ...term, startDate: e.target.value })}
              className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">End Date</label>
            <input
              type="date"
              required
              value={toInputDate(term.endDate)}
              onChange={e => onChange({ ...term, endDate: e.target.value })}
              className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>

        {/* Events */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-600">Term Events</p>
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                {EVENT_TYPES.map(t => (
                  <span key={t.value} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${t.bg} ${t.color}`}>
                    {t.value}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={addEvent}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors"
              >
                <Plus size={12} /> Add
              </button>
            </div>
          </div>

          {sortedEvents.length === 0 ? (
            <div className="text-center py-5 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
              No events yet — add holidays, exam days, or other events
            </div>
          ) : (
            <div className="space-y-2">
              {term.events.map((ev, i) => (
                <EventRow
                  key={ev._id || ev._tempId || i}
                  ev={ev}
                  onChange={updated => updateEvent(i, updated)}
                  onRemove={() => removeEvent(i)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Mini Calendar */}
        <MiniCalendar term={term} />
      </div>
    </div>
  );
};

/* ─── Year Form (create / edit) ───────────────────────────── */
const YearForm = ({ initial, onSave, onCancel, isSaving }) => {
  const [name, setName] = useState(initial?.name || '');
  const [terms, setTerms] = useState(
    initial?.terms?.length
      ? initial.terms.map(t => ({
          ...t,
          startDate: toInputDate(t.startDate),
          endDate: toInputDate(t.endDate),
          events: (t.events || []).map(e => ({ ...e, date: toInputDate(e.date) })),
        }))
      : TERM_DEFAULTS
  );

  const addTerm = () => {
    if (terms.length >= 3) return;
    setTerms([...terms, { name: `Term ${terms.length + 1}`, startDate: '', endDate: '', events: [] }]);
  };

  const updateTerm = (i, updated) => {
    const next = [...terms];
    next[i] = updated;
    setTerms(next);
  };

  const removeTerm = (i) => setTerms(terms.filter((_, idx) => idx !== i));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, terms });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Year Name */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Academic Year Name</label>
        <input
          type="text"
          required
          placeholder="e.g. 2027/2028"
          value={name}
          onChange={e => setName(e.target.value)}
          className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      {/* Terms */}
      <div className="space-y-4">
        {terms.map((term, i) => (
          <TermBlock
            key={i}
            term={term}
            index={i}
            onChange={updated => updateTerm(i, updated)}
            onRemove={() => removeTerm(i)}
            canRemove={terms.length > 1}
          />
        ))}

        {terms.length < 3 && (
          <button
            type="button"
            onClick={addTerm}
            className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-semibold text-slate-400 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Add Another Term
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-sm text-slate-600 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          {isSaving ? (
            <><span className="animate-pulse">Saving…</span></>
          ) : (
            <><CheckCircle2 size={16} /> Save Academic Year</>
          )}
        </button>
      </div>
    </form>
  );
};

/* ─── Year Card ───────────────────────────────────────────── */
const YearCard = ({ year, isSelected, onSelect, onSetCurrent, onDelete, isSettingCurrent, isDeleting }) => {
  const termCount = year.terms?.length || 0;
  const eventCount = year.terms?.reduce((acc, t) => acc + (t.events?.length || 0), 0) || 0;

  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-2xl border cursor-pointer transition-all group ${
        isSelected
          ? 'border-emerald-500 bg-emerald-50/50 shadow-sm shadow-emerald-100'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900 text-sm">{year.name}</span>
            {year.isCurrent && (
              <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                <Star size={9} fill="white" /> ACTIVE
              </span>
            )}
          </div>
          <div className="flex gap-3 mt-1.5">
            <span className="text-[11px] text-slate-500">{termCount} term{termCount !== 1 ? 's' : ''}</span>
            {eventCount > 0 && (
              <span className="text-[11px] text-slate-400">{eventCount} event{eventCount !== 1 ? 's' : ''}</span>
            )}
          </div>
          {/* Term date range pills */}
          <div className="mt-2 space-y-1">
            {year.terms?.map((t, i) => (
              <div key={i} className="text-[10px] text-slate-500 flex gap-1 items-center">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${['bg-violet-500','bg-emerald-500','bg-amber-500'][i]}`} />
                <span className="font-medium">{t.name}:</span>
                <span>{fmt(t.startDate)} – {fmt(t.endDate)}</span>
              </div>
            ))}
          </div>
        </div>
        <ChevronRight size={16} className={`flex-shrink-0 mt-0.5 transition-colors ${isSelected ? 'text-emerald-600' : 'text-slate-300 group-hover:text-slate-500'}`} />
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100" onClick={e => e.stopPropagation()}>
        {!year.isCurrent && (
          <button
            onClick={onSetCurrent}
            disabled={isSettingCurrent}
            className="flex-1 text-[11px] font-bold py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors disabled:opacity-50"
          >
            {isSettingCurrent ? 'Setting…' : '✓ Set as Active'}
          </button>
        )}
        {!year.isCurrent && (
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
            title="Delete year"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
};

/* ─── Main Page ───────────────────────────────────────────── */
const AcademicYearPage = () => {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState('list'); // 'list' | 'create' | 'edit'
  const [selectedYear, setSelectedYear] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const { data: years = [], isLoading } = useQuery({
    queryKey: ['academicYearsList'],
    queryFn: async () => (await api.get('/academic-years')).data?.data || [],
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/academic-years', payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['academicYearsList'] });
      setMode('list');
      showToast(`Academic year "${res.data.data.name}" created successfully`);
    },
    onError: (err) => showToast(err.response?.data?.message || 'Failed to create', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.patch(`/academic-years/${id}`, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['academicYearsList'] });
      setMode('list');
      setSelectedYear(null);
      showToast(`"${res.data.data.name}" updated successfully`);
    },
    onError: (err) => showToast(err.response?.data?.message || 'Failed to update', 'error'),
  });

  const setCurrentMutation = useMutation({
    mutationFn: (id) => api.patch(`/academic-years/${id}/set-current`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['academicYearsList'] });
      showToast(`"${res.data.data.name}" is now the active academic year`);
    },
    onError: (err) => showToast(err.response?.data?.message || 'Failed', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/academic-years/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['academicYearsList'] });
      if (selectedYear?._id === id) { setSelectedYear(null); setMode('list'); }
      showToast('Academic year deleted');
    },
    onError: (err) => showToast(err.response?.data?.message || 'Cannot delete', 'error'),
  });

  const handleSave = (payload) => {
    if (mode === 'edit' && selectedYear) {
      updateMutation.mutate({ id: selectedYear._id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const activeYear = useMemo(() => years.find(y => y.isCurrent), [years]);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Academic Year Management</h2>
          <p className="text-sm text-slate-500 mt-1">Create academic years, configure terms, and schedule events</p>
        </div>
        {mode === 'list' && (
          <button
            onClick={() => { setSelectedYear(null); setMode('create'); }}
            className="flex items-center gap-2 py-2 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm shadow-sm transition-colors"
          >
            <Plus size={16} /> New Academic Year
          </button>
        )}
        {mode !== 'list' && (
          <button
            onClick={() => { setMode('list'); setSelectedYear(null); }}
            className="flex items-center gap-2 py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-sm transition-colors"
          >
            <ArrowLeft size={16} /> Back to List
          </button>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium animate-fade-in ${
          toast.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Active Year Banner */}
      {mode === 'list' && activeYear && (
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-800 to-teal-700 rounded-2xl text-white shadow-md">
          <Star size={18} className="flex-shrink-0" fill="white" />
          <div>
            <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">Currently Active</p>
            <p className="font-bold">{activeYear.name} — {activeYear.terms?.length} term{activeYear.terms?.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      {mode === 'list' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Year List */}
          <div className="lg:col-span-1 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">All Academic Years</p>
            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : years.length === 0 ? (
              <div className="text-center py-12 bg-white border border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm">
                No academic years yet.<br />
                <button
                  onClick={() => setMode('create')}
                  className="mt-2 text-emerald-700 font-semibold hover:underline"
                >
                  Create the first one →
                </button>
              </div>
            ) : (
              years.map(year => (
                <YearCard
                  key={year._id}
                  year={year}
                  isSelected={selectedYear?._id === year._id}
                  onSelect={() => { setSelectedYear(year); }}
                  onSetCurrent={() => setCurrentMutation.mutate(year._id)}
                  onDelete={() => deleteMutation.mutate(year._id)}
                  isSettingCurrent={setCurrentMutation.isPending && setCurrentMutation.variables === year._id}
                  isDeleting={deleteMutation.isPending && deleteMutation.variables === year._id}
                />
              ))
            )}
          </div>

          {/* Right: Year Detail */}
          <div className="lg:col-span-2">
            {selectedYear ? (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{selectedYear.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{selectedYear.terms?.length} term(s) · click Edit to modify</p>
                  </div>
                  <button
                    onClick={() => setMode('edit')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
                  >
                    <Pencil size={12} /> Edit Year
                  </button>
                </div>

                {/* Term detail cards */}
                <div className="space-y-4">
                  {selectedYear.terms?.map((term, i) => {
                    const termColors = ['bg-violet-500','bg-emerald-500','bg-amber-500'];
                    return (
                      <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className={`px-4 py-2 flex items-center gap-2 ${termColors[i]} bg-opacity-10`} style={{ background: ['#f5f3ff','#f0fdf4','#fffbeb'][i] }}>
                          <div className={`w-2.5 h-2.5 rounded-full ${termColors[i]}`} />
                          <span className="font-bold text-sm text-slate-800">{term.name}</span>
                          <span className="text-xs text-slate-500 ml-auto">{fmt(term.startDate)} → {fmt(term.endDate)}</span>
                        </div>
                        <div className="px-4 py-3">
                          {term.events?.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No events scheduled</p>
                          ) : (
                            <div className="space-y-1.5">
                              {[...term.events].sort((a,b) => new Date(a.date) - new Date(b.date)).map((ev, j) => {
                                const meta = getEventMeta(ev.type);
                                const Icon = meta.icon;
                                return (
                                  <div key={j} className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border ${meta.bg}`}>
                                    <Icon size={12} className={meta.color} />
                                    <span className={`font-bold ${meta.color} uppercase text-[9px]`}>{ev.type}</span>
                                    <span className="text-slate-600 font-medium">{ev.name}</span>
                                    <span className="ml-auto text-slate-400">{fmt(ev.date)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <MiniCalendar term={{ ...term, startDate: term.startDate, endDate: term.endDate }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-white border border-dashed border-slate-200 rounded-2xl text-slate-400">
                <CalendarDays size={40} className="mb-3 opacity-30" />
                <p className="text-sm font-medium">Select an academic year to view details</p>
                <p className="text-xs mt-1">or create a new one</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Create / Edit Form */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 max-w-4xl">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-6">
            {mode === 'edit' ? `Edit: ${selectedYear?.name}` : 'Create New Academic Year'}
          </h3>
          <YearForm
            initial={mode === 'edit' ? selectedYear : null}
            onSave={handleSave}
            onCancel={() => { setMode('list'); setSelectedYear(null); }}
            isSaving={isSaving}
          />
        </div>
      )}
    </div>
  );
};

export default AcademicYearPage;
