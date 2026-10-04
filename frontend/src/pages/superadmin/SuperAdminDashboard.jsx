/**
 * SuperAdminDashboard.jsx — Live dashboard for the super_admin role.
 *
 * Displays four KPI widgets (users, courses, enrollments, revenue estimate)
 * and quick access cards to all sub-pages.
 * Fetches real data from /superadmin/analytics/kpis.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import useAuth from '../../hooks/useAuth';
import LoadingSpinner from '../../components/LoadingSpinner';
import SASidebarLayout, { SIDEBAR_ITEMS } from './SASidebarLayout';

const QUICK_ACCESS = SIDEBAR_ITEMS.slice(1);

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/superadmin/analytics/kpis')
      .then(res => setKpis(res.data))
      .catch(err => setError(err.response?.data?.detail || 'Failed to load KPIs'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SASidebarLayout>
      {/* Welcome */}
      <div className="role-welcome">
        <h1>Welcome, <span>Super Admin</span></h1>
        <p>
          Hello {user?.name || 'Administrator'}! Here's a live overview of the platform.
        </p>
      </div>

      {/* ── KPI Widgets ─────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ padding: 'var(--space-2xl) 0' }}><LoadingSpinner /></div>
      ) : error ? (
        <div className="alert alert-error" style={{ marginBottom: 'var(--space-xl)' }}>
          ⚠️ {error}
        </div>
      ) : (
        <div className="sa-widgets-grid">
          <div className="sa-widget sa-widget--users">
            <div className="sa-widget-header">
              <span className="sa-widget-icon">👥</span>
              <h3>Total Users</h3>
            </div>
            <div className="sa-stat-number" id="sa-total-users">{kpis.total_users}</div>
            <p className="sa-stat-label">registered on platform</p>
          </div>

          <div className="sa-widget sa-widget--courses">
            <div className="sa-widget-header">
              <span className="sa-widget-icon">📚</span>
              <h3>Total Courses</h3>
            </div>
            <div className="sa-stat-number" id="sa-total-courses">{kpis.published_courses} / {kpis.total_courses}</div>
            <p className="sa-stat-label">published / total courses</p>
          </div>

          <div className="sa-widget sa-widget--enrollments">
            <div className="sa-widget-header">
              <span className="sa-widget-icon">🎓</span>
              <h3>Total Enrollments</h3>
            </div>
            <div className="sa-stat-number" id="sa-total-enrollments">{kpis.total_enrollments}</div>
            <p className="sa-stat-label">student enrollments</p>
          </div>

          <div className="sa-widget sa-widget--revenue">
            <div className="sa-widget-header">
              <span className="sa-widget-icon">💰</span>
              <h3>Revenue Estimate</h3>
            </div>
            <div className="sa-stat-number" id="sa-revenue">
              ₹{kpis.revenue_estimate?.toLocaleString() || '0'}
            </div>
            <p className="sa-stat-label">estimated (demo data)</p>
          </div>
        </div>
      )}

      {/* ── Quick Access ────────────────────────────────────────────── */}
      <h3 className="sa-section-label">Quick Access</h3>
      <div className="role-cards-grid">
        {QUICK_ACCESS.map((item) => {
          const isPlaceholder = item.path === '/super-admin/support' || item.path === '/super-admin/settings';
          return (
            <Link to={item.path} key={item.label} style={{ textDecoration: 'none', display: 'block' }}>
              <div className="role-placeholder-card" style={{ cursor: 'pointer', height: '100%' }}>
                <div className="card-icon">{item.icon}</div>
                <h4>{item.label}</h4>
                <p>{isPlaceholder ? 'Coming soon' : `Manage ${item.label.toLowerCase()}`}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </SASidebarLayout>
  );
}
