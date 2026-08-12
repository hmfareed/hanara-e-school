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
import StaffCheckInPage from '../features/staff/StaffCheckInPage';
import StaffAttendancePage from '../features/staff/StaffAttendancePage';
import ClassesPage from '../features/classes/ClassesPage';
import MyClassesPage from '../features/classes/MyClassesPage';
import TeacherTimetablePage from '../features/classes/TeacherTimetablePage';
import ResultsEntryPage from '../features/classes/ResultsEntryPage';
import AssignmentsPage from '../features/assignments/AssignmentsPage';
import LessonPlansPage from '../features/lessonPlans/LessonPlansPage';
import BehaviourRecordsPage from '../features/behaviour/BehaviourRecordsPage';
import LearningResourcesPage from '../features/resources/LearningResourcesPage';
import TeacherMessagingPage from '../features/messaging/TeacherMessagingPage';
import ReportsGeneratorPage from '../features/reports/ReportsGeneratorPage';
import TeacherProfileSettingsPage from '../features/settings/TeacherProfileSettingsPage';
import AttendanceRegisterPage from '../features/attendance/AttendanceRegisterPage';
import FeesPage from '../features/fees/FeesPage';
import AcademicYearPage from '../features/academicYear/AcademicYearPage';
import PayrollManagementPage from '../features/accountant/PayrollManagementPage';
import SchoolStorePage from '../features/accountant/SchoolStorePage';

// Phase 3 Pages
import ParentChildDetailsPage from '../features/parent/ParentChildDetailsPage';
import MomoSandboxPage from '../features/parent/MomoSandboxPage';
import MomoCallbackPage from '../features/parent/MomoCallbackPage';
import SmsDashboardPage from '../features/sms/SmsDashboardPage';
import SettingsPage from '../features/settings/SettingsPage';
import NoticeBoardPage from '../features/notices/NoticeBoardPage';
import ExecutiveAnalyticsPage from '../features/analytics/ExecutiveAnalyticsPage';
import ParentTeacherMessagingPage from '../features/messaging/ParentTeacherMessagingPage';

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

import IdCardGeneratorPage from '../features/idCards/IdCardGeneratorPage';
import GateScannerPage from '../features/gateScanner/GateScannerPage';
import PublicReportVerifyPage from '../features/reports/PublicReportVerifyPage';
import PublicCardVerifyPage from '../features/idCards/PublicCardVerifyPage';
import AttendanceKioskPage from '../features/attendance/AttendanceKioskPage';

// Accountant Module
import AccountantLayout from '../features/accountant/AccountantLayout';
import AccountantDashboardPage from '../features/accountant/AccountantDashboardPage';
import PendingQueuePage from '../features/accountant/PendingQueuePage';
import SubmissionDetailPage from '../features/accountant/SubmissionDetailPage';
import ConfirmedHistoryPage from '../features/accountant/ConfirmedHistoryPage';
import DiscrepanciesPage from '../features/accountant/DiscrepanciesPage';
import ReportsPage from '../features/accountant/ReportsPage';
import FeeStructurePage from '../features/accountant/FeeStructurePage';
import AccountantProfilePage from '../features/accountant/ProfilePage';

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Dedicated Attendance Kiosk Scanner View */}
        <Route path="/attendance/kiosk" element={<AttendanceKioskPage />} />

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

        {/* Public Report Verification View (scanned from QR Code) */}
        <Route path="/verify-report/:token" element={<PublicReportVerifyPage />} />
        <Route path="/verify-card/:token" element={<PublicCardVerifyPage />} />

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

          <Route
            path="students"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher', 'accountant', 'system_admin']}>
                <StudentDirectoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="students/admit"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                <AdmissionFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="students/edit/:id"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                <AdmissionFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="students/:id"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher', 'accountant', 'system_admin']}>
                <StudentProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="staff"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                <StaffDirectoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="staff/new"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                <StaffFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="staff/edit/:id"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                <StaffFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="staff/attendance"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'system_admin']}>
                <StaffAttendancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="staff/check-in"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'system_admin', 'teacher', 'accountant']}>
                <StaffCheckInPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="id-cards"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'system_admin', 'teacher']}>
                <IdCardGeneratorPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="gate-scanner"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'system_admin', 'teacher']}>
                <GateScannerPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="classes"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                <ClassesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="my-classes"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher', 'system_admin']}>
                <MyClassesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="my-classes/:classId"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher', 'system_admin']}>
                <MyClassesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="timetable"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher', 'system_admin']}>
                <TeacherTimetablePage />
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
            path="assignments"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher', 'system_admin']}>
                <AssignmentsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="lesson-plans"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher', 'system_admin']}>
                <LessonPlansPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="behaviour-records"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher', 'system_admin']}>
                <BehaviourRecordsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="learning-resources"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher', 'system_admin']}>
                <LearningResourcesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="messages"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher', 'system_admin']}>
                <TeacherMessagingPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="reports-generator"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher', 'system_admin']}>
                <ReportsGeneratorPage />
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
            path="payroll"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'accountant', 'system_admin']}>
                <PayrollManagementPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="store"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'accountant', 'system_admin']}>
                <SchoolStorePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="notices"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher', 'parent', 'accountant', 'system_admin']}>
                <NoticeBoardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="analytics"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'accountant']}>
                <ExecutiveAnalyticsPage />
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
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher', 'accountant', 'system_admin']}>
                <DailyFeeRegisterPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="fees/daily-collection"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher', 'accountant', 'system_admin']}>
                <DailyFeeRegisterPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="fee-collection"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher', 'accountant', 'system_admin']}>
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

          <Route
            path="teacher-settings"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'teacher', 'system_admin']}>
                <TeacherProfileSettingsPage />
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

        {/* ── Accountant Module — dedicated layout ── */}
        <Route
          path="/accountant"
          element={
            <ProtectedRoute allowedRoles={['accountant']}>
              <AccountantLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AccountantDashboardPage />} />
          <Route path="pending" element={<PendingQueuePage />} />
          <Route path="pending/:id" element={<SubmissionDetailPage />} />
          <Route path="history" element={<ConfirmedHistoryPage />} />
          <Route path="discrepancies" element={<DiscrepanciesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="fee-structure" element={<FeeStructurePage />} />
          <Route path="profile" element={<AccountantProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
