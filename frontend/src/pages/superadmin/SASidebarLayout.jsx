/**
 * SASidebarLayout.jsx — Shared sidebar wrapper for all Super Admin sub-pages.
 *
 * Provides consistent navigation sidebar with active state tracking.
 * Pattern follows CoordinatorDashboard.jsx sidebar implementation.
 */

import { Link, useLocation } from 'react-router-dom';
import '../RoleDashboard.css';
import './SuperAdminDashboard.css';

const SIDEBAR_ITEMS = [
  { icon: '📊', label: 'Dashboard', path: '/super-admin' },
  { icon: '👥', label: 'User Management', path: '/super-admin/users' },
  { icon: '🔐', label: 'Roles & Permissions', path: '/super-admin/roles' },
  { icon: '📚', label: 'Course Management', path: '/super-admin/courses' },
  { icon: '🏷️', label: 'Categories', path: '/super-admin/categories' },
  { icon: '✅', label: 'Approvals', path: '/super-admin/approvals' },
  { icon: '💳', label: 'Payments & Finance', path: '/super-admin/finance' },
  { icon: '📈', label: 'Reports & Analytics', path: '/super-admin/analytics' },
  { icon: '⭐', label: 'Reviews & Moderation', path: '/super-admin/reviews' },
  { icon: '🛟', label: 'Support', path: '/super-admin/support' },
  { icon: '⚙️', label: 'Platform Settings', path: '/super-admin/settings' },
  { icon: '📋', label: 'Audit Logs', path: '/super-admin/audit-logs' },
];

export { SIDEBAR_ITEMS };

export default function SASidebarLayout({ children }) {
  const location = useLocation();

  return (
    <div className="role-dashboard" id="super-admin-dashboard">
      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className="role-sidebar">
        <div className="role-sidebar-header">
          <h3>🛡️ Super Admin</h3>
          <p>Full Platform Control</p>
        </div>
        <ul className="sidebar-nav">
          {SIDEBAR_ITEMS.map((item) => {
            const isPlaceholder = item.path === '/super-admin/support' || item.path === '/super-admin/settings';
            return (
              <Link to={item.path} key={item.label} style={{ textDecoration: 'none' }}>
                <li className={`sidebar-nav-item${location.pathname === item.path ? ' active' : ''}`}>
                  <span className="sidebar-nav-icon">{item.icon}</span>
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
