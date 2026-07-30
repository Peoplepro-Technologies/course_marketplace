import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import '../RoleDashboard.css';

export default function CourseApprovals() {
  const [data, setData] = useState({ courses: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for rejection workflow
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const fetchPending = () => {
    setLoading(true);
    api.get('/coordinator/courses/pending')
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.detail || 'Failed to load courses'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = (id) => {
    if (!window.confirm('Approve this course and publish it?')) return;
    setProcessingId(id);
    api.put(`/coordinator/courses/${id}/approve`)
      .then(() => fetchPending())
      .catch(err => alert(err.response?.data?.detail || 'Failed to approve'))
      .finally(() => setProcessingId(null));
  };

  const handleRejectSubmit = (id) => {
    if (!rejectReason.trim()) return alert('Reason is required');
    setProcessingId(id);
    api.put(`/coordinator/courses/${id}/reject`, { reason: rejectReason })
      .then(() => {
        setRejectId(null);
        setRejectReason('');
        fetchPending();
      })
      .catch(err => alert(err.response?.data?.detail || 'Failed to reject'))
      .finally(() => setProcessingId(null));
  };

  if (loading) return <div className="page-wrapper"><LoadingSpinner /></div>;

  return (
    <div className="page-wrapper container animate-fade-in">
      <div className="section-header flex-between">
        <div>
          <h2>✅ Course Approvals</h2>
          <p>Review and approve newly submitted courses.</p>
        </div>
        <Link to="/coordinator" className="btn btn-secondary">← Dashboard</Link>
      </div>

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      {!error && data.courses.length === 0 && (
        <div className="empty-state">
          <h3>No pending approvals</h3>
          <p>All courses have been reviewed.</p>
        </div>
      )}

      {data.courses.length > 0 && (
        <div className="table-wrapper box-glow">
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Instructor</th>
                <th>Category</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.courses.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.title}</strong></td>
                  <td>{c.instructor?.name || 'Unknown'}</td>
                  <td>{c.category}</td>
                  <td>{new Date(c.created_at).toLocaleDateString()}</td>
                  <td>
                    {rejectId === c.id ? (
                      <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                        <textarea 
                          className="form-control" 
                          placeholder="Reason for rejection..." 
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          rows={2}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-danger btn-sm" 
                            onClick={() => handleRejectSubmit(c.id)}
                            disabled={processingId === c.id}
                          >Confirm Reject</button>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            onClick={() => { setRejectId(null); setRejectReason(''); }}
                            disabled={processingId === c.id}
                          >Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-success btn-sm" 
                          onClick={() => handleApprove(c.id)}
                          disabled={processingId === c.id}
                        >Approve</button>
                        <button 
                          className="btn btn-danger btn-sm" 
                          onClick={() => setRejectId(c.id)}
                          disabled={processingId === c.id}
                        >Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
