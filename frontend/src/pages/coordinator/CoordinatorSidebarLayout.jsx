/**
 * CoordinatorSidebarLayout.jsx — Shared sidebar wrapper for all Coordinator sub-pages.
 *
 * Extracts the sidebar from CoordinatorDashboard so that non-dashboard pages
 * (like Support) can share the same navigation shell.
 * Pattern mirrors InstructorSidebarLayout.
 */

import { Link, useLocation } from 'react-router-dom';
import SupportBadgeLink from '../../components/SupportBadgeLink';
import '../RoleDashboard.css';
import './CoordinatorDashboard.css';

const SIDEBAR_ITEMS = [
  { icon: '📊', label: 'Dashboard',        path: '/coordinator' },
  { icon: '✅', label: 'Course Approvals', path: '/coordinator/courses/pending' },
  { icon: '📚', label: 'Course Catalog',   path: '/coordinator/courses' },
  { icon: '👥', label: 'Faculty Management', path: '/coordinator/faculty-assignments' },
  { icon: '📋', label: 'Assign./Quiz Stats', path: '/coordinator/faculty-analytics' },
  { icon: '🏷️', label: 'Categories',       path: '/coordinator/categories' },
  { icon: '👨‍🏫', label: 'Instructors',      path: '/coordinator/instructors' },
  { icon: '⭐', label: 'Quality & Reviews', path: '/coordinator/quality-reviews' },
  { icon: '🛟', label: 'Support',           path: '/coordinator/support' },
  { icon: '📈', label: 'Reports',           path: '/coordinator/reports' },
];

export default function CoordinatorSidebarLayout({ children }) {
  const location = useLocation();

  return (
    <div className="role-dashboard" id="coordinator-dashboard">
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className="role-sidebar">
        <div className="role-sidebar-header">
          <h3>📋 Coordinator</h3>
          <p>Course Quality &amp; Oversight</p>
        </div>
        <ul className="sidebar-nav">
          {SIDEBAR_ITEMS.map((item) => {
            if (item.label === 'Support') {
              return (
                <SupportBadgeLink
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  path={item.path}
                  apiEndpoint="/support-tickets/unread-count"
                />
              );
            }
            return (
              <Link to={item.path} key={item.label} style={{ textDecoration: 'none' }}>
                <li className={`sidebar-nav-item${location.pathname === item.path ? ' active' : ''}`}>
                  <span className="sidebar-nav-icon">{item.icon}</span>
                  {item.label}
                </li>
              </Link>
            );
          })}
        </ul>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main className="role-main">
        {children}
      </main>
    </div>
  );
}
