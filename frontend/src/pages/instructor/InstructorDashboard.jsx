/**
 * InstructorDashboard.jsx — Dashboard for external instructors.
 *
 * Shows:
 *   - List of own courses
 *   - Status of courses (Draft, Published, etc.)
 *   - Button to create a new course
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function InstructorDashboard() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchCourses = () => {
    setLoading(true);
    api.get('/instructor/courses')
      .then((res) => setCourses(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const deleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    try {
      await api.delete(`/instructor/courses/${courseId}`);
      fetchCourses();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete course');
    }
  };

  const togglePublish = async (courseId) => {
    try {
      await api.put(`/instructor/courses/${courseId}/publish`);
      fetchCourses();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update course status');
    }
  };

  if (loading) return <div className="page-wrapper"><LoadingSpinner /></div>;

  return (
    <div className="page-wrapper container">
      <div className="section-header flex-between">
        <div>
          <h2>Instructor Dashboard</h2>
          <p>Manage your courses</p>
        </div>
        <div className="flex" style={{ gap: '0.75rem' }}>
          <Link to="/instructor/earnings" className="btn btn-secondary">
            💰 Earnings
          </Link>
          <Link to="/instructor/reviews" className="btn btn-secondary">
            📬 Review Inbox
          </Link>
          <Link to="/instructor/course/new" className="btn btn-primary">
            + Create New Course
          </Link>
        </div>
      </div>

      <div className="table-wrapper box-glow">
        <table>
          <thead>
            <tr>
              <th>Course Title</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-state" style={{ padding: '2rem' }}>
                  You haven't created any courses yet.
                </td>
              </tr>
            ) : (
              courses.map(course => (
                <tr key={course.id}>
                  <td>
                    <strong>{course.title}</strong>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {new Date(course.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td>{course.category}</td>
                  <td>{(course.price > 0) ? `₹${Number(course.price).toFixed(2)}` : 'Free'}</td>
                  <td>
                    <span className={`badge badge-${
                      course.status === 'published' ? 'success' : 
                      course.status === 'rejected' ? 'danger' : 
                      course.status === 'pending_review' ? 'primary' : 'warning'
                    }`}>
                      {course.status.replace('_', ' ')}
                    </span>
                    {course.status === 'rejected' && course.rejection_reason && (
                      <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--color-danger)' }}>
                        Reason: {course.rejection_reason}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex" style={{ gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <Link to={`/instructor/course/${course.id}/edit`} className="btn btn-secondary btn-sm">
                        Edit Info
                      </Link>
                      <Link to={`/instructor/course/${course.id}/curriculum`} className="btn btn-secondary btn-sm">
                        Curriculum
                      </Link>
                      <Link to={`/instructor/course/${course.id}/students`} className="btn btn-secondary btn-sm">
                        👥 Students
                      </Link>
                      {course.status === 'pending_review' ? (
                        <button className="btn btn-secondary btn-sm" disabled>
                          Pending
                        </button>
                      ) : (
                        <button 
                          className={`btn ${course.status === 'published' ? 'btn-warning' : 'btn-success'} btn-sm`}
                          onClick={() => togglePublish(course.id)}
                        >
                          {course.status === 'published' ? 'Unpublish' : 
                           course.status === 'rejected' ? 'Resubmit for Review' : 
                           'Submit for Review'}
                        </button>
                      )}
                      {course.status !== 'published' && course.status !== 'pending_review' && (
                        <button className="btn btn-danger btn-sm" onClick={() => deleteCourse(course.id)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
