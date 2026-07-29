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

// New Role Dashboards
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import SubAdminDashboard from './pages/subadmin/SubAdminDashboard';
import CoordinatorDashboard from './pages/coordinator/CoordinatorDashboard';
import AccountsDashboard from './pages/accounts/AccountsDashboard';

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

            {/* ── Super Admin Routes ─────────────────────────────────── */}
            <Route 
              path="/super-admin" 
              element={
                <ProtectedRoute role="super_admin">
                  <SuperAdminDashboard />
                </ProtectedRoute>
              } 
            />

            {/* ── Sub Admin Routes ───────────────────────────────────── */}
            <Route 
              path="/sub-admin" 
              element={
                <ProtectedRoute role="sub_admin">
                  <SubAdminDashboard />
                </ProtectedRoute>
              } 
            />

            {/* ── Course Coordinator Routes ──────────────────────────── */}
            <Route 
              path="/coordinator" 
              element={
                <ProtectedRoute role="course_coordinator">
                  <CoordinatorDashboard />
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

