/**
 * CoordinatorDashboard.jsx — Landing page for the coursecoordinator role.
 *
 * Displays four live data widgets:
 *   1. Pending Reviews count  — from /coordinator/stats
 *   2. Recently Published     — last 5 published courses
 *   3. Instructor Roster      — total instructor count + link
 *   4. Category Health        — published courses per category (inline bar chart)
 *
 * Below widgets: Quick Access shortcut cards to sub-pages.
 */

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import useAuth from '../../hooks/useAuth';
import LoadingSpinner from '../../components/LoadingSpinner';
import '../RoleDashboard.css';
import './CoordinatorDashboard.css';

const SIDEBAR_ITEMS = [
  { icon: '📊', label: 'Dashboard', path: '/coordinator' },
  { icon: '✅', label: 'Course Approvals', path: '/coordinator/courses/pending' },
  { icon: '📚', label: 'Course Catalog', path: '/coordinator/courses' },
  { icon: '🏷️', label: 'Categories', path: '/coordinator/categories' },
  { icon: '👨‍🏫', label: 'Instructors', path: '/coordinator/instructors' },
  { icon: '⭐', label: 'Quality & Reviews', path: '/coordinator/quality-reviews' },
  { icon: '📈', label: 'Reports', path: '/coordinator/reports' },
];

const QUICK_ACCESS = SIDEBAR_ITEMS.slice(1); // skip Dashboard itself

export default function CoordinatorDashboard() {
  const { user } = useAuth();
  const location = useLocation();

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);

  useEffect(() => {
    api.get('/coordinator/stats')
      .then(res => setStats(res.data))
      .catch(err => setStatsError(err.response?.data?.detail || 'Failed to load stats'))
      .finally(() => setStatsLoading(false));
  }, []);

  // Category health bar: max count for proportional widths
  const maxCatCount = stats?.category_health?.length
    ? Math.max(...stats.category_health.map(c => c.count))
    : 1;

  return (
    <div className="role-dashboard" id="coordinator-dashboard">
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className="role-sidebar">
        <div className="role-sidebar-header">
          <h3>📋 Coordinator</h3>
          <p>Course Quality & Oversight</p>
        </div>
        <ul className="sidebar-nav">
          {SIDEBAR_ITEMS.map((item) => (
            <Link to={item.path} key={item.label} style={{ textDecoration: 'none' }}>
              <li className={`sidebar-nav-item${location.pathname === item.path ? ' active' : ''}`}>
                <span className="sidebar-nav-icon">{item.icon}</span>
                {item.label}
              </li>
            </Link>
          ))}
        </ul>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main className="role-main">
        {/* Welcome */}
        <div className="role-welcome">
          <h1>Welcome, <span>Course Coordinator</span></h1>
          <p>
            Hello {user?.name || 'Coordinator'}! Here's a live overview of the platform.
          </p>
        </div>

        {/* ── Live Stats Widgets ──────────────────────────────────────── */}
        {statsLoading ? (
          <div style={{ padding: 'var(--space-2xl) 0' }}><LoadingSpinner /></div>
        ) : statsError ? (
          <div className="alert alert-error" style={{ marginBottom: 'var(--space-xl)' }}>
            ⚠️ Could not load stats: {statsError}
          </div>
        ) : (
          <div className="coord-widgets-grid">

            {/* Widget 1 — Pending Reviews */}
            <div className="coord-widget coord-widget--pending animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
              <div className="coord-widget-header">
                <span className="coord-widget-icon">✅</span>
                <h3>Pending Reviews</h3>
              </div>
              <div className="coord-widget-body">
                <div className="coord-stat-number" id="pending-reviews-count">
                  {stats.pending_count}
                </div>
                <p className="coord-stat-label">
                  {stats.pending_count === 1 ? 'course awaiting review' : 'courses awaiting review'}
                </p>
              </div>
              <Link to="/coordinator/courses/pending" className="coord-widget-action btn btn-primary btn-sm">
                {stats.pending_count > 0 ? 'Review Now →' : 'View Queue →'}
              </Link>
            </div>

            {/* Widget 2 — Recently Published */}
            <div className="coord-widget coord-widget--published animate-fade-in-up" style={{ animationDelay: '0.10s' }}>
              <div className="coord-widget-header">
                <span className="coord-widget-icon">🚀</span>
                <h3>Recently Published</h3>
              </div>
              <div className="coord-widget-body">
                {stats.recently_published.length === 0 ? (
                  <p className="coord-empty-note">No published courses yet.</p>
                ) : (
                  <ul className="coord-recent-list">
                    {stats.recently_published.map(c => (
                      <li key={c.id} className="coord-recent-item">
                        <div className="coord-recent-title">{c.title}</div>
                        <div className="coord-recent-meta">
                          <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                            {c.category}
                          </span>
                          <span className="coord-recent-instructor">
                            👤 {c.instructor_name}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Link to="/coordinator/courses?status=published" className="coord-widget-action btn btn-secondary btn-sm">
                View All →
              </Link>
            </div>

            {/* Widget 3 — Instructor Roster */}
            <div className="coord-widget coord-widget--instructors animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
              <div className="coord-widget-header">
                <span className="coord-widget-icon">👨‍🏫</span>
                <h3>Instructor Roster</h3>
              </div>
              <div className="coord-widget-body">
                <div className="coord-stat-number" id="instructor-count">
                  {stats.instructor_count}
                </div>
                <p className="coord-stat-label">
                  {stats.instructor_count === 1 ? 'registered instructor' : 'registered instructors'}
                </p>
              </div>
              <Link to="/coordinator/instructors" className="coord-widget-action btn btn-secondary btn-sm">
                View Roster →
              </Link>
            </div>

            {/* Widget 4 — Category Health */}
            <div className="coord-widget coord-widget--categories animate-fade-in-up" style={{ animationDelay: '0.20s' }}>
              <div className="coord-widget-header">
                <span className="coord-widget-icon">🏷️</span>
                <h3>Category Health</h3>
              </div>
              <div className="coord-widget-body">
                {stats.category_health.length === 0 ? (
                  <p className="coord-empty-note">No published courses yet.</p>
                ) : (
                  <div className="coord-category-bars">
                    {stats.category_health.map(cat => (
                      <div key={cat.category} className="coord-cat-row">
                        <span className="coord-cat-name">{cat.category}</span>
                        <div className="coord-cat-bar-track">
                          <div
                            className="coord-cat-bar-fill"
                            style={{ width: `${Math.round((cat.count / maxCatCount) * 100)}%` }}
                          />
                        </div>
                        <span className="coord-cat-count">{cat.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Link to="/coordinator/categories" className="coord-widget-action btn btn-secondary btn-sm">
                Manage Categories →
              </Link>
            </div>

          </div>
        )}

        {/* ── Quick Access ─────────────────────────────────────────────── */}
        <h3 className="coord-section-label">Quick Access</h3>
        <div className="role-cards-grid">
          {QUICK_ACCESS.map((item) => (
            <Link to={item.path} key={item.label} style={{ textDecoration: 'none', display: 'block' }}>
              <div className="role-placeholder-card" style={{ cursor: 'pointer', height: '100%' }}>
                <div className="card-icon">{item.icon}</div>
                <h4>{item.label}</h4>
                <p>View {item.label.toLowerCase()}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
