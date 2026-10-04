/**
 * SAPaymentsFinance.jsx — Payments & Finance overview for Super Admin.
 *
 * Displays demo/estimated revenue based on approved enrollments.
 */

import { useState, useEffect } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import SASidebarLayout from './SASidebarLayout';

export default function SAPaymentsFinance() {
  const [overview, setOverview] = useState(null);
  const [data, setData] = useState({ transactions: [], total: 0, page: 1, page_size: 20 });
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(true);

  useEffect(() => {
    api.get('/superadmin/finance/overview')
      .then(res => setOverview(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setTxLoading(true);
    api.get('/superadmin/finance/transactions', { params: { page: data.page, page_size: data.page_size } })
      .then(res => setData(prev => ({ ...prev, ...res.data })))
      .catch(console.error)
      .finally(() => setTxLoading(false));
  }, [data.page, data.page_size]);

  return (
    <SASidebarLayout>
      <div className="sa-page-header">
        <h2>💳 Payments & Finance</h2>
        <p>Overview of platform revenue and recent transactions.</p>
      </div>

      <div className="sa-demo-banner">
        <span className="demo-icon">ℹ️</span>
        <span><strong>Demo Data Mode:</strong> Revenue is estimated from course prices × approved enrollments. No real payment gateway is currently connected to the platform.</span>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="sa-finance-grid">
          <div className="sa-finance-card">
            <div className="finance-value">₹{overview?.total_revenue_estimate?.toLocaleString() || '0'}</div>
            <div className="finance-label">Estimated Gross Revenue</div>
          </div>
          <div className="sa-finance-card">
            <div className="finance-value">{overview?.total_approved_enrollments || 0}</div>
            <div className="finance-label">Paid Enrollments</div>
          </div>
          <div className="sa-finance-card">
            <div className="finance-value">{overview?.pending_enrollments || 0}</div>
            <div className="finance-label">Pending Payments</div>
          </div>
        </div>
      )}

      <h3 className="sa-section-label">Recent Transactions</h3>
      {txLoading && data.transactions.length === 0 ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="sa-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Learner</th>
                  <th>Course</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map(tx => (
                  <tr key={tx.id}>
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {tx.enrolled_at ? new Date(tx.enrolled_at).toLocaleString() : 'Unknown'}
                    </td>
                    <td>
                      <strong>{tx.learner_name || 'Unknown'}</strong>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        {tx.learner_email}
                      </div>
                    </td>
                    <td>{tx.course_title}</td>
                    <td><strong>₹{tx.course_price}</strong></td>
                    <td>
                      <span className={`badge badge-${tx.status === 'approved' ? 'success' : tx.status === 'rejected' ? 'danger' : 'warning'}`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {data.transactions.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-xl)' }}>
                      No transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="sa-pagination">
            <button className="btn btn-secondary btn-sm" disabled={data.page === 1}
              onClick={() => setData(p => ({ ...p, page: p.page - 1 }))}>← Prev</button>
            <span>Page {data.page} of {Math.ceil(data.total / data.page_size) || 1}</span>
            <button className="btn btn-secondary btn-sm" disabled={data.page * data.page_size >= data.total}
              onClick={() => setData(p => ({ ...p, page: p.page + 1 }))}>Next →</button>
          </div>
        </>
      )}
    </SASidebarLayout>
  );
}
