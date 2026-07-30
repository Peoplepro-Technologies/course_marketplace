import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import '../RoleDashboard.css';

export default function QualityReviews() {
  const [data, setData] = useState({ reviews: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    fetchReviews();
  }, [page, statusFilter]);

  const fetchReviews = () => {
    setLoading(true);
    const params = { page, page_size: pageSize };
    if (statusFilter) params.status = statusFilter;

    api.get('/coordinator/reviews', { params })
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.detail || 'Failed to load reviews'))
      .finally(() => setLoading(false));
  };

  const handleModerate = (reviewId, action) => {
    api.put(`/coordinator/reviews/${reviewId}/moderate`, { action })
      .then(() => fetchReviews())
      .catch(err => alert(err.response?.data?.detail || `Failed to ${action} review`));
  };

  const totalPages = Math.ceil(data.total / pageSize);

  const getStatusBadge = (status) => {
    const map = {
      active: 'success',
      flagged: 'warning',
      removed: 'danger'
    };
    return <span className={`badge badge-${map[status] || 'primary'}`}>{status}</span>;
  };

  return (
    <div className="page-wrapper container animate-fade-in">
      <div className="section-header flex-between">
        <div>
          <h2>⭐ Quality & Reviews</h2>
          <p>Monitor and moderate learner reviews across the platform.</p>
        </div>
        <Link to="/coordinator" className="btn btn-secondary">← Dashboard</Link>
      </div>

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <label><strong>Filter by Status:</strong></label>
        <select 
          className="form-control" 
          value={statusFilter} 
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ width: '200px' }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="flagged">Flagged</option>
          <option value="removed">Removed</option>
        </select>
      </div>

      {error ? (
        <div className="alert alert-error">⚠️ {error}</div>
      ) : loading ? (
        <LoadingSpinner />
      ) : data.reviews.length === 0 ? (
        <div className="empty-state">
          <h3>No reviews found</h3>
          <p>Try adjusting your filters.</p>
        </div>
      ) : (
        <>
          <div className="table-wrapper box-glow">
            <table>
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Learner</th>
                  <th>Rating</th>
                  <th>Comment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.reviews.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.course_title || 'Unknown Course'}</strong><br/>
                      <small style={{color: '#666'}}>{r.course_id}</small>
                    </td>
                    <td>{r.learner_name || 'Anonymous'}</td>
                    <td>{'⭐'.repeat(r.rating)}</td>
                    <td>{r.comment ? `"${r.comment}"` : <span style={{ color: '#888' }}>No comment</span>}</td>
                    <td>{getStatusBadge(r.status)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {r.status !== 'active' && (
                          <button 
                            className="btn btn-success btn-sm"
                            onClick={() => handleModerate(r.id, 'approve')}
                          >
                            Approve
                          </button>
                        )}
                        {r.status !== 'flagged' && (
                          <button 
                            className="btn btn-warning btn-sm"
                            onClick={() => handleModerate(r.id, 'flag')}
                          >
                            Flag
                          </button>
                        )}
                        {r.status !== 'removed' && (
                          <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => handleModerate(r.id, 'remove')}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination" style={{ marginTop: '1.5rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ← Prev
              </button>
              <span className="page-info">Page {page} of {totalPages}</span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
