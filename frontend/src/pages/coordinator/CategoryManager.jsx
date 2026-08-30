import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import '../RoleDashboard.css';

export default function CategoryManager() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form state
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [formError, setFormError] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchCategories = () => {
    setLoading(true);
    api.get('/coordinator/categories')
      .then(res => setCategories(res.data))
      .catch(err => setError(err.response?.data?.detail || 'Failed to load categories'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleEdit = (category) => {
    setEditingId(category.id);
    setFormData({ name: category.name, description: category.description || '' });
    setFormError('');
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ name: '', description: '' });
    setFormError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }

    setProcessing(true);
    const request = editingId === 'new'
      ? api.post('/coordinator/categories', formData)
      : api.put(`/coordinator/categories/${editingId}`, formData);

    request
      .then(() => {
        handleCancel();
        fetchCategories();
      })
      .catch(err => setFormError(err.response?.data?.detail || 'Failed to save category'))
      .finally(() => setProcessing(false));
  };

  const handleDelete = (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the category "${name}"?`)) return;
    setProcessing(true);
    api.delete(`/coordinator/categories/${id}`)
      .then(() => fetchCategories())
      .catch(err => alert(err.response?.data?.detail || 'Failed to delete category'))
      .finally(() => setProcessing(false));
  };

  if (loading) return <div className="page-wrapper"><LoadingSpinner /></div>;

  return (
    <div className="page-wrapper container animate-fade-in">
      <div className="section-header flex-between">
        <div>
          <h2>🏷️ Categories</h2>
          <p>Manage course categories for the platform.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn btn-primary"
            onClick={() => {
              setEditingId('new');
              setFormData({ name: '', description: '' });
              setFormError('');
            }}
            disabled={editingId !== null}
          >
            + Add Category
          </button>
          <Link to="/coordinator" className="btn btn-secondary">← Dashboard</Link>
        </div>
      </div>

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      {/* ── Add/Edit Form ────────────────────────────────────────────── */}
      {editingId && (
        <div className="box-glow" style={{ marginBottom: '2rem', padding: '1.5rem', background: '#fff', borderRadius: '8px' }}>
          <h3>{editingId === 'new' ? 'New Category' : 'Edit Category'}</h3>
          {formError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{formError}</div>}
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label><strong>Name *</strong></label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={processing}
                required
              />
            </div>
            <div>
              <label><strong>Description</strong></label>
              <textarea 
                className="form-control" 
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={processing}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn btn-success" disabled={processing}>
                {processing ? 'Saving...' : 'Save'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleCancel} disabled={processing}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Category List ─────────────────────────────────────────────── */}
      {!error && categories.length === 0 && !editingId && (
        <div className="empty-state">
          <h3>No categories found</h3>
          <p>Click "Add Category" to create one.</p>
        </div>
      )}

      {categories.length > 0 && (
        <div className="table-wrapper box-glow">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.description || <span style={{ color: '#888' }}>No description</span>}</td>
                  <td>{new Date(c.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleEdit(c)}
                        disabled={editingId !== null || processing}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(c.id, c.name)}
                        disabled={editingId !== null || processing}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
