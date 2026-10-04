/**
 * SubAdminReviewsModeration.jsx — Review Moderation for Sub Admin.
 *
 * Lists all reviews with an option to hide/unhide inappropriate ones.
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import SubAdminSidebarLayout from './SubAdminSidebarLayout';

export default function SubAdminReviewsModeration() {
  const [data, setData] = useState({ reviews: [], total: 0, page: 1, page_size: 20 });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchReviews = useCallback(() => {
    setLoading(true);
    const params = { page: data.page, page_size: data.page_size };
    if (statusFilter) params.status = statusFilter;

    api.get('/subadmin/reviews', { params })
      .then(res => setData(prev => ({ ...prev, ...res.data })))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [data.page, data.page_size, statusFilter]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleModerate = async (reviewId, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this review?`)) return;
    setActionLoading(reviewId);
    try {
      await api.put(`/subadmin/reviews/${reviewId}/moderate`, { action });
      fetchReviews();
    } catch (err) {
      alert(err.response?.data?.detail || 'Moderation failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <SubAdminSidebarLayout>
      <div className="sa-page-header">
        <h2>⭐ Review Moderation</h2>
        <p>Monitor and moderate learner reviews across all courses.</p>
      </div>

      <div className="sa-filter-bar">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setData(p => ({ ...p, page: 1 })); }}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="flagged">Flagged</option>
          <option value="removed">Removed</option>
        </select>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          {data.total} review{data.total !== 1 ? 's' : ''} found
        </span>
      </div>

      {loading && data.reviews.length === 0 ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="sa-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Course & Learner</th>
                  <th>Review</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.reviews.map(review => (
                  <tr key={review.id}>
                    <td>
                      <strong>{review.course_title}</strong>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        by {review.learner_name}
                      </div>
                    </td>
                    <td>
                      <div>
                        <span style={{ color: '#F5A623', fontSize: '1.2rem' }}>
                          {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                        </span>
                      </div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: '4px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {review.comment || 'No comment'}
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${
                        review.status === 'active' ? 'success' : 
                        review.status === 'flagged' ? 'warning' : 'danger'
                      }`}>
                        {review.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {review.status !== 'active' && (
                          <button className="btn btn-success btn-sm" onClick={() => handleModerate(review.id, 'approve')} disabled={actionLoading === review.id}>
                            Approve
                          </button>
                        )}
                        {review.status !== 'flagged' && (
                          <button className="btn btn-warning btn-sm" onClick={() => handleModerate(review.id, 'flag')} disabled={actionLoading === review.id}>
                            Flag
                          </button>
                        )}
                        {review.status !== 'removed' && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleModerate(review.id, 'remove')} disabled={actionLoading === review.id}>
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {data.reviews.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-xl)' }}>
                      No reviews found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="sa-pagination">
            <button className="btn btn-secondary btn-sm" disabled={data.page === 1}
              onClick={() => setData(p => ({ ...p, page: p.page - 1 }))}>← Prev</button>
            <span>Page {data.page} of {Math.ceil(data.total / data.page_size) || 1}</span>
            <button className="btn btn-secondary btn-sm" disabled={data.page * data.page_size >= data.total}
              onClick={() => setData(p => ({ ...p, page: p.page + 1 }))}>Next →</button>
          </div>
        </>
      )}
    </SubAdminSidebarLayout>
  );
}
