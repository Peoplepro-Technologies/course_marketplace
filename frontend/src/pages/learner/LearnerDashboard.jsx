/**
 * LearnerDashboard.jsx — Dashboard for external learners.
 *
 * Shows:
 *   - Enrolled courses with progress bars
 *   - Link to resume learning (LessonViewer)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import ProgressBar from '../../components/ProgressBar';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function LearnerDashboard() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/learner/courses')
      .then((res) => setEnrollments(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-wrapper"><LoadingSpinner /></div>;

  return (
    <div className="page-wrapper container">
      <div className="section-header">
        <h2>My Learning</h2>
        <p>Pick up where you left off</p>
      </div>

      {enrollments.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon">🎒</div>
          <h3>You aren't enrolled in any courses</h3>
          <p style={{ marginBottom: '1.5rem' }}>Start exploring the catalog to find your next course.</p>
          <Link to="/" className="btn btn-primary">Browse Catalog</Link>
        </div>
      ) : (
        <div className="grid grid-3">
          {enrollments.map((enrollment) => (
            <div key={enrollment.enrollment_id} className="card flex-col gap-sm" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ height: '140px', background: 'var(--color-bg-tertiary)', position: 'relative' }}>
                {enrollment.course_thumbnail ? (
                  <img src={enrollment.course_thumbnail} alt={enrollment.course_title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div className="flex-center" style={{ width: '100%', height: '100%', fontSize: '2rem' }}>📚</div>
                )}
                <div style={{ position: 'absolute', bottom: '0.5rem', left: '0.5rem', background: 'rgba(0,0,0,0.6)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                  {enrollment.course_category}
                </div>
              </div>
              <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ fontSize: 'var(--text-base)', lineHeight: 1.4, margin: 0 }}>
                  {enrollment.course_title}
                </h4>
                <div style={{ flex: 1 }}>
                  <ProgressBar percent={enrollment.progress_percent} label={`${enrollment.completed_lessons} / ${enrollment.total_lessons} lessons`} />
                </div>
                <div className="flex-between" style={{ marginTop: 'auto' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    Enrolled {new Date(enrollment.enrolled_at).toLocaleDateString()}
                  </span>
                  <Link to={`/learner/course/${enrollment.course_id}/learn`} className="btn btn-primary btn-sm">
                    {enrollment.progress_percent === 0 ? 'Start' : 'Resume'}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
