import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import '../RoleDashboard.css';

export default function Reports() {
  const [data, setData] = useState({ reports: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    setLoading(true);
    api.get('/coordinator/reports', { params: { page, page_size: pageSize } })
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.detail || 'Failed to load reports'))
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(data.total / pageSize);

  return (
    <div className="page-wrapper container animate-fade-in">
      <div className="section-header flex-between">
        <div>
          <h2>📈 Course Reports</h2>
          <p>Aggregated performance metrics for all courses.</p>
        </div>
        <Link to="/coordinator" className="btn btn-secondary">← Dashboard</Link>
      </div>

      {error ? (
        <div className="alert alert-error">⚠️ {error}</div>
      ) : loading ? (
        <LoadingSpinner />
      ) : data.reports.length === 0 ? (
        <div className="empty-state">
          <h3>No data available</h3>
          <p>No courses found to report on.</p>
        </div>
      ) : (
        <>
          <div className="table-wrapper box-glow">
            <table>
              <thead>
                <tr>
                  <th>Course Title</th>
                  <th>Instructor</th>
                  <th>Enrollments</th>
                  <th>Avg Rating</th>
                  <th>Completion Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.reports.map((r) => (
                  <tr key={r.course_id}>
                    <td>
                      <strong>{r.title}</strong><br/>
                      <small style={{color: '#666'}}>{r.course_id}</small>
                    </td>
                    <td>{r.instructor_name}</td>
                    <td>{r.enrollments_count.toLocaleString()}</td>
                    <td>{r.avg_rating > 0 ? `⭐ ${r.avg_rating.toFixed(1)}` : 'N/A'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ flex: 1, background: '#eee', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: `${r.completion_rate}%`, 
                              height: '100%', 
                              background: r.completion_rate >= 80 ? 'var(--color-success)' : r.completion_rate >= 50 ? 'var(--color-warning)' : 'var(--color-primary)'
                            }} 
                          />
                        </div>
                        <span style={{ fontSize: '0.85rem', width: '40px', textAlign: 'right' }}>
                          {r.completion_rate.toFixed(0)}%
                        </span>
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
