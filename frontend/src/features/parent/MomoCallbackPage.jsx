import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, ShieldAlert, ArrowRight, RefreshCw } from 'lucide-react';
import api from '../../services/api';

const MomoCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ref = searchParams.get('ref');
  const [status, setStatus] = useState('verifying'); // verifying, successful, failed, pending, error
  const [details, setDetails] = useState(null);
  const [attempts, setAttempts] = useState(0);

  const verifyPayment = async () => {
    try {
      const res = await api.get(`/fees/payments/momo/verify?ref=${ref}`);
      if (res.data?.success) {
        const payData = res.data.data;
        setStatus(payData.status);
        setDetails(payData);

        if (payData.status === 'pending' && attempts < 5) {
          // Poll again in 3 seconds
          setAttempts((prev) => prev + 1);
        }
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    if (!ref) {
      setStatus('error');
      return;
    }
    verifyPayment();
  }, [ref, attempts]);

  const handleReturn = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-8 text-center space-y-6">
        
        {status === 'verifying' && (
          <div className="space-y-4 py-8">
            <div className="flex justify-center">
              <RefreshCw className="text-emerald-700 animate-spin" size={48} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg">Verifying Payment Status</h3>
              <p className="text-xs text-slate-400 mt-1">Checking with Mobile Money gateway, please wait...</p>
            </div>
          </div>
        )}

        {status === 'pending' && (
          <div className="space-y-4 py-8">
            <div className="flex justify-center">
              <Clock className="text-amber-500 animate-pulse" size={48} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-805 text-lg">Payment is Processing</h3>
              <p className="text-xs text-slate-400 mt-1">The transaction is still pending. We will notify you via SMS when confirmed.</p>
            </div>
            <div className="pt-4">
              <button
                onClick={handleReturn}
                className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Return to Dashboard</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {status === 'successful' && (
          <div className="space-y-6 py-4">
            <div className="flex justify-center">
              <CheckCircle className="text-emerald-500" size={64} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Payment Successful!</h2>
              <p className="text-xs text-slate-400 mt-1">Your transaction has been processed and invoice updated.</p>
            </div>

            {details && (
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Student:</span>
                  <span className="font-extrabold text-slate-800">{details.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Invoice Reference:</span>
                  <span className="font-mono text-slate-800">{details.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Receipt Number:</span>
                  <span className="font-mono font-bold text-slate-800">{details.receiptNumber}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200/60 pt-2 font-bold">
                  <span className="text-slate-700">Amount Paid:</span>
                  <span className="text-emerald-700 text-sm">GHS {details.amount?.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={handleReturn}
                className="w-full py-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-sm shadow-md transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Return to Dashboard</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="space-y-4 py-8">
            <div className="flex justify-center">
              <XCircle className="text-rose-600" size={64} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">Transaction Failed</h3>
              <p className="text-xs text-slate-400 mt-1">The mobile money gateway reported that the transaction declined.</p>
            </div>
            <div className="pt-4">
              <button
                onClick={handleReturn}
                className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Go Back &amp; Retry</span>
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 py-8">
            <div className="flex justify-center">
              <ShieldAlert className="text-rose-600" size={64} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">Verification Error</h3>
              <p className="text-xs text-slate-400 mt-1">We were unable to verify this transaction. Please contact the administrator.</p>
            </div>
            <div className="pt-4">
              <button
                onClick={handleReturn}
                className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Return to Dashboard</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default MomoCallbackPage;
