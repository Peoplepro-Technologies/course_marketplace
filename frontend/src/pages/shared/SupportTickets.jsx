import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import { Plus, MessageSquare, Clock, CheckCircle } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function SupportTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRaising, setIsRaising] = useState(false);
  const [formData, setFormData] = useState({ subject: '', category: 'technical', priority: 'medium', description: '' });
  const [submitting, setSubmitting] = useState(false);
  
  // Determine role prefix for API routing based on where this component is mounted
  const location = useLocation();
  const rolePrefix = location.pathname.startsWith('/instructor') ? 'instructor' : 'learner';
  const detailPath = `/${rolePrefix}/support`;

  const fetchTickets = () => {
    setLoading(true);
    api.get('/support-tickets')
      .then(res => setTickets(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject || !formData.description) return;
    
    setSubmitting(true);
    try {
      await api.post('/support-tickets', formData);
      setIsRaising(false);
      setFormData({ subject: '', category: 'technical', priority: 'medium', description: '' });
      fetchTickets();
    } catch (err) {
      alert("Failed to raise ticket");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-wrapper"><LoadingSpinner /></div>;

  return (
    <div className="page-wrapper">
      <div className="section-header flex-between">
        <div>
          <h2>Support Tickets</h2>
          <p>Get help with your account, courses, or billing.</p>
        </div>
        {!isRaising && (
          <button className="btn btn-primary flex-center gap-xs" onClick={() => setIsRaising(true)}>
            <Plus size={16} /> Raise Ticket
          </button>
        )}
      </div>

      {isRaising && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '18px' }}>Raise a New Ticket</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label>Subject</label>
              <input type="text" className="form-control" required
                value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Category</label>
                <select className="form-control" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  <option value="technical">Technical Issue</option>
                  <option value="billing">Billing / Payment</option>
                  <option value="course">Course Content</option>
                  <option value="account">Account Management</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select className="form-control" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea className="form-control" rows="4" required
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
              ></textarea>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Ticket'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setIsRaising(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {tickets.length === 0 && !isRaising ? (
        <EmptyState 
          icon={MessageSquare} 
          title="No support tickets" 
          message="You haven't raised any support tickets yet." 
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {tickets.map(ticket => (
            <Link to={`${detailPath}/${ticket.id}`} key={ticket.id} className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: '0.75rem', transition: 'box-shadow 0.2s', ':hover': { boxShadow: 'var(--shadow-md)' } }}>
              <div className="flex-between">
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{ticket.subject}</h4>
                <StatusBadge status={ticket.status} />
              </div>
              
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                <span className="flex-center gap-xs"><Clock size={14} /> {new Date(ticket.created_at).toLocaleDateString()}</span>
                <span style={{ textTransform: 'capitalize' }}>Category: {ticket.category}</span>
                <span style={{ textTransform: 'capitalize' }}>Priority: {ticket.priority}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
