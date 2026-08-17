import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AuditLogs() {
  const [data, setData] = useState({ logs: [], total: 0, page: 1, page_size: 50 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/admin/audit-logs', { params: { page: data.page, page_size: data.page_size } })
      .then((res) => setData(prev => ({ ...prev, ...res.data })))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [data.page, data.page_size]);

  if (loading && data.logs.length === 0) return <div className="page-wrapper"><LoadingSpinner /></div>;

  return (
    <div className="page-wrapper container">
      <div className="section-header flex-between">
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => window.history.back()} style={{ marginBottom: '1rem' }}>
            ← Back
          </button>
          <h2>Audit Logs</h2>
        </div>
        <div>Total: {data.total}</div>
      </div>

      <div className="table-wrapper box-glow">
        <table>
          <thead>
            <tr>
              <th>Date/Time</th>
              <th>Actor ID</th>
              <th>Action</th>
              <th>Target</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {data.logs.map(log => (
              <tr key={log.id}>
                <td>{new Date(log.created_at).toLocaleString()}</td>
                <td><span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{log.actor_id || 'System'}</span></td>
                <td>
                  <span className="badge badge-primary" style={{ textTransform: 'uppercase', fontSize: 'var(--text-xs)' }}>
                    {log.action}
                  </span>
                </td>
                <td>
                  {log.target_type && log.target_id ? (
                    <div style={{ fontSize: 'var(--text-xs)' }}>
                      <strong>{log.target_type}</strong><br />
                      <span style={{ color: 'var(--color-text-muted)' }}>{log.target_id}</span>
                    </div>
                  ) : '-'}
                </td>
                <td>
                  {log.details ? (
                    <pre style={{ margin: 0, fontSize: 'var(--text-xs)', background: 'rgba(0,0,0,0.1)', padding: '0.5rem', borderRadius: '4px', overflowX: 'auto', maxWidth: '300px' }}>
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
        <button 
          className="btn btn-secondary btn-sm" 
          disabled={data.page === 1}
          onClick={() => setData(p => ({ ...p, page: p.page - 1 }))}
        >
          Previous
        </button>
        <button 
          className="btn btn-secondary btn-sm" 
          disabled={data.page * data.page_size >= data.total}
          onClick={() => setData(p => ({ ...p, page: p.page + 1 }))}
        >
          Next
        </button>
      </div>
    </div>
  );
}
