/**
 * CoordinatorDashboard.jsx — Placeholder dashboard for the coursecoordinator role.
 *
 * Displays a welcome header and a sidebar with 7 menu items (non-functional).
 * Reuses the shared RoleDashboard layout and existing design system.
 */

import { Link, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import '../RoleDashboard.css';

const SIDEBAR_ITEMS = [
  { icon: '📊', label: 'Dashboard', path: '/coordinator' },
  { icon: '✅', label: 'Course Approvals', path: '/coordinator/courses/pending' },
  { icon: '📚', label: 'Course Catalog', path: '/coordinator/courses' },
  { icon: '🏷️', label: 'Categories', path: '/coordinator/categories' },
  { icon: '👨‍🏫', label: 'Instructors', path: '/coordinator/instructors' },
  { icon: '⭐', label: 'Quality & Reviews', path: '/coordinator/quality-reviews' },
  { icon: '📈', label: 'Reports', path: '/coordinator/reports' },
];

export default function CoordinatorDashboard() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="role-dashboard" id="coordinator-dashboard">
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className="role-sidebar">
        <div className="role-sidebar-header">
          <h3>📋 Coordinator</h3>
          <p>Course Quality & Oversight</p>
        </div>
        <ul className="sidebar-nav">
          {SIDEBAR_ITEMS.map((item) => (
            item.path !== '#' ? (
              <Link to={item.path} key={item.label} style={{ textDecoration: 'none' }}>
                <li className={`sidebar-nav-item${location.pathname === item.path ? ' active' : ''}`}>
                  <span className="sidebar-nav-icon">{item.icon}</span>
                  {item.label}
                </li>
              </Link>
            ) : (
              <li key={item.label} className="sidebar-nav-item">
                <span className="sidebar-nav-icon">{item.icon}</span>
                {item.label}
                <span className="sidebar-coming-soon">Soon</span>
              </li>
            )
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
            item.path !== '#' ? (
              <Link to={item.path} key={item.label} style={{ textDecoration: 'none', display: 'block' }}>
                <div className="role-placeholder-card" style={{ cursor: 'pointer', height: '100%' }}>
                  <div className="card-icon">{item.icon}</div>
                  <h4>{item.label}</h4>
                  <p>View {item.label.toLowerCase()}</p>
                </div>
              </Link>
            ) : (
              <div key={item.label} className="role-placeholder-card">
                <div className="card-icon">{item.icon}</div>
                <h4>{item.label}</h4>
                <p>Coming soon</p>
              </div>
            )
          ))}
        </div>
      </main>
    </div>
  );
}
