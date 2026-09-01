import React from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Award,
  DollarSign,
  Briefcase,
  QrCode,
  Edit,
  ShieldCheck,
  CheckCircle2,
  Clock,
} from 'lucide-react';

const StaffProfileModal = ({ staff, onClose, onOpenQr }) => {
  if (!staff) return null;

  const role = staff.role || 'staff';
  const fullName = `${staff.title ? staff.title + ' ' : ''}${staff.firstName || ''} ${staff.otherNames ? staff.otherNames + ' ' : ''}${staff.lastName || ''}`.trim() || 'Staff Member';

  const getRoleBadge = (r) => {
    switch (r) {
      case 'superadmin':
      case 'headteacher':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'admin':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'teacher':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'accountant':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'driver':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cleaner':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const colorSec = staff.colorSection;
  const secBadge = colorSec === 'Red'
    ? 'bg-rose-50 text-rose-700 border-rose-200'
    : colorSec === 'Yellow'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : colorSec === 'Green'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : colorSec === 'Blue'
    ? 'bg-sky-50 text-sky-700 border-sky-200'
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header Card */}
        <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 pb-7">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          <div className="flex items-start gap-4">
            <div className="h-18 w-18 rounded-2xl bg-white/10 border-2 border-white/20 flex-shrink-0 flex items-center justify-center text-white font-black text-2xl overflow-hidden shadow-lg">
              {staff.photoUrl ? (
                <img
                  src={staff.photoUrl}
                  alt={fullName}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span>{(staff.firstName?.[0] || 'S').toUpperCase()}</span>
              )}
            </div>

            <div className="flex-1 min-w-0 pr-8">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${getRoleBadge(role)}`}>
                  {role === 'superadmin' ? 'Headteacher' : role}
                </span>
                <span className="font-mono text-xs text-emerald-300 font-semibold">
                  {staff.staffId || staff.staffCode || (staff._id ? `ID: ${String(staff._id).slice(-6)}` : '')}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1 leading-snug truncate">
                {fullName}
              </h2>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-300">
                <span className="capitalize">{staff.gender || 'Not specified'}</span>
                {staff.employmentStatus && (
                  <>
                    <span>•</span>
                    <span className="capitalize font-semibold text-emerald-400">
                      {staff.employmentStatus}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Color Section & Role */}
          {colorSec && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">House / Color Section</span>
                <span className="text-xs font-bold text-slate-800">{staff.sectionRole || 'Patron'}</span>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${secBadge}`}>
                <span className={`w-2 h-2 rounded-full ${colorSec === 'Red' ? 'bg-red-500' : colorSec === 'Yellow' ? 'bg-amber-400' : colorSec === 'Green' ? 'bg-emerald-500' : 'bg-sky-500'}`} />
                {colorSec} Section
              </span>
            </div>
          )}

          {/* Contact Information */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <a
                href={staff.phone ? `tel:${staff.phone}` : undefined}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/60 hover:bg-slate-100 transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                  <Phone size={15} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Phone</span>
                  <span className="text-xs font-semibold text-slate-800 truncate block">
                    {staff.phone || 'Not provided'}
                  </span>
                </div>
              </a>

              <a
                href={staff.email ? `mailto:${staff.email}` : undefined}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/60 hover:bg-slate-100 transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                  <Mail size={15} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Email</span>
                  <span className="text-xs font-semibold text-slate-800 truncate block">
                    {staff.email || 'Not provided'}
                  </span>
                </div>
              </a>

              {staff.address && (
                <div className="sm:col-span-2 flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  <div className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                    <MapPin size={15} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Address</span>
                    <span className="text-xs font-semibold text-slate-800 truncate block">
                      {staff.address}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Professional & Employment Information */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Employment & Qualifications</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Qualification</span>
                <span className="font-semibold text-slate-800 block truncate">{staff.qualification || 'N/A'}</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Employed Date</span>
                <span className="font-semibold text-slate-800 block truncate">
                  {staff.employmentDate ? new Date(staff.employmentDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Base Salary</span>
                <span className="font-bold text-emerald-800 block truncate">
                  {(staff.baseSalary || 0) > 0 ? `${Number(staff.baseSalary).toFixed(2)} GHS` : 'Not Set'}
                </span>
              </div>

              {staff.dob && (
                <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Date of Birth</span>
                  <span className="font-semibold text-slate-800 block truncate">
                    {new Date(staff.dob).toLocaleDateString()}
                  </span>
                </div>
              )}

              {staff.branch && (
                <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Branch Campus</span>
                  <span className="font-semibold text-slate-800 block truncate">
                    {staff.branch}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          {onOpenQr ? (
            <button
              onClick={() => {
                onClose();
                onOpenQr(staff);
              }}
              className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 font-bold text-xs text-emerald-800 transition-colors cursor-pointer"
            >
              <QrCode size={14} />
              <span>Staff QR Pass</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
            {staff._id && (
              <Link
                to={`/staff/edit/${staff._id}`}
                onClick={onClose}
                className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shadow-sm"
              >
                <Edit size={14} />
                <span>Edit Staff</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffProfileModal;
