/**
 * SuperAdminDashboard.jsx — Live dashboard for the super_admin role.
 *
 * Displays KPI widgets, trend charts (revenue + enrollments over time),
 * a pending approvals preview, and recent audit activity.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../../api/axios';
import useAuth from '../../hooks/useAuth';
import LoadingSpinner from '../../components/LoadingSpinner';
import SASidebarLayout, { SIDEBAR_ITEMS } from './SASidebarLayout';
import { Users, BookOpen, GraduationCap, DollarSign, AlertTriangle, CheckSquare, Clock, ClipboardList, ArrowRight } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';

const QUICK_ACCESS = SIDEBAR_ITEMS.slice(1);

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [trends, setTrends] = useState(null);
  const [pendingCourses, setPendingCourses] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/superadmin/analytics/kpis'),
      api.get('/superadmin/trend-charts?days=30').catch(() => ({ data: null })),
      api.get('/superadmin/courses?status=pending_review&page_size=5').catch(() => ({ data: { courses: [] } })),
      api.get('/superadmin/audit-logs?page_size=5').catch(() => ({ data: { logs: [] } })),
    ]).then(([kpiRes, trendRes, pendingRes, logRes]) => {
      setKpis(kpiRes.data);
      setTrends(trendRes.data);
      setPendingCourses(pendingRes.data?.courses || []);
      setRecentLogs(logRes.data?.logs || []);
    }).catch(err => setError(err.response?.data?.detail || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  // Merge enrollment and revenue trend data by date
  const chartData = (() => {
    if (!trends) return [];
    const byDate = {};
    (trends.enrollments || []).forEach(e => { byDate[e.date] = { date: e.date, enrollments: e.enrollments, revenue: 0 }; });
    (trends.revenue || []).forEach(r => {
      if (byDate[r.date]) byDate[r.date].revenue = r.revenue;
      else byDate[r.date] = { date: r.date, enrollments: 0, revenue: r.revenue };
    });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  })();

  return (
    <SASidebarLayout>
      {/* Welcome */}
      <div className="role-welcome">
        <h1>Welcome, <span>Super Admin</span></h1>
        <p>Hello {user?.name || 'Administrator'}! Here's a live overview of the platform.</p>
      </div>

      {/* KPI Widgets */}
      {loading ? (
        <div style={{ padding: 'var(--space-2xl) 0' }}><LoadingSpinner /></div>
      ) : error ? (
        <div className="alert alert-error" style={{ marginBottom: 'var(--space-xl)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} /> {error}
        </div>
      ) : (
        <>
          <div className="sa-widgets-grid">
            <div className="sa-widget sa-widget--users">
              <div className="sa-widget-header"><span className="sa-widget-icon"><Users size={22} /></span><h3>Total Users</h3></div>
              <div className="sa-stat-number" id="sa-total-users">{kpis.total_users}</div>
              <p className="sa-stat-label">registered on platform</p>
            </div>
            <div className="sa-widget sa-widget--courses">
              <div className="sa-widget-header"><span className="sa-widget-icon"><BookOpen size={22} /></span><h3>Total Courses</h3></div>
              <div className="sa-stat-number" id="sa-total-courses">{kpis.published_courses} / {kpis.total_courses}</div>
              <p className="sa-stat-label">published / total courses</p>
            </div>
            <div className="sa-widget sa-widget--enrollments">
              <div className="sa-widget-header"><span className="sa-widget-icon"><GraduationCap size={22} /></span><h3>Total Enrollments</h3></div>
              <div className="sa-stat-number" id="sa-total-enrollments">{kpis.total_enrollments}</div>
              <p className="sa-stat-label">student enrollments</p>
            </div>
            <div className="sa-widget sa-widget--revenue">
              <div className="sa-widget-header"><span className="sa-widget-icon"><DollarSign size={22} /></span><h3>Revenue Estimate</h3></div>
              <div className="sa-stat-number" id="sa-revenue">Rs. {kpis.revenue_estimate?.toLocaleString() || '0'}</div>
              <p className="sa-stat-label">estimated (demo data)</p>
            </div>
          </div>

          {/* Trend Charts */}
          {chartData.length > 0 && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginTop: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #eaeaea' }}>
              <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: '600' }}>30-Day Trends</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="enrollments" stroke="#0056D2" strokeWidth={2} dot={false} name="Enrollments" />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} dot={false} name="Revenue (Rs.)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Pending Approvals + Recent Activity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
            {/* Pending Approvals */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #eaeaea' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckSquare size={16} color="#0056D2" /> Pending Approvals
                </h3>
                <Link to="/super-admin/approvals" style={{ fontSize: '13px', color: '#0056D2', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
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

            {/* Recent Audit Activity */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #eaeaea' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClipboardList size={16} color="#0056D2" /> Recent Activity
                </h3>
                <Link to="/super-admin/audit-logs" style={{ fontSize: '13px', color: '#0056D2', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  View all <ArrowRight size={12} />
                </Link>
              </div>
              {recentLogs.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '12px 0' }}>No recent activity.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recentLogs.slice(0, 5).map(log => (
                    <div key={log.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>{log.action}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Clock size={10} /> {log.actor_name} &middot; {new Date(log.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Quick Access */}
      <h3 className="sa-section-label" style={{ marginTop: '28px' }}>Quick Access</h3>
      <div className="role-cards-grid">
        {QUICK_ACCESS.map((item) => {
          const isPlaceholder = item.path === '/super-admin/settings';
          return (
            <Link to={item.path} key={item.label} style={{ textDecoration: 'none', display: 'block' }}>
              <div className="role-placeholder-card" style={{ cursor: 'pointer', height: '100%' }}>
                <div className="card-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                  <item.Icon size={32} strokeWidth={1.5} />
                </div>
                <h4>{item.label}</h4>
                <p>{isPlaceholder ? 'Configure platform' : `Manage ${item.label.toLowerCase()}`}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </SASidebarLayout>
  );
}
