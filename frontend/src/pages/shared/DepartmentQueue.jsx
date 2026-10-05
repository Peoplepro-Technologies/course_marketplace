/**
 * DepartmentQueue.jsx — Generic Department Ticket Queue (Part 4).
 *
 * ONE component for ALL departments — works for Accounts, HR, IT, Academic Ops, etc.
 * Adding a new department requires ZERO frontend code changes.
 * The user sees tickets routed to their department_id.
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import useAuth from '../../hooks/useAuth';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved'];

const PRIORITY_COLORS = {
  high: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  medium: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  low: { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
};

export default function DepartmentQueue() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (priorityFilter) params.priority = priorityFilter;

    api.get('/support-tickets/department-queue', { params })
      .then(res => setTickets(res.data))
      .catch(err => {
        if (err.response?.status === 403) {
          setError('You are not assigned to any department. Ask Super Admin to assign your department.');
        } else {
          setError('Failed to load tickets.');
        }
      })
      .finally(() => setLoading(false));
  }, [statusFilter, priorityFilter]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleSelectTicket = (ticket) => {
    setSelectedTicket(ticket);
    setUpdateStatus(ticket.status);
    setReplyMessage('');

    if (ticket.is_unread) {
      api.post(`/support-tickets/department-queue/${ticket.id}/read`)
        .then(() => setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, is_unread: false } : t)))
        .catch(() => {});
    }
  };

  const handleUpdateStatus = async () => {
    if (updateStatus === selectedTicket.status) return;
    try {
      await api.put(`/support-tickets/department-queue/${selectedTicket.id}`, { status: updateStatus });
      setSelectedTicket(prev => ({ ...prev, status: updateStatus }));
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, status: updateStatus } : t));
    } catch {
      alert('Failed to update status');
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/support-tickets/department-queue/${selectedTicket.id}/reply`, { message: replyMessage });
      const newReply = res.data;
      setSelectedTicket(prev => ({
        ...prev,
        replies: [...(prev.replies || []), newReply],
        status: ['resolved', 'closed'].includes(prev.status) ? 'in_progress' : prev.status,
      }));
      setReplyMessage('');
      fetchTickets();
    } catch {
      alert('Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  const unreadCount = tickets.filter(t => t.is_unread).length;

  // Get department name from first ticket or user's profile
  const deptName = tickets[0]?.department_name || 'Department';

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="section-header flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            Department Tickets
            {unreadCount > 0 && (
              <span style={{
                background: '#ef4444', color: 'white', borderRadius: '12px',
                padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700,
              }}>{unreadCount} new</span>
            )}
          </h2>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Showing tickets routed to your department.
            This queue works for <strong>any department</strong> — no new pages needed.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchTickets}>Refresh</button>
      </div>

      {error ? (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '12px', padding: '1.5rem', textAlign: 'center', color: '#ef4444',
        }}>
          <strong>{error}</strong>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedTicket ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
          {/* Ticket List */}
          <div>
            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <select className="form-control" style={{ maxWidth: '160px' }}
                value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
              <select className="form-control" style={{ maxWidth: '160px' }}
                value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
                <option value="">All Priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              {(statusFilter || priorityFilter) && (
                <button className="btn btn-secondary btn-sm" onClick={() => { setStatusFilter(''); setPriorityFilter(''); }}>
                  Clear
                </button>
              )}
            </div>

            {loading ? <LoadingSpinner /> : tickets.length === 0 ? (
              <EmptyState title="No tickets in queue" message="Your department has no pending tickets." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {tickets.map(ticket => (
                  <div
                    key={ticket.id}
                    onClick={() => handleSelectTicket(ticket)}
                    style={{
                      background: selectedTicket?.id === ticket.id ? 'rgba(99,102,241,0.08)' : 'var(--color-surface)',
                      border: `1px solid ${selectedTicket?.id === ticket.id ? '#6366f1' : 'var(--color-border)'}`,
                      borderRadius: '12px', padding: '1rem 1.25rem', cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <code style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '2px 6px', borderRadius: '5px', fontSize: '0.75rem' }}>
                          {ticket.ticket_number}
                        </code>
                        {ticket.is_unread && (
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                        )}
                      </div>
                      <StatusBadge status={ticket.status} />
                    </div>

                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                      {ticket.subject}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                      {ticket.category}{ticket.subcategory ? ` → ${ticket.subcategory}` : ''}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      <span>{ticket.raised_by_name}</span>
                      <span style={{
                        ...PRIORITY_COLORS[ticket.priority],
                        padding: '1px 6px', borderRadius: '8px', fontWeight: 600,
                      }}>
                        {ticket.priority}
                      </span>
                      <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ticket Detail Panel */}
          {selectedTicket && (
            <div style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: '12px', padding: '1.5rem',
            }}>
              <div className="flex-between" style={{ marginBottom: '1rem' }}>
                <div>
                  <code style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '3px 8px', borderRadius: '5px', fontSize: '0.85rem' }}>
                    {selectedTicket.ticket_number}
                  </code>
                  <h3 style={{ margin: '8px 0 0', fontSize: '1rem' }}>{selectedTicket.subject}</h3>
                </div>
                <button style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}
                  onClick={() => setSelectedTicket(null)}>✕</button>
              </div>

              {/* Meta */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Raised by: <strong>{selectedTicket.raised_by_name}</strong></span>
                <span style={{ color: 'var(--color-text-muted)' }}>Role: <strong>{selectedTicket.role_context}</strong></span>
                <span style={{
                  ...PRIORITY_COLORS[selectedTicket.priority],
                  padding: '1px 8px', borderRadius: '8px', fontWeight: 600,
                }}>
                  {selectedTicket.priority}
                </span>
              </div>

              {/* Category path */}
              <div style={{ background: 'rgba(99,102,241,0.06)', borderRadius: '8px', padding: '8px 12px', marginBottom: '1rem', fontSize: '0.83rem' }}>
                <strong>Category:</strong> {selectedTicket.category}
                {selectedTicket.subcategory && <> → <strong>{selectedTicket.subcategory}</strong></>}
              </div>

              {/* Description */}
              <div style={{ marginBottom: '1rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
                {selectedTicket.description}
              </div>

              {/* Update Status */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '1rem' }}>
                <select className="form-control" style={{ maxWidth: '180px' }}
                  value={updateStatus} onChange={e => setUpdateStatus(e.target.value)}>
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
                <button className="btn btn-primary btn-sm" onClick={handleUpdateStatus}
                  disabled={updateStatus === selectedTicket.status}>
                  Update Status
                </button>
              </div>

              {/* Replies */}
              <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '1rem' }}>
                {(selectedTicket.replies || []).map(reply => (
                  <div key={reply.id} style={{
                    background: 'var(--color-bg)', borderRadius: '8px',
                    padding: '0.75rem', marginBottom: '0.5rem', fontSize: '0.85rem',
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      {reply.author_name} · {new Date(reply.created_at).toLocaleString()}
                    </div>
                    {reply.message}
                  </div>
                ))}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleReply} style={{ display: 'flex', gap: '8px' }}>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Type a reply..."
                  value={replyMessage}
                  onChange={e => setReplyMessage(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
                <button className="btn btn-primary btn-sm" type="submit" disabled={submitting || !replyMessage.trim()}>
                  {submitting ? '...' : 'Send'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
