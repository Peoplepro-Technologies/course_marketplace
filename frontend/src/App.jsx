import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthProvider from './auth/AuthProvider';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import HomePage from './pages/HomePage';
import CourseDetail from './pages/CourseDetail';

// Learner Pages
import LearnerDashboard from './pages/learner/LearnerDashboard';
import LessonViewer from './pages/learner/LessonViewer';
import Wishlist from './pages/learner/Wishlist';
import Profile from './pages/learner/Profile';

// Instructor Pages
import InstructorDashboard from './pages/instructor/InstructorDashboard';
import CourseForm from './pages/instructor/CourseForm';
import SectionManager from './pages/instructor/SectionManager';
import ReviewInbox from './pages/instructor/ReviewInbox';
import EarningsChart from './pages/instructor/EarningsChart';
import StudentsProgress from './pages/instructor/StudentsProgress';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import CourseModeration from './pages/admin/CourseModeration';
import ReviewModeration from './pages/admin/ReviewModeration';
import AuditLogs from './pages/admin/AuditLogs';

// New Role Dashboards
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import SubAdminDashboard from './pages/subadmin/SubAdminDashboard';
import CoordinatorDashboard from './pages/coordinator/CoordinatorDashboard';
import InstructorRoster from './pages/coordinator/InstructorRoster';
import CourseApprovals from './pages/coordinator/CourseApprovals';
import CourseCatalog from './pages/coordinator/CourseCatalog';
import CategoryManager from './pages/coordinator/CategoryManager';
import QualityReviews from './pages/coordinator/QualityReviews';
import Reports from './pages/coordinator/Reports';
import AccountsDashboard from './pages/accounts/AccountsDashboard';

// Super Admin Sub-pages
import SAUserManagement from './pages/superadmin/SAUserManagement';
import SARolesPermissions from './pages/superadmin/SARolesPermissions';
import SACourseManagement from './pages/superadmin/SACourseManagement';
import SACategories from './pages/superadmin/SACategories';
import SAApprovals from './pages/superadmin/SAApprovals';
import SAPaymentsFinance from './pages/superadmin/SAPaymentsFinance';
import SAReportsAnalytics from './pages/superadmin/SAReportsAnalytics';
import SAReviewsModeration from './pages/superadmin/SAReviewsModeration';
import SAAuditLogs from './pages/superadmin/SAAuditLogs';

