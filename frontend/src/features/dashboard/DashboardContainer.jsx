import React from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardPage from './DashboardPage';
import ParentDashboardPage from '../parent/ParentDashboardPage';
import AdminDashboard from '../admin/AdminDashboard';

const DashboardContainer = () => {
  const { user, activeMode } = useAuth();

  if (user?.role === 'parent') {
    return <ParentDashboardPage />;
  }

  if (user?.role === 'system_admin' && activeMode === 'admin') {
    return <AdminDashboard />;
  }

  return <DashboardPage />;
};

export default DashboardContainer;
