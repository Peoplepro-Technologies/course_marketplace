/**
 * InstructorAnalytics.jsx — Instructor's own assignment & quiz completion view.
 *
 * Grouped by course, shows each assignment and quiz question with
 * enrolled vs. submitted/attempted count + color-coded completion badge.
 */

import { useState, useEffect } from 'react';
import api from '../../api/axios';
import InstructorSidebarLayout from './InstructorSidebarLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import './InstructorAnalytics.css';

function CompletionBadge({ submitted, total, type = 'submitted' }) {
  if (total === 0) return <span className="ia-badge ia-badge--grey">No students</span>;
  const pct = Math.min(100, Math.round((submitted / total) * 100));
  const level = pct >= 75 ? 'green' : pct >= 40 ? 'amber' : 'red';
  return (
    <span className={`ia-badge ia-badge--${level}`}>
      {submitted}/{total} {type} — {pct}%
    </span>
  );
}

function EmptyState({ message }) {
  return (
    <div className="ia-empty">
      <span className="ia-empty-icon">📭</span>
      <p>{message}</p>
    </div>
  );
}

function CourseCard({ course }) {
  const hasAssignments = course.assignments && course.assignments.length > 0;
  const hasQuizzes = course.quizzes && course.quizzes.length > 0;

  return (
    <div className="ia-course-card">
      <div className="ia-course-card-header">
        <span className="ia-course-icon">📚</span>
        <h3>{course.course_title}</h3>
      </div>

      {!hasAssignments && !hasQuizzes ? (
        <EmptyState message="No assignments or quizzes in this course yet." />
      ) : (
        <>
          {hasAssignments && (
            <div className="ia-section">
              <h4 className="ia-section-heading">
                <span>📝</span> Assignments
              </h4>
              <table className="ia-table">
                <thead>
                  <tr>
                    <th>Assignment</th>
                    <th>Enrolled</th>
                    <th>Submitted</th>
                    <th>Completion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {course.assignments.map((a, i) => (
                    <tr key={i}>
                      <td className="ia-item-title">{a.title}</td>
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
            <div className="ia-section">
              <h4 className="ia-section-heading">
                <span>❓</span> Quiz Questions
              </h4>
              <table className="ia-table">
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Enrolled</th>
                    <th>Attempted</th>
                    <th>Completion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {course.quizzes.map((q, i) => (
                    <tr key={i}>
                      <td className="ia-item-title">{q.title}</td>
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
        </>
      )}
    </div>
  );
}

export default function InstructorAnalytics() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/instructor/my-assignments-quizzes')
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.detail || 'Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <InstructorSidebarLayout>
      <div className="ia-page animate-fade-in">
        {/* Header */}
        <div className="ia-page-header">
          <div>
            <h1>Assignments &amp; Quiz Analytics</h1>
            <p>Track student submission and quiz completion across your courses</p>
          </div>
          <div className="ia-legend">
            <span className="ia-badge ia-badge--green">≥75% — On Track</span>
            <span className="ia-badge ia-badge--amber">40–74% — Needs Attention</span>
            <span className="ia-badge ia-badge--red">&lt;40% — At Risk</span>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="ia-loading"><LoadingSpinner /></div>
        ) : error ? (
          <div className="ia-error">⚠️ {error}</div>
        ) : data.length === 0 ? (
          <EmptyState message="You don't have any courses with assignments or quizzes yet." />
        ) : (
          <div className="ia-courses">
            {data.map((course, idx) => (
              <CourseCard
                key={idx}
                course={course}
              />
            ))}
          </div>
        )}
      </div>
    </InstructorSidebarLayout>
  );
}
