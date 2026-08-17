/**
 * SubAdminUserManagement.jsx — User Management for Sub Admin.
 *
 * Lists all users with role, email, join date.
 * Allows changing user roles (except promoting to super_admin) and deactivating/reactivating users.
 * Blocks any modifications to existing super_admin users.
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import SubAdminSidebarLayout from './SubAdminSidebarLayout';

const VALID_ROLES = ['learner', 'instructor', 'coursecoordinator', 'sub_admin', 'accounts', 'admin'];

export default function SubAdminUserManagement() {
  const [data, setData] = useState({ users: [], total: 0, page: 1, page_size: 20 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = { page: data.page, page_size: data.page_size };
    if (search) params.search = search;

    api.get('/subadmin/users', { params })
      .then(res => setData(prev => ({ ...prev, ...res.data })))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [data.page, data.page_size, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleRoleChange = async (userId, newRole) => {
    if (newRole === 'super_admin') {
      alert('Cannot assign super_admin role.');
      return;
    }
    if (!window.confirm(`Change this user's role to "${newRole}"?`)) return;
    setActionLoading(userId);
    try {
      await api.put(`/subadmin/users/${userId}/role`, { role: newRole });
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
      await api.put(`/subadmin/users/${userId}/deactivate`);
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
      await api.put(`/subadmin/users/${userId}/reactivate`, { role: 'learner' });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reactivate');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <SubAdminSidebarLayout>
      <div className="sa-page-header">
        <h2>👥 User Management</h2>
        <p>View, search, and manage all platform users (delegated permissions).</p>
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
                      {u.role === 'super_admin' ? (
                        <span className="badge badge-primary">Super Admin</span>
                      ) : u.role === 'deactivated' ? (
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
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {u.role === 'super_admin' ? (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Protected</span>
                      ) : u.role === 'deactivated' ? (
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
    </SubAdminSidebarLayout>
  );
}
