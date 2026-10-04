/**
 * SAReportsAnalytics.jsx — Reports & Analytics for Super Admin.
 *
 * Displays KPI cards and role distribution.
 */

import { useState, useEffect } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import SASidebarLayout from './SASidebarLayout';

export default function SAReportsAnalytics() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/superadmin/analytics/kpis')
      .then(res => setKpis(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SASidebarLayout><LoadingSpinner /></SASidebarLayout>;
  if (!kpis) return <SASidebarLayout>Failed to load analytics.</SASidebarLayout>;

  // Find max count for role distribution bars
  const maxRoleCount = kpis.role_distribution.length > 0 
    ? Math.max(...kpis.role_distribution.map(r => r.count)) 
    : 1;

  return (
    <SASidebarLayout>
      <div className="sa-page-header">
        <h2>📈 Reports & Analytics</h2>
        <p>In-depth metrics and distribution stats across the platform.</p>
      </div>

      <div className="sa-widgets-grid">
        <div className="sa-widget sa-widget--users">
          <div className="sa-widget-header">
            <h3>Total Users</h3>
          </div>
          <div className="sa-stat-number">{kpis.total_users}</div>
        </div>

        <div className="sa-widget sa-widget--courses">
          <div className="sa-widget-header">
            <h3>Courses (Published / Total)</h3>
          </div>
          <div className="sa-stat-number">{kpis.published_courses} / {kpis.total_courses}</div>
        </div>

        <div className="sa-widget sa-widget--enrollments">
          <div className="sa-widget-header">
            <h3>Total Enrollments</h3>
          </div>
          <div className="sa-stat-number">{kpis.total_enrollments}</div>
        </div>

        <div className="sa-widget sa-widget--revenue">
          <div className="sa-widget-header">
            <h3>Pending Approvals</h3>
          </div>
          <div className="sa-stat-number">{kpis.pending_approvals}</div>
        </div>
      </div>

      <div className="sa-table-wrapper" style={{ padding: 'var(--space-xl)' }}>
        <h3 style={{ marginBottom: 'var(--space-md)' }}>User Role Distribution</h3>
        <div className="sa-role-bars">
          {kpis.role_distribution.map(role => (
            <div key={role.role} className="sa-role-row">
              <span className="sa-role-name">{role.role.replace('_', ' ')}</span>
              <div className="sa-role-bar-track">
                <div 
                  className="sa-role-bar-fill" 
                  style={{ width: `${Math.max(1, (role.count / maxRoleCount) * 100)}%` }} 
                />
              </div>
              <span className="sa-role-count">{role.count}</span>
            </div>
          ))}
        </div>
      </div>

    </SASidebarLayout>
  );
}
