/**
 * ACTransactions.jsx — Simplified transaction listing for Accounts role.
 *
 * Displays all approved enrollments as transaction records.
 * ⚠️ SIMPLIFIED VIEW: This is based on enrollment data, not real payment
 *    records. Clearly labeled in the UI. Pending real payment integration.
 */

import { useState, useEffect } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import AccountsSidebarLayout from './AccountsSidebarLayout';

export default function ACTransactions() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  useEffect(() => {
    setLoading(true);
    api.get(`/accounts/transactions?page=${page}&page_size=${PAGE_SIZE}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load transactions'))
      .finally(() => setLoading(false));
  }, [page]);

  const fmt = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <AccountsSidebarLayout>
      <div className="role-welcome">
        <h1>💰 <span>Transactions</span></h1>
        <p>Approved enrollment-based transaction records</p>
      </div>

      {/* Simplified view banner */}
      <div style={{
        background: '#FFF3CD', border: '1px solid #ffc107', borderRadius: 'var(--radius-md)',
        padding: 'var(--space-md) var(--space-lg)', marginBottom: 'var(--space-xl)',
        display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: '1.2rem' }}>⚠️</span>
        <div>
          <strong>Simplified View</strong> — These records are derived from enrollment approvals, not a real
          payment gateway. A real payment integration is required to show actual transaction data (amounts charged,
          payment methods, gateway IDs, etc.).
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="alert alert-error">⚠️ {error}</div>
      ) : (
        <>
          <div style={{ marginBottom: 'var(--space-md)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            Showing {data.transactions.length} of {data.total} transactions
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <thead>
                <tr style={{ background: '#0056D2', color: '#fff' }}>
                  {['#', 'Learner', 'Course', 'Amount', 'Date', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 'var(--text-sm)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((tx, i) => (
                  <tr key={tx.transaction_id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-tertiary)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '12px 16px', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{tx.learner_name}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{tx.learner_email}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 'var(--text-sm)', maxWidth: 240 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.course_title}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0056D2' }}>
                      {fmt(tx.amount)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#d4edda', color: '#155724', padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                        ✓ Completed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.total > PAGE_SIZE && (
            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', marginTop: 'var(--space-xl)' }}>
              <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span style={{ lineHeight: '32px', fontSize: 'var(--text-sm)' }}>Page {page} of {Math.ceil(data.total / PAGE_SIZE)}</span>
              <button className="btn btn-secondary btn-sm" disabled={page * PAGE_SIZE >= data.total} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </AccountsSidebarLayout>
  );
}
