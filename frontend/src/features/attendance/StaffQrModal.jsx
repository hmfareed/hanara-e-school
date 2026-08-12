import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Save,
  Printer,
  RefreshCw,
  Trash2,
  X,
  User,
  Building2,
  ShieldAlert,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import api from '../../services/api';

const StaffQrModal = ({ staff, isOpen, onClose }) => {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (isOpen && staff?._id) {
      fetchStaffQr();
    } else {
      setQrData(null);
      setMessage({ text: '', type: '' });
    }
  }, [isOpen, staff]);

  const fetchStaffQr = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/staff-attendance/staff/${staff._id}/qr`);
      if (res.data?.success) {
        setQrData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching staff QR code:', err);
      setMessage({ text: 'Failed to load QR code', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setActionLoading(true);
      const res = await api.post(`/staff-attendance/staff/${staff._id}/qr/generate`);
      if (res.data?.success) {
        setQrData(res.data.data);
        setMessage({ text: 'New QR attendance credential generated successfully', type: 'success' });
      }
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Failed to generate QR code', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!window.confirm('Are you sure you want to revoke this staff member\'s QR code? It will immediately stop working at scanners.')) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.post(`/staff-attendance/staff/${staff._id}/qr/revoke`);
      if (res.data?.success) {
        setQrData(null);
        setMessage({ text: 'QR credential revoked', type: 'warning' });
      }
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Failed to revoke QR code', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qrData?.qrCodeDataUrl) return;
    const link = document.createElement('a');
    link.href = qrData.qrCodeDataUrl;
    link.download = `Staff-QR-${staff.staffId || staff.firstName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || !staff) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-wide">Staff Attendance Credential</h3>
              <p className="text-xs text-slate-400">Official QR Attendance Pass</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {message.text && (
            <div
              className={`p-3.5 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
                message.type === 'error'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : message.type === 'warning'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{message.text}</span>
            </div>
          )}

          {/* Printable Attendance ID Pass Card */}
          <div
            id="printable-staff-card"
            className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-6 text-center space-y-4 shadow-inner relative overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">HANARA SMS</span>
              <span className="text-[10px] font-black uppercase text-emerald-600 px-2 py-0.5 bg-emerald-100 rounded-md">
                STAFF PASS
              </span>
            </div>

            {/* Staff Details */}
            <div className="flex items-center space-x-4 text-left">
              <img
                src={
                  staff.photoUrl ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                    staff.firstName || 'Staff'
                  )}`
                }
                alt={staff.firstName}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-sm shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-black text-slate-900 text-base truncate">
                  {staff.title ? `${staff.title} ` : ''}
                  {staff.firstName} {staff.lastName}
                </h4>
                <p className="text-xs font-bold text-emerald-600">{staff.staffId || 'HAN-2026-STAFF'}</p>
                <p className="text-[11px] text-slate-500 font-medium truncate">
                  {staff.department || staff.role || 'Staff Member'}
                </p>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 inline-block shadow-sm">
              {loading ? (
                <div className="w-44 h-44 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <span className="text-xs font-semibold">Generating QR...</span>
                </div>
              ) : qrData?.qrCodeDataUrl ? (
                <img
                  src={qrData.qrCodeDataUrl}
                  alt="Staff QR Code"
                  className="w-44 h-44 object-contain mx-auto"
                />
              ) : (
                <div className="w-44 h-44 flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <QrCode className="w-10 h-10 text-slate-300" />
                  <span className="text-xs font-bold text-slate-500">No Active QR Credential</span>
                </div>
              )}
            </div>

            <p className="text-[10px] text-slate-400 font-medium">
              Scan at reception or kiosk scanner every morning for attendance verification
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {qrData?.qrCodeDataUrl ? (
              <>
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center space-x-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
                >
                  <Save className="w-4 h-4" />
                  <span>Download QR</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center justify-center space-x-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Pass</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={actionLoading}
                className="col-span-2 flex items-center justify-center space-x-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-emerald-600/20"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                <span>Generate QR Credential</span>
              </button>
            )}
          </div>

          {qrData?.qrCodeDataUrl && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <button
                onClick={handleGenerate}
                disabled={actionLoading}
                className="flex items-center space-x-1.5 text-slate-600 hover:text-slate-900 text-xs font-bold transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                <span>Regenerate QR</span>
              </button>

              <button
                onClick={handleRevoke}
                disabled={actionLoading}
                className="flex items-center space-x-1.5 text-rose-600 hover:text-rose-700 text-xs font-bold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Revoke Credential</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffQrModal;
