/**
 * ReviewModeration.jsx — Admin tool to moderate reviews.
 */

import { useState, useEffect } from 'react';
import api from '../../api/axios';
import StarRating from '../../components/StarRating';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function ReviewModeration() {
  const [data, setData] = useState({ reviews: [], total: 0, page: 1, page_size: 20 });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchReviews = () => {
    setLoading(true);
    const params = { page: data.page, page_size: data.page_size };
    if (statusFilter) params.status = statusFilter;

    api.get('/admin/reviews', { params })
      .then((res) => setData(prev => ({ ...prev, ...res.data })))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReviews();
  }, [data.page, data.page_size, statusFilter]);

  const handleModerate = async (reviewId, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this review?`)) return;
    try {
      await api.put(`/admin/reviews/${reviewId}/moderate`, { action });
      fetchReviews();
    } catch (err) {
      alert('Moderation failed');
    }
  };

  if (loading && data.reviews.length === 0) return <div className="page-wrapper"><LoadingSpinner /></div>;

  return (
    <div className="page-wrapper container">
      <div className="section-header flex-between">
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => window.history.back()} style={{ marginBottom: '1rem' }}>
            ← Back
          </button>
          <h2>Review Moderation</h2>
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '200px' }}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="flagged">Flagged</option>
          <option value="removed">Removed</option>
        </select>
      </div>

      <div className="grid grid-2">
        {data.reviews.map(review => (
          <div key={review.id} className="card-glass flex-col gap-sm">
            <div className="flex-between">
              <div>
                <strong>{review.learner_name || 'Anonymous User'}</strong>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  {new Date(review.created_at).toLocaleDateString()}
                </div>
              </div>
              <span className={`badge badge-${review.status === 'active' ? 'success' : review.status === 'flagged' ? 'warning' : 'danger'}`}>
                {review.status}
              </span>
            </div>
            
            <StarRating rating={review.rating} />
            <p style={{ fontSize: 'var(--text-sm)', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '4px' }}>
              {review.comment || <em>No comment provided.</em>}
            </p>

            <div className="flex gap-sm" style={{ marginTop: 'auto', paddingTop: '1rem' }}>
              {review.status !== 'active' && <button className="btn btn-success btn-sm" onClick={() => handleModerate(review.id, 'approve')}>Approve (Make Active)</button>}
              {review.status !== 'flagged' && <button className="btn btn-warning btn-sm" onClick={() => handleModerate(review.id, 'flag')}>Flag</button>}
              {review.status !== 'removed' && <button className="btn btn-danger btn-sm" onClick={() => handleModerate(review.id, 'remove')}>Remove</button>}
            </div>
          </div>
        ))}
      </div>
      
      <div className="pagination" style={{ justifyContent: 'center', marginTop: '2rem' }}>
        <button className="btn btn-secondary btn-sm" disabled={data.page === 1} onClick={() => setData(p => ({ ...p, page: p.page - 1 }))}>Prev</button>
        <span className="page-info">Total: {data.total}</span>
        <button className="btn btn-secondary btn-sm" disabled={data.page * data.page_size >= data.total} onClick={() => setData(p => ({ ...p, page: p.page + 1 }))}>Next</button>
      </div>
    </div>
  );
}
