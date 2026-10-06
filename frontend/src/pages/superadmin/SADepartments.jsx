/**
 * SADepartments.jsx — Super Admin: Department CRUD page.
 *
 * DB-driven departments — add/edit/deactivate without any code changes.
 * Same pattern as Branches page. Assign users to departments from User Management.
 */

import { useState, useEffect } from 'react';
import api from '../../api/axios';
import SASidebarLayout from './SASidebarLayout';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function SADepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const fetchDepts = () => {
    setLoading(true);
    api.get('/superadmin/departments')
      .then(res => setDepartments(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDepts(); }, []);

  const openCreate = () => {
    setEditDept(null);
    setForm({ name: '', description: '' });
    setShowForm(true);
  };

  const openEdit = (dept) => {
    setEditDept(dept);
    setForm({ name: dept.name, description: dept.description || '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editDept) {
        await api.put(`/superadmin/departments/${editDept.id}`, form);
      } else {
        await api.post('/superadmin/departments', form);
      }
      setShowForm(false);
      fetchDepts();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save department');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (dept) => {
    try {
      await api.put(`/superadmin/departments/${dept.id}`, { is_active: !dept.is_active });
      fetchDepts();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update');
    }
  };

  const handleDelete = async (dept) => {
    if (!confirm(`Delete department "${dept.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/superadmin/departments/${dept.id}`);
      fetchDepts();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete');
    }
  };

  return (
    <SASidebarLayout>
      <div className="sa-page-header">
        <div>
          <h2>Departments</h2>
          <p>Manage service departments. Each department owns a ticket queue — no code changes needed to add new departments.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Department</button>
      </div>

      <div style={{
        background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: '10px', padding: '12px 16px', marginBottom: '1.5rem', fontSize: '0.875rem',
      }}>
        <strong>Scalability note:</strong> Any user assigned to a department automatically gets access to the generic Department Queue — zero new frontend code required.
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          <div className="sa-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'center' }}>Users</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map(dept => (
                  <tr key={dept.id}>
                    <td><strong>{dept.name}</strong></td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                      {dept.description || '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        background: 'rgba(99,102,241,0.12)', color: '#818cf8',
                        padding: '2px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600,
                      }}>
                        {dept.user_count}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        background: dept.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)',
                        color: dept.is_active ? '#10b981' : '#ef4444',
                        padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600,
                      }}>
                        {dept.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(dept)}>Edit</button>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ color: dept.is_active ? '#f59e0b' : '#10b981', borderColor: dept.is_active ? '#f59e0b' : '#10b981' }}
                          onClick={() => toggleActive(dept)}
                        >
                          {dept.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        {dept.user_count === 0 && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#ef4444', borderColor: '#ef4444' }}
                            onClick={() => handleDelete(dept)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {departments.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
              <h3>No departments yet</h3>
              <p>Create departments to enable the department-driven ticket queue.</p>
              <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: '1rem' }}>
                Create First Department
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', padding: '2rem',
            width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px rgba(0,0,0,0.4)', color: '#1a1a2e',
          }}>
            <h3 style={{ margin: '0 0 1.5rem' }}>
              {editDept ? 'Edit Department' : 'New Department'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.875rem' }}>
                  Department Name *
                </label>
                <input
                  className="form-control"
                  placeholder="e.g. Logistics"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  disabled={!!editDept}
                  style={{ opacity: editDept ? 0.6 : 1 }}
                />
                {editDept && <small style={{ color: '#888' }}>Name cannot be changed after creation.</small>}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.875rem' }}>
                  Description (optional)
                </label>
                <input
                  className="form-control"
                  placeholder="Brief description of this department"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving ? 'Saving…' : editDept ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SASidebarLayout>
  );
}
