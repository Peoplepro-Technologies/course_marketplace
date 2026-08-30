/**
 * ACFinancialReports.jsx — Financial aggregate report for Accounts role.
 *
 * Shows aggregate numbers:
 *   - Revenue this month / YTD / all-time (estimated)
 *   - Total payouts issued
 *   - Pending refunds count
 *   - Enrollment breakdown
 *
 * All revenue figures are ESTIMATED (no real payment gateway).
 */

import { useState, useEffect } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import AccountsSidebarLayout from './AccountsSidebarLayout';

const StatCard = ({ label, value, sub, accent = '#0056D2', estimated = false }) => (
  <div className="card" style={{ borderTop: `4px solid ${accent}`, padding: 'var(--space-xl)' }}>
    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-xs)', display: 'flex', alignItems: 'center', gap: 6 }}>
      {label}
      {estimated && (
        <span style={{ background: '#FFF3CD', color: '#856404', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, textTransform: 'none' }}>
          Estimated
        </span>
      )}
    </div>
    <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: accent, marginBottom: 'var(--space-xs)' }}>
      {value}
    </div>
    {sub && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{sub}</p>}
  </div>
);

export default function ACFinancialReports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/accounts/financial-reports')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load reports'))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n ?? 0);

  const now = new Date();
  const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <AccountsSidebarLayout>
      <div className="role-welcome">
        <h1>📈 <span>Financial Reports</span></h1>
        <p>Aggregated financial metrics across the platform</p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="alert alert-error">⚠️ {error}</div>
      ) : (
        <>
          {/* Note banner */}
          <div style={{
            background: '#FFF3CD', border: '1px solid #ffc107', borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md) var(--space-lg)', marginBottom: 'var(--space-xl)',
            display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
            <div>
              <strong>Note:</strong> Revenue figures are <strong>estimated</strong> — calculated from course
              prices × approved enrollments. No real payment gateway is connected. Payout totals reflect
              "Mark as Paid" records only.
            </div>
          </div>

          {/* Revenue section */}
          <h3 style={{ marginBottom: 'var(--space-lg)', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Revenue
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-2xl)' }}>
            <StatCard label={`Revenue — ${monthName}`} value={fmt(data.revenue.this_month)} sub="Approved enrollments this month" accent="#0056D2" estimated />
            <StatCard label="Revenue — Year to Date" value={fmt(data.revenue.year_to_date)} sub={`Jan–${now.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`} accent="#6f42c1" estimated />
            <StatCard label="Revenue — All Time" value={fmt(data.revenue.all_time)} sub="Since platform launch" accent="#28a745" estimated />
          </div>

          {/* Payouts section */}
          <h3 style={{ marginBottom: 'var(--space-lg)', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Instructor Payouts
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-2xl)' }}>
            <StatCard label="Total Payouts Issued" value={fmt(data.payouts.total_issued)} sub="Net payout amount (after 20% fee)" accent="#fd7e14" />
            <StatCard label="Payout Events" value={data.payouts.payout_events} sub="Times 'Mark as Paid' was clicked" accent="#17a2b8" />
          </div>

          {/* Refunds section */}
          <h3 style={{ marginBottom: 'var(--space-lg)', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Refunds
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-2xl)' }}>
            <StatCard label="Pending Refunds" value={data.refunds.pending} sub="Awaiting accounts review" accent={data.refunds.pending > 0 ? '#dc3545' : '#28a745'} />
            <StatCard label="Approved Refunds (All Time)" value={data.refunds.approved_all_time} sub="Enrollment access revoked" accent="#6c757d" />
          </div>

          {/* Enrollments section */}
          <h3 style={{ marginBottom: 'var(--space-lg)', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Enrollments
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-2xl)' }}>
            <StatCard label="Total Approved" value={data.enrollments.total_approved} sub="Active learner enrollments" accent="#28a745" />
            <StatCard label="Total Refunded" value={data.enrollments.total_refunded} sub="Access revoked after refund" accent="#6c757d" />
          </div>

          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-lg)' }}>
            Generated at: {new Date(data.generated_at).toLocaleString('en-IN')}
          </div>
        </>
      )}
    </AccountsSidebarLayout>
  );
}
