/**
 * SubAdminReports.jsx — Reports & Analytics for Sub Admin.
 *
 * Displays KPI cards (except revenue/financials) and user role distribution.
 * Fetches data from /subadmin/analytics/kpis.
 */

import { useState, useEffect } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import SubAdminSidebarLayout from './SubAdminSidebarLayout';

export default function SubAdminReports() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/subadmin/analytics/kpis')
      .then(res => setKpis(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SubAdminSidebarLayout><LoadingSpinner /></SubAdminSidebarLayout>;
  if (!kpis) return <SubAdminSidebarLayout>Failed to load analytics.</SubAdminSidebarLayout>;

  // Find max count for role distribution bars
  const maxRoleCount = kpis.role_distribution && kpis.role_distribution.length > 0 
    ? Math.max(...kpis.role_distribution.map(r => r.count)) 
    : 1;

  return (
    <SubAdminSidebarLayout>
      <div className="sa-page-header">
        <h2>📈 Reports & Analytics</h2>
        <p>In-depth metrics and distribution stats across the platform (delegated permissions).</p>
      </div>

      <div className="sa-widgets-grid">
        <div className="sa-widget sa-widget--users">
          <div className="sa-widget-header">
            <h3>Total Users</h3>
          </div>
          <div className="sa-stat-number" id="sub-reports-users">{kpis.total_users}</div>
        </div>

        <div className="sa-widget sa-widget--courses">
          <div className="sa-widget-header">
            <h3>Courses (Published / Total)</h3>
          </div>
          <div className="sa-stat-number" id="sub-reports-courses">{kpis.published_courses} / {kpis.total_courses}</div>
        </div>

        <div className="sa-widget sa-widget--enrollments">
          <div className="sa-widget-header">
            <h3>Total Enrollments</h3>
          </div>
          <div className="sa-stat-number" id="sub-reports-enrollments">{kpis.total_enrollments}</div>
        </div>

        <div className="sa-widget sa-widget--revenue">
          <div className="sa-widget-header">
            <h3>Pending Approvals</h3>
          </div>
          <div className="sa-stat-number" id="sub-reports-pending">{kpis.pending_approvals}</div>
        </div>
      </div>

      {kpis.role_distribution && (
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
      )}
    </SubAdminSidebarLayout>
  );
}
