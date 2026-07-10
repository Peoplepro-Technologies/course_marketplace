/**
 * CourseModeration.jsx — Admin tool to approve, flag, or remove courses.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function CourseModeration() {
  const [data, setData] = useState({ courses: [], total: 0, page: 1, page_size: 20 });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCourses = () => {
    setLoading(true);
    const params = { page: data.page, page_size: data.page_size };
    if (statusFilter) params.status = statusFilter;

    api.get('/admin/courses', { params })
      .then((res) => setData(prev => ({ ...prev, ...res.data })))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCourses();
  }, [data.page, data.page_size, statusFilter]);

  const handleModerate = async (courseId, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this course?`)) return;
    try {
      await api.put(`/admin/courses/${courseId}/moderate`, { action });
      fetchCourses();
    } catch (err) {
      alert('Moderation failed');
    }
  };

  if (loading && data.courses.length === 0) return <div className="page-wrapper"><LoadingSpinner /></div>;

  return (
    <div className="page-wrapper container">
      <div className="section-header flex-between">
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => window.history.back()} style={{ marginBottom: '1rem' }}>
            ← Back
          </button>
          <h2>Course Moderation</h2>
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '200px' }}>
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="flagged">Flagged</option>
          <option value="removed">Removed</option>
        </select>
      </div>

      <div className="table-wrapper box-glow">
        <table>
          <thead>
            <tr>
              <th>Course</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.courses.map(course => (
              <tr key={course.id}>
                <td>
                  <strong>{course.title}</strong>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    ID: {course.id}
                  </div>
                </td>
                <td>
                  <span className={`badge badge-${course.status === 'published' ? 'success' : course.status === 'flagged' ? 'danger' : 'warning'}`}>
                    {course.status}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div className="flex gap-sm" style={{ justifyContent: 'flex-end' }}>
                    <Link to={`/course/${course.id}`} className="btn btn-secondary btn-sm">View</Link>
                    {course.status !== 'published' && (
                      <button className="btn btn-success btn-sm" onClick={() => handleModerate(course.id, 'approve')}>Approve</button>
                    )}
                    {course.status !== 'flagged' && (
                      <button className="btn btn-warning btn-sm" onClick={() => handleModerate(course.id, 'flag')}>Flag</button>
                    )}
                    {course.status !== 'removed' && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleModerate(course.id, 'remove')}>Remove</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="pagination" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
        <button className="btn btn-secondary btn-sm" disabled={data.page === 1} onClick={() => setData(p => ({ ...p, page: p.page - 1 }))}>Prev</button>
        <button className="btn btn-secondary btn-sm" disabled={data.page * data.page_size >= data.total} onClick={() => setData(p => ({ ...p, page: p.page + 1 }))}>Next</button>
      </div>
    </div>
  );
}
