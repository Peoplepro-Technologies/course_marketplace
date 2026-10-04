import { useState, useEffect } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import '../RoleDashboard.css';

export default function FacultyAssignments() {
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Deactivate/Reassign Modal State
  const [deactivateInst, setDeactivateInst] = useState(null);
  const [assignedCourses, setAssignedCourses] = useState(null);
  const [reassignMap, setReassignMap] = useState({}); // courseId -> newInstructorId or "discard"
  const [processing, setProcessing] = useState(false);

  const fetchInstructors = () => {
    setLoading(true);
    api.get('/coordinator/instructors')
      .then(res => setInstructors(res.data))
      .catch(err => setError(err.response?.data?.detail || 'Failed to load faculty'))
      .finally(() => setLoading(false));
  };

  const handleReactivate = async (inst) => {
    setProcessing(true);
    try {
      await api.put(`/coordinator/instructors/${inst.id}/reactivate`);
      fetchInstructors();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reactivate instructor');
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    fetchInstructors();
  }, []);

  const openDeactivateModal = async (inst) => {
    setDeactivateInst(inst);
    setAssignedCourses(null);
    setReassignMap({});
    
    try {
      const courseRes = await api.get(`/coordinator/instructors/${inst.id}/courses`);
      setAssignedCourses(courseRes.data);
      // Initialize map with empty strings (which forces the user to select)
      const initialMap = {};
      courseRes.data.forEach(c => {
        initialMap[c.id] = '';
      });
      setReassignMap(initialMap);
    } catch (err) {
      alert("Failed to load instructor's assigned courses.");
      setDeactivateInst(null);
    }
  };

  const handleDeactivate = async () => {
    // Validate all courses have an action selected
    if (assignedCourses && assignedCourses.length > 0) {
      const unselected = assignedCourses.find(c => !reassignMap[c.id]);
      if (unselected) {
        alert("Please select a reassignment action for all courses before proceeding.");
        return;
      }
    }

    setProcessing(true);
    try {
      // 1. Reassign or discard courses
      if (assignedCourses && assignedCourses.length > 0) {
        await Promise.all(
          assignedCourses.map(course => 
            api.post(`/coordinator/courses/${course.id}/assign-instructor`, {
              instructor_id: reassignMap[course.id]
            })
          )
        );
      }

      // 2. Deactivate instructor
      await api.put(`/coordinator/instructors/${deactivateInst.id}/deactivate`);
      
      setDeactivateInst(null);
      fetchInstructors();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to process deactivation');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="page-wrapper container animate-fade-in">
      <div className="section-header flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2>👥 Faculty Management</h2>
          <p>Manage faculty members and handle course handovers.</p>
        </div>
      </div>

      {error ? (
        <div className="alert alert-error">⚠️ {error}</div>
      ) : loading ? (
        <LoadingSpinner />
      ) : instructors.length === 0 ? (
        <div className="empty-state">
          <h3>No faculty found</h3>
        </div>
      ) : (
        <div className="table-wrapper box-glow" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Faculty Member</th>
                <th style={{ textAlign: 'left' }}>Role / Access</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {instructors.map((inst, idx) => (
                <tr key={inst.id} className="animate-fade-in-up" style={{ animationDelay: `${idx * 0.02}s` }}>
                  <td>
                    <strong>{inst.name}</strong>
                    <div style={{ fontSize: '0.85em', color: 'var(--color-text-muted)' }}>{inst.email}</div>
                  </td>
                  <td>
                    {inst.can_host_live_classes ? 'Full Instructor' : 'Faculty (No Live Classes)'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`badge badge-${inst.is_active ? 'success' : 'danger'}`}>
                      {inst.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {inst.is_active ? (
                      <button 
                        className="btn btn-danger btn-sm"
                        onClick={() => openDeactivateModal(inst)}
                      >
                        Deactivate & Handover
                      </button>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>Deactivated</span>
                        <button 
                          className="btn btn-success btn-sm"
                          onClick={() => handleReactivate(inst)}
                          disabled={processing}
                        >
                          {processing ? '...' : 'Reactivate'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Deactivate & Handover Modal */}
      {deactivateInst && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#ffffff', color: '#1e293b', borderRadius: '16px', padding: '2rem',
            width: '100%', maxWidth: '600px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#dc2626' }}>
              ⚠️ Deactivate {deactivateInst.name}
            </h3>
            
            {!assignedCourses ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}><LoadingSpinner /></div>
            ) : (
              <>
                {assignedCourses.length > 0 ? (
                  <div style={{ marginBottom: '1.5rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    <p style={{ color: '#475569', marginBottom: '1rem', fontSize: '0.95rem' }}>
                      This person is assigned to {assignedCourses.length} course(s). 
                      Please assign them to someone else or discard the assignment. The new instructor will be able to resume the work immediately.
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {assignedCourses.map(course => (
                        <div key={course.id} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#0f172a' }}>{course.title}</strong>
                          <select 
                            className="form-control"
                            style={{ background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }}
                            value={reassignMap[course.id] || ''}
                            onChange={(e) => setReassignMap({...reassignMap, [course.id]: e.target.value})}
                          >
                            <option value="" disabled>-- Action Required --</option>
                            <option value="discard">Unassign / Discard</option>
                            <optgroup label="Reassign to:">
                              {instructors
                                .filter(i => i.is_active && i.id !== deactivateInst.id)
                                .map(i => (
                                  <option key={i.id} value={i.id}>{i.name} ({i.email})</option>
                                ))
                              }
                            </optgroup>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p style={{ color: '#475569', marginBottom: '1.5rem' }}>
                    This person is not currently assigned to any courses. You can safely deactivate them.
                  </p>
                )}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                  <button className="btn btn-secondary" onClick={() => setDeactivateInst(null)} disabled={processing}>
                    Cancel
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={handleDeactivate} 
                    disabled={processing}
                  >
                    {processing ? 'Processing...' : 'Confirm Deactivation'}
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

