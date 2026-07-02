import React, { useState } from 'react';
import { Receipt, FileText, CreditCard, ClipboardList } from 'lucide-react';
import FeeStructuresTab from './FeeStructuresTab';
import InvoicesTab from './InvoicesTab';
import PaymentsTab from './PaymentsTab';
import DailyCollectionsTab from './DailyCollectionsTab';

const TABS = [
  { id: 'structures', label: 'Fee Structures', icon: Receipt },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'payments', label: 'Payment Records', icon: CreditCard },
  { id: 'daily', label: 'Daily Collections', icon: ClipboardList },
];

const FeesPage = () => {
  const [activeTab, setActiveTab] = useState('structures');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fees &amp; Finance</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage fee structures, generate invoices, and record payments
          </p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`fees-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/60'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'structures' && <FeeStructuresTab />}
          {activeTab === 'invoices' && <InvoicesTab />}
          {activeTab === 'payments' && <PaymentsTab />}
          {activeTab === 'daily' && <DailyCollectionsTab />}
        </div>
      </div>
    </div>
  );
};

export default FeesPage;
