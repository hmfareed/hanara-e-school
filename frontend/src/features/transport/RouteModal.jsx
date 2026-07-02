import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ArrowUpDown } from 'lucide-react';
import api from '../../services/api';

const RouteModal = ({ route, onClose, onSaved }) => {
  const [name, setName] = useState('');
  const [pickupTime, setPickupTime] = useState('07:00 AM');
  const [dropoffTime, setDropoffTime] = useState('03:00 PM');
  const [stops, setStops] = useState([{ name: '', order: 1, approxPickupTime: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (route) {
      setName(route.name || '');
      setPickupTime(route.pickupTime || '07:00 AM');
      setDropoffTime(route.dropoffTime || '03:00 PM');
      setStops(
        route.stops && route.stops.length > 0
          ? [...route.stops].sort((a, b) => a.order - b.order)
          : [{ name: '', order: 1, approxPickupTime: '' }]
      );
    }
  }, [route]);

  const handleAddStop = () => {
    setStops((prev) => [
      ...prev,
      { name: '', order: prev.length + 1, approxPickupTime: '' },
    ]);
  };

  const handleRemoveStop = (index) => {
    if (stops.length === 1) return;
    const filtered = stops.filter((_, idx) => idx !== index);
    // Recalculate orders
    const updated = filtered.map((stop, idx) => ({
      ...stop,
      order: idx + 1,
    }));
    setStops(updated);
  };

  const handleStopChange = (index, field, value) => {
    const updated = [...stops];
    updated[index][field] = value;
    setStops(updated);
  };

  const moveStop = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === stops.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...stops];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Reset orders
    const ordered = updated.map((stop, idx) => ({
      ...stop,
      order: idx + 1,
    }));
    setStops(ordered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validations
    if (!name.trim()) {
      setError('Route name is required');
      return;
    }
    const invalidStop = stops.find((s) => !s.name.trim());
    if (invalidStop) {
      setError('All stop names must be filled out');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        pickupTime: pickupTime.trim(),
        dropoffTime: dropoffTime.trim(),
        stops: stops.map((s) => ({
          name: s.name.trim(),
          order: s.order,
          approxPickupTime: s.approxPickupTime.trim(),
        })),
      };

      if (route) {
        const res = await api.patch(`/transport/routes/${route._id}`, payload);
        onSaved(res.data.data, 'Route updated successfully');
      } else {
        const res = await api.post('/transport/routes', payload);
        onSaved(res.data.data, 'Route created successfully');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save route');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">
            {route ? 'Edit Route Details' : 'Create New Route'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Route Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Route A - West"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Pickup Time
              </label>
              <input
                type="text"
                placeholder="e.g. 07:00 AM"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Dropoff Time
              </label>
              <input
                type="text"
                placeholder="e.g. 03:00 PM"
                value={dropoffTime}
                onChange={(e) => setDropoffTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Stops Sequence <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddStop}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> Add Stop
              </button>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {stops.map((stop, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3"
                >
                  <div className="text-xs font-bold text-slate-400 w-6 text-center select-none">
                    #{stop.order}
                  </div>
                  
                  <div className="flex-1">
                    <input
                      type="text"
                      required
                      placeholder="Stop name / Landmark"
                      value={stop.name}
                      onChange={(e) => handleStopChange(index, 'name', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <div className="w-32">
                    <input
                      type="text"
                      placeholder="Pickup time"
                      value={stop.approxPickupTime}
                      onChange={(e) =>
                        handleStopChange(index, 'approxPickupTime', e.target.value)
                      }
                      className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-center"
                    />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveStop(index, 'up')}
                      className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-40 rounded hover:bg-slate-200"
                    >
                      <ArrowUpDown size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={stops.length === 1}
                      onClick={() => handleRemoveStop(index)}
                      className="p-1.5 text-red-500 hover:text-red-700 disabled:opacity-45 rounded hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-bold bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Route'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RouteModal;
