/**
 * StudentsProgress.jsx — Instructor view of enrolled students and their progress.
 *
 * Route: /instructor/course/:courseId/students
 * Shows: learner name, email, enrolled date, progress bar, lesson count.
 * Read-only — no DB schema changes required.
 */

import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import './StudentsProgress.css';

function ProgressBar({ pct }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const colorClass =
    clamped === 100 ? 'sp-bar-fill--complete' :
    clamped >= 50  ? 'sp-bar-fill--half' : '';

  return (
    <div className="sp-bar-wrap" title={`${clamped}% complete`}>
      <div
        className={`sp-bar-fill ${colorClass}`}
        style={{ width: `${clamped}%` }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

export default function StudentsProgress() {
  const { courseId } = useParams();
  const [data, setData]     = useState(null);   // { course_title, total_lessons, students[] }
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [activeTab, setActiveTab] = useState('enrolled');

  const fetchStudents = () => {
    setLoading(true);
    const endpoint = courseId 
      ? `/instructor/courses/${courseId}/students`
      : `/instructor/students`;

    api.get(endpoint)
      .then((res) => setData(res.data))
      .catch((err) =>
        setError(err.response?.data?.detail || 'Failed to load student data')
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStudents();
  }, [courseId]);

  const handleApprove = async (enrollmentId) => {
    if (!window.confirm('Approve this enrollment?')) return;
    try {
      await api.put(`/instructor/enrollments/${enrollmentId}/approve`);
      fetchStudents();
    } catch (err) {
      alert('Failed to approve');
    }
  };

  const handleReject = async (enrollmentId) => {
    if (!window.confirm('Reject this enrollment?')) return;
    try {
      await api.put(`/instructor/enrollments/${enrollmentId}/reject`);
      fetchStudents();
    } catch (err) {
      alert('Failed to reject');
    }
  };

  const approvedStudents = data?.students?.filter(s => s.status !== 'pending' && s.status !== 'rejected') || [];
  const pendingStudents = data?.students?.filter(s => s.status === 'pending') || [];

  if (loading) return <div className="page-wrapper"><LoadingSpinner /></div>;

  return (
    <div className="page-wrapper container animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="section-header flex-between">
        <div>
          <h2>👥 Students & Progress</h2>
          {data && (
            <p>
              {data.course_title !== "All Courses" && (
                <>
                  <strong>{data.course_title}</strong> &nbsp;·&nbsp;
                  {data.total_lessons} lesson{data.total_lessons !== 1 ? 's' : ''} &nbsp;·&nbsp;
                </>
              )}
              {data.students.length} enrolled
            </p>
          )}
        </div>
        <Link to="/instructor" className="btn btn-secondary">
          ← Dashboard
        </Link>
      </div>

      {/* ── Error ──────────────────────────────────────────────────── */}
      {error && (
        <div className="sp-alert sp-alert-error">⚠️ {error}</div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {!error && activeTab === 'enrolled' && approvedStudents.length === 0 && (
        <div className="empty-state sp-empty">
          <div className="empty-icon">🎓</div>
          <h3>No students enrolled yet</h3>
          <p>Approved learners will appear here once they enrol in this course.</p>
        </div>
      )}
      
      {!error && activeTab === 'pending' && pendingStudents.length === 0 && (
        <div className="empty-state sp-empty">
          <div className="empty-icon">⏳</div>
          <h3>No pending enrollments</h3>
          <p>You have no new enrollment requests to review.</p>
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
        <button
          onClick={() => setActiveTab('enrolled')}
          style={{ background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: activeTab === 'enrolled' ? 600 : 400, color: activeTab === 'enrolled' ? 'var(--color-primary)' : 'var(--color-text-muted)', borderBottom: activeTab === 'enrolled' ? '2px solid var(--color-primary)' : 'none' }}
        >
          Enrolled ({approvedStudents.length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          style={{ background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: activeTab === 'pending' ? 600 : 400, color: activeTab === 'pending' ? 'var(--color-primary)' : 'var(--color-text-muted)', borderBottom: activeTab === 'pending' ? '2px solid var(--color-primary)' : 'none' }}
        >
          Pending Enrollments {pendingStudents.length > 0 && <span className="badge badge-warning" style={{ marginLeft: '6px' }}>{pendingStudents.length}</span>}
        </button>
      </div>

      {/* ── Table (Enrolled) ────────────────────────────────────────── */}
      {activeTab === 'enrolled' && approvedStudents.length > 0 && (
        <div className="table-wrapper box-glow">
          <table>
            <thead>
              <tr>
                <th>Learner</th>
                <th>Email</th>
                <th>Enrolled</th>
                <th>Progress</th>
                <th style={{ textAlign: 'right' }}>Lessons</th>
              </tr>
            </thead>
            <tbody>
              {approvedStudents.map((s, idx) => (
                <tr key={s.learner_id} className="animate-fade-in-up" style={{ animationDelay: `${idx * 0.03}s` }}>
                  {/* ── Learner ── */}
                  <td>
                    <div className="sp-learner-row">
                      <div className="sp-avatar">
                        {s.learner_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <span className="sp-learner-name">{s.learner_name}</span>
                    </div>
                  </td>

                  {/* ── Email ── */}
                  <td>
                    <span className="sp-email" style={{ display: 'block' }}>{s.email}</span>
                    {!courseId && s.course_title && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '4px', display: 'block' }}>
                        {s.course_title}
                      </span>
                    )}
                  </td>

                  {/* ── Enrolled date ── */}
                  <td>
                    <span className="sp-date">
                      {new Date(s.enrolled_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </td>

                  {/* ── Progress bar + pct ── */}
                  <td style={{ minWidth: '160px' }}>
                    <div className="sp-progress-col">
                      <ProgressBar pct={s.completion_pct} />
                      <span className={`sp-pct ${s.completion_pct === 100 ? 'sp-pct--done' : ''}`}>
                        {s.completion_pct}%
                      </span>
                    </div>
                  </td>

                  {/* ── Lesson count ── */}
                  <td style={{ textAlign: 'right' }}>
                    <span className="sp-lesson-count">
                      {s.completed_lessons}
                      <span className="sp-lesson-total"> / {s.total_lessons}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Table (Pending) ─────────────────────────────────────────── */}
      {activeTab === 'pending' && pendingStudents.length > 0 && (
        <div className="table-wrapper box-glow">
          <table>
            <thead>
              <tr>
                <th>Learner</th>
                <th>Email</th>
                <th>Course</th>
                <th>Requested On</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingStudents.map((s, idx) => (
                <tr key={s.enrollment_id} className="animate-fade-in-up" style={{ animationDelay: `${idx * 0.03}s` }}>
                  <td>
                    <div className="sp-learner-row">
                      <div className="sp-avatar">
                        {s.learner_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <span className="sp-learner-name">{s.learner_name}</span>
                    </div>
                  </td>
                  <td>{s.email}</td>
                  <td>{s.course_title}</td>
                  <td>
                    <span className="sp-date">
                      {new Date(s.enrolled_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button className="btn btn-success btn-sm" onClick={() => handleApprove(s.enrollment_id)}>Approve</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleReject(s.enrollment_id)}>Reject</button>
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
