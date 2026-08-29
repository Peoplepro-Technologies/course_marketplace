/**
 * ACPaymentsRefunds.jsx — Refund request management for Accounts role.
 *
 * Displays all refund requests with Approve / Reject actions.
 * On approval, the backend revokes the learner's enrollment access.
 * On rejection, the enrollment is unchanged (learner keeps access).
 */

import { useState, useEffect } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import AccountsSidebarLayout from './AccountsSidebarLayout';

const STATUS_COLORS = {
  pending:  { bg: '#FFF3CD', text: '#856404' },
  approved: { bg: '#d4edda', text: '#155724' },
  rejected: { bg: '#f8d7da', text: '#721c24' },
};

export default function ACPaymentsRefunds() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');  // '' = all
  const [acting, setActing] = useState({});
  const [toast, setToast] = useState(null);

  const load = () => {
    setLoading(true);
    const url = filter ? `/accounts/refunds?status=${filter}` : '/accounts/refunds';
    api.get(url)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load refunds'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const handleAction = async (refundId, action) => {
    setActing((prev) => ({ ...prev, [refundId]: action }));
    try {
      await api.put(`/accounts/refunds/${refundId}/${action}`);
      showToast(
        action === 'approve'
          ? 'Refund approved — learner access has been revoked.'
          : 'Refund request rejected.',
        action === 'approve',
      );
      load();
    } catch (err) {
      showToast(err.response?.data?.detail || `Failed to ${action} refund`, false);
    } finally {
      setActing((prev) => ({ ...prev, [refundId]: null }));
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
        <h1>💳 <span>Payments &amp; Refunds</span></h1>
        <p>Review and resolve learner refund requests</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)' }}>
        {[['', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(([val, label]) => (
          <button
            key={val}
            id={`ac-refund-filter-${val || 'all'}`}
            className={`btn btn-sm ${filter === val ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(val)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="alert alert-error">⚠️ {error}</div>
      ) : data?.refunds?.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon">✅</div>
          <h3>No refund requests found</h3>
          <p>{filter ? `No ${filter} requests.` : 'No refund requests have been submitted yet.'}</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <thead>
              <tr style={{ background: '#0056D2', color: '#fff' }}>
                {['#', 'Learner', 'Course', 'Amount', 'Reason', 'Requested', 'Status', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 'var(--text-sm)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.refunds.map((rr, i) => {
                const colors = STATUS_COLORS[rr.status] || STATUS_COLORS.pending;
                const isActing = acting[rr.id];
                return (
                  <tr key={rr.id} style={{ borderBottom: '1px solid var(--color-border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-tertiary)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '12px 16px', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{i + 1}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{rr.learner_name}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 'var(--text-sm)', maxWidth: 200 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rr.course_title}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                      {fmt(rr.course_price)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 'var(--text-sm)', maxWidth: 200 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rr.reason}>{rr.reason}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(rr.requested_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        background: colors.bg, color: colors.text,
                        padding: '3px 10px', borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--text-xs)', fontWeight: 600, whiteSpace: 'nowrap',
                      }}>
                        {rr.status.charAt(0).toUpperCase() + rr.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {rr.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            id={`ac-refund-approve-${rr.id}`}
                            className="btn btn-sm btn-primary"
                            disabled={!!isActing}
                            onClick={() => handleAction(rr.id, 'approve')}
                            style={{ fontSize: '12px', padding: '4px 10px' }}
                          >
                            {isActing === 'approve' ? '...' : '✓ Approve'}
                          </button>
                          <button
                            id={`ac-refund-reject-${rr.id}`}
                            className="btn btn-sm btn-secondary"
                            disabled={!!isActing}
                            onClick={() => handleAction(rr.id, 'reject')}
                            style={{ fontSize: '12px', padding: '4px 10px', color: '#dc3545', borderColor: '#dc3545' }}
                          >
                            {isActing === 'reject' ? '...' : '✗ Reject'}
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                          Resolved {rr.resolved_at ? new Date(rr.resolved_at).toLocaleDateString('en-IN') : ''}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            Total: {data.total} refund requests
          </div>
        </div>
      )}
    </AccountsSidebarLayout>
  );
}
