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

  useEffect(() => {
    api.get(`/instructor/courses/${courseId}/students`)
      .then((res) => setData(res.data))
      .catch((err) =>
        setError(err.response?.data?.detail || 'Failed to load student data')
      )
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) return <div className="page-wrapper"><LoadingSpinner /></div>;

  return (
    <div className="page-wrapper container animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="section-header flex-between">
        <div>
          <h2>👥 Students & Progress</h2>
          {data && (
            <p>
              <strong>{data.course_title}</strong> &nbsp;·&nbsp;
              {data.students.length} enrolled &nbsp;·&nbsp;
              {data.total_lessons} lesson{data.total_lessons !== 1 ? 's' : ''}
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
      {!error && data?.students.length === 0 && (
        <div className="empty-state sp-empty">
          <div className="empty-icon">🎓</div>
          <h3>No students enrolled yet</h3>
          <p>Learners will appear here once they enrol in this course.</p>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────── */}
      {data?.students.length > 0 && (
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
              {data.students.map((s, idx) => (
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
                    <span className="sp-email">{s.email}</span>
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
    </div>
  );
}
