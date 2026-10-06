/**
 * SASidebarLayout.jsx — Shared sidebar wrapper for all Super Admin sub-pages.
 *
 * Provides consistent navigation sidebar with active state tracking.
 * Pattern follows CoordinatorDashboard.jsx sidebar implementation.
 */

import { Link, useLocation } from 'react-router-dom';
import SupportBadgeLink from '../../components/SupportBadgeLink';
import '../RoleDashboard.css';
import './SuperAdminDashboard.css';

const SIDEBAR_ITEMS = [
  { label: 'Dashboard', path: '/super-admin' },
  { label: 'User Management', path: '/super-admin/users' },
  { label: 'Roles & Permissions', path: '/super-admin/roles' },
  { label: 'Course Management', path: '/super-admin/courses' },
  { label: 'Categories', path: '/super-admin/categories' },
  { label: 'Approvals', path: '/super-admin/approvals' },
  { label: 'Payments & Finance', path: '/super-admin/finance' },
  { label: 'Reports & Analytics', path: '/super-admin/analytics' },
  { label: 'Reviews & Moderation', path: '/super-admin/reviews' },
  { label: 'Support', path: '/super-admin/support' },
  { label: 'Departments',       path: '/super-admin/departments' },
  { label: 'Service Requests',   path: '/super-admin/service-requests' },
  { label: 'Ticket Routing',    path: '/super-admin/ticket-routing' },
  { label: 'Platform Settings', path: '/super-admin/settings' },
  { label: 'Audit Logs',        path: '/super-admin/audit-logs' },
];

export { SIDEBAR_ITEMS };

export default function SASidebarLayout({ children }) {
  const location = useLocation();

  return (
    <div className="role-dashboard" id="super-admin-dashboard">
      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className="role-sidebar">
        <div className="role-sidebar-header">
          <h3>Super Admin</h3>
          <p>Full Platform Control</p>
        </div>
        <ul className="sidebar-nav">
          {SIDEBAR_ITEMS.map((item) => {
            const isPlaceholder = item.path === '/super-admin/settings';
            if (item.label === 'Support') {
              return (
                <SupportBadgeLink 
                  key={item.label}
                  label={item.label}
                  path={item.path}
                  apiEndpoint="/superadmin/support-tickets/unread-count"
                />
              );
            }
            return (
              <Link to={item.path} key={item.label} style={{ textDecoration: 'none' }}>
                <li className={`sidebar-nav-item${location.pathname === item.path ? ' active' : ''}`}>
                  {item.label}
                  {isPlaceholder && (
                    <span className="sidebar-coming-soon">Soon</span>
                  )}
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
