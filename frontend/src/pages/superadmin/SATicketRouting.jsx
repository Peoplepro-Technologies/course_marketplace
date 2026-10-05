/**
 * SATicketRouting.jsx — Super Admin: Dynamic two-level routing rules.
 *
 * Flow when adding a rule:
 *   1. Select Raiser (who raises): Learner | Instructor | Course Coordinator
 *   2. Select Category (e.g. "Payment & Salary")
 *   3. Select Subcategory / Service Request (e.g. "Salary Delay")
 *   4. Route to Department (from DB — zero hardcoding)
 *   5. Optional note
 *
 * All data is DB-driven. New depts / roles appear automatically.
 */

import { useState, useEffect } from 'react';
import api from '../../api/axios';
import SASidebarLayout from './SASidebarLayout';
import LoadingSpinner from '../../components/LoadingSpinner';

const RAISER_ROLES = [
  { value: 'learner',           label: 'Learner',             desc: 'Students enrolled in courses' },
  { value: 'instructor',        label: 'Instructor',          desc: 'Course instructors / faculty' },
  { value: 'coursecoordinator', label: 'Course Coordinator',   desc: 'Academic coordinators' },
];

const ROLE_COLORS = {
  learner: '#6366f1',
  instructor: '#f59e0b',
  coursecoordinator: '#10b981',
};

const EMPTY_FORM = {
  role_context: '',
  category: '',
  subcategory: '',
  department_id: '',
  note: '',
};

