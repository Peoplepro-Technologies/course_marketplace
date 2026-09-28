/**
 * SubAdminDashboard.jsx — Live dashboard for the sub_admin role.
 *
 * Displays three KPI widgets (users, courses, enrollments)
 * and quick access cards to all sub-pages.
 * Fetches real data from /subadmin/analytics/kpis.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import useAuth from '../../hooks/useAuth';
import LoadingSpinner from '../../components/LoadingSpinner';
import SubAdminSidebarLayout, { SIDEBAR_ITEMS } from './SubAdminSidebarLayout';
import { Users, BookOpen, GraduationCap, AlertTriangle, CheckSquare, Clock, ArrowRight } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';

const QUICK_ACCESS = SIDEBAR_ITEMS.slice(1);

export default function SubAdminDashboard() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [pendingCourses, setPendingCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/subadmin/analytics/kpis'),
      api.get('/subadmin/courses?status=pending_review&page_size=5').catch(() => ({ data: { courses: [] } })),
    ]).then(([kpiRes, pendingRes]) => {
      setKpis(kpiRes.data);
      setPendingCourses(pendingRes.data?.courses || []);
    }).catch(err => setError(err.response?.data?.detail || 'Failed to load KPIs'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SubAdminSidebarLayout>
      {/* Welcome */}
      <div className="role-welcome">
        <h1>Welcome, <span>Sub Admin</span></h1>
        <p>
          Hello {user?.name || 'Sub Administrator'}! Here's a live overview of the platform.
        </p>
      </div>

      {/* ── KPI Widgets ─────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ padding: 'var(--space-2xl) 0' }}><LoadingSpinner /></div>
      ) : error ? (
        <div className="alert alert-error" style={{ marginBottom: 'var(--space-xl)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} /> {error}
        </div>
      ) : (
        <div className="sa-widgets-grid">
          <div className="sa-widget sa-widget--users">
            <div className="sa-widget-header">
              <span className="sa-widget-icon"><Users size={22} /></span>
              <h3>Total Users</h3>
            </div>
            <div className="sa-stat-number" id="sub-total-users">{kpis.total_users}</div>
            <p className="sa-stat-label">registered on platform</p>
          </div>

          <div className="sa-widget sa-widget--courses">
            <div className="sa-widget-header">
              <span className="sa-widget-icon"><BookOpen size={22} /></span>
              <h3>Total Courses</h3>
            </div>
            <div className="sa-stat-number" id="sub-total-courses">{kpis.published_courses} / {kpis.total_courses}</div>
            <p className="sa-stat-label">published / total courses</p>
          </div>

          <div className="sa-widget sa-widget--enrollments">
            <div className="sa-widget-header">
              <span className="sa-widget-icon"><GraduationCap size={22} /></span>
              <h3>Total Enrollments</h3>
            </div>
            <div className="sa-stat-number" id="sub-total-enrollments">{kpis.total_enrollments}</div>
            <p className="sa-stat-label">student enrollments</p>
          </div>
        </div>
      )}

      {/* Pending Approvals Widget */}
      {!loading && !error && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginTop: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #eaeaea' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckSquare size={16} color="#0056D2" /> Pending Approvals
            </h3>
            <Link to="/sub-admin/approvals" style={{ fontSize: '13px', color: '#0056D2', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {pendingCourses.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '12px 0' }}>No pending approvals.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pendingCourses.slice(0, 5).map(course => (
                <div key={course.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {course.title}
                  </div>
                  <StatusBadge status={course.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Access */}
      <h3 className="sa-section-label" style={{ marginTop: '28px' }}>Quick Access</h3>
      <div className="role-cards-grid">
        {QUICK_ACCESS.map((item) => (
          <Link to={item.path} key={item.label} style={{ textDecoration: 'none', display: 'block' }}>
            <div className="role-placeholder-card" style={{ cursor: 'pointer', height: '100%' }}>
              <div className="card-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                <item.Icon size={32} strokeWidth={1.5} />
              </div>
              <h4>{item.label}</h4>
              <p>Manage {item.label.toLowerCase()}</p>
            </div>
          </Link>
        ))}
      </div>
    </SubAdminSidebarLayout>
  );
}
