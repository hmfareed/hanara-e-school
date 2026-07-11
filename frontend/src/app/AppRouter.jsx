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
import MockExamPage from '../features/mockExam/MockExamPage';

// System Admin Pages
import AdminUsersPage from '../features/admin/AdminUsersPage';
import AdminSettingsPage from '../features/admin/AdminSettingsPage';
import IntegrationMonitorPage from '../features/admin/IntegrationMonitorPage';
import BackupRestorePage from '../features/admin/BackupRestorePage';
import AuditLogViewer from '../features/admin/AuditLogViewer';
import DataProtectionCenter from '../features/admin/DataProtectionCenter';

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
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher', 'accountant', 'system_admin']}>
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
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher', 'accountant', 'system_admin']}>
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
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher', 'system_admin']} requireFormTeacher>
                <AttendanceRegisterPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="grades"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher', 'system_admin']}>
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
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher', 'system_admin']} requireFormTeacher>
                <DailyFeeRegisterPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="bece"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher', 'system_admin']}>
                <BecePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="mock-exams"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher', 'system_admin']}>
                <MockExamPage />
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

          {/* System Admin Routes */}
          <Route path="admin">
            <Route
              path="users"
              element={
                <ProtectedRoute allowedRoles={['system_admin']}>
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="settings"
              element={
                <ProtectedRoute allowedRoles={['system_admin']}>
                  <AdminSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="integrations"
              element={
                <ProtectedRoute allowedRoles={['system_admin']}>
                  <IntegrationMonitorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="backups"
              element={
                <ProtectedRoute allowedRoles={['system_admin']}>
                  <BackupRestorePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="audit-logs"
              element={
                <ProtectedRoute allowedRoles={['system_admin']}>
                  <AuditLogViewer />
                </ProtectedRoute>
              }
            />
            <Route
              path="data-requests"
              element={
                <ProtectedRoute allowedRoles={['system_admin']}>
                  <DataProtectionCenter />
                </ProtectedRoute>
              }
            />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
