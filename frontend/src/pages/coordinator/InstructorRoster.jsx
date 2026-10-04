import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import '../RoleDashboard.css';

export default function InstructorRoster() {
  const [instructors, setInstructors] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modals state
  const [editInst, setEditInst] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    instructor_payout_rate: '',
    instructor_mode: 'full',
  });

  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    education: '',
    instructor_payout_rate: '',
    instructor_mode: 'full',
    assignedCourses: [],
  });
  const [courseSearch, setCourseSearch] = useState('');
  const [generatedCreds, setGeneratedCreds] = useState(null);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [instRes, courseRes] = await Promise.all([
        api.get('/coordinator/instructors'),
        api.get('/coordinator/courses', { params: { page_size: 100 } })
      ]);
      setInstructors(instRes.data);
      setCourses(courseRes.data.courses || []);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail) || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchInstructors = () => {
    api.get('/coordinator/instructors')
      .then(res => setInstructors(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const toggleStatus = async (inst) => {
    if (!confirm(`Are you sure you want to ${inst.is_active ? 'deactivate' : 'reactivate'} ${inst.name}?`)) return;
    try {
      const endpoint = inst.is_active ? 'deactivate' : 'reactivate';
      await api.put(`/coordinator/instructors/${inst.id}/${endpoint}`);
      fetchInstructors();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to change status');
    }
  };

  const openEdit = (inst) => {
    setEditInst(inst);
    setForm({
      instructor_payout_rate: inst.instructor_payout_rate ?? '',
      instructor_mode: inst.can_host_live_classes && inst.can_upload_video !== false ? 'full' : 'faculty',
    });
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const payload = {
        can_host_live_classes: form.instructor_mode === 'full',
        can_upload_video: form.instructor_mode === 'full',
      };
      if (form.instructor_payout_rate !== '') {
        payload.instructor_payout_rate = parseFloat(form.instructor_payout_rate);
      } else {
        payload.instructor_payout_rate = null;
      }
      
      await api.put(`/coordinator/instructors/${editInst.id}`, payload);
      setEditInst(null);
      fetchInstructors();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update instructor');
    } finally {
      setSaving(false);
    }
  };

  const handleAddInstructor = async () => {
    setSaving(true);
    try {
      const payload = {
        name: addForm.name,
        email: addForm.email,
        password: 'testpass',
        can_host_live_classes: addForm.instructor_mode === 'full',
        can_upload_video: addForm.instructor_mode === 'full',
      };

      if (addForm.instructor_payout_rate !== '') {
        payload.instructor_payout_rate = parseFloat(addForm.instructor_payout_rate);
      }

      const instRes = await api.post(`/coordinator/instructors`, payload);
      const newInstId = instRes.data.id;

      // Assign selected courses
      if (addForm.assignedCourses.length > 0) {
        await Promise.all(
          addForm.assignedCourses.map(courseId =>
            api.post(`/coordinator/courses/${courseId}/assign-instructor`, { instructor_id: newInstId })
          )
        );
      }

      // Show real credentials returned from backend
      setGeneratedCreds({
        email: instRes.data.login_email,
        password: instRes.data.login_password,
      });
      fetchInitialData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create instructor');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-wrapper"><LoadingSpinner /></div>;

  return (
    <div className="page-wrapper container animate-fade-in">
      <div className="section-header flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h2>👨‍🏫 Instructor Roster</h2>
          <p>Monitor performance, set custom payout rates, and manage live class access.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={() => {
            setShowAddModal(true);
            setGeneratedCreds(null);
            setAddForm({
              name: '', email: '', education: '', instructor_payout_rate: '',
              instructor_mode: 'full',
              assignedCourses: [],
            });
            setCourseSearch('');
          }}>
            + Add Instructor
          </button>

        </div>
      </div>

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      {!error && instructors.length === 0 && (
        <div className="empty-state">
          <h3>No instructors found</h3>
        </div>
      )}

      {instructors.length > 0 && (
        <div className="table-wrapper box-glow" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Instructor</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Role Type</th>
                <th style={{ textAlign: 'center' }}>Payout Rate</th>
                <th style={{ textAlign: 'center' }}>Courses</th>
                <th style={{ textAlign: 'center' }}>Avg Rating</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {instructors.map((inst, idx) => (
                <tr key={inst.id} className="animate-fade-in-up" style={{ animationDelay: `${idx * 0.03}s` }}>
                  <td>
                    <strong>{inst.name}</strong><br/>
                    <small style={{ color: 'var(--color-text-muted)' }}>{inst.email}</small>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: '12px', fontSize: '0.8rem',
                      background: inst.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      color: inst.is_active ? '#10b981' : '#ef4444'
                    }}>
                      {inst.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {inst.can_host_live_classes && inst.can_upload_video !== false ? (
                      <span title="Full Instructor">👨‍🏫 Full</span>
                    ) : (
                      <span title="Faculty (Assignments & Quizzes only)">📝 Faculty</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {inst.instructor_payout_rate !== null ? (
                      <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>{inst.instructor_payout_rate}%</span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)' }}>Default (80%)</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {inst.total_courses} 
                    <small style={{ display: 'block', color: 'var(--color-text-muted)' }}>
                      ({inst.published_count} pub, {inst.pending_review_count} pend)
                    </small>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {inst.avg_rating > 0 ? `⭐ ${inst.avg_rating}` : '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(inst)}>
                        Edit
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm"
                        style={{ color: inst.is_active ? '#ef4444' : '#10b981', borderColor: inst.is_active ? '#ef4444' : '#10b981' }}
                        onClick={() => toggleStatus(inst)}
                      >
                        {inst.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editInst && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--color-surface, #ffffff)', color: 'var(--color-text, #111827)', borderRadius: '16px', padding: '2rem',
            width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ marginTop: 0 }}>Edit Instructor: {editInst.name}</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                Custom Payout Rate (%)
              </label>
              <input
                type="number"
                className="form-control"
                placeholder="Leave blank for platform default (80%)"
                value={form.instructor_payout_rate}
                onChange={e => setForm(f => ({ ...f, instructor_payout_rate: e.target.value }))}
                min="0" max="100" step="0.1"
              />
              <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: '4px' }}>
                Enter the percentage the instructor keeps. Default is 80%.
              </small>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Instructor Role Type</label>
              <select
                className="form-control"
                value={form.instructor_mode}
                onChange={e => setForm(f => ({ ...f, instructor_mode: e.target.value }))}
              >
                <option value="full">Full Instructor (Can upload videos, host live classes)</option>
                <option value="faculty">Faculty — Assignments & Quizzes only (No video/live classes)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setEditInst(null)} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveEdit} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Instructor Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--color-surface, #ffffff)', color: 'var(--color-text, #111827)', borderRadius: '16px', padding: '2rem',
            width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h3 style={{ marginTop: 0 }}>➕ Add New Instructor</h3>
            
            {generatedCreds ? (
              <div className="alert alert-success" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4>✅ Instructor Created in Keycloak!</h4>
                <p>Share these credentials securely with the instructor. They can log in immediately.</p>
                <div style={{ background: 'rgba(0,0,0,0.08)', padding: '14px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.95rem', lineHeight: '1.8' }}>
                  <div><strong>Email / Login ID:</strong> {generatedCreds.email}</div>
                  <div><strong>Password:</strong> {generatedCreds.password}</div>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddModal(false)} style={{ marginTop: '1rem' }}>
                  Close
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Full Name</label>
                  <input
                    type="text" className="form-control"
                    value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Email (Optional)</label>
                  <input
                    type="email" className="form-control"
                    value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Education & Bio</label>
                  <textarea
                    className="form-control" rows="2"
                    value={addForm.education} onChange={e => setAddForm(f => ({ ...f, education: e.target.value }))}
                    placeholder="Brief background and qualifications..."
                  ></textarea>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Custom Payout Rate (%)
                  </label>
                  <input
                    type="number" className="form-control"
                    placeholder="Leave blank for platform default (80%)"
                    value={addForm.instructor_payout_rate}
                    onChange={e => setAddForm(f => ({ ...f, instructor_payout_rate: e.target.value }))}
                    min="0" max="100" step="0.1"
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Instructor Role Type</label>
                  <select
                    className="form-control"
                    value={addForm.instructor_mode}
                    onChange={e => setAddForm(f => ({ ...f, instructor_mode: e.target.value }))}
                  >
                    <option value="full">Full Instructor (Can upload videos, host live classes)</option>
                    <option value="faculty">Faculty — Assignments & Quizzes only (No video/live classes)</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '0.8rem', fontWeight: 600 }}>Assign Courses</label>
                  
                  {/* Selected Courses Tags */}
                  {addForm.assignedCourses.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1rem' }}>
                      {addForm.assignedCourses.map(id => {
                        const course = courses.find(c => c.id === id);
                        return (
                          <div key={id} style={{ 
                            background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', 
                            padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem',
                            display: 'flex', alignItems: 'center', gap: '6px'
                          }}>
                            {course ? course.title : id}
                            <button 
                              onClick={() => setAddForm(f => ({ ...f, assignedCourses: f.assignedCourses.filter(cid => cid !== id) }))}
                              style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0, fontSize: '1rem', lineHeight: 1 }}
                            >
                              &times;
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Search Bar */}
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Search courses..." 
                    value={courseSearch}
                    onChange={e => setCourseSearch(e.target.value)}
                    style={{ marginBottom: '0.8rem' }}
                  />

                  {/* Filtered Course List */}
                  {courseSearch && (
                    <div style={{ 
                      maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', 
                      border: '1px solid var(--color-border)', borderRadius: '6px', 
                      background: 'var(--color-bg)' 
                    }}>
                      {courses
                        .filter(c => !addForm.assignedCourses.includes(c.id))
                        .filter(c => c.title.toLowerCase().includes(courseSearch.toLowerCase()))
                        .length === 0 ? (
                        <div style={{ padding: '12px', color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                          No courses found.
                        </div>
                      ) : (
                        courses
                          .filter(c => !addForm.assignedCourses.includes(c.id))
                          .filter(c => c.title.toLowerCase().includes(courseSearch.toLowerCase()))
                          .map(course => (
                          <div 
                            key={course.id} 
                            onClick={() => {
                              setAddForm(f => ({ ...f, assignedCourses: [...f.assignedCourses, course.id] }));
                              setCourseSearch('');
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            style={{ 
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                              cursor: 'pointer', padding: '10px 12px', borderBottom: '1px solid var(--color-border)',
                              transition: 'background 0.2s'
                            }}
                          >
                            <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>{course.title}</span>
                            <span style={{ fontSize: '0.8rem', color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                              {course.instructor?.name || 'Unassigned'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => setShowAddModal(false)} disabled={saving}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={handleAddInstructor} disabled={saving || !addForm.name}>
                    {saving ? 'Creating...' : 'Create Instructor'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
