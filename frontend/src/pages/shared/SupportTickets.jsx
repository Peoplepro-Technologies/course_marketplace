/**
 * SupportTickets.jsx — Raise & view your own support tickets.
 *
 * v2: Two-level dynamic routing form.
 * Category and subcategory dropdowns load from the DB (routing rules),
 * so new service requests appear without any frontend code changes.
 */

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';

const PRIORITY_COLORS = {
  high: { background: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  medium: { background: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  low: { background: 'rgba(16,185,129,0.12)', color: '#10b981' },
};

export default function SupportTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRaising, setIsRaising] = useState(false);

  // Dynamic routing state
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [routedDept, setRoutedDept] = useState(null);
  const [loadingSubcats, setLoadingSubcats] = useState(false);

  const [formData, setFormData] = useState({
    subject: '', category: '', subcategory: '', priority: 'medium', description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const location = useLocation();
  const rolePrefix = location.pathname.startsWith('/instructor') ? 'instructor'
    : location.pathname.startsWith('/coordinator') ? 'coordinator' : 'learner';
  const detailPath = `/${rolePrefix}/support`;

  const fetchTickets = () => {
    setLoading(true);
    api.get('/support-tickets')
      .then(res => setTickets(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // Load categories when form opens
  const loadCategories = () => {
    api.get('/support-tickets/routing-options')
      .then(res => setCategories(res.data.categories || []))
      .catch(() => setCategories([]));
  };

  // Load subcategories when category is selected
  const handleCategoryChange = (cat) => {
    setFormData(f => ({ ...f, category: cat, subcategory: '' }));
    setRoutedDept(null);
    if (!cat) {
      setSubcategories([]);
      return;
    }
    setLoadingSubcats(true);
    api.get('/support-tickets/routing-options', { params: { category: cat } })
      .then(res => setSubcategories(res.data.subcategories || []))
      .catch(() => setSubcategories([]))
      .finally(() => setLoadingSubcats(false));
  };

  const handleSubcategoryChange = (subcat) => {
    setFormData(f => ({ ...f, subcategory: subcat }));
    const found = subcategories.find(s => s.subcategory === subcat);
    setRoutedDept(found?.department_name || null);
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleOpenForm = () => {
    setIsRaising(true);
    loadCategories();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject || !formData.description || !formData.category) return;
    setSubmitting(true);
    try {
      await api.post('/support-tickets', formData);
      setIsRaising(false);
      setFormData({ subject: '', category: '', subcategory: '', priority: 'medium', description: '' });
      setCategories([]);
      setSubcategories([]);
      setRoutedDept(null);
      fetchTickets();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to raise ticket');
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
          <p>Get help from the right team. Your request is routed automatically.</p>
        </div>
        {!isRaising && (
          <button className="btn btn-primary flex-center gap-xs" onClick={handleOpenForm}>
Raise Request
          </button>
        )}
      </div>

      {isRaising && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '18px' }}>
            New Service Request
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Category */}
            <div className="form-group">
              <label>Category *</label>
              <select
                className="form-control"
                value={formData.category}
                onChange={e => handleCategoryChange(e.target.value)}
                required
              >
                <option value="">-- Select category --</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Subcategory (service request) */}
            {formData.category && (
              <div className="form-group">
                <label>Service Request *
                  {loadingSubcats && <span style={{ marginLeft: '8px', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>loading...</span>}
                </label>
                <select
                  className="form-control"
                  value={formData.subcategory}
                  onChange={e => handleSubcategoryChange(e.target.value)}
                  required
                  disabled={loadingSubcats || subcategories.length === 0}
                >
                  <option value="">-- Select service request --</option>
                  {subcategories.map(s => <option key={s.subcategory} value={s.subcategory}>{s.subcategory}</option>)}
                </select>
              </div>
            )}

            {/* Routing indicator */}
            {routedDept && (
              <div style={{
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: '8px', padding: '8px 12px', fontSize: '0.83rem',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                This request will be routed to: <strong style={{ color: '#10b981' }}>{routedDept}</strong>
              </div>
            )}

            {/* Subject + Priority */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Subject *</label>
                <input type="text" className="form-control" required
                  value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select className="form-control" value={formData.priority}
                  onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea className="form-control" rows="4" required
                value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button type="submit" className="btn btn-primary"
                disabled={submitting || !formData.category || !formData.subcategory}>
                {submitting ? 'Submitting...' : 'Submit Request'}
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
          title="No support tickets"
          message="You haven't raised any support tickets yet."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {tickets.map(ticket => (
            <Link
              to={`${detailPath}/${ticket.id}`}
              key={ticket.id}
              className="card"
              style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              <div className="flex-between">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                    {ticket.ticket_number ? (
                      <code style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '2px 6px', borderRadius: '5px', marginRight: '6px', fontFamily: 'monospace' }}>
                        {ticket.ticket_number}
                      </code>
                    ) : null}
                    {ticket.subject}
                  </h4>
                  {ticket.is_unread && (
                    <span className="badge" style={{ backgroundColor: 'var(--color-danger)', color: 'white', fontSize: '0.7rem' }}>New Reply</span>
                  )}
                </div>
                <StatusBadge status={ticket.status} />
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '13px', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
                <span className="flex-center gap-xs">{new Date(ticket.created_at).toLocaleDateString()}</span>
                <span>{ticket.category}{ticket.subcategory ? ` → ${ticket.subcategory}` : ''}</span>
                {ticket.department_name && (
                  <span style={{ fontWeight: 600, color: '#818cf8' }}>{ticket.department_name}</span>
                )}
                <span style={{ ...(PRIORITY_COLORS[ticket.priority] || {}), padding: '1px 8px', borderRadius: '8px', fontWeight: 600 }}>
                  {ticket.priority}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
