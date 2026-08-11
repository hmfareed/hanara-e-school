import React, { useState } from 'react';
import { X, Receipt, Save, AlertCircle, Loader2, DollarSign } from 'lucide-react';
import api from '../../services/api';

const DailyFeeConfigModal = ({ student, onClose, onSaved }) => {
  const currentConfig = student?.dailyFeeConfig || {};

  const [planType, setPlanType] = useState(currentConfig.planType || (student?.transport?.usesBus ? 'both_daily' : 'feeding_only_daily'));
  const [feedingPlan, setFeedingPlan] = useState(currentConfig.feedingPlan || (planType.includes('weekly') ? 'weekly' : 'daily'));
  const [feedingWeeklyAmount, setFeedingWeeklyAmount] = useState(currentConfig.feedingWeeklyAmount ?? 20);
  const [busPlan, setBusPlan] = useState(currentConfig.busPlan || (student?.transport?.usesBus ? 'daily' : 'none'));
  const [busWeeklyAmount, setBusWeeklyAmount] = useState(currentConfig.busWeeklyAmount ?? 25);
  const [customFeedingRate, setCustomFeedingRate] = useState(currentConfig.customFeedingRate ?? '');
  const [customBusRate, setCustomBusRate] = useState(currentConfig.customBusRate ?? '');
  const [notes, setNotes] = useState(currentConfig.notes || '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handlePlanTypePresetChange = (type) => {
    setPlanType(type);
    if (type === 'both_daily') {
      setFeedingPlan('daily');
      setBusPlan('daily');
    } else if (type === 'feeding_only_daily') {
      setFeedingPlan('daily');
      setBusPlan('none');
    } else if (type === 'bus_only_daily') {
      setFeedingPlan('exempt');
      setBusPlan('daily');
    } else if (type === 'feeding_weekly_bus_daily') {
      setFeedingPlan('weekly');
      setBusPlan('daily');
    } else if (type === 'feeding_weekly_only') {
      setFeedingPlan('weekly');
      setBusPlan('none');
    } else if (type === 'both_weekly') {
      setFeedingPlan('weekly');
      setBusPlan('weekly');
    } else if (type === 'exempt') {
      setFeedingPlan('exempt');
      setBusPlan('none');
    }
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const payload = {
        dailyFeeConfig: {
          planType,
          feedingPlan,
          feedingWeeklyAmount: parseFloat(feedingWeeklyAmount) || 0,
          busPlan,
          busWeeklyAmount: parseFloat(busWeeklyAmount) || 0,
          customFeedingRate: customFeedingRate !== '' ? parseFloat(customFeedingRate) : null,
          customBusRate: customBusRate !== '' ? parseFloat(customBusRate) : null,
          notes,
        },
      };

      await api.patch(`/students/${student._id}`, payload);
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update fee collection configuration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
              <Receipt size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Fee Collection Configuration</h3>
              <p className="text-xs text-slate-300">
                {student?.firstName} {student?.lastName} ({student?.admissionNumber})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Quick Plan Preset Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Fee Collection Plan Category
            </label>
            <select
              value={planType}
              onChange={(e) => handlePlanTypePresetChange(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
            >
              <option value="both_daily">Both Feeding & Transport Bus (Daily 9.00 GHS)</option>
              <option value="feeding_only_daily">Feeding Fee Only (Daily 4.00 GHS)</option>
              <option value="bus_only_daily">Transport Bus Fare Only (Daily 5.00 GHS)</option>
              <option value="feeding_weekly_bus_daily">Feeding Weekly (20 GHS/wk) + Bus Daily (5 GHS/day)</option>
              <option value="feeding_weekly_only">Feeding Weekly Only (20 GHS/wk)</option>
              <option value="both_weekly">Both Feeding & Bus (Weekly)</option>
              <option value="exempt">Fee Exempt / Free</option>
            </select>
          </div>

          {/* Detailed Plan Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            {/* Feeding Plan */}
            <div className="space-y-2">
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                Feeding Plan
              </label>
              <select
                value={feedingPlan}
                onChange={(e) => setFeedingPlan(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white"
              >
                <option value="daily">Daily (Standard 4.00 GHS/day)</option>
                <option value="weekly">Weekly Fee (20.00 GHS/wk)</option>
                <option value="exempt">Exempt (0.00 GHS)</option>
              </select>

              {feedingPlan === 'weekly' && (
                <div className="pt-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Weekly Feeding Fee (GHS)</label>
                  <input
                    type="number"
                    value={feedingWeeklyAmount}
                    onChange={(e) => setFeedingWeeklyAmount(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-800 bg-white mt-0.5"
                  />
                </div>
              )}
            </div>

            {/* Bus Transport Plan */}
            <div className="space-y-2">
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                Transport Bus Plan
              </label>
              <select
                value={busPlan}
                onChange={(e) => setBusPlan(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white"
              >
                <option value="daily">Daily Fee (Standard 5.00 GHS/day)</option>
                <option value="weekly">Weekly Fee (25.00 GHS/wk)</option>
                <option value="none">None (Walks / No Bus)</option>
              </select>

              {busPlan === 'weekly' && (
                <div className="pt-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Weekly Bus Fee (GHS)</label>
                  <input
                    type="number"
                    value={busWeeklyAmount}
                    onChange={(e) => setBusWeeklyAmount(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-800 bg-white mt-0.5"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Optional Custom Rate Overrides */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Custom Daily Rate Overrides (Optional)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-semibold text-slate-500 block mb-1">Custom Feeding Rate (GHS)</span>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Default (4.00)"
                  value={customFeedingRate}
                  onChange={(e) => setCustomFeedingRate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white"
                />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 block mb-1">Custom Bus Rate (GHS)</span>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Default (5.00)"
                  value={customBusRate}
                  onChange={(e) => setCustomBusRate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Special Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Payment & Fee Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Student pays 20 GHS for feeding every Monday morning and 5 GHS daily for transport..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors cursor-pointer shadow-sm disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>Save Fee Configuration</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyFeeConfigModal;
