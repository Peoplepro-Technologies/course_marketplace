/**
 * UserManagement.jsx — View all users on the platform.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import useAuth from '../../hooks/useAuth';

export default function UserManagement() {
  const { primaryRole } = useAuth();
  const canChangeRole = primaryRole === 'super_admin' || primaryRole === 'sub_admin';

  const [data, setData] = useState({ users: [], total: 0, page: 1, page_size: 20 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/admin/users', { params: { page: data.page, page_size: data.page_size } })
      .then((res) => setData(prev => ({ ...prev, ...res.data })))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [data.page, data.page_size]);

  const handleToggleActive = async (userId, currentStatus) => {
    try {
      const action = currentStatus ? 'deactivate' : 'activate';
      await api.put(`/admin/users/${userId}/${action}`);
      setData(prev => ({
        ...prev,
        users: prev.users.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u)
      }));
    } catch (err) {
      console.error(err);
      alert('Failed to update user status');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { new_role: newRole });
      setData(prev => ({
        ...prev,
        users: prev.users.map(u => u.id === userId ? { ...u, role: newRole } : u)
      }));
    } catch (err) {
      console.error(err);
      alert('Failed to update user role');
    }
  };

  if (loading && data.users.length === 0) return <div className="page-wrapper"><LoadingSpinner /></div>;

  return (
    <div className="page-wrapper container">
      <div className="section-header flex-between">
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => window.history.back()} style={{ marginBottom: '1rem' }}>
            ← Back
          </button>
          <h2>User Management</h2>
        </div>
        <div>Total: {data.total}</div>
      </div>

      <div className="table-wrapper box-glow">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map(user => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  {canChangeRole ? (
                    <select 
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      style={{ padding: '4px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                      <option value="learner">Learner</option>
                      <option value="instructor">Instructor</option>
                      <option value="coursecoordinator">Coordinator</option>
                      <option value="accounts">Accounts</option>
                      <option value="sub_admin">Sub Admin</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className={`badge badge-${user.role === 'admin' ? 'danger' : user.role === 'instructor' ? 'warning' : 'primary'}`}>
                      {user.role}
                    </span>
                  )}
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <button 
                    className={`btn btn-sm btn-${user.is_active ? 'danger' : 'success'}`}
                    onClick={() => handleToggleActive(user.id, user.is_active)}
                  >
                    {user.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
        <button 
          className="btn btn-secondary btn-sm" 
          disabled={data.page === 1}
          onClick={() => setData(p => ({ ...p, page: p.page - 1 }))}
        >
          Previous
        </button>
        <button 
          className="btn btn-secondary btn-sm" 
          disabled={data.page * data.page_size >= data.total}
          onClick={() => setData(p => ({ ...p, page: p.page + 1 }))}
        >
          Next
        </button>
      </div>
    </div>
  );
}
