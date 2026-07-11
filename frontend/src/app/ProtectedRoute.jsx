import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles, requireFormTeacher }) => {
  const { user, loading, hasRole, isFormTeacher } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-green border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-500 animate-pulse">Loading HANARA SMS...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return <Navigate to="/" replace />;
  }

  // If this route requires the user to be a form teacher, block subject-only teachers.
  // Admins and superadmins are always allowed through.
  if (requireFormTeacher && user.role === 'teacher' && !isFormTeacher) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;

