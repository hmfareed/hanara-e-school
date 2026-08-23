import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  CreditCard,
  Printer,
  Users,
  Shield,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Download,
  Eye,
  RotateCw,
  Sparkles,
  QrCode,
  Phone,
  Building,
  Calendar,
  Award,
  Layers,
} from 'lucide-react';

const IdCardGeneratorPage = () => {
  const { user, activeMode } = useAuth();
  const [entityType, setEntityType] = useState('student'); // 'student' | 'staff'
  const [selectedClass, setSelectedClass] = useState('');
  const [orientation, setOrientation] = useState('portrait'); // 'portrait' | 'landscape'
  const [sideView, setSideView] = useState('both'); // 'front' | 'back' | 'both'
  const [search, setSearch] = useState('');

  // Fetch classes for student filter
  const { data: classes = [] } = useQuery({
    queryKey: ['classesListIdCards', user?._id || user?.id, activeMode],
    queryFn: async () => (await api.get('/classes')).data?.data || [],
  });

  // Fetch ID card payloads
  const { data: cards = [], isLoading, refetch } = useQuery({
    queryKey: ['idCardsBatch', entityType, selectedClass],
    queryFn: async () => {
      const params = { entity: entityType };
      if (entityType === 'student' && selectedClass) params.classId = selectedClass;
      const res = await api.get('/id-cards/batch', { params });
      return res.data?.data || [];
    },
  });

  const filteredCards = cards.filter((c) =>
    c.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (c.admissionNumber && c.admissionNumber.toLowerCase().includes(search.toLowerCase())) ||
    (c.staffId && c.staffId.toLowerCase().includes(search.toLowerCase()))
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Print CSS Injection */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-cards-area, #printable-cards-area * {
            visibility: visible;
          }
          #printable-cards-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-after: always;
          }
        }
      `}</style>

      {/* ── Header Controls (Hidden on Print) ── */}
      <div className="no-print bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#78282E]" />
            Official ID Card Generator
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Generate and print CR80 standard PVC identification cards with embedded QR security tokens
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            disabled={filteredCards.length === 0}
            className="px-5 py-2.5 bg-[#78282E] hover:bg-[#6B2228] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 transition disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            Print Cards ({filteredCards.length})
          </button>
        </div>
      </div>

      {/* ── Configuration Bar (Hidden on Print) ── */}
      <div className="no-print bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        {/* Entity Selector */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => { setEntityType('student'); setSelectedClass(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${entityType === 'student' ? 'bg-[#78282E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Student Cards
          </button>
          <button
            onClick={() => { setEntityType('staff'); setSelectedClass(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${entityType === 'staff' ? 'bg-[#78282E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Staff & Teacher Cards
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {entityType === 'student' && (
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#78282E]"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#78282E] w-48"
            />
          </div>

          {/* Orientation Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              onClick={() => setOrientation('portrait')}
              className={`px-3 py-1 rounded-lg ${orientation === 'portrait' ? 'bg-white text-slate-900 shadow-xs' : ''}`}
            >
              Portrait
            </button>
            <button
              onClick={() => setOrientation('landscape')}
              className={`px-3 py-1 rounded-lg ${orientation === 'landscape' ? 'bg-white text-slate-900 shadow-xs' : ''}`}
            >
              Landscape
            </button>
          </div>

          {/* Side Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button onClick={() => setSideView('front')} className={`px-2.5 py-1 rounded-lg ${sideView === 'front' ? 'bg-white text-slate-900 shadow-xs' : ''}`}>Front</button>
            <button onClick={() => setSideView('back')} className={`px-2.5 py-1 rounded-lg ${sideView === 'back' ? 'bg-white text-slate-900 shadow-xs' : ''}`}>Back</button>
            <button onClick={() => setSideView('both')} className={`px-2.5 py-1 rounded-lg ${sideView === 'both' ? 'bg-white text-slate-900 shadow-xs' : ''}`}>Both</button>
          </div>
        </div>
      </div>

      {/* ── Cards Grid Display Area ── */}
      {isLoading ? (
        <div className="h-64 bg-white rounded-3xl border border-slate-200 animate-pulse flex items-center justify-center text-slate-400">
          Loading cards payload…
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 space-y-2">
          <CreditCard className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="font-bold text-sm">No cards to display</p>
          <p className="text-xs text-slate-400">Select a class or search for a student/staff member</p>
        </div>
      ) : (
        <div id="printable-cards-area" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
          {filteredCards.map((card) => {
            const isPortrait = orientation === 'portrait';
            const cardWidthClass = isPortrait ? 'w-[280px] h-[435px]' : 'w-[435px] h-[280px]';

            return (
              <div key={card._id} className="flex flex-col gap-4 items-center">
                
                {/* ── FRONT OF CARD ── */}
                {(sideView === 'front' || sideView === 'both') && (
                  <div className={`${cardWidthClass} bg-gradient-to-br from-[#4A1C20] via-[#5C2227] to-[#2D0D10] text-white rounded-2xl p-4 shadow-xl border border-[#78282E]/50 relative overflow-hidden flex flex-col justify-between select-none print:shadow-none`}>
                    
                    {/* Background Pattern Overlay */}
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />
                    
                    {/* Card Top Banner */}
                    <div className="relative z-10 flex items-center justify-between border-b border-white/15 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-white/10 rounded-lg border border-white/20 flex items-center justify-center shrink-0">
                          <Shield className="w-4 h-4 text-amber-300 fill-amber-300/30" />
                        </div>
                        <div>
                          <p className="text-[11px] font-black tracking-wider uppercase text-white leading-tight">
                            {card.schoolProfile?.name || 'HANARA SCHOOLS'}
                          </p>
                          <p className="text-[8px] font-bold text-amber-200/80 uppercase tracking-widest leading-tight">
                            Official ID Card
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 uppercase">
                        {card.entity === 'student' ? 'STUDENT' : card.subTitle}
                      </span>
                    </div>

                    {/* Main Content Area */}
                    {isPortrait ? (
                      <div className="relative z-10 flex flex-col items-center text-center my-auto space-y-2.5">
                        {/* Avatar */}
                        <div className="w-24 h-24 rounded-2xl bg-white/10 border-2 border-amber-300/60 overflow-hidden shadow-md shrink-0 flex items-center justify-center">
                          {card.photoUrl ? (
                            <img src={card.photoUrl} alt={card.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-3xl font-black text-white/40">{card.fullName.charAt(0)}</span>
                          )}
                        </div>

                        {/* Name & Title */}
                        <div>
                          <p className="text-base font-black text-white tracking-wide leading-tight">{card.fullName}</p>
                          <p className="text-[11px] font-bold text-amber-200 mt-0.5">{card.subTitle}</p>
                        </div>

                        {/* Bio Grid */}
                        <div className="w-full bg-black/25 backdrop-blur-xs rounded-xl p-2.5 grid grid-cols-2 gap-1.5 text-[10px] text-left border border-white/10">
                          <div>
                            <span className="text-white/50 block text-[8px] uppercase font-bold">ID / Admission #</span>
                            <span className="font-mono font-bold text-white">{card.admissionNumber || card.staffId}</span>
                          </div>
                          <div>
                            <span className="text-white/50 block text-[8px] uppercase font-bold">Blood Group</span>
                            <span className="font-bold text-amber-300">{card.bloodGroup || 'O+'}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-white/50 block text-[8px] uppercase font-bold">Emergency Contact</span>
                            <span className="font-mono font-bold text-white flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5 text-amber-300" />
                              {card.emergencyContact}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Landscape layout */
                      <div className="relative z-10 flex items-center gap-4 my-auto">
                        <div className="w-24 h-24 rounded-2xl bg-white/10 border-2 border-amber-300/60 overflow-hidden shadow-md shrink-0 flex items-center justify-center">
                          {card.photoUrl ? (
                            <img src={card.photoUrl} alt={card.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-3xl font-black text-white/40">{card.fullName.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex-1 space-y-1.5 text-left">
                          <p className="text-base font-black text-white leading-tight">{card.fullName}</p>
                          <p className="text-xs font-bold text-amber-200">{card.subTitle}</p>
                          <div className="bg-black/25 rounded-xl p-2 text-[10px] space-y-1 border border-white/10">
                            <p><span className="text-white/50 font-bold">ID #:</span> <span className="font-mono text-white font-bold">{card.admissionNumber || card.staffId}</span></p>
                            <p><span className="text-white/50 font-bold">Emergency:</span> <span className="font-mono text-white">{card.emergencyContact}</span></p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bottom Strip: QR Code & Security Barcode */}
                    <div className="relative z-10 flex items-center justify-between border-t border-white/15 pt-2 mt-auto">
                      <div className="flex items-center gap-1 text-[8px] text-white/60 uppercase font-bold tracking-wider">
                        <Shield className="w-3 h-3 text-amber-300" /> Authorized Sign
                      </div>
                      <div className="bg-white p-1 rounded-lg shrink-0 border border-amber-300/40">
                        <img src={card.qrDataUrl} alt="QR" className="w-10 h-10" />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── BACK OF CARD ── */}
                {(sideView === 'back' || sideView === 'both') && (
                  <div className={`${cardWidthClass} bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-slate-800 relative overflow-hidden flex flex-col justify-between select-none print:shadow-none`}>
                    
                    {/* Magnetic Stripe visual */}
                    <div className="absolute top-4 left-0 right-0 h-9 bg-slate-950 border-y border-slate-800" />
                    
                    <div className="relative z-10 pt-10 space-y-2 text-[9px] text-slate-300">
                      <p className="font-bold text-amber-300 uppercase tracking-wider text-[10px]">Terms & Conditions</p>
                      <p className="leading-tight text-slate-400">
                        This identification card is the property of {card.schoolProfile?.name || 'HANARA SCHOOLS'}. If found, please return to the school administrative office or call {card.schoolProfile?.phone}.
                      </p>
                    </div>

                    {/* School Motto & Address */}
                    <div className="relative z-10 text-center py-2 bg-slate-950/60 rounded-xl border border-slate-800 space-y-0.5">
                      <p className="text-[10px] font-black text-amber-300 italic">"{card.schoolProfile?.motto}"</p>
                      <p className="text-[8px] text-slate-400">{card.schoolProfile?.address}</p>
                    </div>

                    {/* Simulated Barcode at bottom */}
                    <div className="relative z-10 flex flex-col items-center border-t border-slate-800 pt-2">
                      <div className="h-6 w-4/5 bg-white p-1 rounded flex items-center justify-between gap-1 overflow-hidden">
                        {[...Array(32)].map((_, i) => (
                          <div key={i} className={`h-full bg-slate-900 ${i % 3 === 0 ? 'w-1' : i % 5 === 0 ? 'w-1.5' : 'w-0.5'}`} />
                        ))}
                      </div>
                      <span className="font-mono text-[8px] text-slate-400 mt-1 uppercase tracking-widest">
                        {card.qrToken || 'HNR-SECURE-TOKEN'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default IdCardGeneratorPage;
