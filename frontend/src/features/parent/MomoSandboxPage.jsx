import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Smartphone, CheckCircle, XCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import api from '../../services/api';

const MomoSandboxPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ref = searchParams.get('ref');
  const invoiceId = searchParams.get('invoiceId');
  const [network, setNetwork] = useState('mtn');
  const [phone, setPhone] = useState('0244111222');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: input details, 2: authorize prompt, 3: success/redirecting
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch invoice details
  const { data: invoice, isLoading } = useQuery({
    queryKey: ['sandboxInvoice', invoiceId],
    queryFn: async () => {
      const res = await api.get(`/parent/dashboard`);
      const invList = res.data?.data?.invoices || [];
      return invList.find((i) => i._id === invoiceId);
    },
    enabled: !!invoiceId,
  });

  const handleInitiateOtp = (e) => {
    e.preventDefault();
    if (!phone || phone.length < 9) {
      setErrorMsg('Please enter a valid phone number');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(2);
    }, 1500);
  };

  const handleAuthorize = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // POST directly to backend MoMo webhook simulating gateway confirm callback
      const webhookPayload = {
        ref: ref,
        amount: invoice?.balance,
        invoiceId: invoiceId,
        event: 'charge.success',
      };

      await api.post('/fees/payments/momo/webhook', webhookPayload);

      setStep(3);
      // Wait 2 seconds and redirect to verify callback screen
      setTimeout(() => {
        navigate(`/finance/momo/verify?ref=${ref}`);
      }, 2000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Verification webhook failed');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-800 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-6">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black tracking-wider text-slate-100 uppercase">HANARA PAY</h2>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest block mt-0.5">
              Secure Sandbox
            </span>
          </div>
          <ShieldCheck className="text-emerald-500" size={32} />
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Total</span>
            <div className="flex justify-between items-baseline mt-1">
              <span className="text-2xl font-black text-slate-900">GHS {invoice?.balance?.toFixed(2) || '0.00'}</span>
              <span className="text-xs text-slate-500 font-medium">Inv: {invoice?.invoiceNumber}</span>
            </div>
            <span className="text-[9px] text-slate-400 block mt-2 font-mono">Ref: {ref}</span>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <XCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleInitiateOtp} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Select Network</label>
                <div className="grid grid-cols-3 gap-3">
                  {['mtn', 'telecel', 'airteltigo'].map((net) => (
                    <button
                      key={net}
                      type="button"
                      onClick={() => setNetwork(net)}
                      className={`py-3 px-2 rounded-xl text-xs font-extrabold uppercase border text-center transition-all ${
                        network === net
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 text-slate-650 hover:bg-slate-50'
                      }`}
                    >
                      {net === 'airteltigo' ? 'AT' : net}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile Money Phone Number</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0244111222"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{loading ? 'Initializing Prompt...' : 'Send MoMo Prompt'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-5 text-center py-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center border border-amber-100 animate-bounce">
                  <Smartphone size={32} />
                </div>
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900">Authorize MoMo Transaction</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-[280px] mx-auto leading-relaxed">
                  We sent a simulated push prompt to network <span className="font-extrabold uppercase">{network}</span> number <span className="font-bold">{phone}</span>.
                </p>
              </div>

              <div className="pt-4 space-y-3">
                <button
                  onClick={handleAuthorize}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>{loading ? 'Processing Payment...' : 'Enter PIN &amp; Approve'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition-all"
                >
                  Edit Number
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 text-center py-6">
              <div className="flex justify-center">
                <CheckCircle className="text-emerald-500 animate-pulse" size={64} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-lg">Transaction Confirmed</h3>
                <p className="text-xs text-slate-400 mt-1">Redirecting you back to verify status...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MomoSandboxPage;
