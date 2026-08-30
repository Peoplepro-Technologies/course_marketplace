import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import '../RoleDashboard.css';

export default function InstructorRoster() {
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/coordinator/instructors')
      .then(res => setInstructors(res.data))
      .catch(err => setError(err.response?.data?.detail || 'Failed to load instructors'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-wrapper"><LoadingSpinner /></div>;

  return (
    <div className="page-wrapper container animate-fade-in">
      <div className="section-header flex-between">
        <div>
          <h2>👨‍🏫 Instructor Roster</h2>
          <p>Monitor instructor performance and course statuses.</p>
        </div>
        <Link to="/coordinator" className="btn btn-secondary">
          ← Coordinator Dashboard
        </Link>
      </div>

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      {!error && instructors.length === 0 && (
        <div className="empty-state">
          <h3>No instructors found</h3>
          <p>There are currently no users with the instructor role.</p>
        </div>
      )}

      {instructors.length > 0 && (
        <div className="table-wrapper box-glow">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th style={{ textAlign: 'center' }}>Total Courses</th>
                <th style={{ textAlign: 'center' }}>Published</th>
                <th style={{ textAlign: 'center' }}>Pending</th>
                <th style={{ textAlign: 'center' }}>Avg Rating</th>
              </tr>
            </thead>
            <tbody>
              {instructors.map((inst, idx) => (
                <tr key={inst.id} className="animate-fade-in-up" style={{ animationDelay: `${idx * 0.03}s` }}>
                  <td><strong>{inst.name}</strong></td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{inst.email}</td>
                  <td style={{ textAlign: 'center' }}>{inst.total_courses}</td>
                  <td style={{ textAlign: 'center', color: inst.published_count > 0 ? '#00A65A' : 'inherit' }}>
                    {inst.published_count}
                  </td>
                  <td style={{ textAlign: 'center', color: inst.pending_review_count > 0 ? '#F5A623' : 'inherit' }}>
                    {inst.pending_review_count}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {inst.avg_rating > 0 ? `⭐ ${inst.avg_rating}` : '—'}
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
