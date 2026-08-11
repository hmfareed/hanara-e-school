import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, DollarSign, Users, Award, ShoppingBag, UtensilsCrossed, Bus, PieChart, BarChart3, AlertCircle, ArrowUpRight,
} from 'lucide-react';
import api from '../../services/api';

const ExecutiveAnalyticsPage = () => {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['executiveSummaryAnalytics'],
    queryFn: async () => {
      const res = await api.get('/analytics/executive-summary');
      return res.data?.data;
    },
  });

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-700 border-t-transparent"></div>
      </div>
    );
  }

  const revenue = summary?.revenue || {};
  const financial = summary?.financialSummary || {};
  const attendance = summary?.attendance || {};
  const academics = summary?.academics || {};

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <BarChart3 size={28} className="text-emerald-700" />
          <span>Executive Analytics &amp; Revenue Visualizer</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          High-level executive financial collections, debtor balances, attendance heatmap, and academic pass ratios.
        </p>
      </div>

      {/* Top Financial Revenue Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-emerald-950 text-white rounded-2xl p-5 shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-300">
            <span className="text-xs font-bold uppercase tracking-wider">Grand Revenue</span>
            <DollarSign size={20} />
          </div>
          <p className="text-2xl font-black">GHS {(revenue.grandRevenue || 0).toFixed(2)}</p>
          <p className="text-[11px] text-emerald-200">Combined collections across all channels</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Term Invoices Paid</span>
            <ArrowUpRight size={18} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">GHS {(revenue.invoiceTotal || 0).toFixed(2)}</p>
          <p className="text-[11px] text-slate-400">School fees &amp; tuition collections</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Daily Register Fees</span>
            <UtensilsCrossed size={18} className="text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">GHS {(revenue.dailyFeeTotal || 0).toFixed(2)}</p>
          <p className="text-[11px] text-slate-400">Feeding ({(revenue.feedingTotal || 0).toFixed(0)}) &amp; Bus ({(revenue.busFareTotal || 0).toFixed(0)})</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">School Store POS</span>
            <ShoppingBag size={18} className="text-purple-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">GHS {(revenue.storeTotal || 0).toFixed(2)}</p>
          <p className="text-[11px] text-slate-400">Uniforms, books &amp; stationery sales</p>
        </div>
      </div>

      {/* Revenue Distribution & Debtor Visualizer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Financial Fee Collection Status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <PieChart size={18} className="text-emerald-700" />
              <span>Term Fees Billed vs Collected</span>
            </h3>
            <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {financial.collectionRate}% Collected
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                <span>Paid Invoices (GHS {financial.totalPaidInvoices?.toFixed(2)})</span>
                <span>Outstanding Debts (GHS {financial.totalOutstanding?.toFixed(2)})</span>
              </div>
              <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${financial.collectionRate}%` }}
                  className="bg-emerald-700 h-full transition-all duration-500"
                />
                <div
                  style={{ width: `${(100 - parseFloat(financial.collectionRate || 0)).toFixed(1)}%` }}
                  className="bg-rose-500 h-full transition-all duration-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-xs pt-2">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Total Billed</p>
                <p className="font-extrabold text-slate-900 mt-1">GHS {financial.totalBilled?.toFixed(2)}</p>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                <p className="text-[10px] text-emerald-700 font-bold uppercase">Total Paid</p>
                <p className="font-extrabold text-emerald-900 mt-1">GHS {financial.totalPaidInvoices?.toFixed(2)}</p>
              </div>
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                <p className="text-[10px] text-rose-700 font-bold uppercase">Outstanding</p>
                <p className="font-extrabold text-rose-900 mt-1">GHS {financial.totalOutstanding?.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Academic Pass Ratios */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <Award size={18} className="text-blue-700" />
              <span>Academic Subject Pass Rate</span>
            </h3>
            <span className="text-xs font-extrabold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              {academics.passRate}% Overall Pass
            </span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-xl font-black text-emerald-800">{academics.highGradesCount || 0}</p>
                <p className="text-[10px] text-emerald-700 font-bold uppercase mt-0.5">High Performance (65%+)</p>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-xl font-black text-blue-800">{academics.avgGradesCount || 0}</p>
                <p className="text-[10px] text-blue-700 font-bold uppercase mt-0.5">Average (50% - 64%)</p>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <p className="text-xl font-black text-rose-800">{academics.lowGradesCount || 0}</p>
                <p className="text-[10px] text-rose-700 font-bold uppercase mt-0.5">Underperforming (&lt;50%)</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center space-x-2">
              <Users size={16} className="text-slate-400 flex-shrink-0" />
              <span>Total Subject Grades Evaluated across all classes: <strong>{academics.totalGradesCount || 0}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveAnalyticsPage;
