import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../../services/api';

const BusModal = ({ bus, onClose, onSaved }) => {
  const [plateNumber, setPlateNumber] = useState('');
  const [capacity, setCapacity] = useState(30);
  const [driver, setDriver] = useState('');
  const [route, setRoute] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [driversRes, routesRes] = await Promise.all([
          api.get('/staff', { params: { role: 'driver', limit: 100 } }),
          api.get('/transport/routes'),
        ]);
        setDrivers(driversRes.data?.data || []);
        setRoutes(routesRes.data?.data || []);
      } catch (err) {
        setError('Failed to load drivers or routes');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    if (bus) {
      setPlateNumber(bus.plateNumber || '');
      setCapacity(bus.capacity || 30);
      setDriver(bus.driver?._id || bus.driver || '');
      setRoute(bus.route?._id || bus.route || '');
    }
  }, [bus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!plateNumber.trim()) {
      setError('Plate number is required');
      return;
    }
    if (capacity <= 0) {
      setError('Capacity must be greater than 0');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        plateNumber: plateNumber.trim(),
        capacity: parseInt(capacity),
        driver: driver || null,
        route: route || null,
      };

      if (bus) {
        const res = await api.patch(`/transport/buses/${bus._id}`, payload);
        onSaved(res.data.data, 'Bus updated successfully');
      } else {
        const res = await api.post('/transport/buses', payload);
        onSaved(res.data.data, 'Bus created successfully');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save bus');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">
            {bus ? 'Edit Bus Details' : 'Register New Bus'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-800 border-t-transparent"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Plate Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. GR-2943-26"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Capacity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="e.g. 30"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Assigned Driver
              </label>
              <select
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">Unassigned</option>
                {drivers.map((drv) => (
                  <option key={drv._id} value={drv._id}>
                    {drv.firstName} {drv.lastName} ({drv.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Assigned Route
              </label>
              <select
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">Unassigned</option>
                {routes.map((rt) => (
                  <option key={rt._id} value={rt._id}>
                    {rt.name} (Pick: {rt.pickupTime} / Drop: {rt.dropoffTime})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
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
                {saving ? 'Saving...' : 'Save Bus'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default BusModal;
