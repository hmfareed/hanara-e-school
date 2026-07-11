import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Settings, Save, Eye, EyeOff, Loader2 } from 'lucide-react';

const categoryMeta = {
  academic: { label: 'Academic', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  branding: { label: 'Branding', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  integration: { label: 'Integration', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  security: { label: 'Security', color: 'bg-red-50 text-red-700 border-red-200' },
};

const SettingRow = ({ setting, onSave }) => {
  const [value, setValue] = useState(String(setting.value));
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isSecret = setting.category === 'integration' && setting.key.toLowerCase().includes('key');
  const displayValue = isSecret && !revealed
    ? '••••••••••••' + String(setting.value).slice(-4)
    : value;

  const handleSave = async () => {
    setSaving(true);
    await onSave(setting.key, value);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white transition-colors group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 font-mono">{setting.key}</p>
        {setting.description && (
          <p className="text-xs text-slate-400 mt-0.5">{setting.description}</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isSecret ? (
          <div className="relative flex items-center">
            <input
              type={revealed ? 'text' : 'password'}
              value={revealed ? value : ''}
              placeholder={!revealed ? '••••••••••••' + String(setting.value).slice(-4) : ''}
              onChange={(e) => setValue(e.target.value)}
              className="w-52 text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-mono pr-8"
            />
            <button
              onClick={() => setRevealed((r) => !r)}
              className="absolute right-2 text-slate-400 hover:text-slate-700"
              title={revealed ? 'Hide' : 'Reveal (logged)'}
            >
              {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        ) : (
          <input
            type={setting.valueType === 'number' ? 'number' : setting.valueType === 'boolean' ? 'checkbox' : 'text'}
            value={value}
            onChange={(e) => setValue(setting.valueType === 'boolean' ? String(e.target.checked) : e.target.value)}
            className="w-44 text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            saved
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          <span>{saved ? 'Saved!' : 'Save'}</span>
        </button>
      </div>
    </div>
  );
};

const AdminSettingsPage = () => {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState('academic');

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => (await api.get('/admin/settings')).data?.data || [],
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, value }) => api.patch(`/admin/settings/${encodeURIComponent(key)}`, { value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-settings'] }),
  });

  const grouped = settings.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  const categories = ['academic', 'branding', 'integration', 'security'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center">
          <Settings size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">System Settings</h1>
          <p className="text-sm text-slate-500">Configure academic year, branding, integrations, and security</p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
              activeCategory === cat
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-emerald-700'
            }`}
          >
            {categoryMeta[cat]?.label || cat}
          </button>
        ))}
      </div>

      {/* Settings List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <span className={`text-xs font-bold px-2.5 py-1 rounded border ${categoryMeta[activeCategory]?.color}`}>
            {categoryMeta[activeCategory]?.label} Settings
          </span>
          <span className="text-xs text-slate-400">
            {grouped[activeCategory]?.length || 0} setting(s)
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-xl" />
            ))}
          </div>
        ) : (grouped[activeCategory]?.length || 0) === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">
            No settings found in this category.
          </p>
        ) : (
          <div className="space-y-3">
            {(grouped[activeCategory] || []).map((setting) => (
              <SettingRow
                key={setting._id}
                setting={setting}
                onSave={(key, value) => updateMutation.mutateAsync({ key, value })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSettingsPage;
