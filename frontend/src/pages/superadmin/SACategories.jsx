/**
 * SACategories.jsx — Category Management for Super Admin.
 *
 * Full CRUD for categories. Matches Coordinator pattern.
 */

import { useState, useEffect } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import SASidebarLayout from './SASidebarLayout';

export default function SACategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const fetchCategories = () => {
    setLoading(true);
    api.get('/superadmin/categories')
      .then(res => setCategories(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await api.post('/superadmin/categories', { name: newCatName, description: newCatDesc });
      setNewCatName('');
      setNewCatDesc('');
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create category');
    }
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    try {
      await api.put(`/superadmin/categories/${id}`, { name: editName, description: editDesc });
      setEditingId(null);
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update category');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.delete(`/superadmin/categories/${id}`);
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete category');
    }
  };

  return (
    <SASidebarLayout>
      <div className="sa-page-header">
        <h2>🏷️ Category Management</h2>
        <p>Manage course categories available to instructors.</p>
      </div>

      <div className="sa-table-wrapper" style={{ padding: 'var(--space-lg)' }}>
        <h3 style={{ marginBottom: 'var(--space-sm)' }}>Add New Category</h3>
        <form onSubmit={handleCreate} className="sa-category-form">
          <input
            type="text"
            placeholder="Category Name"
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newCatDesc}
            onChange={e => setNewCatDesc(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">Add Category</button>
        </form>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="sa-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.id}>
                  {editingId === cat.id ? (
                    <>
                      <td><input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="sa-filter-bar input" style={{ width: '100%', padding: '0.25rem' }} /></td>
                      <td><input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)} className="sa-filter-bar input" style={{ width: '100%', padding: '0.25rem' }} /></td>
                      <td style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-success btn-sm" onClick={() => handleUpdate(cat.id)}>Save</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td><strong>{cat.name}</strong></td>
                      <td>{cat.description || <span style={{ color: 'var(--color-text-muted)' }}>No description</span>}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setEditingId(cat.id);
                              setEditName(cat.name);
                              setEditDesc(cat.description || '');
                            }}
                          >
                            Edit
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(cat.id)}>Delete</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-xl)' }}>
                    No categories found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </SASidebarLayout>
  );
}
