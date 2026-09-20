import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthProvider from './auth/AuthProvider';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import HomePage from './pages/HomePage';
import CourseDetail from './pages/CourseDetail';
import CategoriesPage from './pages/CategoriesPage';

// Learner Pages
import LearnerSidebarLayout from './pages/learner/LearnerSidebarLayout';
import LearnerDashboard from './pages/learner/LearnerDashboard';
import LessonViewer from './pages/learner/LessonViewer';
import Wishlist from './pages/learner/Wishlist';
import Profile from './pages/learner/Profile';
import PurchasesHistory from './pages/learner/PurchasesHistory';
import InvoiceView from './pages/learner/InvoiceView';
import LearnerLiveClasses from './pages/learner/LearnerLiveClasses';
import MyReviews from './pages/learner/MyReviews';
import LearnerProgress from './pages/learner/LearnerProgress';

// Instructor Pages
import InstructorSidebarLayout from './pages/instructor/InstructorSidebarLayout';
import InstructorDashboard from './pages/instructor/InstructorDashboard';
import CourseForm from './pages/instructor/CourseForm';
import SectionManager from './pages/instructor/SectionManager';
import ReviewInbox from './pages/instructor/ReviewInbox';
import EarningsChart from './pages/instructor/EarningsChart';
import StudentsProgress from './pages/instructor/StudentsProgress';
import LiveClassManager from './pages/instructor/LiveClassManager';
import SubmissionsStatus from './pages/instructor/SubmissionsStatus';
import InstructorProfile from './pages/instructor/InstructorProfile';


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
import ACTransactions from './pages/accounts/ACTransactions';
import ACPaymentsRefunds from './pages/accounts/ACPaymentsRefunds';
import ACPayouts from './pages/accounts/ACPayouts';
import ACInvoices from './pages/accounts/ACInvoices';
import ACFinancialReports from './pages/accounts/ACFinancialReports';
import ACReconciliation from './pages/accounts/ACReconciliation';

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
import SASettings from './pages/superadmin/SASettings';

// Sub Admin Sub-pages
import SubAdminUserManagement from './pages/subadmin/SubAdminUserManagement';
import SubAdminCourseManagement from './pages/subadmin/SubAdminCourseManagement';
import SubAdminCategories from './pages/subadmin/SubAdminCategories';
import SubAdminApprovals from './pages/subadmin/SubAdminApprovals';
import SubAdminReviewsModeration from './pages/subadmin/SubAdminReviewsModeration';
import SubAdminReports from './pages/subadmin/SubAdminReports';

