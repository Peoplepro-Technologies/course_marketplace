/**
 * ACPayouts.jsx — Instructor payout management for Accounts role.
 *
 * Shows per-instructor estimated earnings with a "Mark as Paid" button
 * that records a payout timestamp in the DB (no real payment processed).
 *
 * ⚠️ SIMPLIFIED: Earnings = course.price × approved enrollments, 20% flat fee.
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import AccountsSidebarLayout from './AccountsSidebarLayout';

export default function ACPayouts() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [marking, setMarking] = useState({});
  const [toast, setToast] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/accounts/payouts')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load payouts'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const handleMarkPaid = async (instructorId, name) => {
    setMarking((prev) => ({ ...prev, [instructorId]: true }));
    try {
      const res = await api.post(`/accounts/payouts/${instructorId}/mark-paid`);
      showToast(`Payout of ${fmt(res.data.net_payout)} recorded for ${name}`, true);
      load();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to mark as paid', false);
    } finally {
      setMarking((prev) => ({ ...prev, [instructorId]: false }));
    }
  };

  const fmt = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n ?? 0);

  return (
    <AccountsSidebarLayout>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 80, right: 24, zIndex: 9999,
          background: toast.ok ? '#d4edda' : '#f8d7da',
          color: toast.ok ? '#155724' : '#721c24',
          padding: '12px 20px', borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)', fontWeight: 600, fontSize: 'var(--text-sm)',
        }}>
          {toast.ok ? '✓ ' : '✗ '}{toast.msg}
        </div>
      )}

      <div className="role-welcome">
        <h1>🏦 <span>Instructor Payouts</span></h1>
        <p>Estimated earnings per instructor — 20% platform fee</p>
      </div>

      {/* Simplified view banner */}
      <div style={{
        background: '#FFF3CD', border: '1px solid #ffc107', borderRadius: 'var(--radius-md)',
        padding: 'var(--space-md) var(--space-lg)', marginBottom: 'var(--space-xl)',
        display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: '1.2rem' }}>⚠️</span>
        <div>
          <strong>Simplified View</strong> — Earnings are estimated (sum of course prices × approved
          enrollments). Platform fee is a flat 20% placeholder. "Mark as Paid" records a timestamp
          in the database only — no real payment is processed.
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="alert alert-error">⚠️ {error}</div>
      ) : data?.payouts?.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon">🏦</div>
          <h3>No payout data available</h3>
          <p>No instructors have approved enrollments yet.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <thead>
              <tr style={{ background: '#0056D2', color: '#fff' }}>
                {['Instructor', 'Courses', 'Enrollments', 'Gross Earnings', 'Platform Fee (20%)', 'Net Payout', 'Last Paid', 'Action'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 'var(--text-sm)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.payouts.map((p) => (
                <tr key={p.instructor_id} style={{ borderBottom: '1px solid var(--color-border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-tertiary)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{p.instructor_name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{p.instructor_email}</div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>{p.course_count}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>{p.approved_enrollments}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>{fmt(p.gross_earnings)}</td>
                  <td style={{ padding: '12px 16px', color: '#dc3545' }}>−{fmt(p.platform_fee)}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 800, color: '#28a745', fontSize: 'var(--text-lg)' }}>{fmt(p.net_payout)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    {p.last_paid_at
                      ? new Date(p.last_paid_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : <span style={{ color: '#dc3545' }}>Not yet paid</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      id={`ac-payout-mark-${p.instructor_id}`}
                      className="btn btn-sm btn-primary"
                      disabled={!!marking[p.instructor_id]}
                      onClick={() => handleMarkPaid(p.instructor_id, p.instructor_name)}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {marking[p.instructor_id] ? '...' : '✓ Mark as Paid'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {data.payouts.length} instructor{data.payouts.length !== 1 ? 's' : ''} with approved enrollments
          </div>
        </div>
      )}
    </AccountsSidebarLayout>
  );
}
