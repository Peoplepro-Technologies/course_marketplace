/**
 * UserManagement.jsx — View all users on the platform.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function UserManagement() {
  const [data, setData] = useState({ users: [], total: 0, page: 1, page_size: 20 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/admin/users', { params: { page: data.page, page_size: data.page_size } })
      .then((res) => setData(prev => ({ ...prev, ...res.data })))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [data.page, data.page_size]);

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
            </tr>
          </thead>
          <tbody>
            {data.users.map(user => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`badge badge-${user.role === 'admin' ? 'danger' : user.role === 'instructor' ? 'warning' : 'primary'}`}>
                    {user.role}
                  </span>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
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
