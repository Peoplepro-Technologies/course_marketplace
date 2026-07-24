/**
 * SubAdminDashboard.jsx — Placeholder dashboard for the sub_admin role.
 *
 * Displays a welcome header and a sidebar with 8 menu items (non-functional).
 * Reuses the shared RoleDashboard layout and existing design system.
 */

import useAuth from '../../hooks/useAuth';
import '../RoleDashboard.css';

const SIDEBAR_ITEMS = [
  { icon: '📊', label: 'Dashboard' },
  { icon: '👥', label: 'User Management' },
  { icon: '📚', label: 'Course Management' },
  { icon: '🏷️', label: 'Categories' },
  { icon: '✅', label: 'Approvals' },
  { icon: '⭐', label: 'Reviews & Moderation' },
  { icon: '🛟', label: 'Support' },
  { icon: '📈', label: 'Reports' },
];

export default function SubAdminDashboard() {
  const { user } = useAuth();

  return (
    <div className="role-dashboard" id="sub-admin-dashboard">
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className="role-sidebar">
        <div className="role-sidebar-header">
          <h3>🔧 Sub Admin</h3>
          <p>Delegated Management</p>
        </div>
        <ul className="sidebar-nav">
          {SIDEBAR_ITEMS.map((item, i) => (
            <li
              key={item.label}
              className={`sidebar-nav-item${i === 0 ? ' active' : ''}`}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              {item.label}
              {i !== 0 && (
                <span className="sidebar-coming-soon">Soon</span>
              )}
            </li>
          ))}
        </ul>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="role-main">
        <div className="role-welcome">
          <h1>
            Welcome, <span>Sub Admin</span>
          </h1>
          <p>
            Hello {user?.name || 'Sub Administrator'}! You can manage users,
            courses, and reviews with delegated permissions.
          </p>
        </div>

        <h3 style={{ marginBottom: 'var(--space-lg)' }}>Quick Access</h3>
        <div className="role-cards-grid">
          {SIDEBAR_ITEMS.slice(1).map((item) => (
            <div key={item.label} className="role-placeholder-card">
              <div className="card-icon">{item.icon}</div>
              <h4>{item.label}</h4>
              <p>Coming soon</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
