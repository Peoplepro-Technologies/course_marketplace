/**
 * SAAuditLogs.jsx — Audit Logs for Super Admin.
 *
 * Lists all audit log entries (role changes, status overrides).
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import SASidebarLayout from './SASidebarLayout';

export default function SAAuditLogs() {
  const [data, setData] = useState({ logs: [], total: 0, page: 1, page_size: 30 });
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    api.get('/superadmin/audit-logs', { params: { page: data.page, page_size: data.page_size } })
      .then(res => setData(prev => ({ ...prev, ...res.data })))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [data.page, data.page_size]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <SASidebarLayout>
      <div className="sa-page-header">
        <h2>📋 Audit Logs</h2>
        <p>System tracking of critical administrative actions.</p>
      </div>

      {loading && data.logs.length === 0 ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="sa-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target Type</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <strong>{log.actor_name}</strong>
                      {log.actor_email && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                          {log.actor_email}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`sa-audit-action sa-audit-action--${log.action}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td><span className="badge" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>{log.target_type}</span></td>
                    <td style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                      {log.details || '—'}
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        ID: {log.target_id}
                      </div>
                    </td>
                  </tr>
                ))}
                {data.logs.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-xl)' }}>
                      No audit logs found.
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
