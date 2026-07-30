import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import '../RoleDashboard.css';

export default function CourseCatalog() {
  const [data, setData] = useState({ courses: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    setLoading(true);
    const params = { page, page_size: pageSize };
    if (statusFilter) params.status = statusFilter;

    api.get('/coordinator/courses', { params })
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.detail || 'Failed to load courses'))
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  const totalPages = Math.ceil(data.total / pageSize);

  const getStatusBadge = (status) => {
    const map = {
      published: 'success',
      pending_review: 'warning',
      rejected: 'danger',
      flagged: 'danger',
      draft: 'secondary'
    };
    return <span className={`badge badge-${map[status] || 'primary'}`}>{status}</span>;
  };

  return (
    <div className="page-wrapper container animate-fade-in">
      <div className="section-header flex-between">
        <div>
          <h2>📚 Course Catalog</h2>
          <p>Read-only view of all platform courses.</p>
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
          <option value="published">Published</option>
          <option value="pending_review">Pending Review</option>
          <option value="draft">Draft</option>
          <option value="rejected">Rejected</option>
          <option value="flagged">Flagged</option>
        </select>
      </div>

      {error ? (
        <div className="alert alert-error">⚠️ {error}</div>
      ) : loading ? (
        <LoadingSpinner />
      ) : data.courses.length === 0 ? (
        <div className="empty-state">
          <h3>No courses found</h3>
          <p>Try adjusting your filters.</p>
        </div>
      ) : (
        <>
          <div className="table-wrapper box-glow">
            <table>
              <thead>
                <tr>
                  <th>Course Title</th>
                  <th>Instructor</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Rating</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {data.courses.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.title}</strong></td>
                    <td>{c.instructor?.name || 'Unknown'}</td>
                    <td>{c.category}</td>
                    <td>{getStatusBadge(c.status)}</td>
                    <td>{c.avg_rating > 0 ? `⭐ ${c.avg_rating.toFixed(1)}` : 'N/A'}</td>
                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
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
