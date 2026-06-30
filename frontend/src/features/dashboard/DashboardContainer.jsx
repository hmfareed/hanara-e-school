import React from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardPage from './DashboardPage';
import ParentDashboardPage from '../parent/ParentDashboardPage';

const DashboardContainer = () => {
  const { user } = useAuth();

  if (user?.role === 'parent') {
    return <ParentDashboardPage />;
  }

  return <DashboardPage />;
};

export default DashboardContainer;
