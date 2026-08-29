/**
 * AccountsDashboard.jsx — Live KPI dashboard for the Accounts role.
 *
 * Fetches real data from /api/v1/accounts/dashboard/kpis and displays:
 *   - Estimated total revenue (course prices × approved enrollments)
 *   - Pending refunds count
 *   - Recent transactions count (last 30 days)
 *
 * Revenue is clearly marked as "estimated" since there is no real payment gateway.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import useAuth from '../../hooks/useAuth';
import LoadingSpinner from '../../components/LoadingSpinner';
import AccountsSidebarLayout, { SIDEBAR_ITEMS } from './AccountsSidebarLayout';

const QUICK_ACCESS = SIDEBAR_ITEMS.slice(1);

export default function AccountsDashboard() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/accounts/dashboard/kpis')
      .then((res) => setKpis(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load KPIs'))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <AccountsSidebarLayout>
      {/* ── Welcome ─────────────────────────────────────────────────── */}
      <div className="role-welcome">
        <h1>
          Welcome, <span>Accounts Manager</span>
        </h1>
        <p>
          Hello {user?.name || 'Accounts Manager'}! Here's a live overview of financial activity.
        </p>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ padding: 'var(--space-2xl) 0' }}><LoadingSpinner /></div>
      ) : error ? (
        <div className="alert alert-error" style={{ marginBottom: 'var(--space-xl)' }}>
          ⚠️ {error}
        </div>
      ) : (
        <>
          <div className="ac-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-2xl)' }}>
            {/* Total Revenue */}
            <div className="card" style={{ borderTop: '4px solid #0056D2', padding: 'var(--space-xl)' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: 'var(--space-sm)' }}>💵</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-xs)' }}>
                Total Revenue <span style={{ background: '#FFF3CD', color: '#856404', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>Estimated</span>
              </div>
              <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: '#0056D2' }} id="ac-total-revenue">
                {fmt(kpis.total_revenue)}
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-xs)' }}>
                {kpis.total_approved_enrollments} approved enrollments
              </p>
            </div>

            {/* Pending Refunds */}
            <div className="card" style={{ borderTop: `4px solid ${kpis.pending_refunds_count > 0 ? '#dc3545' : '#28a745'}`, padding: 'var(--space-xl)' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: 'var(--space-sm)' }}>🔄</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-xs)' }}>
                Pending Refunds
              </div>
              <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: kpis.pending_refunds_count > 0 ? '#dc3545' : '#28a745' }} id="ac-pending-refunds">
                {kpis.pending_refunds_count}
              </div>
              <Link to="/accounts/refunds" style={{ fontSize: 'var(--text-xs)', color: '#0056D2' }}>
                View all →
              </Link>
            </div>

            {/* Recent Transactions */}
            <div className="card" style={{ borderTop: '4px solid #6f42c1', padding: 'var(--space-xl)' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: 'var(--space-sm)' }}>💳</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-xs)' }}>
                Recent Transactions
              </div>
              <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: '#6f42c1' }} id="ac-recent-transactions">
                {kpis.recent_transactions_count}
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-xs)' }}>
                Approved in last 30 days
              </p>
            </div>
          </div>

          {/* ── Quick Access ──────────────────────────────────────────── */}
          <h3 style={{ marginBottom: 'var(--space-lg)', fontSize: 'var(--text-lg)', fontWeight: 700 }}>
            Quick Access
          </h3>
          <div className="role-cards-grid">
            {QUICK_ACCESS.map((item) => (
              <Link
                to={item.path}
                key={item.label}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div className="role-placeholder-card" style={{ cursor: 'pointer' }}>
                  <div className="card-icon">{item.icon}</div>
                  <h4>{item.label}</h4>
                  <p>{item.comingSoon ? 'Coming soon' : `Manage ${item.label.toLowerCase()}`}</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </AccountsSidebarLayout>
  );
}
