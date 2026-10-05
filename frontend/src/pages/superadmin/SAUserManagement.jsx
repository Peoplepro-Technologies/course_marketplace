/**
 * SAUserManagement.jsx — User Management for Super Admin.
 *
 * Lists all users with role, email, join date, department assignment.
 * Allows changing user roles, deactivating/reactivating, and assigning departments.
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import SASidebarLayout from './SASidebarLayout';

const VALID_ROLES = ['learner', 'instructor', 'coursecoordinator', 'sub_admin', 'accounts', 'admin', 'super_admin'];

export default function SAUserManagement() {
  const [data, setData] = useState({ users: [], total: 0, page: 1, page_size: 20 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [showDeptModal, setShowDeptModal] = useState(null); // user object
  const [selectedDeptId, setSelectedDeptId] = useState('');

  useEffect(() => {
    api.get('/superadmin/departments').then(res => setDepartments(res.data)).catch(() => {});
  }, []);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = { page: data.page, page_size: data.page_size };
    if (search) params.search = search;

    api.get('/superadmin/users', { params })
      .then(res => setData(prev => ({ ...prev, ...res.data })))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [data.page, data.page_size, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleRoleChange = async (userId, newRole) => {
    if (!window.confirm(`Change this user's role to "${newRole}"?`)) return;
    setActionLoading(userId);
    try {
      await api.put(`/superadmin/users/${userId}/role`, { role: newRole });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to change role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivate = async (userId) => {
    if (!window.confirm('Deactivate this user? They will lose access.')) return;
    setActionLoading(userId);
    try {
      await api.put(`/superadmin/users/${userId}/deactivate`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to deactivate');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async (userId) => {
    if (!window.confirm('Reactivate this user as a learner?')) return;
    setActionLoading(userId);
    try {
      await api.put(`/superadmin/users/${userId}/reactivate`, { role: 'learner' });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reactivate');
    } finally {
      setActionLoading(null);
    }
  };

  const openDeptModal = (user) => {
    setShowDeptModal(user);
    setSelectedDeptId(user.department_id || '');
  };

  const handleDeptAssign = async () => {
    if (!showDeptModal) return;
    setActionLoading(showDeptModal.id);
    try {
      await api.put(`/superadmin/users/${showDeptModal.id}/department`, {
        department_id: selectedDeptId || null,
      });
      setShowDeptModal(null);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to assign department');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <SASidebarLayout>
      <div className="sa-page-header">
        <h2>User Management</h2>
        <p>View, search, manage users and assign departments for ticket routing.</p>
      </div>

      <div className="sa-filter-bar">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => { setSearch(e.target.value); setData(p => ({ ...p, page: 1 })); }}
        />
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          {data.total} user{data.total !== 1 ? 's' : ''} found
        </span>
      </div>

      {loading && data.users.length === 0 ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="sa-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Joined</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.name || '—'}</strong></td>
                    <td>{u.email}</td>
                    <td>
                      {u.role === 'deactivated' ? (
                        <span className="badge badge-danger">Deactivated</span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={e => handleRoleChange(u.id, e.target.value)}
                          disabled={actionLoading === u.id}
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-border)',
                            fontSize: 'var(--text-xs)',
                            cursor: 'pointer',
                          }}
                        >
                          {VALID_ROLES.map(r => (
                            <option key={r} value={r}>{r.replace('_', ' ')}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                        onClick={() => openDeptModal(u)}
                        disabled={actionLoading === u.id}
                      >
                        {u.department_name ? (
                          <span style={{ color: '#818cf8' }}>{u.department_name}</span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>Assign dept</span>
                        )}
                      </button>
                    </td>
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {u.role === 'deactivated' ? (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleReactivate(u.id)}
                          disabled={actionLoading === u.id}
                        >
                          {actionLoading === u.id ? '...' : 'Reactivate'}
                        </button>
                      ) : (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeactivate(u.id)}
                          disabled={actionLoading === u.id}
                        >
                          {actionLoading === u.id ? '...' : 'Deactivate'}
                        </button>
                      )}
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

      {/* Department Assignment Modal */}
      {showDeptModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', padding: '2rem',
            width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px rgba(0,0,0,0.4)', color: '#1a1a2e',
          }}>
            <h3 style={{ margin: '0 0 0.5rem' }}>Assign Department</h3>
            <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              <strong>{showDeptModal.name}</strong> ({showDeptModal.email})<br />
              Users assigned to a department get access to the Department Queue.
            </p>

            <select
              className="form-control"
              value={selectedDeptId}
              onChange={e => setSelectedDeptId(e.target.value)}
              style={{ marginBottom: '1.25rem', color: '#1a1a2e' }}
            >
              <option value="">— No Department (unassign) —</option>
              {departments.filter(d => d.is_active).map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowDeptModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleDeptAssign} disabled={actionLoading === showDeptModal.id}>
                {actionLoading === showDeptModal.id ? 'Saving…' : 'Save Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SASidebarLayout>
  );
}
