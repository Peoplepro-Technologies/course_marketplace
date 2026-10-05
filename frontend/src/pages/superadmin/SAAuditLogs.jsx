/**
 * SAAuditLogs.jsx — Audit Logs for Super Admin.
 *
 * Lists all audit log entries (role changes, course status overrides, ticket actions).
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import SASidebarLayout from './SASidebarLayout';
import './SuperAdminDashboard.css';

// Map action slugs → badge variant colour class
const ACTION_VARIANTS = {
  role_change:              'role_change',
  role_changed:             'role_change',
  course_status_override:   'course_status_override',
  course_approved:          'course_approved',
  course_rejected:          'course_rejected',
  user_deactivated:         'user_deactivated',
  user_reactivated:         'user_reactivated',
  ticket_created:           'ticket_created',
  ticket_reply:             'ticket_reply',
  ticket_reopened:          'ticket_reopened',
  ticket_open:              'ticket_open',
  ticket_in_progress:       'ticket_in_progress',
  ticket_resolved:          'ticket_resolved',
  ticket_closed:            'ticket_closed',
};

function formatDetails(details) {
  if (!details || typeof details !== 'object') return details || '—';
  const entries = Object.entries(details);
  if (entries.length === 0) return '—';
  return entries.map(([k, v]) => `${k}: ${v}`).join(' · ');
}

function ActionBadge({ action }) {
  const variant = ACTION_VARIANTS[action] || 'default';
  return (
    <span className={`sa-audit-action sa-audit-action--${variant}`}>
      {action.replace(/_/g, ' ')}
    </span>
  );
}

export default function SAAuditLogs() {
  const [logs, setLogs]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [pageSize]              = useState(30);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = useCallback(() => {
    setLoading(true);
    api.get('/superadmin/audit-logs', { params: { page, page_size: pageSize } })
      .then(res => {
        setLogs(res.data.logs || []);
        setTotal(res.data.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, pageSize]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Client-side filter (API returns up to 30 per page; for full-text search backend would be needed)
  const filtered = logs.filter(log => {
    const matchSearch = !search ||
      log.actor_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.actor_email?.toLowerCase().includes(search.toLowerCase()) ||
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      log.target_type?.toLowerCase().includes(search.toLowerCase());
    const matchAction = !actionFilter || log.action === actionFilter;
    return matchSearch && matchAction;
  });

  const totalPages = Math.ceil(total / pageSize) || 1;
  const uniqueActions = [...new Set(logs.map(l => l.action))].sort();

  return (
    <SASidebarLayout>
      <div className="page-wrapper">
        <div className="section-header">
          <div>
            <h2>Audit Logs</h2>
            <p>Complete record of all critical administrative and system actions.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span className="badge" style={{ background: 'var(--color-primary)', color: '#fff', fontSize: '0.8rem', padding: '4px 10px' }}>
              {total} total
            </span>
            <button className="btn btn-secondary btn-sm" onClick={fetchLogs}>
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="card" style={{ padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="form-control"
            style={{ maxWidth: '220px' }}
            placeholder="Search actor or action…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="form-control"
            style={{ maxWidth: '200px' }}
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
          >
            <option value="">All Actions</option>
            {uniqueActions.map(a => (
              <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
            ))}
          </select>
          {(search || actionFilter) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setActionFilter(''); }}>
              Clear
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Showing {filtered.length} of {logs.length} on this page
          </span>
        </div>

        {loading && logs.length === 0 ? (
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
                    <th>Target</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2.5rem' }}>
                        {logs.length === 0 ? 'No audit logs found.' : 'No results match your filters.'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map(log => (
                      <tr key={log.id}>
                        <td style={{ fontSize: '12px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(log.timestamp).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td>
                          <strong style={{ display: 'block' }}>{log.actor_name || 'System'}</strong>
                          {log.actor_email && (
                            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{log.actor_email}</span>
                          )}
                        </td>
                        <td>
                          <ActionBadge action={log.action} />
                        </td>
                        <td>
                          <span className="badge" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                            {log.target_type}
                          </span>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '3px', fontFamily: 'monospace' }}>
                            {log.target_id?.slice(0, 8)}…
                          </div>
                        </td>
                        <td style={{ fontSize: '13px', color: 'var(--color-text-secondary)', maxWidth: '280px' }}>
                          {formatDetails(log.details)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="sa-pagination" style={{ marginTop: '1.25rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                ← Prev
              </button>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </SASidebarLayout>
  );
}
