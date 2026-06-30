import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

const AdmissionFormPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [student, setStudent] = useState({
    firstName: '',
    lastName: '',
    otherNames: '',
    gender: 'male',
    dob: '',
    currentClass: '',
    medicalNotes: '',
    transport: { usesBus: false, stop: '' },
  });

  const [guardian, setGuardian] = useState({
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
    consentGranted: false,
  });

  const [errorMsg, setErrorMsg] = useState('');

  const { data: classes } = useQuery({
    queryKey: ['classesList'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  const admissionMutation = useMutation({
    mutationFn: async (payload) => {
      return await api.post('/students', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentsList'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      navigate('/students');
    },
    onError: (err) => {
      setErrorMsg(
        err.response?.data?.message || err.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(', ')
          : 'Failed to admit student. Please try again.'
      );
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!guardian.consentGranted) {
      setErrorMsg('Guardian consent for data processing under Data Protection Act, 2012 (Act 843) is required.');
      return;
    }
    setErrorMsg('');

    const payload = {
      ...student,
      dob: student.dob ? new Date(student.dob).toISOString() : undefined,
      currentClass: student.currentClass || null,
      guardian: {
        firstName: guardian.firstName,
        lastName: guardian.lastName,
        relationship: guardian.relationship,
        phone: guardian.phone,
        altPhone: guardian.altPhone || undefined,
        email: guardian.email || undefined,
        occupation: guardian.occupation || undefined,
        address: guardian.address || undefined,
        momoNumber: guardian.momoNumber || undefined,
        momoProvider: guardian.momoNumber ? guardian.momoProvider : undefined,
        consentDataProcessing: {
          granted: guardian.consentGranted,
        },
      },
    };

    admissionMutation.mutate(payload);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-3">
        <Link to="/students" className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Student Admission Form</h2>
          <p className="text-sm text-slate-500 mt-1">Enroll a new student and record guardian details</p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Student Details */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">
            Student Personal Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700">First Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={student.firstName}
                onChange={(e) => setStudent({ ...student, firstName: e.target.value })}
                className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Last Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={student.lastName}
                onChange={(e) => setStudent({ ...student, lastName: e.target.value })}
                className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Other Names</label>
              <input
                type="text"
                value={student.otherNames}
                onChange={(e) => setStudent({ ...student, otherNames: e.target.value })}
                className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700">Gender <span className="text-red-500">*</span></label>
              <select
                value={student.gender}
                onChange={(e) => setStudent({ ...student, gender: e.target.value })}
                className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Date of Birth <span className="text-red-500">*</span></label>
              <input
                type="date"
                required
                value={student.dob}
                onChange={(e) => setStudent({ ...student, dob: e.target.value })}
                className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Assigned Class</label>
              <select
                value={student.currentClass}
                onChange={(e) => setStudent({ ...student, currentClass: e.target.value })}
                className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
              >
                <option value="">Select a Class</option>
                {classes?.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">Medical Notes</label>
            <textarea
              rows="2"
              value={student.medicalNotes}
              onChange={(e) => setStudent({ ...student, medicalNotes: e.target.value })}
              placeholder="Allergies, conditions, or key information staff should note..."
              className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
            />
          </div>
        </div>

        {/* Section 2: Guardian Details */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">
            Primary Guardian / Parent Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700">Guardian First Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={guardian.firstName}
                onChange={(e) => setGuardian({ ...guardian, firstName: e.target.value })}
                className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Guardian Last Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={guardian.lastName}
                onChange={(e) => setGuardian({ ...guardian, lastName: e.target.value })}
                className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Relationship <span className="text-red-500">*</span></label>
              <select
                value={guardian.relationship}
                onChange={(e) => setGuardian({ ...guardian, relationship: e.target.value })}
                className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
              >
                <option value="father">Father</option>
                <option value="mother">Mother</option>
                <option value="guardian">Guardian</option>
                <option value="sibling">Sibling</option>
                <option value="grandparent">Grandparent</option>
                <option value="uncle">Uncle</option>
                <option value="aunt">Aunt</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700">Phone Number <span className="text-red-500">*</span></label>
              <input
                type="tel"
                required
                placeholder="e.g. 0244123456"
                value={guardian.phone}
                onChange={(e) => setGuardian({ ...guardian, phone: e.target.value })}
                className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Alt Phone</label>
              <input
                type="tel"
                value={guardian.altPhone}
                onChange={(e) => setGuardian({ ...guardian, altPhone: e.target.value })}
                className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Email Address</label>
              <input
                type="email"
                value={guardian.email}
                onChange={(e) => setGuardian({ ...guardian, email: e.target.value })}
                className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700">Home Address</label>
              <input
                type="text"
                value={guardian.address}
                onChange={(e) => setGuardian({ ...guardian, address: e.target.value })}
                className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Occupation</label>
              <input
                type="text"
                value={guardian.occupation}
                onChange={(e) => setGuardian({ ...guardian, occupation: e.target.value })}
                className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <label className="block text-sm font-semibold text-slate-700">Ghana Mobile Money (MoMo) Number</label>
              <input
                type="tel"
                placeholder="Number registered for school fees"
                value={guardian.momoNumber}
                onChange={(e) => setGuardian({ ...guardian, momoNumber: e.target.value })}
                className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">MoMo Network Provider</label>
              <select
                value={guardian.momoProvider}
                onChange={(e) => setGuardian({ ...guardian, momoProvider: e.target.value })}
                className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
              >
                <option value="mtn">MTN Mobile Money</option>
                <option value="telecel">Telecel Cash</option>
                <option value="airteltigo">AirtelTigo Money</option>
              </select>
            </div>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl space-y-2">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="consentGranted"
                checked={guardian.consentGranted}
                onChange={(e) => setGuardian({ ...guardian, consentGranted: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
              />
              <label htmlFor="consentGranted" className="text-xs font-semibold text-slate-700 leading-normal font-sans">
                Consent data processing <span className="text-red-500">*</span>: The guardian consents to the collection and processing of personal data for school administrative services, billing notifications, and emergency contact SMS delivery, in compliance with the **Ghana Data Protection Act, 2012 (Act 843)**.
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: Transport */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">
            Transport Details
          </h3>
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="usesBus"
              checked={student.transport.usesBus}
              onChange={(e) =>
                setStudent({
                  ...student,
                  transport: { ...student.transport, usesBus: e.target.checked },
                })
              }
              className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
            />
            <label htmlFor="usesBus" className="text-sm font-semibold text-slate-700">
              Student uses the School Bus service
            </label>
          </div>

          {student.transport.usesBus && (
            <div>
              <label className="block text-sm font-semibold text-slate-700">Pickup Stop / Location</label>
              <input
                type="text"
                placeholder="e.g. Police Station Junction, Tamale"
                value={student.transport.stop}
                onChange={(e) =>
                  setStudent({
                    ...student,
                    transport: { ...student.transport, stop: e.target.value },
                  })
                }
                className="mt-1.5 block w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-800 focus:border-emerald-800 text-sm"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <Link
            to="/students"
            className="py-2.5 px-6 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-sm text-slate-600 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={admissionMutation.isPending}
            className="flex items-center space-x-2 py-2.5 px-6 rounded-xl text-white font-bold bg-[#116a4c] hover:bg-[#0b4f38] focus:outline-none disabled:opacity-50 transition-colors cursor-pointer text-sm shadow-md shadow-emerald-950/10 font-sans"
          >
            {admissionMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Admitting...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Admission</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdmissionFormPage;