export default function SATicketRouting() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterRole, setFilterRole] = useState('');

  // Group rules: role → category → subcategories
  const fetchRules = () => {
    setLoading(true);
    api.get('/superadmin/ticket-routing-rules-v2')
      .then(res => setRules(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRules();
    api.get('/superadmin/departments').then(res => setDepartments(res.data.filter(d => d.is_active))).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditRule(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (rule) => {
    setEditRule(rule);
    setForm({
      role_context: rule.role_context,
      category: rule.category,
      subcategory: rule.subcategory,
      department_id: rule.department_id || '',
      note: rule.note || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.role_context || !form.category || !form.subcategory) {
      alert('Role, Category, and Subcategory are all required.');
      return;
    }
    setSaving(true);
    try {
      if (editRule) {
        await api.put(`/superadmin/ticket-routing-rules-v2/${editRule.id}`, {
          department_id: form.department_id || null,
          is_active: true,
        });
      } else {
        await api.post('/superadmin/ticket-routing-rules-v2', {
          role_context: form.role_context,
          category: form.category,
          subcategory: form.subcategory,
          department_id: form.department_id || null,
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
      await api.put(`/superadmin/ticket-routing-rules-v2/${rule.id}`, { is_active: !rule.is_active });
      fetchRules();
    } catch { alert('Failed to update'); }
  };

  const handleDelete = async (rule) => {
    if (!confirm(`Delete rule "${rule.category} → ${rule.subcategory}"?`)) return;
    try {
      await api.delete(`/superadmin/ticket-routing-rules/${rule.id}`);
      fetchRules();
    } catch (err) { alert(err.response?.data?.detail || 'Failed to delete'); }
  };

  // Group for display
  const displayRules = filterRole ? rules.filter(r => r.role_context === filterRole) : rules;

  // Group by role_context → category
  const grouped = displayRules.reduce((acc, r) => {
    const rk = r.role_context;
    const ck = r.category;
    if (!acc[rk]) acc[rk] = {};
    if (!acc[rk][ck]) acc[rk][ck] = [];
    acc[rk][ck].push(r);
    return acc;
  }, {});

  return (
    <SASidebarLayout>
      {/* Header */}
      <div className="sa-page-header">
        <div>
          <h2>Ticket Routing Rules</h2>
          <p>Define which department handles each service request per raiser role.<br />
            <strong>How it works:</strong> Raiser selects Category → Subcategory → ticket auto-routes to the assigned Department. Zero hardcoding.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Rule</button>
      </div>

      {/* Architecture callout */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(16,185,129,0.06))',
        border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px',
        padding: '1rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.875rem', lineHeight: 1.7,
      }}>
        <strong>Architecture:</strong> Each rule = (Raiser Role + Category + Subcategory) → Department.
        When the raiser raises a ticket, the form shows only their role's categories. Selecting a subcategory
        auto-routes to the right department — <strong>no new dashboards needed</strong>. Add a new department → assign rules → done.
      </div>

      {/* Role filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterRole('')}
          style={{
            padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 600, fontSize: '0.83rem',
            background: !filterRole ? '#6366f1' : 'var(--color-surface)',
            color: !filterRole ? 'white' : 'var(--color-text-muted)',
            border: `1px solid ${!filterRole ? '#6366f1' : 'var(--color-border)'}`,
          }}
        >All Roles</button>
        {RAISER_ROLES.map(r => (
          <button key={r.value} onClick={() => setFilterRole(r.value)} style={{
            padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 600, fontSize: '0.83rem',
            background: filterRole === r.value ? ROLE_COLORS[r.value] : 'var(--color-surface)',
            color: filterRole === r.value ? 'white' : 'var(--color-text-muted)',
            border: `1px solid ${filterRole === r.value ? ROLE_COLORS[r.value] : 'var(--color-border)'}`,
          }}>
            {r.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        Object.keys(grouped).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
            <h3>No routing rules yet</h3>
            <p>Add rules to control which department handles each service request.</p>
            <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: '1rem' }}>Add First Rule</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {Object.entries(grouped).map(([role, categories]) => {
              const roleInfo = RAISER_ROLES.find(r => r.value === role);
              return (
                <div key={role} style={{
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  borderRadius: '12px', overflow: 'hidden',
                }}>
                  {/* Role header */}
                  <div style={{
                    background: `linear-gradient(90deg, ${ROLE_COLORS[role] || '#6366f1'}18, transparent)`,
                    borderBottom: `2px solid ${ROLE_COLORS[role] || '#6366f1'}33`,
                    padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '10px',
                  }}>
                    <span style={{
                      background: ROLE_COLORS[role] || '#6366f1', color: 'white',
                      padding: '2px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700,
                    }}>
                      {roleInfo?.label || role}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {roleInfo?.desc} · {Object.values(categories).flat().length} rules
                    </span>
                  </div>

                  {/* Categories */}
                  <div style={{ padding: '0.75rem 1rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Category</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Service Request</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Routes To</th>
                          <th style={{ padding: '6px 8px', textAlign: 'center' }}>Status</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(categories).map(([cat, subcatRules]) =>
                          subcatRules.map((rule, i) => (
                            <tr key={rule.id} style={{
                              borderTop: '1px solid var(--color-border)',
                              background: !rule.is_active ? 'rgba(239,68,68,0.03)' : 'transparent',
                            }}>
                              {i === 0 && (
                                <td rowSpan={subcatRules.length} style={{
                                  padding: '8px', verticalAlign: 'top', fontWeight: 600, fontSize: '0.875rem',
                                  borderRight: '1px solid var(--color-border)',
                                }}>
                                  <span style={{
                                    background: `${ROLE_COLORS[role] || '#6366f1'}15`,
                                    color: ROLE_COLORS[role] || '#6366f1',
                                    padding: '3px 10px', borderRadius: '8px', fontSize: '0.8rem',
                                  }}>{cat}</span>
                                </td>
                              )}
                              <td style={{ padding: '8px', fontSize: '0.875rem' }}>{rule.subcategory}</td>
                              <td style={{ padding: '8px' }}>
                                {rule.department_name ? (
                                  <span style={{
                                    background: 'rgba(16,185,129,0.1)', color: '#10b981',
                                    padding: '2px 8px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600,
                                  }}>
                                    {rule.department_name}
                                  </span>
                                ) : (
                                  <span style={{ color: '#f59e0b', fontSize: '0.78rem' }}>Unassigned → Super Admin</span>
                                )}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <span style={{
                                  background: rule.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)',
                                  color: rule.is_active ? '#10b981' : '#ef4444',
                                  padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 600,
                                }}>
                                  {rule.is_active ? 'Active' : 'Off'}
                                </span>
                              </td>
                              <td style={{ padding: '8px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                  <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                                    onClick={() => openEdit(rule)}>Edit</button>
                                  <button className="btn btn-secondary btn-sm" style={{
                                    fontSize: '0.72rem', padding: '2px 8px',
                                    color: rule.is_active ? '#f59e0b' : '#10b981',
                                  }} onClick={() => toggleActive(rule)}>
                                    {rule.is_active ? 'Pause' : 'Enable'}
                                  </button>
                                  <button className="btn btn-secondary btn-sm" style={{
                                    fontSize: '0.72rem', padding: '2px 8px', color: '#ef4444',
                                  }} onClick={() => handleDelete(rule)}>Del</button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem',
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '20px', padding: '2rem',
            width: '100%', maxWidth: '520px', boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
            color: '#1a1a2e', maxHeight: '90vh', overflowY: 'auto',
          }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>
              {editRule ? 'Edit Routing Rule' : 'New Routing Rule'}
            </h3>
            <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Define which department handles a specific service request from a specific raiser type.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Step 1: Who raises */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '0.875rem' }}>
                  Step 1 — Who raises this ticket?
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {RAISER_ROLES.map(r => (
                    <button key={r.value} type="button"
                      onClick={() => !editRule && setForm(f => ({ ...f, role_context: r.value }))}
                      disabled={!!editRule}
                      style={{
                        padding: '8px 16px', borderRadius: '10px', cursor: editRule ? 'not-allowed' : 'pointer',
                        fontWeight: 600, fontSize: '0.83rem', transition: 'all 0.15s',
                        background: form.role_context === r.value ? ROLE_COLORS[r.value] : '#f3f4f6',
                        color: form.role_context === r.value ? 'white' : '#374151',
                        border: `2px solid ${form.role_context === r.value ? ROLE_COLORS[r.value] : 'transparent'}`,
                        opacity: editRule ? 0.6 : 1,
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                {editRule && <small style={{ color: '#888', marginTop: '4px', display: 'block' }}>Role cannot be changed after creation.</small>}
              </div>

              {/* Step 2: Category */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px', fontSize: '0.875rem' }}>
                  Step 2 — Category
                </label>
                <input
                  className="form-control"
                  placeholder="e.g. Payment & Salary, Live Class Issue, Certificate"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  disabled={!!editRule}
                  style={{ opacity: editRule ? 0.6 : 1 }}
                />
                {editRule && <small style={{ color: '#888' }}>Category cannot be changed. Delete and re-create to change.</small>}
              </div>

              {/* Step 3: Service Request (subcategory) */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px', fontSize: '0.875rem' }}>
                  Step 3 — Service Request (subcategory)
                </label>
                <input
                  className="form-control"
                  placeholder="e.g. Salary Delay, Refund Request, Class Link Missing"
                  value={form.subcategory}
                  onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))}
                  disabled={!!editRule}
                  style={{ opacity: editRule ? 0.6 : 1 }}
                />
              </div>

              {/* Step 4: Route to Department */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '6px', fontSize: '0.875rem' }}>
                  Step 4 — Route to Department
                </label>
                <select
                  className="form-control"
                  value={form.department_id}
                  onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
                  style={{ color: '#1a1a2e' }}
                >
                  <option value="">— Unassigned (falls to Super Admin) —</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                {form.department_id && (
                  <div style={{
                    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                    borderRadius: '8px', padding: '8px 12px', marginTop: '8px', fontSize: '0.8rem',
                    color: '#10b981',
                  }}>
                    Tickets matching this rule will appear in the <strong>
                      {departments.find(d => d.id === form.department_id)?.name}
                    </strong> department queue.
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '2rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}
                disabled={saving || !form.role_context || !form.category || !form.subcategory}>
                {saving ? 'Saving…' : editRule ? 'Save Changes' : 'Create Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SASidebarLayout>
  );
}
