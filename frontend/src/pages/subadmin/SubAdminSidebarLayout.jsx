/**
 * SubAdminSidebarLayout.jsx — Shared sidebar wrapper for all Sub Admin sub-pages.
 *
 * Provides consistent navigation sidebar with active state tracking.
 * Reuses the layout styles from Super Admin dashboard for visual consistency.
 */

import { Link, useLocation } from 'react-router-dom';
import '../RoleDashboard.css';
import '../superadmin/SuperAdminDashboard.css';

const SIDEBAR_ITEMS = [
  { icon: '📊', label: 'Dashboard', path: '/sub-admin' },
  { icon: '👥', label: 'User Management', path: '/sub-admin/users' },
  { icon: '📚', label: 'Course Management', path: '/sub-admin/courses' },
  { icon: '🏷️', label: 'Categories', path: '/sub-admin/categories' },
  { icon: '✅', label: 'Approvals', path: '/sub-admin/approvals' },
  { icon: '⭐', label: 'Reviews & Moderation', path: '/sub-admin/reviews' },
  { icon: '🛟', label: 'Support', path: '/sub-admin/support' },
  { icon: '📈', label: 'Reports', path: '/sub-admin/reports' },
];

export { SIDEBAR_ITEMS };

export default function SubAdminSidebarLayout({ children }) {
  const location = useLocation();

  return (
    <div className="role-dashboard" id="sub-admin-dashboard">
      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className="role-sidebar">
        <div className="role-sidebar-header">
          <h3>🔧 Sub Admin</h3>
          <p>Delegated Management</p>
        </div>
        <ul className="sidebar-nav">
          {SIDEBAR_ITEMS.map((item) => {
            const isPlaceholder = item.path === '/sub-admin/support';
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
