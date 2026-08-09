import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardPage from './DashboardPage';
import ParentDashboardPage from '../parent/ParentDashboardPage';
import AdminDashboard from '../admin/AdminDashboard';
import TeacherDashboard from './TeacherDashboard';

const DashboardContainer = () => {
  const { user, activeMode } = useAuth();

  if (user?.role === 'parent') {
    return <ParentDashboardPage />;
  }

  if (user?.role === 'system_admin' && activeMode === 'admin') {
    return <AdminDashboard />;
  }

  // Accountants have their own dedicated layout — redirect there
  if (user?.role === 'accountant') {
    return <Navigate to="/accountant" replace />;
  }

  if (user?.role === 'teacher') {
    return <TeacherDashboard />;
  }

  return <DashboardPage />;
};

export default DashboardContainer;

