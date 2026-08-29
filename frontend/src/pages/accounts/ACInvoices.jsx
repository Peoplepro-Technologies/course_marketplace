/**
 * ACInvoices.jsx — Invoice listing for Accounts role.
 *
 * Displays approved enrollments as simplified invoice records.
 * ⚠️ SIMPLIFIED: No real invoice system or PDF generation.
 */

import { useState, useEffect } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import AccountsSidebarLayout from './AccountsSidebarLayout';

export default function ACInvoices() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  useEffect(() => {
    setLoading(true);
    api.get(`/accounts/invoices?page=${page}&page_size=${PAGE_SIZE}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load invoices'))
      .finally(() => setLoading(false));
  }, [page]);

  const fmt = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n ?? 0);

  return (
    <AccountsSidebarLayout>
      <div className="role-welcome">
        <h1>🧾 <span>Invoices</span></h1>
        <p>Enrollment-based invoice records</p>
      </div>

      {/* Simplified view banner */}
      <div style={{
        background: '#FFF3CD', border: '1px solid #ffc107', borderRadius: 'var(--radius-md)',
        padding: 'var(--space-md) var(--space-lg)', marginBottom: 'var(--space-xl)',
        display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: '1.2rem' }}>⚠️</span>
        <div>
          <strong>Simplified View</strong> — These are invoice-like records generated from approved
          enrollment data. No real invoice system, billing software, or PDF export is implemented.
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="alert alert-error">⚠️ {error}</div>
      ) : (
        <>
          <div style={{ marginBottom: 'var(--space-md)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            Showing {data.invoices.length} of {data.total} invoices
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <thead>
                <tr style={{ background: '#0056D2', color: '#fff' }}>
                  {['Invoice ID', 'Learner', 'Course', 'Amount', 'Date', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 'var(--text-sm)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((inv) => (
                  <tr key={inv.invoice_id} style={{ borderBottom: '1px solid var(--color-border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-tertiary)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 'var(--text-xs)', color: '#0056D2', fontWeight: 600 }}>
                      {inv.invoice_id}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{inv.learner_name}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{inv.learner_email}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 'var(--text-sm)', maxWidth: 240 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.course_title}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                      {fmt(inv.amount)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(inv.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#d4edda', color: '#155724', padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                        Paid
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
