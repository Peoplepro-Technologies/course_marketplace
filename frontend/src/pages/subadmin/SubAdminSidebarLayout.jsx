/**
 * SubAdminSidebarLayout.jsx — Shared sidebar wrapper for all Sub Admin sub-pages.
 *
 * Provides consistent navigation sidebar with active state tracking.
 * Reuses the layout styles from Super Admin dashboard for visual consistency.
 */

import { Link, useLocation } from 'react-router-dom';
import SupportBadgeLink from '../../components/SupportBadgeLink';
import '../RoleDashboard.css';
import '../superadmin/SuperAdminDashboard.css';

const SIDEBAR_ITEMS = [
  { label: 'Dashboard', path: '/sub-admin' },
  { label: 'User Management', path: '/sub-admin/users' },
  { label: 'Course Management', path: '/sub-admin/courses' },
  { label: 'Categories', path: '/sub-admin/categories' },
  { label: 'Approvals', path: '/sub-admin/approvals' },
  { label: 'Reviews & Moderation', path: '/sub-admin/reviews' },
  { label: 'Support', path: '/sub-admin/support' },
  { label: 'Reports', path: '/sub-admin/reports' },
];

export { SIDEBAR_ITEMS };

export default function SubAdminSidebarLayout({ children }) {
  const location = useLocation();

  return (
    <div className="role-dashboard" id="sub-admin-dashboard">
      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className="role-sidebar">
        <div className="role-sidebar-header">
          <h3>Sub Admin</h3>
          <p>Delegated Management</p>
        </div>
        <ul className="sidebar-nav">
          {SIDEBAR_ITEMS.map((item) => {
            if (item.label === 'Support') {
              return (
                <SupportBadgeLink 
                  key={item.label}
                  label={item.label}
                  path={item.path}
                  apiEndpoint="/subadmin/support-tickets/unread-count"
                />
              );
            }
            return (
              <Link to={item.path} key={item.label} style={{ textDecoration: 'none' }}>
                <li className={`sidebar-nav-item${location.pathname === item.path ? ' active' : ''}`}>
                  {item.label}
                </li>
              </Link>
            );
          })}
        </ul>
      </aside>

      {/* ── Main Content ───────────────────────────────────────────── */}
      <main className="role-main">
        {children}
      </main>
    </div>
  );
}
