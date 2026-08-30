/**
 * SubAdminApprovals.jsx — Course Approvals for Sub Admin.
 *
 * Lists pending courses. Allows approving or rejecting courses.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import SubAdminSidebarLayout from './SubAdminSidebarLayout';

export default function SubAdminApprovals() {
  const [data, setData] = useState({ courses: [], total: 0, page: 1, page_size: 20 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchCourses = useCallback(() => {
    setLoading(true);
    api.get('/subadmin/approvals/pending', { params: { page: data.page, page_size: data.page_size } })
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [data.page, data.page_size]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const handleApprove = async (courseId) => {
    if (!window.confirm('Approve this course and publish it to the catalog?')) return;
    setActionLoading(courseId);
    try {
      await api.put(`/subadmin/approvals/${courseId}/approve`);
      fetchCourses();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to approve course');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (courseId) => {
    const reason = window.prompt('Enter rejection reason:');
    if (reason === null) return;
    if (!reason.trim()) {
      alert('Rejection reason is required.');
      return;
    }
    setActionLoading(courseId);
    try {
      await api.put(`/subadmin/approvals/${courseId}/reject`, { reason });
      fetchCourses();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reject course');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <SubAdminSidebarLayout>
      <div className="sa-page-header">
        <h2>✅ Course Approvals</h2>
        <p>Review and approve courses submitted by instructors.</p>
      </div>

      {loading && data.courses.length === 0 ? (
        <LoadingSpinner />
      ) : data.courses.length === 0 ? (
        <div className="sa-placeholder">
          <div className="placeholder-icon">🎉</div>
          <h2>All Caught Up!</h2>
          <p>There are currently no courses pending approval.</p>
        </div>
      ) : (
        <>
          <div className="sa-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Course Title</th>
                  <th>Instructor</th>
                  <th>Category</th>
                  <th>Submitted</th>
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
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleApprove(c.id)}
                          disabled={actionLoading === c.id}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleReject(c.id)}
                          disabled={actionLoading === c.id}
                        >
                          Reject
                        </button>
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
    </SubAdminSidebarLayout>
  );
}
