/**
 * StaffDashboard.jsx — Universal department staff portal.
 *
 * One component → works for ALL departments:
 *   HR, IT/Technical Support, Academic Operations, Academic Team,
 *   MIS & Reporting, Student Support, Finance, any future dept.
 *
 * Data comes from /api/v1/support-tickets/department-queue (filtered by dept_id).
 * Layout, sidebar, KPIs, ticket table, reply panel — all DB-driven.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import useAuth from '../../hooks/useAuth';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import './StaffLayout.css';

/* ── Dept accent colour ─────────────────────────────────────────────── */
const DEPT_COLOR_MAP = {
  'accounts':            '#3b82f6',
  'finance':             '#3b82f6',
  'hr':                  '#ec4899',
  'it':                  '#6366f1',
  'technical':           '#6366f1',
  'mis':                 '#8b5cf6',
  'reporting':           '#8b5cf6',
  'academic operations': '#f59e0b',
  'academic team':       '#f59e0b',
  'student support':     '#10b981',
  'course coord':        '#06b6d4',
};
function deptColor(name = '') {
  const lc = name.toLowerCase();
  for (const [k, c] of Object.entries(DEPT_COLOR_MAP)) {
    if (lc.includes(k)) return c;
  }
  return '#6366f1';
}

/* ── Priority colours ───────────────────────────────────────────────── */
const PRI = {
  high:   { bg: 'rgba(239,68,68,0.12)',   fg: '#ef4444' },
  medium: { bg: 'rgba(245,158,11,0.12)',  fg: '#f59e0b' },
  low:    { bg: 'rgba(16,185,129,0.12)',  fg: '#10b981' },
};

const ROLE_LABEL = { learner: 'Learner', instructor: 'Instructor', coursecoordinator: 'Coordinator' };
const NAV = [
  { to: '/staff',          label: 'Dashboard' },
  { to: '/staff/resolved', label: 'Resolved'  },
];

