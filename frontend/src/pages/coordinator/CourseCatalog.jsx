import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import '../RoleDashboard.css';

export default function CourseCatalog() {
  const [data, setData] = useState({ courses: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Reassignment Modal State
  const [reassignCourse, setReassignCourse] = useState(null);
  const [reassignData, setReassignData] = useState(null);
  const [instructors, setInstructors] = useState([]);
  const [newInstId, setNewInstId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Add Course Modal State
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [addCourseForm, setAddCourseForm] = useState({
    title: '', description: '', category: 'General', price: '', instructor_id: ''
  });
  const [creating, setCreating] = useState(false);

  const fetchInstructors = () => {
    api.get('/coordinator/instructors')
      .then(res => setInstructors(res.data.filter(i => i.is_active)))
      .catch(console.error);
  };

  const fetchCourses = () => {
    setLoading(true);
    const params = { page, page_size: pageSize };
    if (statusFilter) params.status = statusFilter;

    api.get('/coordinator/courses', { params })
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.detail || 'Failed to load courses'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCourses();
    fetchInstructors();
  }, [page, statusFilter]);

  // Re-fetch instructors when reassign modal opens (also used for add course)

  const totalPages = Math.ceil(data.total / pageSize);

  const getStatusBadge = (status) => {
    const map = {
      published: 'success',
      pending_review: 'warning',
      rejected: 'danger',
      flagged: 'danger',
      draft: 'secondary'
    };
    return <span className={`badge badge-${map[status] || 'primary'}`}>{status}</span>;
  };

  const openReassign = async (course) => {
    setReassignCourse(course);
    setReassignData(null);
    setNewInstId('');
    
    try {
      // Fetch assignment details for this course
      const detailRes = await api.get(`/coordinator/courses/${course.id}/assignment-detail`);
      setReassignData(detailRes.data);
      
      // Fetch all active instructors for dropdown
      const instRes = await api.get('/coordinator/instructors');
      // Only active instructors can be assigned
      setInstructors(instRes.data.filter(i => i.is_active));
    } catch (err) {
      alert("Failed to load assignment details.");
      setReassignCourse(null);
    }
  };

  const handleReassign = async () => {
    if (!newInstId) return;
    setAssigning(true);
    try {
      await api.post(`/coordinator/courses/${reassignCourse.id}/assign-instructor`, {
        instructor_id: newInstId
      });
      setReassignCourse(null);
      fetchCourses();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reassign course');
    } finally {
      setAssigning(false);
    }
  };

  const handleCreateCourse = async () => {
    if (!addCourseForm.title.trim()) return;
    setCreating(true);
    try {
      const payload = {
        title: addCourseForm.title,
        description: addCourseForm.description,
        category: addCourseForm.category,
        price: parseFloat(addCourseForm.price) || 0,
      };
      if (addCourseForm.instructor_id) payload.instructor_id = addCourseForm.instructor_id;
      await api.post('/coordinator/courses', payload);
      setShowAddCourse(false);
      setAddCourseForm({ title: '', description: '', category: 'General', price: '', instructor_id: '' });
      fetchCourses();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create course');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page-wrapper container animate-fade-in">
      <div className="section-header flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2>Course Catalog</h2>
          <p>View all courses and manage instructor assignments.</p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowAddCourse(true)}>+ Add Course</button>
      </div>

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <label><strong>Filter by Status:</strong></label>
        <select 
          className="form-control" 
          value={statusFilter} 
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ width: '200px' }}
        >
          <option value="">All Statuses</option>
          <option value="published">Published</option>
          <option value="pending_review">Pending Review</option>
          <option value="draft">Draft</option>
          <option value="rejected">Rejected</option>
          <option value="flagged">Flagged</option>
        </select>
      </div>

      {error ? (
        <div className="alert alert-error">{error}</div>
      ) : loading ? (
        <LoadingSpinner />
      ) : data.courses.length === 0 ? (
        <div className="empty-state">
          <h3>No courses found</h3>
          <p>Try adjusting your filters.</p>
        </div>
      ) : (
        <>
          <div className="table-wrapper box-glow" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Course Title</th>
                  <th style={{ textAlign: 'left' }}>Category</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Rating</th>
                  <th style={{ textAlign: 'left' }}>Current Instructor</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.courses.map((c, idx) => (
                  <tr key={c.id} className="animate-fade-in-up" style={{ animationDelay: `${idx * 0.02}s` }}>
                    <td><strong>{c.title}</strong></td>
                    <td>{c.category}</td>
                    <td style={{ textAlign: 'center' }}>{getStatusBadge(c.status)}</td>
                    <td style={{ textAlign: 'center' }}>{c.avg_rating > 0 ? `${c.avg_rating.toFixed(1)}` : '—'}</td>
                    <td>{c.instructor?.name || 'Unknown'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => openReassign(c)}
                        title="Reassign to another instructor"
                      >
                        Reassign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination" style={{ marginTop: '1.5rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ← Prev
              </button>
              <span className="page-info">Page {page} of {totalPages}</span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Reassign Modal */}
      {reassignCourse && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', padding: '2rem',
            width: '100%', maxWidth: '480px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            color: '#1a1a2e'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Reassign Course</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontWeight: 600 }}>
              {reassignCourse.title}
            </p>
            
            {!reassignData ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}><LoadingSpinner /></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'var(--color-bg)', padding: '1rem', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>CURRENT INSTRUCTOR</p>
                  <strong style={{ display: 'block', fontSize: '1.1rem' }}>{reassignData.instructor_name}</strong>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{reassignData.instructor_email}</span>
                  
                  {reassignData.previous_instructor_name && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>Note:</span> Previously assigned to <strong>{reassignData.previous_instructor_name}</strong>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Select New Instructor
                  </label>
                  <select 
                    className="form-control"
                    value={newInstId}
                    onChange={e => setNewInstId(e.target.value)}
                  >
                    <option value="" disabled>-- Select an instructor --</option>
                    {instructors
                      .filter(i => i.id !== reassignData.instructor_id)
                      .map(i => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.email})
                        </option>
                      ))
                    }
                  </select>
                  <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: '6px' }}>
                    Warning: The new instructor will take full ownership of the course, its earnings from this point forward, and all its contents (sections, lessons, etc.). The previous assignment will be logged.
                  </small>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button className="btn btn-secondary" onClick={() => setReassignCourse(null)} disabled={assigning}>
                    Cancel
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleReassign} 
                    disabled={assigning || !newInstId}
                  >
                    {assigning ? 'Reassigning...' : 'Confirm Reassignment'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Add Course Modal */}
      {showAddCourse && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--color-surface, #ffffff)', color: 'var(--color-text, #111827)',
            borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '520px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h3 style={{ marginTop: 0 }}>Add New Course</h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Course Title *</label>
              <input type="text" className="form-control"
                value={addCourseForm.title}
                onChange={e => setAddCourseForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Advanced React Development"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Description</label>
              <textarea className="form-control" rows="3"
                value={addCourseForm.description}
                onChange={e => setAddCourseForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief course description..."
              ></textarea>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Category</label>
                <input type="text" className="form-control"
                  value={addCourseForm.category}
                  onChange={e => setAddCourseForm(f => ({ ...f, category: e.target.value }))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Price (₹)</label>
                <input type="number" className="form-control" min="0" step="0.01"
                  value={addCourseForm.price}
                  onChange={e => setAddCourseForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="0 for free"
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(59,130,246,0.05)', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.2)' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Assign Instructor</label>
              <select className="form-control"
                value={addCourseForm.instructor_id}
                onChange={e => setAddCourseForm(f => ({ ...f, instructor_id: e.target.value }))}
              >
                <option value="">— Fill Later (leave unassigned) —</option>
                {instructors.map(inst => (
                  <option key={inst.id} value={inst.id}>{inst.name} ({inst.email})</option>
                ))}
              </select>
              <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: '6px' }}>
                You can assign an instructor now, or leave blank and assign later via the course list.
              </small>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAddCourse(false)} disabled={creating}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateCourse} disabled={creating || !addCourseForm.title.trim()}>
                {creating ? 'Creating...' : 'Create Course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
