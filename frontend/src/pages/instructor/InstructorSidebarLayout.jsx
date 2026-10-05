import { Link, useLocation } from 'react-router-dom';
import SupportBadgeLink from '../../components/SupportBadgeLink';
import '../RoleDashboard.css';

const SIDEBAR_ITEMS = [
  { label: 'Dashboard', path: '/instructor/dashboard' },
  { label: 'My Courses', path: '/instructor/courses' },
  { label: 'Submissions & Status', path: '/instructor/submissions' },
  { label: 'Assignments/Quiz', path: '/instructor/analytics' },
  { label: 'Students', path: '/instructor/students' },
  { label: 'Earnings', path: '/instructor/earnings' },
  { label: 'Live Classes', path: '/instructor/live-classes' },
  { label: 'Reviews', path: '/instructor/reviews' },
  { label: 'Support', path: '/instructor/support' },
  { label: 'Profile & Payout', path: '/instructor/profile' },
];

export { SIDEBAR_ITEMS };

export default function InstructorSidebarLayout({ children }) {
  const location = useLocation();

  return (
    <div className="role-dashboard" id="instructor-dashboard">
      <aside className="role-sidebar">
        <div className="role-sidebar-header">
          <h3>Instructor</h3>
          <p>Manage Your Teaching</p>
        </div>
        <ul className="sidebar-nav">
          {SIDEBAR_ITEMS.map((item) => {
            // Exact match for dashboard, prefix match for others to keep active state when on sub-routes
            const isActive = item.path === '/instructor/dashboard' 
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);

            if (item.label === 'Support') {
              return (
                <SupportBadgeLink 
                  key={item.label}
                  label={item.label}
                  path={item.path}
                  apiEndpoint="/support-tickets/unread-count"
                />
              );
            }

            return (
              <Link to={item.path} key={item.label} style={{ textDecoration: 'none' }}>
                <li className={`sidebar-nav-item${isActive ? ' active' : ''}`}>
                  {item.label}
                </li>
              </Link>
            );
          })}
        </ul>
      </aside>

      <main className="role-main">
        {children}
      </main>
    </div>
  );
}
