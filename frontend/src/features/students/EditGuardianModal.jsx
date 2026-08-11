import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, AlertCircle, CheckCircle, User } from 'lucide-react';
import api from '../../services/api';

const EditGuardianModal = ({ isOpen, onClose, guardian, studentId }) => {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    relationship: 'father',
    phone: '',
    altPhone: '',
    email: '',
    occupation: '',
    address: '',
    momoNumber: '',
    momoProvider: 'mtn',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (guardian) {
      setFormData({
        firstName: guardian.firstName || '',
        lastName: guardian.lastName || '',
        relationship: guardian.relationship || 'father',
        phone: guardian.phone || '',
        altPhone: guardian.altPhone || '',
        email: guardian.email || '',
        occupation: guardian.occupation || '',
        address: guardian.address || '',
        momoNumber: guardian.momoNumber || '',
        momoProvider: guardian.momoProvider || 'mtn',
      });
      setError('');
      setSuccess('');
    }
  }, [guardian]);

  const updateMutation = useMutation({
    mutationFn: async (updatedData) => {
      const res = await api.patch(`/guardians/${guardian._id}`, updatedData);
      return res.data?.data;
    },
    onSuccess: () => {
      setSuccess('Guardian profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['studentProfile', studentId] });
      queryClient.invalidateQueries({ queryKey: ['studentsDirectory'] });
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 1000);
    },
    onError: (err) => {
      const serverMsg = err.response?.data?.message || err.response?.data?.error;
      const details = err.response?.data?.details
        ? err.response.data.details.map((d) => d.message).join(', ')
        : '';
      setError(serverMsg ? `${serverMsg} ${details}` : 'Failed to update guardian details.');
    },
  });

  if (!isOpen || !guardian) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.phone.trim()) {
      setError('First name, last name, and phone number are required.');
      return;
    }
    setError('');
    const cleanPayload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      relationship: formData.relationship,
      phone: formData.phone.trim(),
      altPhone: formData.altPhone.trim(),
      email: formData.email.trim(),
      occupation: formData.occupation.trim(),
      address: formData.address.trim(),
      momoNumber: formData.momoNumber.trim(),
      momoProvider: formData.momoProvider || 'mtn',
    };
    updateMutation.mutate(cleanPayload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-emerald-950 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2">
            <User size={20} className="text-emerald-400" />
            <h3 className="font-bold text-base">Edit Guardian Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-emerald-900 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center space-x-2">
              <CheckCircle size={16} className="flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Relationship *</label>
              <select
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none capitalize"
              >
                <option value="father">Father</option>
                <option value="mother">Mother</option>
                <option value="guardian">Legal Guardian</option>
                <option value="sibling">Sibling</option>
                <option value="grandparent">Grandparent</option>
                <option value="uncle">Uncle</option>
                <option value="aunt">Aunt</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Primary Phone *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Alt Phone</label>
              <input
                type="text"
                value={formData.altPhone}
                onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">MoMo Number</label>
              <input
                type="text"
                value={formData.momoNumber}
                onChange={(e) => setFormData({ ...formData, momoNumber: e.target.value })}
                placeholder="024XXXXXXX"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">MoMo Network</label>
              <select
                value={formData.momoProvider}
                onChange={(e) => setFormData({ ...formData, momoProvider: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none uppercase"
              >
                <option value="mtn">MTN MoMo</option>
                <option value="telecel">Telecel Cash</option>
                <option value="airteltigo">AirtelTigo Money</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Occupation</label>
            <input
              type="text"
              value={formData.occupation}
              onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
              placeholder="e.g. Accountant, Trader, Engineer"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Residential Address</label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Residential address / GPS Digital Address"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex items-center space-x-1.5 px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
            >
              {updateMutation.isPending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Save size={14} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditGuardianModal;
