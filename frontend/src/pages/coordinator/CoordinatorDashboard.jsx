/**
 * CoordinatorDashboard.jsx — Premium coordinator home page.
 *
 * Full-page layout with:
 *   - Hero header with greeting + date
 *   - 5 KPI metric cards (clickable for quick nav)
 *   - 4 rich content widgets (pending, published, instructors, categories)
 *   - Quick access shortcuts
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import useAuth from '../../hooks/useAuth';
import LoadingSpinner from '../../components/LoadingSpinner';
import './CoordinatorDashboard.css';

/* ── helpers ─────────────────────────────────────────────────────────── */
const fmt = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});

const timeFmt = new Intl.DateTimeFormat('en-IN', {
  hour: '2-digit', minute: '2-digit', second: '2-digit',
});

const ACCENT = {
  pending:     '#f59e0b',
  published:   '#10b981',
  instructors: '#6366f1',
  categories:  '#8b5cf6',
};

function KpiCard({ label, value, sub, color, to }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div className="cd-kpi-card" style={{ '--kpi-color': color }}>
        <div className="cd-kpi-value">{value ?? '—'}</div>
        <div className="cd-kpi-label">{label}</div>
        {sub && <div className="cd-kpi-sub">{sub}</div>}
      </div>
    </Link>
  );
}

