import React, { useState } from 'react';
import SubmissionMatrix from './SubmissionMatrix';
import StudentResultCard from './StudentResultCard';
import RankingsView from './RankingsView';
import TrendView from './TrendView';
import MockSeriesManager from './MockSeriesManager';
import ClassGradesGrid from './ClassGradesGrid';
import { LayoutGrid, ClipboardList, TrendingUp, Award, Settings, Table } from 'lucide-react';

const AdminMockPanel = ({ seriesList, selectedSeriesId, setSelectedSeriesId, onRefresh, initialTab = 'matrix' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [drillDownStudentId, setDrillDownStudentId] = useState(null);

  const tabs = [
    { id: 'matrix', label: 'Submission Matrix', icon: LayoutGrid },
    { id: 'grids', label: 'Class Score Sheets', icon: Table },
    { id: 'rankings', label: 'Class & Cohort Rankings', icon: Award },
    { id: 'trends', label: 'Cross-Series Trends', icon: TrendingUp },
    { id: 'series', label: 'Manage Series', icon: Settings },
  ];

  const handleStudentDrillDown = (studentId) => {
    setDrillDownStudentId(studentId);
    setActiveTab('drilldown');
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm max-w-max">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setDrillDownStudentId(null);
              }}
              className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="transition-all duration-150">
        {activeTab === 'matrix' && (
          <SubmissionMatrix
            seriesId={selectedSeriesId}
            onStudentClick={handleStudentDrillDown}
          />
        )}

        {activeTab === 'grids' && (
          <ClassGradesGrid
            seriesId={selectedSeriesId}
          />
        )}

        {activeTab === 'drilldown' && drillDownStudentId && (
          <div className="space-y-4">
            <button
              onClick={() => {
                setActiveTab('matrix');
                setDrillDownStudentId(null);
              }}
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1"
            >
              <span>← Back to Submission Matrix</span>
            </button>
            <StudentResultCard
              seriesId={selectedSeriesId}
              studentId={drillDownStudentId}
            />
          </div>
        )}

        {activeTab === 'rankings' && (
          <RankingsView
            seriesId={selectedSeriesId}
            onStudentClick={handleStudentDrillDown}
          />
        )}

        {activeTab === 'trends' && (
          <TrendView
            seriesId={selectedSeriesId}
            onStudentClick={handleStudentDrillDown}
          />
        )}

        {activeTab === 'series' && (
          <MockSeriesManager
            seriesList={seriesList}
            onRefresh={onRefresh}
            selectedSeriesId={selectedSeriesId}
            setSelectedSeriesId={setSelectedSeriesId}
          />
        )}
      </div>
    </div>
  );
};

export default AdminMockPanel;
