import { useState, useEffect } from 'react';
import api from '../../api/axios';
import '../RoleDashboard.css';
import './SuperAdminDashboard.css';

const ROLE_OPTIONS = ['accounts', 'admin', 'HR'];
const ROLE_LABELS = { accounts: 'Accounts', admin: 'Super Admin', HR: 'HR (→ Admin queue)' };
const ROLE_COLORS = { accounts: '#3b82f6', admin: '#8b5cf6', HR: '#f59e0b' };

export default function SATicketRouting() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ category: '', assigned_role: 'accounts', assignee_name: '', assignee_email: '' });

  const fetchRules = () => {
    setLoading(true);
    api.get('/superadmin/ticket-routing-rules')
      .then(res => setRules(res.data))
      .catch(err => setError(err.response?.data?.detail || 'Failed to load rules'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRules(); }, []);

  const openCreate = () => {
    setEditRule(null);
    setForm({ category: '', assigned_role: 'accounts', assignee_name: '', assignee_email: '' });
    setShowForm(true);
  };

  const openEdit = (rule) => {
    setEditRule(rule);
    setForm({
      category: rule.category,
      assigned_role: rule.assigned_role,
      assignee_name: rule.assignee_name || '',
      assignee_email: rule.assignee_email || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.category.trim()) return;
    setSaving(true);
    try {
      if (editRule) {
        await api.put(`/superadmin/ticket-routing-rules/${editRule.id}`, {
          assigned_role: form.assigned_role,
          assignee_name: form.assignee_name || null,
          assignee_email: form.assignee_email || null,
        });
      } else {
        await api.post('/superadmin/ticket-routing-rules', {
          category: form.category,
          assigned_role: form.assigned_role,
          assignee_name: form.assignee_name || null,
          assignee_email: form.assignee_email || null,
        });
      }
      setShowForm(false);
      fetchRules();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (rule) => {
    try {
      await api.put(`/superadmin/ticket-routing-rules/${rule.id}`, { is_active: !rule.is_active });
      fetchRules();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update rule');
    }
  };

  const handleDelete = async (rule) => {
    if (!confirm(`Delete routing rule for "${rule.category}"?`)) return;
    try {
      await api.delete(`/superadmin/ticket-routing-rules/${rule.id}`);
      fetchRules();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete rule');
    }
  };

  return (
    <div className="page-wrapper container animate-fade-in">
      {/* Header */}
      <div className="section-header flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            🔀 Ticket Routing Rules
          </h2>
          <p style={{ margin: '6px 0 0', color: 'var(--color-text-muted)' }}>
            Control which team receives tickets by category. Replaces hardcoded routing logic.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Add Rule
        </button>
      </div>

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      {/* Info Banner for HR */}
      <div style={{
        background: 'rgba(245,158,11,0.1)',
        border: '1px solid rgba(245,158,11,0.3)',
        borderRadius: '10px',
        padding: '12px 16px',
        marginBottom: '1.5rem',
        fontSize: '0.875rem',
        color: 'var(--color-text-muted)',
      }}>
        💡 <strong>Note:</strong> Rules with role <strong>HR</strong> currently route to the Super Admin queue (no HR dashboard yet). The HR assignee is stored for reference.
      </div>

      {/* Rules Table */}
      {!loading && rules.length === 0 ? (
        <div className="empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔀</div>
          <h3>No routing rules configured</h3>
          <p>Add a rule to map ticket categories to specific teams.</p>
          <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: '1rem' }}>
            Create First Rule
          </button>
        </div>
      ) : (
        <div className="table-wrapper box-glow" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Category</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Routed To</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Assignee</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Email</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule, idx) => (
                <tr key={rule.id} className="animate-fade-in-up" style={{ animationDelay: `${idx * 0.04}s`, borderTop: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <code style={{
                      background: 'rgba(99,102,241,0.1)',
                      color: '#818cf8',
                      padding: '3px 8px',
                      borderRadius: '5px',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                    }}>
                      {rule.category}
                    </code>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      background: `${ROLE_COLORS[rule.assigned_role] || '#6b7280'}22`,
                      color: ROLE_COLORS[rule.assigned_role] || '#6b7280',
                      padding: '3px 10px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}>
                      {ROLE_LABELS[rule.assigned_role] || rule.assigned_role}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>
                    {rule.assignee_name || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    {rule.assignee_email || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{
                      background: rule.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)',
                      color: rule.is_active ? '#10b981' : '#ef4444',
                      padding: '3px 10px',
                      borderRadius: '20px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                    }}>
                      {rule.is_active ? '● Active' : '○ Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                        onClick={() => openEdit(rule)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.78rem',
                          color: rule.is_active ? '#f59e0b' : '#10b981',
                          borderColor: rule.is_active ? '#f59e0b' : '#10b981',
                        }}
                        onClick={() => toggleActive(rule)}
                      >
                        {rule.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.78rem', color: '#ef4444', borderColor: '#ef4444' }}
                        onClick={() => handleDelete(rule)}
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

      {/* Modal Form */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--color-surface)', borderRadius: '16px', padding: '2rem',
            width: '100%', maxWidth: '480px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          }}>
            <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem' }}>
              {editRule ? '✏️ Edit Routing Rule' : '➕ New Routing Rule'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600 }}>
                  Category *
                </label>
                <input
                  className="form-control"
                  placeholder="e.g. salary_WB, medical_W"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  disabled={!!editRule}
                  style={{ opacity: editRule ? 0.6 : 1 }}
                />
                {editRule && <small style={{ color: 'var(--color-text-muted)' }}>Category cannot be changed after creation.</small>}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600 }}>
                  Route To (Role)
                </label>
                <select
                  className="form-control"
                  value={form.assigned_role}
                  onChange={e => setForm(f => ({ ...f, assigned_role: e.target.value }))}
                >
                  {ROLE_OPTIONS.map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600 }}>
                  Assignee Name (optional)
                </label>
                <input
                  className="form-control"
                  placeholder="e.g. WB Accounts Officer"
                  value={form.assignee_name}
                  onChange={e => setForm(f => ({ ...f, assignee_name: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600 }}>
                  Assignee Email (optional)
                </label>
                <input
                  className="form-control"
                  type="email"
                  placeholder="e.g. accounts@company.com"
                  value={form.assignee_email}
                  onChange={e => setForm(f => ({ ...f, assignee_email: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.category.trim()}>
                {saving ? 'Saving…' : editRule ? 'Save Changes' : 'Create Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