// Support Tickets Shared Components
import SupportTickets from './pages/shared/SupportTickets';
import SupportTicketDetail from './pages/shared/SupportTicketDetail';
import SASupportTickets from './pages/superadmin/SASupportTickets';
import SubAdminSupportTickets from './pages/subadmin/SubAdminSupportTickets';
import ACSupportTickets from './pages/accounts/ACSupportTickets';

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
            <Route path="/categories" element={<CategoriesPage />} />

            {/* ── Learner Routes ─────────────────────────────────────── */}
            <Route 
              path="/learner/dashboard" 
              element={
                <ProtectedRoute role="learner">
                  <LearnerSidebarLayout>
                    <LearnerDashboard />
                  </LearnerSidebarLayout>
                </ProtectedRoute>
              } 
            />
            {/* Kept original /learner path mapped to dashboard for compatibility */}
            <Route 
              path="/learner" 
              element={
                <ProtectedRoute role="learner">
                  <LearnerSidebarLayout>
                    <LearnerDashboard />
                  </LearnerSidebarLayout>
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
              path="/learner/courses/:courseId" 
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
                  <LearnerSidebarLayout>
                    <Wishlist />
                  </LearnerSidebarLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/learner/profile" 
              element={
                <ProtectedRoute role="learner">
                  <LearnerSidebarLayout>
                    <Profile />
                  </LearnerSidebarLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/learner/purchases" 
              element={
                <ProtectedRoute role="learner">
                  <LearnerSidebarLayout>
                    <PurchasesHistory />
                  </LearnerSidebarLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/learner/transactions/:transactionId/invoice" 
              element={
                <ProtectedRoute role="learner">
                  <LearnerSidebarLayout>
                    <InvoiceView />
                  </LearnerSidebarLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/learner/live-classes" 
              element={
                <ProtectedRoute role="learner">
                  <LearnerSidebarLayout>
                    <LearnerLiveClasses />
                  </LearnerSidebarLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/learner/support" 
              element={
                <ProtectedRoute role="learner">
                  <LearnerSidebarLayout>
                    <SupportTickets />
                  </LearnerSidebarLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/learner/support/:id" 
              element={
                <ProtectedRoute role="learner">
                  <LearnerSidebarLayout>
                    <SupportTicketDetail />
                  </LearnerSidebarLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/learner/progress" 
              element={
                <ProtectedRoute role="learner">
                  <LearnerSidebarLayout>
                    <LearnerProgress />
                  </LearnerSidebarLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/learner/my-reviews" 
              element={
                <ProtectedRoute role="learner">
                  <LearnerSidebarLayout>
                    <MyReviews />
                  </LearnerSidebarLayout>
                </ProtectedRoute>
              } 
            />

            {/* ── Instructor Routes ──────────────────────────────────── */}
            <Route 
              path="/instructor/dashboard" 
              element={
                <ProtectedRoute role="instructor">
                  <InstructorSidebarLayout>
                    <InstructorDashboard />
                  </InstructorSidebarLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/instructor" 
              element={
                <ProtectedRoute role="instructor">
                  <InstructorSidebarLayout>
                    <InstructorDashboard />
                  </InstructorSidebarLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/instructor/courses" 
              element={
                <ProtectedRoute role="instructor">
                  <InstructorSidebarLayout>
                    {/* Placeholder for now until we have an explicit Courses list page separate from Dashboard */}
                    <InstructorDashboard />
                  </InstructorSidebarLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/instructor/submissions" 
              element={
                <ProtectedRoute role="instructor">
                  <InstructorSidebarLayout>
                    <SubmissionsStatus />
                  </InstructorSidebarLayout>
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
                  <InstructorSidebarLayout>
                    <ReviewInbox />
                  </InstructorSidebarLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/instructor/earnings" 
              element={
                <ProtectedRoute role="instructor">
                  <InstructorSidebarLayout>
                    <EarningsChart />
                  </InstructorSidebarLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/instructor/students" 
              element={
                <ProtectedRoute role="instructor">
                  <InstructorSidebarLayout>
                    <StudentsProgress />
                  </InstructorSidebarLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/instructor/course/:courseId/students" 
              element={
                <ProtectedRoute role="instructor">
                  <InstructorSidebarLayout>
                    <StudentsProgress />
                  </InstructorSidebarLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/instructor/live-classes" 
              element={
                <ProtectedRoute role="instructor">
                  <InstructorSidebarLayout>
                    <LiveClassManager />
                  </InstructorSidebarLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/instructor/support" 
              element={
                <ProtectedRoute role="instructor">
                  <InstructorSidebarLayout>
                    <SupportTickets />
                  </InstructorSidebarLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/instructor/support/:id" 
              element={
                <ProtectedRoute role="instructor">
                  <InstructorSidebarLayout>
                    <SupportTicketDetail />
                  </InstructorSidebarLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/instructor/profile" 
              element={
                <ProtectedRoute role="instructor">
                  <InstructorSidebarLayout>
                    <InstructorProfile />
                  </InstructorSidebarLayout>
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
            <Route path="/super-admin/support" element={<ProtectedRoute role="super_admin"><SASupportTickets /></ProtectedRoute>} />
            <Route path="/super-admin/settings" element={<ProtectedRoute role="super_admin"><SASettings /></ProtectedRoute>} />
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
            <Route path="/sub-admin/support" element={<ProtectedRoute role="sub_admin"><SubAdminSupportTickets /></ProtectedRoute>} />

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
            <Route path="/accounts/transactions" element={<ProtectedRoute role="accounts"><ACTransactions /></ProtectedRoute>} />
            <Route path="/accounts/refunds" element={<ProtectedRoute role="accounts"><ACPaymentsRefunds /></ProtectedRoute>} />
            <Route path="/accounts/payouts" element={<ProtectedRoute role="accounts"><ACPayouts /></ProtectedRoute>} />
            <Route path="/accounts/invoices" element={<ProtectedRoute role="accounts"><ACInvoices /></ProtectedRoute>} />
            <Route path="/accounts/reports" element={<ProtectedRoute role="accounts"><ACFinancialReports /></ProtectedRoute>} />
            <Route path="/accounts/reconciliation" element={<ProtectedRoute role="accounts"><ACReconciliation /></ProtectedRoute>} />
            <Route path="/accounts/support" element={<ProtectedRoute role="accounts"><ACSupportTickets /></ProtectedRoute>} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}

