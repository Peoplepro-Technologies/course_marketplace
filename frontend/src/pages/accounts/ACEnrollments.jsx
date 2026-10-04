import { useState, useEffect } from 'react';
import api from '../../api/axios';
import AccountsSidebarLayout from './AccountsSidebarLayout';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function ACEnrollments() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = () => {
    setLoading(true);
    api.get('/accounts/enrollments/pending')
      .then(res => setEnrollments(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this enrollment?')) return;
    try {
      await api.put(`/accounts/enrollments/${id}/approve`);
      setEnrollments(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      alert('Failed to approve');
      console.error(err);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Reject this enrollment?')) return;
    try {
      await api.put(`/accounts/enrollments/${id}/reject`);
      setEnrollments(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      alert('Failed to reject');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <AccountsSidebarLayout>
        <LoadingSpinner />
      </AccountsSidebarLayout>
    );
  }

  return (
    <AccountsSidebarLayout>
      <header className="dashboard-header">
        <h2>Enrollment Approvals</h2>
        <p>Review and approve pending student enrollments.</p>
      </header>

      <div className="card-glass">
        {enrollments.length === 0 ? (
          <p className="text-muted" style={{ padding: '2rem', textAlign: 'center' }}>
            No pending enrollments.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Price</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map(e => (
                  <tr key={e.id}>
                    <td>{new Date(e.enrolled_at).toLocaleDateString()}</td>
                    <td>
                      <div><strong>{e.learner_name}</strong></div>
                      <div className="text-muted" style={{ fontSize: '0.85rem' }}>{e.learner_email}</div>
                    </td>
                    <td>{e.course_title}</td>
                    <td>₹{e.course_price}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-success btn-sm" onClick={() => handleApprove(e.id)}>Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleReject(e.id)}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AccountsSidebarLayout>
  );
}
