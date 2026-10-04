/**
 * AdminDashboard.jsx — Overview of platform metrics and links to admin tools.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/metrics')
      .then((res) => setMetrics(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-wrapper"><LoadingSpinner /></div>;

  return (
    <div className="page-wrapper container">
      <div className="section-header">
        <h2>Admin Dashboard</h2>
        <p>Platform Overview</p>
      </div>

      <div className="grid grid-4" style={{ marginBottom: '3rem' }}>
        <div className="stat-card">
          <div className="stat-value">{metrics?.total_users || 0}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{metrics?.total_enrollments || 0}</div>
          <div className="stat-label">Total Enrollments</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{metrics?.published_courses || 0} / {metrics?.total_courses || 0}</div>
          <div className="stat-label">Published Courses</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{metrics?.total_reviews || 0}</div>
          <div className="stat-label">Total Reviews</div>
        </div>
      </div>

      <h3 style={{ marginBottom: '1.5rem' }}>Management Areas</h3>
      <div className="grid grid-3">
        <Link to="/admin/users" className="card flex-col gap-sm">
          <div style={{ fontSize: '2rem' }}>👥</div>
          <h4>User Management</h4>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>View and manage platform users.</p>
        </Link>
        
        <Link to="/admin/courses" className="card flex-col gap-sm">
          <div style={{ fontSize: '2rem' }}>📚</div>
          <h4>Course Moderation</h4>
          <div className="flex-between">
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Approve or flag courses.</p>
            {metrics?.flagged_courses > 0 && <span className="badge badge-danger">{metrics.flagged_courses} flagged</span>}
          </div>
        </Link>

        <Link to="/admin/reviews" className="card flex-col gap-sm">
          <div style={{ fontSize: '2rem' }}>⭐</div>
          <h4>Review Moderation</h4>
          <div className="flex-between">
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Monitor course reviews.</p>
            {metrics?.flagged_reviews > 0 && <span className="badge badge-danger">{metrics.flagged_reviews} flagged</span>}
          </div>
        </Link>

        <Link to="/admin/audit-logs" className="card flex-col gap-sm">
          <div style={{ fontSize: '2rem' }}>📜</div>
          <h4>Audit Logs</h4>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>View system and administrative actions.</p>
        </Link>
      </div>
    </div>
  );
}
