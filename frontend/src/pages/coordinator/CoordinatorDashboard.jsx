/**
 * CoordinatorDashboard.jsx — Placeholder dashboard for the course_coordinator role.
 *
 * Displays a welcome header and a sidebar with 7 menu items (non-functional).
 * Reuses the shared RoleDashboard layout and existing design system.
 */

import useAuth from '../../hooks/useAuth';
import '../RoleDashboard.css';

const SIDEBAR_ITEMS = [
  { icon: '📊', label: 'Dashboard' },
  { icon: '✅', label: 'Course Approvals' },
  { icon: '📚', label: 'Course Catalog' },
  { icon: '🏷️', label: 'Categories' },
  { icon: '👨‍🏫', label: 'Instructors' },
  { icon: '⭐', label: 'Quality & Reviews' },
  { icon: '📈', label: 'Reports' },
];

export default function CoordinatorDashboard() {
  const { user } = useAuth();

  return (
    <div className="role-dashboard" id="coordinator-dashboard">
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className="role-sidebar">
        <div className="role-sidebar-header">
          <h3>📋 Coordinator</h3>
          <p>Course Quality & Oversight</p>
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
            Welcome, <span>Course Coordinator</span>
          </h1>
          <p>
            Hello {user?.name || 'Coordinator'}! Manage course approvals,
            quality standards, and instructor coordination.
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
