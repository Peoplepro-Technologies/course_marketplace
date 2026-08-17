/**
 * SACourseManagement.jsx — Course Management for Super Admin.
 *
 * Lists all courses with status filter. Allows overriding course status.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import SASidebarLayout from './SASidebarLayout';

export default function SACourseManagement() {
  const [data, setData] = useState({ courses: [], total: 0, page: 1, page_size: 20 });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchCourses = useCallback(() => {
    setLoading(true);
    const params = { page: data.page, page_size: data.page_size };
    if (statusFilter) params.status = statusFilter;

    api.get('/superadmin/courses', { params })
      .then(res => setData(prev => ({ ...prev, ...res.data })))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [data.page, data.page_size, statusFilter]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const handleStatusOverride = async (courseId, newStatus) => {
    if (!window.confirm(`Are you sure you want to change this course's status to "${newStatus}"?`)) return;
    setActionLoading(courseId);
    try {
      await api.put(`/superadmin/courses/${courseId}/status`, { status: newStatus });
      fetchCourses();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <SASidebarLayout>
      <div className="sa-page-header">
        <h2>📚 Course Management</h2>
        <p>View and manage all courses on the platform.</p>
      </div>

      <div className="sa-filter-bar">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setData(p => ({ ...p, page: 1 })); }}>
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="pending_review">Pending Review</option>
          <option value="published">Published</option>
          <option value="rejected">Rejected</option>
          <option value="flagged">Flagged</option>
          <option value="removed">Removed</option>
        </select>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          {data.total} course{data.total !== 1 ? 's' : ''} found
        </span>
      </div>

      {loading && data.courses.length === 0 ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="sa-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Course Title</th>
                  <th>Instructor</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.courses.map(c => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.title}</strong>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        ID: {c.id}
                      </div>
                    </td>
                    <td>{c.instructor?.name || 'Unknown'}</td>
                    <td><span className="badge" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>{c.category}</span></td>
                    <td>
                      <span className={`badge badge-${
                        c.status === 'published' ? 'success' :
                        c.status === 'rejected' || c.status === 'removed' || c.status === 'flagged' ? 'danger' :
                        c.status === 'pending_review' ? 'primary' : 'warning'
                      }`}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <Link to={`/course/${c.id}`} className="btn btn-secondary btn-sm" target="_blank">View</Link>
                        <select
                          value={c.status}
                          onChange={e => handleStatusOverride(c.id, e.target.value)}
                          disabled={actionLoading === c.id}
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-border)',
                            fontSize: 'var(--text-xs)',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="draft">Draft</option>
                          <option value="pending_review" disabled>Pending Review</option>
                          <option value="published">Published</option>
                          <option value="rejected" disabled>Rejected</option>
                          <option value="flagged">Flagged</option>
                          <option value="removed">Removed</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sa-pagination">
            <button className="btn btn-secondary btn-sm" disabled={data.page === 1}
              onClick={() => setData(p => ({ ...p, page: p.page - 1 }))}>← Prev</button>
            <span>Page {data.page} of {Math.ceil(data.total / data.page_size) || 1}</span>
            <button className="btn btn-secondary btn-sm" disabled={data.page * data.page_size >= data.total}
              onClick={() => setData(p => ({ ...p, page: p.page + 1 }))}>Next →</button>
          </div>
        </>
      )}
    </SASidebarLayout>
  );
}
