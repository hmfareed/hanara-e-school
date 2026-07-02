import React, { useState, useEffect, useCallback } from 'react';
import { Bus, MapPin, ClipboardList, Plus, Edit, Trash2, Printer, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import BusModal from './BusModal';
import RouteModal from './RouteModal';

const TransportPage = () => {
  const { hasRole, user } = useAuth();
  const [activeTab, setActiveTab] = useState('buses');
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState('');
  const [manifest, setManifest] = useState(null);
  
  // Modals
  const [showBusModal, setShowBusModal] = useState(false);
  const [selectedBus, setSelectedBus] = useState(null);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  
  // Loading & error
  const [loading, setLoading] = useState(true);
  const [manifestLoading, setManifestLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [busesRes, routesRes] = await Promise.all([
        api.get('/transport/buses'),
        api.get('/transport/routes'),
      ]);
      setBuses(busesRes.data?.data || []);
      setRoutes(routesRes.data?.data || []);

      // Default selected bus for manifest if none selected
      const allBuses = busesRes.data?.data || [];
      if (allBuses.length > 0 && !selectedBusId) {
        // If logged in user is driver, try to select their bus automatically
        const driverBus = allBuses.find(b => b.driver?._id === user?.refStaff);
        if (driverBus) {
          setSelectedBusId(driverBus._id);
        } else {
          setSelectedBusId(allBuses[0]._id);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load transport details');
    } finally {
      setLoading(false);
    }
  }, [selectedBusId, user]);

  useEffect(() => {
    loadData();
  }, []); // Initial load

  const loadManifest = useCallback(async (busId) => {
    if (!busId) return;
    setManifestLoading(true);
    try {
      const res = await api.get(`/transport/buses/${busId}/manifest`);
      setManifest(res.data?.data || null);
    } catch (err) {
      setError('Failed to load bus manifest');
    } finally {
      setManifestLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBusId) {
      loadManifest(selectedBusId);
    }
  }, [selectedBusId, loadManifest]);

  const handleBusSaved = () => {
    setShowBusModal(false);
    setSelectedBus(null);
    loadData();
  };

  const handleRouteSaved = () => {
    setShowRouteModal(false);
    setSelectedRoute(null);
    loadData();
  };

  const handleDeleteBus = async (id) => {
    if (window.confirm('Are you sure you want to delete this bus?')) {
      try {
        await api.delete(`/transport/buses/${id}`);
        loadData();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete bus');
      }
    }
  };

  const handleDeleteRoute = async (id) => {
    if (window.confirm('Are you sure you want to delete this route? This will unassign any buses.')) {
      try {
        await api.delete(`/transport/routes/${id}`);
        loadData();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete route');
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isEditable = hasRole(['superadmin', 'admin']);

  // If driver, force active tab to manifest
  useEffect(() => {
    if (user?.role === 'driver') {
      setActiveTab('manifests');
    }
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Header section (hidden on print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Transport & Fleet Management</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage school buses, routes, driver scheduling, and student registers
          </p>
        </div>
      </div>

      {/* Tabs Menu (hidden on print) */}
      <div className="flex border-b border-slate-200 gap-6 print:hidden">
        {user?.role !== 'driver' && (
          <>
            <button
              onClick={() => setActiveTab('buses')}
              className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'buses'
                  ? 'border-emerald-800 text-emerald-800'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Bus size={16} /> Buses
            </button>
            <button
              onClick={() => setActiveTab('routes')}
              className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'routes'
                  ? 'border-emerald-800 text-emerald-800'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <MapPin size={16} /> Routes & Stops
            </button>
          </>
        )}
        <button
          onClick={() => setActiveTab('manifests')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'manifests'
              ? 'border-emerald-800 text-emerald-800'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <ClipboardList size={16} /> Passenger Manifests
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm print:hidden">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-800 border-t-transparent"></div>
          <p className="text-sm font-semibold text-slate-400">Loading transport system...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* BUSES TAB */}
          {activeTab === 'buses' && user?.role !== 'driver' && (
            <div className="space-y-4">
              <div className="flex justify-end print:hidden">
                {isEditable && (
                  <button
                    onClick={() => {
                      setSelectedBus(null);
                      setShowBusModal(true);
                    }}
                    className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-sm shadow-sm transition-colors cursor-pointer"
                  >
                    <Plus size={16} /> Add Bus
                  </button>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-4 px-6">Plate Number</th>
                      <th className="py-4 px-6">Capacity</th>
                      <th className="py-4 px-6">Route</th>
                      <th className="py-4 px-6">Driver</th>
                      <th className="py-4 px-6">Students</th>
                      {isEditable && <th className="py-4 px-6 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {buses.length > 0 ? (
                      buses.map((bus) => (
                        <tr key={bus._id} className="hover:bg-slate-50/30">
                          <td className="py-4 px-6 font-mono font-bold text-slate-900">
                            {bus.plateNumber}
                          </td>
                          <td className="py-4 px-6 font-semibold">{bus.capacity} seats</td>
                          <td className="py-4 px-6">
                            {bus.route ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                                {bus.route.name}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">No Route</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            {bus.driver ? (
                              <div className="font-semibold text-slate-800">
                                {bus.driver.firstName} {bus.driver.lastName}
                                <span className="block text-xs text-slate-400 font-medium font-mono">
                                  {bus.driver.phone}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">No Driver</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-bold text-slate-800">{bus.studentCount || 0}</span>
                            <span className="text-slate-400 text-xs"> / {bus.capacity}</span>
                          </td>
                          {isEditable && (
                            <td className="py-4 px-6 text-right space-x-1.5">
                              <button
                                onClick={() => {
                                  setSelectedBus(bus);
                                  setShowBusModal(true);
                                }}
                                className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteBus(bus._id)}
                                className="inline-flex items-center justify-center p-2 rounded-lg border border-red-200 hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-400">
                          No buses registered. Click "Add Bus" to setup.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ROUTES TAB */}
          {activeTab === 'routes' && user?.role !== 'driver' && (
            <div className="space-y-4">
              <div className="flex justify-end print:hidden">
                {isEditable && (
                  <button
                    onClick={() => {
                      setSelectedRoute(null);
                      setShowRouteModal(true);
                    }}
                    className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-sm shadow-sm transition-colors cursor-pointer"
                  >
                    <Plus size={16} /> Add Route
                  </button>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-4 px-6">Route Name</th>
                      <th className="py-4 px-6">Pickup / Dropoff Times</th>
                      <th className="py-4 px-6">Stops Sequence</th>
                      {isEditable && <th className="py-4 px-6 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {routes.length > 0 ? (
                      routes.map((rt) => (
                        <tr key={rt._id} className="hover:bg-slate-50/30">
                          <td className="py-4 px-6 font-bold text-slate-900">{rt.name}</td>
                          <td className="py-4 px-6 font-semibold">
                            <span className="block text-slate-800">AM: {rt.pickupTime || '07:00 AM'}</span>
                            <span className="block text-xs text-slate-400">PM: {rt.dropoffTime || '03:00 PM'}</span>
                          </td>
                          <td className="py-4 px-6 max-w-md">
                            <div className="flex flex-wrap gap-1.5">
                              {rt.stops && rt.stops.length > 0 ? (
                                rt.stops
                                  .sort((a, b) => a.order - b.order)
                                  .map((stop) => (
                                    <span
                                      key={stop._id}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700"
                                    >
                                      <span className="text-[10px] text-slate-400">#{stop.order}</span>
                                      {stop.name}
                                      {stop.approxPickupTime && (
                                        <span className="text-[9px] bg-slate-200 text-slate-500 rounded px-1 ml-0.5 font-semibold">
                                          {stop.approxPickupTime}
                                        </span>
                                      )}
                                    </span>
                                  ))
                              ) : (
                                <span className="text-slate-400 italic">No stops added</span>
                              )}
                            </div>
                          </td>
                          {isEditable && (
                            <td className="py-4 px-6 text-right space-x-1.5">
                              <button
                                onClick={() => {
                                  setSelectedRoute(rt);
                                  setShowRouteModal(true);
                                }}
                                className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteRoute(rt._id)}
                                className="inline-flex items-center justify-center p-2 rounded-lg border border-red-200 hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="py-12 text-center text-slate-400">
                          No routes configured. Click "Add Route" to setup.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PASSENGER MANIFESTS TAB */}
          {activeTab === 'manifests' && (
            <div className="space-y-4">
              {/* Bus Selection dropdown (hidden on print) */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm print:hidden">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-bold text-slate-700">Select Student Bus:</label>
                  <select
                    value={selectedBusId}
                    onChange={(e) => setSelectedBusId(e.target.value)}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white min-w-[200px]"
                  >
                    <option value="">Select bus…</option>
                    {buses.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.plateNumber} — {b.route?.name || 'No Route'}
                      </option>
                    ))}
                  </select>
                </div>
                {manifest && (
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-sm shadow-sm transition-colors cursor-pointer"
                  >
                    <Printer size={16} /> Print Manifest
                  </button>
                )}
              </div>

              {/* Manifest view */}
              {manifestLoading ? (
                <div className="p-12 flex justify-center items-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-800 border-t-transparent"></div>
                </div>
              ) : manifest ? (
                <div className="space-y-6">
                  {/* Bus details banner */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block">
                        Bus / Plate Number
                      </span>
                      <span className="text-lg font-black text-slate-900 font-mono">
                        {manifest.bus.plateNumber}
                      </span>
                      {manifest.bus.route && (
                        <span className="block text-xs text-slate-500 font-medium mt-1">
                          Pickup: {manifest.bus.route.pickupTime} | Dropoff: {manifest.bus.route.dropoffTime}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block">
                        Assigned Route
                      </span>
                      <span className="text-lg font-bold text-slate-800">
                        {manifest.bus.route?.name || (
                          <span className="text-amber-600 italic flex items-center gap-1 text-sm font-semibold mt-1">
                            <AlertTriangle size={14} /> No route assigned
                          </span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block">
                        Bus Driver
                      </span>
                      <span className="text-lg font-bold text-slate-800">
                        {manifest.bus.driver ? (
                          <>
                            {manifest.bus.driver.firstName} {manifest.bus.driver.lastName}
                            <span className="block text-xs font-mono font-medium text-slate-500">
                              {manifest.bus.driver.phone}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400 italic text-sm">No driver assigned</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Stops sequencing list */}
                  {manifest.bus.route?.stops && manifest.bus.route.stops.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Stops Route Order & Pickup times:
                      </h4>
                      <div className="flex flex-wrap gap-2.5">
                        {manifest.bus.route.stops
                          .sort((a, b) => a.order - b.order)
                          .map((stop) => (
                            <div
                              key={stop._id}
                              className="bg-white border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm text-sm"
                            >
                              <div className="h-5 w-5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full flex items-center justify-center border border-emerald-100">
                                {stop.order}
                              </div>
                              <span className="font-semibold text-slate-850">{stop.name}</span>
                              {stop.approxPickupTime && (
                                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 border border-slate-200/50">
                                  {stop.approxPickupTime}
                                </span>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Passengers Table */}
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm text-slate-600">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          <th className="py-4 px-6">Adm #</th>
                          <th className="py-4 px-6">Student Name</th>
                          <th className="py-4 px-6">Class</th>
                          <th className="py-4 px-6">Pickup Stop</th>
                          <th className="py-4 px-6">Guardian Contacts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {manifest.students.length > 0 ? (
                          manifest.students.map((student) => (
                            <tr key={student._id} className="hover:bg-slate-50/30">
                              <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-800">
                                {student.admissionNumber}
                              </td>
                              <td className="py-4 px-6 font-bold text-slate-900">
                                {student.firstName} {student.otherNames ? `${student.otherNames} ` : ''}{' '}
                                {student.lastName}
                              </td>
                              <td className="py-4 px-6">
                                <span className="inline-flex px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-100 text-xs font-medium">
                                  {student.currentClass?.name || 'Unassigned'}
                                </span>
                              </td>
                              <td className="py-4 px-6 font-semibold text-emerald-800">
                                {student.transport?.stop || (
                                  <span className="text-slate-400 italic font-normal">Not specified</span>
                                )}
                              </td>
                              <td className="py-4 px-6 text-xs text-slate-500">
                                {student.guardians && student.guardians.length > 0 ? (
                                  student.guardians.map((g) => (
                                    <div key={g._id} className="font-semibold">
                                      {g.firstName} {g.lastName} ({g.phone})
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-slate-400 italic">No guardians linked</span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="py-12 text-center text-slate-400">
                              No active students assigned to this bus.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Print Layout Header (Strictly visible only during window.print()) */}
                  <div className="hidden print:block p-8 space-y-6">
                    <div className="text-center space-y-1">
                      <h1 className="text-2xl font-black uppercase text-slate-900">Passenger Bus Manifest</h1>
                      <p className="text-sm font-semibold text-slate-500">HANARA SCHOOLS — TAMALE, GHANA</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Generated At: {new Date().toLocaleString('en-GH')}
                      </p>
                    </div>

                    <div className="border-y border-slate-300 py-4 grid grid-cols-3 gap-6 text-sm font-semibold">
                      <div>
                        <span className="text-slate-400 uppercase tracking-wide text-[9px] block">
                          Bus Plate
                        </span>
                        <span className="text-slate-900 font-mono font-bold">
                          {manifest.bus.plateNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 uppercase tracking-wide text-[9px] block">
                          Assigned Route
                        </span>
                        <span className="text-slate-900 font-bold">
                          {manifest.bus.route?.name || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 uppercase tracking-wide text-[9px] block">
                          Assigned Driver
                        </span>
                        <span className="text-slate-900 font-bold">
                          {manifest.bus.driver
                            ? `${manifest.bus.driver.firstName} ${manifest.bus.driver.lastName} (${manifest.bus.driver.phone})`
                            : 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-slate-800">Passenger List:</h3>
                      <table className="w-full text-left text-xs border border-collapse border-slate-300">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                            <th className="py-2.5 px-4 border-r border-slate-300">#</th>
                            <th className="py-2.5 px-4 border-r border-slate-300">Adm #</th>
                            <th className="py-2.5 px-4 border-r border-slate-300">Student Name</th>
                            <th className="py-2.5 px-4 border-r border-slate-300">Class</th>
                            <th className="py-2.5 px-4 border-r border-slate-300">Pickup Stop</th>
                            <th className="py-2.5 px-4">Guardian Contact</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                          {manifest.students.map((student, idx) => (
                            <tr key={student._id}>
                              <td className="py-2 px-4 border-r border-slate-300">{idx + 1}</td>
                              <td className="py-2 px-4 border-r border-slate-300 font-mono">
                                {student.admissionNumber}
                              </td>
                              <td className="py-2 px-4 border-r border-slate-300 font-bold">
                                {student.firstName} {student.lastName}
                              </td>
                              <td className="py-2 px-4 border-r border-slate-300">
                                {student.currentClass?.name}
                              </td>
                              <td className="py-2 px-4 border-r border-slate-300 font-semibold text-emerald-800">
                                {student.transport?.stop}
                              </td>
                              <td className="py-2 px-4">
                                {student.guardians && student.guardians.length > 0
                                  ? `${student.guardians[0].firstName} ${student.guardians[0].lastName} (${student.guardians[0].phone})`
                                  : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-400 bg-white border border-slate-200 rounded-2xl shadow-sm">
                  Please select a bus to load passenger manifest details.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showBusModal && (
        <BusModal bus={selectedBus} onClose={() => setShowBusModal(false)} onSaved={handleBusSaved} />
      )}
      {showRouteModal && (
        <RouteModal
          route={selectedRoute}
          onClose={() => setShowRouteModal(false)}
          onSaved={handleRouteSaved}
        />
      )}
    </div>
  );
};

export default TransportPage;
