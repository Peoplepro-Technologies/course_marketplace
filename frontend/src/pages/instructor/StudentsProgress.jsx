/**
 * StudentsProgress.jsx — Instructor view of enrolled students and their progress.
 *
 * Two modes:
 *  1. /instructor/students           → no courseId → show a course picker
 *  2. /instructor/course/:courseId/students → show students for that course
 *
 * Shows: learner name, email, enrolled date, progress bar, lesson count.
 * Read-only — no DB schema changes required.
 */

import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { Users, GraduationCap, AlertTriangle, BookOpen, ChevronRight } from 'lucide-react';
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

// ── Course picker (no courseId in URL) ──────────────────────────────────────
function CoursePicker() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/instructor/courses')
      .then((res) => setCourses(res.data || []))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load courses'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-wrapper"><LoadingSpinner /></div>;

  return (
    <div className="page-wrapper">
      <div className="section-header">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={24} /> Students &amp; Progress
          </h2>
          <p>Select a course to view its enrolled students.</p>
        </div>
      </div>

      {error && (
        <div className="sp-alert sp-alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {!error && courses.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          message="Create a course first to view student progress."
        />
      )}

      {courses.length > 0 && (
        <div className="sp-course-picker">
          {courses.map((course, idx) => (
            <button
              key={course.id}
              className="sp-course-card animate-fade-in-up"
              style={{ animationDelay: `${idx * 0.04}s` }}
              onClick={() => navigate(`/instructor/course/${course.id}/students`)}
              id={`sp-course-${course.id}`}
            >
              <div className="sp-course-icon">
                <BookOpen size={22} />
              </div>
              <div className="sp-course-info">
                <span className="sp-course-title">{course.title}</span>
                <span className="sp-course-status">{course.status || 'draft'}</span>
              </div>
              <ChevronRight size={18} className="sp-course-arrow" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function StudentsProgress() {
  const { courseId } = useParams();

  // No courseId → show course picker instead of crashing
  if (!courseId) return <CoursePicker />;

  return <StudentsTable courseId={courseId} />;
}

// ── Per-course student table ─────────────────────────────────────────────────
function StudentsTable({ courseId }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get(`/instructor/courses/${courseId}/students`)
      .then((res) => setData(res.data))
      .catch((err) =>
        setError(err.response?.data?.detail || 'Failed to load student data')
      )
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) return <div className="page-wrapper"><LoadingSpinner /></div>;

  return (
    <div className="page-wrapper">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="section-header flex-between">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={24} /> Students &amp; Progress
          </h2>
          {data && (
            <p>
              <strong>{data.course_title}</strong> &nbsp;·&nbsp;
              {data.students.length} enrolled &nbsp;·&nbsp;
              {data.total_lessons} lesson{data.total_lessons !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Link to="/instructor/students" className="btn btn-secondary">
          ← All Courses
        </Link>
      </div>

      {/* ── Error ──────────────────────────────────────────────────── */}
      {error && (
        <div className="sp-alert sp-alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {!error && data?.students.length === 0 && (
        <EmptyState 
          icon={GraduationCap}
          title="No students enrolled yet"
          message="Learners will appear here once they enrol in this course."
        />
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
