import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { MessageSquare, Clock, Filter, Check, X } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminSupportInbox({ apiPrefix, roleName, hideCategoryFilter = false }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  
  // Viewing a specific ticket
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  
  const fetchTickets = () => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (categoryFilter) params.category = categoryFilter;
    if (priorityFilter) params.priority = priorityFilter;
    
    api.get(`${apiPrefix}/support-tickets`, { params })
      .then(res => setTickets(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, categoryFilter, priorityFilter]);

  const handleSelectTicket = (ticket) => {
    setSelectedTicket(ticket);
    setUpdateStatus(ticket.status);
    setReplyMessage('');
  };

  const handleUpdateStatus = async () => {
    if (updateStatus === selectedTicket.status) return;
    try {
      await api.put(`${apiPrefix}/support-tickets/${selectedTicket.id}`, { status: updateStatus });
      setSelectedTicket({ ...selectedTicket, status: updateStatus });
      fetchTickets();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    
    setSubmitting(true);
    try {
      const res = await api.post(`${apiPrefix}/support-tickets/${selectedTicket.id}/reply`, { message: replyMessage });
      const newReply = res.data;
      
      // Update local state to show the reply immediately
      setSelectedTicket(prev => ({
        ...prev,
        replies: [...prev.replies, newReply],
        // Backend auto-opens resolved/closed tickets on reply
        status: ['resolved', 'closed'].includes(prev.status) ? 'open' : prev.status
      }));
      setReplyMessage('');
      fetchTickets();
    } catch (err) {
      alert("Failed to send reply");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !tickets.length && !selectedTicket) return <div className="page-wrapper"><LoadingSpinner /></div>;

  return (
    <div className="page-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="section-header">
        <h2>{roleName} Support Inbox</h2>
        <p>Manage and respond to user support requests.</p>
      </div>

      {!selectedTicket ? (
        <>
          {/* Inbox List View */}
          <div className="card flex-between" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Filter size={18} color="var(--color-text-muted)" />
              <select className="form-control" style={{ width: '150px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              
              {!hideCategoryFilter && (
                <select className="form-control" style={{ width: '150px' }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                  <option value="">All Categories</option>
                  <option value="technical">Technical</option>
                  <option value="billing">Billing</option>
                  <option value="course">Course</option>
                  <option value="account">Account</option>
                  <option value="other">Other</option>
                </select>
              )}
              
              <select className="form-control" style={{ width: '150px' }} value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
                <option value="">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            
            <button className="btn btn-secondary btn-sm flex-center" onClick={fetchTickets}>
              <Clock size={14} style={{ marginRight: '6px' }} /> Refresh
            </button>
          </div>

          {tickets.length === 0 ? (
            <EmptyState 
              icon={MessageSquare} 
              title="Inbox Zero" 
              message="There are no support tickets matching your filters." 
            />
          ) : (
            <div className="table-responsive card" style={{ padding: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Requester</th>
                    {!hideCategoryFilter && <th>Category</th>}
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(ticket => (
                    <tr key={ticket.id} onClick={() => handleSelectTicket(ticket)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontWeight: 600 }}>{ticket.subject}</td>
                      <td>
                        {ticket.raised_by_name}
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Role: {ticket.role_context}</div>
                      </td>
                      {!hideCategoryFilter && <td style={{ textTransform: 'capitalize' }}>{ticket.category}</td>}
                      <td style={{ textTransform: 'capitalize' }}>{ticket.priority}</td>
                      <td><StatusBadge status={ticket.status} /></td>
                      <td>{new Date(ticket.updated_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        /* Ticket Detail View */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', alignItems: 'start' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card">
              <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>{selectedTicket.subject}</h3>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                    <span>By: {selectedTicket.raised_by_name} ({selectedTicket.role_context})</span>
                    <span>Opened: {new Date(selectedTicket.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm flex-center" onClick={() => setSelectedTicket(null)}>
                  <X size={16} /> Close Thread
                </button>
              </div>
              
              <div style={{ background: 'var(--color-bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {selectedTicket.description}
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1.5rem 0' }}>Conversation</h4>
              
              {(!selectedTicket.replies || selectedTicket.replies.length === 0) ? (
                <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', margin: 0 }}>No replies yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {selectedTicket.replies.map(reply => (
                    <div key={reply.id} style={{ 
                      marginLeft: reply.author_id === selectedTicket.raised_by_id ? 0 : '2rem', 
                      marginRight: reply.author_id === selectedTicket.raised_by_id ? '2rem' : 0,
                      padding: '1rem',
                      background: reply.author_id === selectedTicket.raised_by_id ? '#f8f9fa' : '#eef2ff',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${reply.author_id === selectedTicket.raised_by_id ? '#e9ecef' : '#c7d2fe'}`
                    }}>
                      <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                        <strong style={{ color: reply.author_id === selectedTicket.raised_by_id ? 'var(--color-text)' : 'var(--color-primary)', fontSize: '13px' }}>
                          {reply.author_name}
                        </strong>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          {new Date(reply.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: 1.5 }}>{reply.message}</p>
                    </div>
                  ))}
                </div>
              )}
              
              <hr style={{ margin: '2rem 0', borderColor: 'var(--color-border)' }} />
              
              <form onSubmit={handleReply} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <textarea 
                  className="form-control" 
                  rows="4" 
                  placeholder="Type your reply to the user..."
                  required
                  value={replyMessage}
                  onChange={e => setReplyMessage(e.target.value)}
                ></textarea>
                <div style={{ alignSelf: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </form>
            </div>
          </div>
          
          <div className="card" style={{ position: 'sticky', top: '100px' }}>
            <h4 style={{ margin: '0 0 1rem 0' }}>Ticket Details</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '14px' }}>
              <div>
                <div style={{ color: 'var(--color-text-muted)', marginBottom: '4px', fontSize: '12px' }}>Status</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select className="form-control" style={{ padding: '4px 8px', fontSize: '13px', height: 'auto' }} value={updateStatus} onChange={e => setUpdateStatus(e.target.value)}>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  {updateStatus !== selectedTicket.status && (
                    <button className="btn btn-primary btn-sm flex-center" onClick={handleUpdateStatus} style={{ padding: '0 8px' }}>
                      <Check size={14} />
                    </button>
                  )}
                </div>
              </div>
              
              <div>
                <div style={{ color: 'var(--color-text-muted)', marginBottom: '4px', fontSize: '12px' }}>Category</div>
                <div style={{ textTransform: 'capitalize', fontWeight: 500 }}>{selectedTicket.category}</div>
              </div>
              
              <div>
                <div style={{ color: 'var(--color-text-muted)', marginBottom: '4px', fontSize: '12px' }}>Priority</div>
                <div style={{ textTransform: 'capitalize', fontWeight: 500 }}>
                  <span style={{ 
                    color: selectedTicket.priority === 'high' ? '#dc3545' : (selectedTicket.priority === 'medium' ? '#fd7e14' : '#28a745') 
                  }}>
                    {selectedTicket.priority}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