// Sub Admin Sub-pages
import SubAdminUserManagement from './pages/subadmin/SubAdminUserManagement';
import SubAdminCourseManagement from './pages/subadmin/SubAdminCourseManagement';
import SubAdminCategories from './pages/subadmin/SubAdminCategories';
import SubAdminApprovals from './pages/subadmin/SubAdminApprovals';
import SubAdminReviewsModeration from './pages/subadmin/SubAdminReviewsModeration';
import SubAdminReports from './pages/subadmin/SubAdminReports';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main style={{ flex: 1 }}>
          <Routes>
            {/* ── Public Routes ──────────────────────────────────────── */}
            <Route path="/" element={<HomePage />} />
            <Route path="/course/:courseId" element={<CourseDetail />} />

            {/* ── Learner Routes ─────────────────────────────────────── */}
            <Route 
              path="/learner" 
              element={
                <ProtectedRoute role="learner">
                  <LearnerDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/learner/course/:courseId/learn" 
              element={
                <ProtectedRoute role="learner">
                  <LessonViewer />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/learner/wishlist" 
              element={
                <ProtectedRoute role="learner">
                  <Wishlist />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/learner/profile" 
              element={
                <ProtectedRoute role="learner">
                  <Profile />
                </ProtectedRoute>
              } 
            />

            {/* ── Instructor Routes ──────────────────────────────────── */}
            <Route 
              path="/instructor" 
              element={
                <ProtectedRoute role="instructor">
                  <InstructorDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/instructor/course/new" 
              element={
                <ProtectedRoute role="instructor">
                  <CourseForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/instructor/course/:courseId/edit" 
              element={
                <ProtectedRoute role="instructor">
                  <CourseForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/instructor/course/:courseId/curriculum" 
              element={
                <ProtectedRoute role="instructor">
                  <SectionManager />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/instructor/reviews" 
              element={
                <ProtectedRoute role="instructor">
                  <ReviewInbox />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/instructor/earnings" 
              element={
                <ProtectedRoute role="instructor">
                  <EarningsChart />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/instructor/course/:courseId/students" 
              element={
                <ProtectedRoute role="instructor">
                  <StudentsProgress />
                </ProtectedRoute>
              } 
            />

            {/* ── Admin Routes ───────────────────────────────────────── */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute role="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/users" 
              element={
                <ProtectedRoute role="admin">
                  <UserManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/courses" 
              element={
                <ProtectedRoute role="admin">
                  <CourseModeration />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/reviews" 
              element={
                <ProtectedRoute role="admin">
                  <ReviewModeration />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/audit-logs" 
              element={
                <ProtectedRoute role="admin">
                  <AuditLogs />
                </ProtectedRoute>
              } 
            />

            {/* ── Super Admin Routes ─────────────────────────────────── */}
            <Route 
              path="/super-admin" 
              element={
                <ProtectedRoute role="super_admin">
                  <SuperAdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/super-admin/users" element={<ProtectedRoute role="super_admin"><SAUserManagement /></ProtectedRoute>} />
            <Route path="/super-admin/roles" element={<ProtectedRoute role="super_admin"><SARolesPermissions /></ProtectedRoute>} />
            <Route path="/super-admin/courses" element={<ProtectedRoute role="super_admin"><SACourseManagement /></ProtectedRoute>} />
            <Route path="/super-admin/categories" element={<ProtectedRoute role="super_admin"><SACategories /></ProtectedRoute>} />
            <Route path="/super-admin/approvals" element={<ProtectedRoute role="super_admin"><SAApprovals /></ProtectedRoute>} />
            <Route path="/super-admin/finance" element={<ProtectedRoute role="super_admin"><SAPaymentsFinance /></ProtectedRoute>} />
            <Route path="/super-admin/analytics" element={<ProtectedRoute role="super_admin"><SAReportsAnalytics /></ProtectedRoute>} />
            <Route path="/super-admin/reviews" element={<ProtectedRoute role="super_admin"><SAReviewsModeration /></ProtectedRoute>} />
            <Route path="/super-admin/support" element={<ProtectedRoute role="super_admin"><SuperAdminDashboard /></ProtectedRoute>} />
            <Route path="/super-admin/settings" element={<ProtectedRoute role="super_admin"><SuperAdminDashboard /></ProtectedRoute>} />
            <Route path="/super-admin/audit-logs" element={<ProtectedRoute role="super_admin"><SAAuditLogs /></ProtectedRoute>} />

            {/* ── Sub Admin Routes ───────────────────────────────────── */}
            <Route 
              path="/sub-admin" 
              element={
                <ProtectedRoute role="sub_admin">
                  <SubAdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/sub-admin/users" element={<ProtectedRoute role="sub_admin"><SubAdminUserManagement /></ProtectedRoute>} />
            <Route path="/sub-admin/courses" element={<ProtectedRoute role="sub_admin"><SubAdminCourseManagement /></ProtectedRoute>} />
            <Route path="/sub-admin/categories" element={<ProtectedRoute role="sub_admin"><SubAdminCategories /></ProtectedRoute>} />
            <Route path="/sub-admin/approvals" element={<ProtectedRoute role="sub_admin"><SubAdminApprovals /></ProtectedRoute>} />
            <Route path="/sub-admin/reviews" element={<ProtectedRoute role="sub_admin"><SubAdminReviewsModeration /></ProtectedRoute>} />
            <Route path="/sub-admin/reports" element={<ProtectedRoute role="sub_admin"><SubAdminReports /></ProtectedRoute>} />
            <Route path="/sub-admin/support" element={<ProtectedRoute role="sub_admin"><SubAdminDashboard /></ProtectedRoute>} />

            {/* ── Course Coordinator Routes ──────────────────────────── */}
            <Route 
              path="/coordinator" 
              element={
                <ProtectedRoute role="coursecoordinator">
                  <CoordinatorDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/coordinator/instructors" 
              element={
                <ProtectedRoute role="coursecoordinator">
                  <InstructorRoster />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/coordinator/courses/pending" 
              element={
                <ProtectedRoute role="coursecoordinator">
                  <CourseApprovals />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/coordinator/courses" 
              element={
                <ProtectedRoute role="coursecoordinator">
                  <CourseCatalog />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/coordinator/categories" 
              element={
                <ProtectedRoute role="coursecoordinator">
                  <CategoryManager />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/coordinator/quality-reviews" 
              element={
                <ProtectedRoute role="coursecoordinator">
                  <QualityReviews />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/coordinator/reports" 
              element={
                <ProtectedRoute role="coursecoordinator">
                  <Reports />
                </ProtectedRoute>
              } 
            />

            {/* ── Accounts Routes ────────────────────────────────────── */}
            <Route 
              path="/accounts" 
              element={
                <ProtectedRoute role="accounts">
                  <AccountsDashboard />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}

