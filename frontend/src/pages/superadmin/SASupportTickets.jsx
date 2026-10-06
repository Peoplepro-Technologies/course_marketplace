/**
 * SASupportTickets.jsx — Super Admin: Unified Service Request Inbox.
 *
 * KPI cards + filters (Role | Dept | Category | Priority | Status | Date)
 * + full ticket table: ID | Raised By | Category | Request | Dept | Priority | Status | Assigned To
 * All data fetched live from /api/v1/support-tickets/analytics
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import SASidebarLayout from './SASidebarLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import '../RoleDashboard.css';
import './SuperAdminDashboard.css';

const ROLE_LABELS = { learner: 'Learner', instructor: 'Instructor', coursecoordinator: 'Coordinator' };
const PRIORITY_STYLE = {
  high:   { background: 'rgba(239,68,68,0.12)',   color: '#ef4444' },
  medium: { background: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
  low:    { background: 'rgba(16,185,129,0.12)',  color: '#10b981' },
};

export default function SASupportTickets() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyMsg, setReplyMsg] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [filters, setFilters] = useState({
    role: '', department_id: '', category: '', priority: '', status: '', date_from: '', date_to: '',
  });

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    api.get('/support-tickets/analytics', { params })
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    api.get('/superadmin/departments').then(res => setDepartments(res.data)).catch(() => {});
  }, []);

  const kpis = data?.kpis || {};
  const tickets = data?.tickets || [];

  const KPI_CARDS = [
    { label: 'Total Requests', value: kpis.total ?? '—', color: '#6366f1' },
    { label: 'Open',           value: kpis.open ?? '—',  color: '#3b82f6' },
    { label: 'In Progress',    value: kpis.in_progress ?? '—', color: '#f59e0b' },
    { label: 'Resolved',       value: kpis.resolved ?? '—',    color: '#10b981' },
    { label: 'Overdue',        value: kpis.overdue ?? '—',     color: '#ef4444' },
  ];

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  const clearFilters = () => setFilters({ role: '', department_id: '', category: '', priority: '', status: '', date_from: '', date_to: '' });

  const handleSelect = (t) => {
    setSelectedTicket(t);
    setUpdateStatus(t.status);
    setReplyMsg('');
  };

  const handleStatusUpdate = async () => {
    try {
      await api.put(`/superadmin/support-tickets/${selectedTicket.id}`, { status: updateStatus });
      setSelectedTicket(p => ({ ...p, status: updateStatus }));
      fetchData();
    } catch { alert('Failed to update status'); }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyMsg.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/superadmin/support-tickets/${selectedTicket.id}/reply`, { message: replyMsg });
      setReplyMsg('');
      fetchData();
    } catch { alert('Failed to send reply'); }
    finally { setSubmitting(false); }
  };

  return (
    <SASidebarLayout>
      {/* Page header */}
      <div className="sa-page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2>Service Requests</h2>
          <p>Platform-wide view of all support tickets across every department.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchData} disabled={loading}>
          {loading ? '…' : 'Refresh'}
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem',
      }}>
        {KPI_CARDS.map(card => (
          <div key={card.label} style={{
            background: 'var(--color-surface)',
            border: `1px solid ${card.color}30`,
            borderTop: `3px solid ${card.color}`,
            borderRadius: '12px', padding: '1.1rem 1rem', textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: card.color, lineHeight: 1 }}>
              {card.value}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', fontWeight: 500 }}>
              {card.label}
            </div>
            {card.label === 'Overdue' && kpis.overdue > 0 && (
              <div style={{ fontSize: '0.68rem', color: '#ef4444', marginTop: '2px' }}>SLA breached</div>
            )}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
          Filters
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.65rem' }}>
          <select className="form-control" value={filters.role} onChange={e => setFilter('role', e.target.value)}>
            <option value="">All Roles</option>
            <option value="learner">Learner</option>
            <option value="instructor">Instructor</option>
            <option value="coursecoordinator">Coordinator</option>
          </select>
          <select className="form-control" value={filters.department_id} onChange={e => setFilter('department_id', e.target.value)}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input className="form-control" placeholder="Category…" value={filters.category}
            onChange={e => setFilter('category', e.target.value)} />
          <select className="form-control" value={filters.priority} onChange={e => setFilter('priority', e.target.value)}>
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select className="form-control" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <input className="form-control" type="date" value={filters.date_from}
            onChange={e => setFilter('date_from', e.target.value)} title="From date" />
          <input className="form-control" type="date" value={filters.date_to}
            onChange={e => setFilter('date_to', e.target.value)} title="To date" />
          <button className="btn btn-secondary btn-sm" onClick={clearFilters}
            style={{ alignSelf: 'center' }}>Clear</button>
        </div>
      </div>

      {/* Main layout: table + optional detail panel */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedTicket ? '1fr 420px' : '1fr', gap: '1.25rem' }}>

        {/* Ticket Table */}
        <div>
          {loading ? <LoadingSpinner /> : (
            <div className="sa-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Raised By</th>
                    <th>Category</th>
                    <th>Request</th>
                    <th>Department</th>
                    <th style={{ textAlign: 'center' }}>Priority</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th>Assigned To</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--color-text-muted)' }}>
                      No tickets match the current filters.
                    </td></tr>
                  ) : tickets.map(t => (
                    <tr key={t.id}
                      onClick={() => handleSelect(t)}
                      style={{
                        cursor: 'pointer',
                        background: selectedTicket?.id === t.id ? 'rgba(99,102,241,0.06)' : 'transparent',
                        transition: 'background 0.1s',
                      }}
                    >
                      <td>
                        <code style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '2px 7px', borderRadius: '5px', fontSize: '0.78rem' }}>
                          {t.ticket_number}
                        </code>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t.raised_by_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                          {ROLE_LABELS[t.role_context] || t.role_context}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{t.category}</td>
                      <td style={{ fontSize: '0.83rem', color: 'var(--color-text-muted)', maxWidth: '160px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.subcategory || t.subject}
                        </div>
                      </td>
                      <td>
                        {t.department_name ? (
                          <span style={{
                            background: 'rgba(99,102,241,0.1)', color: '#818cf8',
                            padding: '2px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600,
                          }}>
                            {t.department_name}
                          </span>
                        ) : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          ...(PRIORITY_STYLE[t.priority] || {}),
                          padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize',
                        }}>
                          {t.priority}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <StatusBadge status={t.status} />
                      </td>
                      <td style={{ fontSize: '0.83rem', color: 'var(--color-text-muted)' }}>
                        {t.assigned_to_name || '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Ticket Detail Side Panel */}
        {selectedTicket && (
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '12px', padding: '1.25rem', alignSelf: 'start', position: 'sticky', top: '80px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <code style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '2px 8px', borderRadius: '5px', fontSize: '0.8rem' }}>
                  {selectedTicket.ticket_number}
                </code>
                <h3 style={{ margin: '6px 0 0', fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.3 }}>
                  {selectedTicket.subject}
                </h3>
              </div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--color-text-muted)' }}
                onClick={() => setSelectedTicket(null)}>✕</button>
            </div>

            {/* Meta tags */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <span style={{ ...(PRIORITY_STYLE[selectedTicket.priority] || {}), padding: '2px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700 }}>
                {selectedTicket.priority}
              </span>
              {selectedTicket.department_name && (
                <span style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '2px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 600 }}>
                  {selectedTicket.department_name}
                </span>
              )}
              <span style={{ background: 'var(--color-bg)', padding: '2px 8px', borderRadius: '8px', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                {selectedTicket.role_context}
              </span>
            </div>

            <div style={{ fontSize: '0.82rem', marginBottom: '0.75rem' }}>
              <strong>Category:</strong> {selectedTicket.category}
              {selectedTicket.subcategory && <> → <strong>{selectedTicket.subcategory}</strong></>}
            </div>

            {/* Update status */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
              <select className="form-control" style={{ flex: 1 }} value={updateStatus}
                onChange={e => setUpdateStatus(e.target.value)}>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <button className="btn btn-primary btn-sm" onClick={handleStatusUpdate}
                disabled={updateStatus === selectedTicket.status}>
                Update
              </button>
            </div>

            {/* Reply box */}
            <form onSubmit={handleReply} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <textarea className="form-control" rows={3} placeholder="Reply to this ticket…"
                value={replyMsg} onChange={e => setReplyMsg(e.target.value)} style={{ resize: 'vertical' }} />
              <button className="btn btn-primary btn-sm" type="submit"
                disabled={submitting || !replyMsg.trim()}>
                {submitting ? 'Sending…' : 'Send Reply'}
              </button>
            </form>
          </div>
        )}
      </div>
    </SASidebarLayout>
  );
}
