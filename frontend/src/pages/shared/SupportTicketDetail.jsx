import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import { ArrowLeft, Send } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function SupportTicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const rolePrefix = location.pathname.startsWith('/instructor') ? 'instructor' : 'learner';
  
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTicket = () => {
    api.get(`/support-tickets/${id}`)
      .then(res => setTicket(res.data))
      .catch(err => {
        console.error(err);
        alert("Failed to load ticket");
        navigate(`/${rolePrefix}/support`);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    
    setSubmitting(true);
    try {
      await api.post(`/support-tickets/${id}/reply`, { message: replyMessage });
      setReplyMessage('');
      fetchTicket();
    } catch (err) {
      alert("Failed to send reply");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-wrapper"><LoadingSpinner /></div>;
  if (!ticket) return null;

  return (
    <div className="page-wrapper">
      <div className="section-header">
        <button className="btn btn-secondary btn-sm flex-center gap-xs" style={{ marginBottom: '1rem' }} onClick={() => navigate(`/${rolePrefix}/support`)}>
          <ArrowLeft size={16} /> Back to Tickets
        </button>
        <div className="flex-between">
          <h2>{ticket.subject}</h2>
          <StatusBadge status={ticket.status} />
        </div>
        <p style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', fontSize: '14px', color: 'var(--color-text-muted)' }}>
          <span style={{ textTransform: 'capitalize' }}>Category: {ticket.category}</span>
          <span style={{ textTransform: 'capitalize' }}>Priority: {ticket.priority}</span>
          <span>Opened: {new Date(ticket.created_at).toLocaleString()}</span>
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="flex-between" style={{ marginBottom: '1rem' }}>
          <strong style={{ color: 'var(--color-text)' }}>{ticket.raised_by_name} (You)</strong>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{new Date(ticket.created_at).toLocaleString()}</span>
        </div>
        <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{ticket.description}</p>
      </div>

      {ticket.replies && ticket.replies.map(reply => (
        <div key={reply.id} className="card" style={{ marginBottom: '1rem', marginLeft: reply.author_id === ticket.raised_by_id ? 0 : '2rem', marginRight: reply.author_id === ticket.raised_by_id ? '2rem' : 0 }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <strong style={{ color: reply.author_id === ticket.raised_by_id ? 'var(--color-text)' : 'var(--color-primary)' }}>
              {reply.author_id === ticket.raised_by_id ? `${reply.author_name} (You)` : `${reply.author_name} (Support)`}
            </strong>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{new Date(reply.created_at).toLocaleString()}</span>
          </div>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{reply.message}</p>
        </div>
      ))}

      {ticket.status !== 'closed' && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>Reply</h4>
          <form onSubmit={handleReply} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <textarea 
              className="form-control" 
              rows="3" 
              placeholder="Type your message here..."
              required
              value={replyMessage}
              onChange={e => setReplyMessage(e.target.value)}
            ></textarea>
            <div style={{ alignSelf: 'flex-end' }}>
              <button type="submit" className="btn btn-primary flex-center gap-xs" disabled={submitting}>
                <Send size={16} /> {submitting ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
