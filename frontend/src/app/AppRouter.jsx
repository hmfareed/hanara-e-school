import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Layout from './Layout';

// Page stubs — will be filled during Phase 0 & Phase 1 execution
import LoginPage from '../features/auth/LoginPage';
import DashboardContainer from '../features/dashboard/DashboardContainer';
import StudentDirectoryPage from '../features/students/StudentDirectoryPage';
import AdmissionFormPage from '../features/students/AdmissionFormPage';
import StudentProfilePage from '../features/students/StudentProfilePage';
import StaffDirectoryPage from '../features/staff/StaffDirectoryPage';
import StaffFormPage from '../features/staff/StaffFormPage';
import ClassesPage from '../features/classes/ClassesPage';
import ResultsEntryPage from '../features/classes/ResultsEntryPage';
import AttendanceRegisterPage from '../features/attendance/AttendanceRegisterPage';
import FeesPage from '../features/fees/FeesPage';
import AcademicYearPage from '../features/academicYear/AcademicYearPage';

// Phase 3 Pages
import ParentChildDetailsPage from '../features/parent/ParentChildDetailsPage';
import MomoSandboxPage from '../features/parent/MomoSandboxPage';
import MomoCallbackPage from '../features/parent/MomoCallbackPage';
import SmsDashboardPage from '../features/sms/SmsDashboardPage';
import SettingsPage from '../features/settings/SettingsPage';

// Phase 5 Pages
import TransportPage from '../features/transport/TransportPage';
import DailyFeeRegisterPage from '../features/fees/DailyFeeRegisterPage';

// Phase 4 Pages
import BecePage from '../features/bece/BecePage';

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Standalone payment gateway views */}
        <Route
          path="/finance/momo/sandbox"
          element={
            <ProtectedRoute>
              <MomoSandboxPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance/momo/verify"
          element={
            <ProtectedRoute>
              <MomoCallbackPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <ProtectedRoute>
                <DashboardContainer />
              </ProtectedRoute>
            }
          />

          <Route path="parent/child/:id" element={
            <ProtectedRoute allowedRoles={['parent']}>
              <ParentChildDetailsPage />
            </ProtectedRoute>
          } />

          <Route path="sms" element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
              <SmsDashboardPage />
            </ProtectedRoute>
          } />

          <Route path="students">
            <Route
              index
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher', 'accountant']}>
                  <StudentDirectoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admit"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                  <AdmissionFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path=":id"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher', 'accountant']}>
                  <StudentProfilePage />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="staff">
            <Route
              index
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                  <StaffDirectoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="new"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                  <StaffFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="edit/:id"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                  <StaffFormPage />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route
            path="classes"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                <ClassesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="attendance"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher']}>
                <AttendanceRegisterPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="grades"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher']}>
                <ResultsEntryPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="fees"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'accountant']}>
                <FeesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="academic-year"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                <AcademicYearPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="transport"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                <TransportPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="fees/daily-register"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher']}>
                <DailyFeeRegisterPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="bece"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher']}>
                <BecePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