export default function CoordinatorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [now, setNow]       = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    api.get('/coordinator/stats')
      .then(r => setStats(r.data))
      .catch(e => setError(e.response?.data?.detail || 'Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  const maxCat = stats?.category_health?.length
    ? Math.max(...stats.category_health.map(c => c.count))
    : 1;

  const totalCourses = stats
    ? (stats.category_health || []).reduce((s, c) => s + c.count, 0)
    : 0;

  return (
    <>
      <div className="cd-page">

        {/* ── Hero header ────────────────────────────────────────── */}
        <div className="cd-hero">
          <div className="cd-hero-left">
            <div className="cd-hero-tag">Course Coordinator</div>
            <h1 className="cd-hero-title">
              Hello, <span style={{ color: '#6366f1' }}>{user?.name?.split(' ')[0] || 'Coordinator'}</span> 
            </h1>
            <p className="cd-hero-sub">{fmt.format(now)} · {timeFmt.format(now)} · Platform overview</p>
          </div>
          <div className="cd-hero-actions">
            <Link to="/coordinator/courses/pending" className="btn btn-primary">
              Review Queue
            </Link>
            <Link to="/coordinator/courses" className="btn btn-secondary">
              Course Catalog
            </Link>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem 0' }}><LoadingSpinner /></div>
        ) : error ? (
          <div className="alert alert-error">{error}</div>
        ) : (
          <>
            {/* ── KPI strip ──────────────────────────────────────── */}
            <div className="cd-kpi-strip">
              <KpiCard label="Pending Review"    value={stats.pending_count}    color={ACCENT.pending}     to="/coordinator/courses/pending" />
              <KpiCard label="Total Published"   value={totalCourses}            color={ACCENT.published}    to="/coordinator/courses?status=published" />
              <KpiCard label="Instructors"       value={stats.instructor_count} color={ACCENT.instructors}  to="/coordinator/instructors" />
              <KpiCard label="Categories"        value={stats.category_health?.length} color={ACCENT.categories} to="/coordinator/categories" />
              <KpiCard label="Quality & Reviews"  value="—"                       color="#ec4899"             to="/coordinator/quality-reviews" />
            </div>

            {/* ── Widget grid ────────────────────────────────────── */}
            <div className="cd-widget-grid">

              {/* Pending Reviews */}
              <div className="cd-widget cd-widget--alert">
                <div className="cd-widget-head">

                  <div>
                    <div className="cd-widget-title">Pending Reviews</div>
                    <div className="cd-widget-sub">Courses awaiting your approval</div>
                  </div>
                </div>
                <div className="cd-widget-body">
                  <div className="cd-big-number" style={{ color: ACCENT.pending }}>
                    {stats.pending_count}
                  </div>
                  <p className="cd-big-label">
                    {stats.pending_count === 0
                      ? 'All caught up!'
                      : stats.pending_count === 1
                      ? 'course waiting for review'
                      : 'courses waiting for review'
                    }
                  </p>
                  {stats.pending_count > 0 && (
                    <div className="cd-alert-pill">
                      Action needed
                    </div>
                  )}
                </div>
                <Link to="/coordinator/courses/pending" className="cd-widget-btn" style={{ background: ACCENT.pending }}>
                  {stats.pending_count > 0 ? 'Review Now →' : 'View Queue →'}
                </Link>
              </div>

              {/* Recently Published */}
              <div className="cd-widget cd-widget--list">
                <div className="cd-widget-head">

                  <div>
                    <div className="cd-widget-title">Recently Published</div>
                    <div className="cd-widget-sub">Latest courses on the platform</div>
                  </div>
                </div>
                <div className="cd-widget-body">
                  {stats.recently_published.length === 0 ? (
                    <p className="cd-empty">No published courses yet.</p>
                  ) : (
                    <ul className="cd-course-list">
                      {stats.recently_published.map((c, i) => (
                        <li key={c.id} className="cd-course-item" style={{ animationDelay: `${i * 0.05}s` }}>
                          <div className="cd-course-rank">{i + 1}</div>
                          <div className="cd-course-info">
                            <div className="cd-course-title">{c.title}</div>
                            <div className="cd-course-meta">
                              <span className="cd-cat-chip">{c.category}</span>
                              <span className="cd-inst-name">{c.instructor_name}</span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Link to="/coordinator/courses?status=published" className="cd-widget-btn" style={{ background: ACCENT.published }}>
                  View All Published →
                </Link>
              </div>

              {/* Instructor Roster */}
              <div className="cd-widget cd-widget--stat">
                <div className="cd-widget-head">

                  <div>
                    <div className="cd-widget-title">Instructor Roster</div>
                    <div className="cd-widget-sub">Platform teaching faculty</div>
                  </div>
                </div>
                <div className="cd-widget-body cd-widget-body--centered">
                  <div className="cd-big-number" style={{ color: ACCENT.instructors }}>
                    {stats.instructor_count}
                  </div>
                  <p className="cd-big-label">
                    {stats.instructor_count === 1 ? 'registered instructor' : 'registered instructors'}
                  </p>
                  <div className="cd-stat-pill" style={{ background: `${ACCENT.instructors}15`, color: ACCENT.instructors }}>
                    Active Faculty
                  </div>
                </div>
                <Link to="/coordinator/instructors" className="cd-widget-btn" style={{ background: ACCENT.instructors }}>
                  View Roster →
                </Link>
              </div>

              {/* Category Health */}
              <div className="cd-widget cd-widget--bars">
                <div className="cd-widget-head">

                  <div>
                    <div className="cd-widget-title">Category Health</div>
                    <div className="cd-widget-sub">Published courses per category</div>
                  </div>
                </div>
                <div className="cd-widget-body">
                  {stats.category_health.length === 0 ? (
                    <p className="cd-empty">No published courses yet.</p>
                  ) : (
                    <div className="cd-bars">
                      {stats.category_health.map((cat, i) => (
                        <div key={cat.category} className="cd-bar-row" style={{ animationDelay: `${i * 0.04}s` }}>
                          <span className="cd-bar-label">{cat.category}</span>
                          <div className="cd-bar-track">
                            <div className="cd-bar-fill" style={{ width: `${(cat.count / maxCat) * 100}%`, background: ACCENT.categories }} />
                          </div>
                          <span className="cd-bar-count">{cat.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Link to="/coordinator/categories" className="cd-widget-btn" style={{ background: ACCENT.categories }}>
                  Manage Categories →
                </Link>
              </div>

            </div>

            {/* ── Quick Access ────────────────────────────────────── */}
            <div className="cd-qa-section">
              <div className="cd-qa-header">
                <h3 className="cd-qa-title">Quick Access</h3>
                <p className="cd-qa-sub">Jump to any section</p>
              </div>
              <div className="cd-qa-grid">
                {[
                  { label: 'Course Approvals',   sub: 'Review pending submissions',      to: '/coordinator/courses/pending',     color: ACCENT.pending },
                  { label: 'Course Catalog',      sub: 'Browse all platform courses',     to: '/coordinator/courses',             color: ACCENT.published },
                  { label: 'Faculty Management',  sub: 'Manage faculty assignments',      to: '/coordinator/faculty-assignments',  color: '#3b82f6' },
                  { label: 'Assignment Stats',    sub: 'View quiz & assignment data',     to: '/coordinator/faculty-analytics',   color: '#06b6d4' },
                  { label: 'Categories',          sub: 'Manage course categories',        to: '/coordinator/categories',          color: ACCENT.categories },
                  { label: 'Instructors',          sub: 'View teaching faculty',           to: '/coordinator/instructors',         color: ACCENT.instructors },
                  { label: 'Quality & Reviews',   sub: 'Monitor course quality',          to: '/coordinator/quality-reviews',     color: '#ec4899' },
                  { label: 'Support',             sub: 'Manage support requests',         to: '/coordinator/support',             color: '#ef4444' },
                ].map(item => (
                  <Link key={item.to} to={item.to} className="cd-qa-card" style={{ '--qa-color': item.color }}>
                    <div>
                      <div className="cd-qa-label">{item.label}</div>
                      <div className="cd-qa-desc">{item.sub}</div>
                    </div>
                    <div className="cd-qa-arrow">→</div>
                  </Link>
                ))}
              </div>
            </div>

          </>
        )}
      </div>
    </>
  );
}