/* ══════════════════════════════════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════════════════════════════════ */
function StaffSidebar({ accent, unreadCount }) {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const isActive = (p) => loc.pathname === p;

  return (
    <aside className="staff-sidebar" style={{ '--accent': accent }}>
      {/* Brand */}
      <div className="staff-brand">
        <div className="staff-brand-text">
          <div className="staff-dept-name">{user?.department_name || 'Staff Portal'}</div>
          <div className="staff-dept-sub">Service Requests</div>
        </div>
      </div>

      {/* User pill */}
      <div className="staff-user-info">
        <div className="staff-avatar" style={{ background: accent }}>
          {user?.name?.charAt(0)?.toUpperCase() || 'S'}
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div className="staff-user-name">{user?.name}</div>
          <div className="staff-user-email">{user?.email}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="staff-nav">
        {NAV.map(n => (
          <Link key={n.to} to={n.to}
            className={`staff-nav-item ${isActive(n.to) ? 'active' : ''}`}
            style={isActive(n.to) ? { '--item-color': accent } : {}}>
            <span className="staff-nav-label">{n.label}</span>
            {n.to === '/staff' && unreadCount > 0 && (
              <span style={{
                marginLeft: 'auto', background: '#ef4444', color: '#fff',
                borderRadius: '10px', padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700,
              }}>{unreadCount}</span>
            )}
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <button className="staff-logout" onClick={logout}>
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        <span>Sign out</span>
      </button>
    </aside>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   TICKET DETAIL PANEL
══════════════════════════════════════════════════════════════════════ */
function TicketDetailPanel({ ticket, accent, onClose, onUpdated }) {
  const { user } = useAuth();
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [replyMsg, setReplyMsg]   = useState('');
  const [newStatus, setNewStatus] = useState(ticket.status);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoadingDetail(true);
    api.get(`/support-tickets/department-queue/${ticket.id}`)
      .then(r => setDetail(r.data))
      .catch(console.error)
      .finally(() => setLoadingDetail(false));
    api.post(`/support-tickets/department-queue/${ticket.id}/read`).catch(() => {});
  }, [ticket.id]);

  const handleStatusUpdate = async () => {
    try {
      await api.put(`/support-tickets/department-queue/${ticket.id}`, { status: newStatus });
      onUpdated();
    } catch { alert('Failed to update status'); }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyMsg.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/support-tickets/department-queue/${ticket.id}/reply`, { message: replyMsg });
      setReplyMsg('');
      // Reload detail
      const r = await api.get(`/support-tickets/department-queue/${ticket.id}`);
      setDetail(r.data);
      onUpdated();
    } catch { alert('Failed to send reply'); }
    finally { setSubmitting(false); }
  };

  const pri = PRI[ticket.priority] || PRI.medium;

  return (
    <div className="staff-detail-panel">
      {/* Header */}
      <div className="staff-detail-header">
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <code style={{
              background: `${accent}18`, color: accent,
              padding: '2px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700,
            }}>{ticket.ticket_number}</code>
            <span style={{ background: pri.bg, color: pri.fg, padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize' }}>
              {ticket.priority}
            </span>
            <StatusBadge status={ticket.status} />
          </div>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.35 }}>
            {ticket.subject}
          </h3>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--color-text-muted)', padding: '4px' }}>✕</button>
      </div>

      {/* Meta row */}
      <div className="staff-detail-meta">
        <div><span>Raised by</span> <strong>{ticket.raised_by_name}</strong></div>
        <div><span>Role</span> <strong style={{ textTransform: 'capitalize' }}>{ROLE_LABEL[ticket.role_context] || ticket.role_context}</strong></div>
        <div><span>Category</span> <strong>{ticket.category}</strong></div>
        {ticket.subcategory && <div><span>Request</span> <strong>{ticket.subcategory}</strong></div>}
        <div><span>Opened</span> <strong>{new Date(ticket.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></div>
      </div>

      {/* Description */}
      {loadingDetail ? <LoadingSpinner /> : detail?.description && (
        <div className="staff-detail-description">
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Description
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.7 }}>{detail.description}</p>
        </div>
      )}

      {/* Reply thread */}
      {!loadingDetail && detail?.replies?.length > 0 && (
        <div className="staff-reply-thread">
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Conversation ({detail.replies.length})
          </div>
          {detail.replies.map(r => (
            <div key={r.id} className={`staff-reply-bubble ${r.author_name === user?.name ? 'mine' : 'theirs'}`} style={{ '--bubble-accent': accent }}>
              <div className="staff-reply-author">{r.author_name}</div>
              <div className="staff-reply-msg">{r.message}</div>
              <div className="staff-reply-time">{new Date(r.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          ))}
        </div>
      )}

      {/* Status update */}
      <div className="staff-detail-actions">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <select className="form-control" style={{ flex: 1 }} value={newStatus} onChange={e => setNewStatus(e.target.value)}>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={handleStatusUpdate}
            disabled={newStatus === ticket.status}
            style={{ background: accent, borderColor: accent, whiteSpace: 'nowrap' }}>
            Update Status
          </button>
        </div>

        {/* Reply box */}
        <form onSubmit={handleReply}>
          <textarea className="form-control" rows={3} placeholder="Write a reply to the requester…"
            value={replyMsg} onChange={e => setReplyMsg(e.target.value)}
            style={{ resize: 'vertical', fontSize: '0.875rem', marginBottom: '8px' }} />
          <button className="btn btn-primary" type="submit"
            disabled={submitting || !replyMsg.trim()}
            style={{ width: '100%', background: accent, borderColor: accent }}>
            {submitting ? 'Sending…' : 'Send Reply'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN DASHBOARD
══════════════════════════════════════════════════════════════════════ */
export default function StaffDashboard() {
  const { user } = useAuth();
  const loc = useLocation();
  const resolvedOnly = loc.pathname === '/staff/resolved';

  const [tickets, setTickets]           = useState([]);
  const [allTickets, setAllTickets]     = useState([]); // unfiltered, for KPIs
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [statusFilter, setStatusFilter] = useState(resolvedOnly ? 'resolved' : '');
  const [priorityFilter, setPriFilter]  = useState('');
  const [searchQ, setSearchQ]           = useState('');
  const [selectedTicket, setSelected]   = useState(null);

  const accent = deptColor(user?.department_name);

  // Reset filters when switching between /staff and /staff/resolved
  useEffect(() => {
    setStatusFilter(resolvedOnly ? 'resolved' : '');
    setPriFilter('');
    setSearchQ('');
    setSelected(null);
  }, [resolvedOnly]);

  // Fetch KPI data (always unfiltered)
  const fetchAll = useCallback(() => {
    api.get('/support-tickets/department-queue')
      .then(r => setAllTickets(r.data))
      .catch(() => {});
  }, []);

  // Fetch displayed tickets (with filters)
  const fetchTickets = useCallback(() => {
    setLoading(true);
    const params = {};
    if (statusFilter)   params.status   = statusFilter;
    if (priorityFilter) params.priority = priorityFilter;
    api.get('/support-tickets/department-queue', { params })
      .then(r => { setTickets(r.data); setError(null); })
      .catch(() => setError('Could not load tickets. Please retry.'))
      .finally(() => setLoading(false));
  }, [statusFilter, priorityFilter]);

  useEffect(() => { fetchAll(); fetchTickets(); }, [fetchAll, fetchTickets]);

  const refresh = () => { fetchAll(); fetchTickets(); };

  // KPIs always from unfiltered data
  const kpis = {
    total:      allTickets.length,
    open:       allTickets.filter(t => t.status === 'open').length,
    inProgress: allTickets.filter(t => t.status === 'in_progress').length,
    resolved:   allTickets.filter(t => t.status === 'resolved').length,
    highPri:    allTickets.filter(t => t.priority === 'high' && t.status !== 'resolved').length,
    unread:     allTickets.filter(t => t.is_unread).length,
  };

  const KPI_CARDS = [
    { label: 'Total',       value: kpis.total,      color: accent    },
    { label: 'Open',        value: kpis.open,       color: '#3b82f6' },
    { label: 'In Progress', value: kpis.inProgress, color: '#f59e0b' },
    { label: 'Resolved',    value: kpis.resolved,   color: '#10b981' },
    { label: 'High Priority',value: kpis.highPri,   color: '#ef4444' },
  ];

  // Filter + search
  const filtered = tickets.filter(t =>
    (!searchQ || [t.raised_by_name, t.subject, t.category, t.subcategory]
      .some(v => v?.toLowerCase().includes(searchQ.toLowerCase())))
  );

  if (!user?.department_id) {
    return (
      <div className="staff-layout">
        <StaffSidebar accent={accent} unreadCount={0} />
        <main className="staff-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <h2 style={{ marginBottom: '0.5rem' }}>No Department Assigned</h2>
            <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
              Your account hasn't been assigned to a department yet.<br />
              Ask your <strong>Super Admin</strong> to assign you under<br />
              <code>User Management → Assign Dept</code>.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="staff-layout" id="staff-portal">
      <StaffSidebar accent={accent} unreadCount={kpis.unread} />

      <main className="staff-main">
        {/* ── Page header ──────────────────────────────────────────── */}
        <div className="staff-page-header">
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
              {resolvedOnly ? 'Resolved Tickets' : `${user?.department_name || 'Department'} Queue`}
            </h1>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              {resolvedOnly
                ? 'All resolved service requests in your department'
                : `Live service requests routed to your department · ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}`
              }
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={refresh} style={{ alignSelf: 'flex-start' }}>
            Refresh
          </button>
        </div>

        {/* ── KPI Cards ────────────────────────────────────────────── */}
        {!resolvedOnly && (
          <div className="staff-kpi-grid">
            {[
              { label: 'Total',        value: kpis.total,      color: accent,    filter: ''            },
              { label: 'Open',         value: kpis.open,       color: '#3b82f6', filter: 'open'        },
              { label: 'In Progress',  value: kpis.inProgress, color: '#f59e0b', filter: 'in_progress' },
              { label: 'Resolved',     value: kpis.resolved,   color: '#10b981', filter: 'resolved'    },
              { label: 'High Priority',value: kpis.highPri,    color: '#ef4444', filter: ''            },
            ].map(c => (
              <div key={c.label} className="staff-kpi-card"
                onClick={() => c.filter !== undefined && setStatusFilter(c.filter)}
                style={{
                  borderTop: `3px solid ${c.color}`,
                  border: `1px solid ${c.color}22`,
                  cursor: c.filter !== undefined ? 'pointer' : 'default',
                  outline: statusFilter === c.filter && c.filter !== '' ? `2px solid ${c.color}` : 'none',
                }}>
                <div className="staff-kpi-value" style={{ color: c.color }}>{c.value}</div>
                <div className="staff-kpi-label">{c.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Filters ────────────────────────────────────────────── */}
        <div className="staff-filters">
          <input className="form-control" placeholder="Search by name, category…"
            value={searchQ} onChange={e => setSearchQ(e.target.value)}
            style={{ flex: 2, minWidth: '180px' }} />
          {!resolvedOnly && (
            <select className="form-control" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ flex: 1, minWidth: '145px' }}>
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          )}
          <select className="form-control" value={priorityFilter} onChange={e => setPriFilter(e.target.value)}
            style={{ flex: 1, minWidth: '130px' }}>
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button className="btn btn-secondary btn-sm" onClick={() => {
            setStatusFilter(resolvedOnly ? 'resolved' : '');
            setPriFilter('');
            setSearchQ('');
          }}>
            Clear
          </button>
        </div>

        {/* ── Main grid: table + detail panel ──────────────────────── */}
        <div className="staff-content-grid" style={{ gridTemplateColumns: selectedTicket ? '1fr 420px' : '1fr' }}>

          {/* Ticket table */}
          <div className="staff-table-wrapper">
            {error ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>
                {error} <button className="btn btn-secondary btn-sm" onClick={fetchTickets} style={{ marginLeft: '8px' }}>Retry</button>
              </div>
            ) : loading ? <LoadingSpinner /> : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                  {resolvedOnly ? '' : ''}
                </div>
                <h3>{searchQ || statusFilter || priorityFilter ? 'No matches' : resolvedOnly ? 'No resolved tickets yet' : 'Inbox Zero'}</h3>
                <p>{searchQ || statusFilter || priorityFilter ? 'Try different filters.' : resolvedOnly ? 'Tickets marked resolved will appear here.' : 'No service requests right now.'}</p>
              </div>
            ) : (
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Raised By</th>
                    <th>Category</th>
                    <th>Request</th>
                    <th style={{ textAlign: 'center' }}>Priority</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => {
                    const pri = PRI[t.priority] || PRI.medium;
                    const isSelected = selectedTicket?.id === t.id;
                    return (
                      <tr key={t.id}
                        onClick={() => setSelected(isSelected ? null : t)}
                        style={{
                          cursor: 'pointer',
                          background: isSelected ? `${accent}0d`
                            : t.is_unread ? 'var(--color-bg)' : 'transparent',
                          borderLeft: isSelected ? `3px solid ${accent}` : '3px solid transparent',
                        }}>
                        <td>
                          <code style={{ background: `${accent}18`, color: accent, padding: '2px 7px', borderRadius: '5px', fontSize: '0.78rem', fontWeight: 700 }}>
                            {t.ticket_number || t.id?.slice(0, 8)}
                          </code>
                          {t.is_unread && (
                            <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.62rem', padding: '1px 5px', borderRadius: '8px', marginLeft: '5px', fontWeight: 700 }}>
                              NEW
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.2 }}>{t.raised_by_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                            {ROLE_LABEL[t.role_context] || t.role_context}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{t.category}</td>
                        <td style={{ fontSize: '0.83rem', color: 'var(--color-text-muted)', maxWidth: '180px' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.subcategory || t.subject}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ background: pri.bg, color: pri.fg, padding: '2px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize' }}>
                            {t.priority}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <StatusBadge status={t.status} />
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Detail panel */}
          {selectedTicket && (
            <TicketDetailPanel
              ticket={selectedTicket}
              accent={accent}
              onClose={() => setSelected(null)}
              onUpdated={() => { fetchTickets(); }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
