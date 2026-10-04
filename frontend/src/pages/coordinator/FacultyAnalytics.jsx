/**
 * FacultyAnalytics.jsx — Coordinator view of all instructors' assignment & quiz completion.
 *
 * Groups data by Instructor → Course → Assignment/Quiz table.
 * Completion rate badge: green >75%, amber 40-75%, red <40%.
 */

import { useState, useEffect } from 'react';
import api from '../../api/axios';
import CoordinatorSidebarLayout from './CoordinatorSidebarLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import './FacultyAnalytics.css';

function CompletionBadge({ submitted, total, type = 'submitted' }) {
  if (total === 0) return <span className="fa-badge fa-badge--grey">No students</span>;
  const pct = Math.min(100, Math.round((submitted / total) * 100));
  const level = pct >= 75 ? 'green' : pct >= 40 ? 'amber' : 'red';
  return (
    <span className={`fa-badge fa-badge--${level}`}>
      {submitted}/{total} {type} — {pct}%
    </span>
  );
}

function EmptyState({ message }) {
  return (
    <div className="fa-empty">
      <span className="fa-empty-icon">📭</span>
      <p>{message}</p>
    </div>
  );
}

function CourseSection({ course }) {
  const hasAssignments = course.assignments && course.assignments.length > 0;
  const hasQuizzes = course.quizzes && course.quizzes.length > 0;

  if (!hasAssignments && !hasQuizzes) {
    return (
      <div className="fa-course">
        <div className="fa-course-header">
          <span className="fa-course-icon">📚</span>
          <h4>{course.course_title}</h4>
        </div>
        <EmptyState message="No assignments or quizzes in this course yet." />
      </div>
    );
  }

  return (
    <div className="fa-course">
      <div className="fa-course-header">
        <span className="fa-course-icon">📚</span>
        <h4>{course.course_title}</h4>
      </div>

      {hasAssignments && (
        <div className="fa-table-section">
          <h5 className="fa-table-heading">
            <span className="fa-table-icon">📝</span> Assignments
          </h5>
          <table className="fa-table">
            <thead>
              <tr>
                <th>Assignment</th>
                <th>Enrolled</th>
                <th>Submitted</th>
                <th>Completion</th>
              </tr>
            </thead>
            <tbody>
              {course.assignments.map((a, i) => (
                <tr key={i}>
                  <td className="fa-item-title">{a.title}</td>
                  <td>{a.total_enrolled}</td>
                  <td>{a.submitted}</td>
                  <td>
                    <CompletionBadge submitted={a.submitted} total={a.total_enrolled} type="submitted" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasQuizzes && (
        <div className="fa-table-section">
          <h5 className="fa-table-heading">
            <span className="fa-table-icon">❓</span> Quizzes
          </h5>
          <table className="fa-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Enrolled</th>
                <th>Attempted</th>
                <th>Completion</th>
              </tr>
            </thead>
            <tbody>
              {course.quizzes.map((q, i) => (
                <tr key={i}>
                  <td className="fa-item-title">{q.title}</td>
                  <td>{q.total_enrolled}</td>
                  <td>{q.attempted}</td>
                  <td>
                    <CompletionBadge submitted={q.attempted} total={q.total_enrolled} type="attempted" />
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

export default function FacultyAnalytics() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/coordinator/faculty-assignments-quizzes')
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.detail || 'Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = data.filter(inst =>
    inst.instructor_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <CoordinatorSidebarLayout>
      <div className="fa-page animate-fade-in">
        {/* Header */}
        <div className="fa-page-header">
          <div className="fa-page-title">
            <h1>Faculty Assignments &amp; Quizzes</h1>
            <p>Completion analytics grouped by instructor and course</p>
          </div>
          <div className="fa-legend">
            <span className="fa-badge fa-badge--green">≥75% — On Track</span>
            <span className="fa-badge fa-badge--amber">40–74% — Needs Attention</span>
            <span className="fa-badge fa-badge--red">&lt;40% — At Risk</span>
          </div>
        </div>

        {/* Search */}
        <div className="fa-search-bar">
          <span className="fa-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by instructor name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="fa-search-input"
            id="faculty-analytics-search"
          />
          {search && (
            <button className="fa-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="fa-loading"><LoadingSpinner /></div>
        ) : error ? (
          <div className="fa-error">⚠️ {error}</div>
        ) : filtered.length === 0 ? (
          <EmptyState message={search ? `No instructors matching "${search}".` : 'No instructors with assignments or quizzes yet.'} />
        ) : (
          <div className="fa-instructors">
            {filtered.map((inst, idx) => (
              <div key={idx} className="fa-instructor-block animate-fade-in-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="fa-instructor-header">
                  <div className="fa-instructor-avatar">
                    {inst.instructor_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="fa-instructor-info">
                    <h2>{inst.instructor_name}</h2>
                    <span className="fa-course-count">{inst.courses.length} course{inst.courses.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="fa-courses">
                  {inst.courses.map((course, ci) => (
                    <CourseSection key={ci} course={course} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CoordinatorSidebarLayout>
  );
}
