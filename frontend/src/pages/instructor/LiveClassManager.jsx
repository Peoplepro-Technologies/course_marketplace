/**
 * LiveClassManager.jsx — Instructor-side live class management.
 *
 * Features:
 *   - Schedule new live classes with a form (title, date/time, duration)
 *   - List all scheduled/live/ended classes with status badges
 *   - Start / End / Cancel actions per class
 *   - Launches Jitsi room when instructor clicks "Start" or "Re-join"
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import JitsiRoomModal from '../../components/JitsiRoomModal';
import keycloak from '../../auth/keycloak';

function formatDateTime(isoStr) {
  return new Date(isoStr).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function StatusBadge({ status }) {
  const map = {
    scheduled: { bg: '#e0f2fe', color: '#0369a1', label: '📅 Scheduled' },
    live: { bg: '#dcfce7', color: '#166534', label: '🔴 Live' },
    ended: { bg: '#f1f5f9', color: '#475569', label: '✔ Ended' },
  };
  const s = map[status] || { bg: '#f1f5f9', color: '#475569', label: status };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '3px 10px', borderRadius: '999px',
      fontSize: 'var(--text-xs)', fontWeight: 700,
      letterSpacing: '0.02em',
    }}>
      {s.label}
    </span>
  );
}

export default function LiveClassManager() {
  const [liveClasses, setLiveClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({
    course_id: '',
    title: '',
    scheduled_at: '',
    duration_minutes: 60,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [jitsiRoom, setJitsiRoom] = useState(null); // { roomName, displayName }
  const [actionError, setActionError] = useState({});

  const displayName = keycloak.tokenParsed?.name || keycloak.tokenParsed?.preferred_username || 'Instructor';

  const fetchClasses = useCallback(() => {
    setLoading(true);
    api.get('/instructor/live-classes')
      .then(r => setLiveClasses(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fetchCourses = useCallback(() => {
    api.get('/instructor/courses')
      .then(r => {
        const published = r.data.filter(c => c.status === 'published');
        setCourses(published);
        if (published.length > 0) setForm(f => ({ ...f, course_id: published[0].id }));
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchClasses();
    fetchCourses();
  }, [fetchClasses, fetchCourses]);

  const handleSchedule = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!form.course_id) { setFormError('Please select a course.'); return; }
    if (!form.title.trim()) { setFormError('Title is required.'); return; }
    if (!form.scheduled_at) { setFormError('Please pick a date and time.'); return; }
    setSubmitting(true);
    try {
      await api.post(`/instructor/courses/${form.course_id}/live-classes`, {
        title: form.title.trim(),
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        duration_minutes: Number(form.duration_minutes),
      });
      setShowForm(false);
      setForm({ course_id: courses[0]?.id || '', title: '', scheduled_at: '', duration_minutes: 60 });
      fetchClasses();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to schedule class');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStart = async (lc) => {
    try {
      await api.put(`/instructor/live-classes/${lc.id}/start`);
      fetchClasses();
      // Open Jitsi room
      setJitsiRoom({ roomName: lc.room_name, displayName });
    } catch (err) {
      setActionError(prev => ({ ...prev, [lc.id]: err.response?.data?.detail || 'Failed to start' }));
    }
  };

  const handleEnd = async (lc) => {
    if (!window.confirm('End this live session for all participants?')) return;
    try {
      await api.put(`/instructor/live-classes/${lc.id}/end`);
      fetchClasses();
    } catch (err) {
      setActionError(prev => ({ ...prev, [lc.id]: err.response?.data?.detail || 'Failed to end' }));
    }
  };

  const handleCancel = async (lc) => {
    if (!window.confirm('Cancel this scheduled live class?')) return;
    try {
      await api.delete(`/instructor/live-classes/${lc.id}`);
      fetchClasses();
    } catch (err) {
      setActionError(prev => ({ ...prev, [lc.id]: err.response?.data?.detail || 'Failed to cancel' }));
    }
  };

  const handleRejoin = (lc) => {
    setJitsiRoom({ roomName: lc.room_name, displayName });
  };

  if (loading) return <div className="page-wrapper"><LoadingSpinner /></div>;

  return (
    <>
      {jitsiRoom && (
        <JitsiRoomModal
          roomName={jitsiRoom.roomName}
          displayName={jitsiRoom.displayName}
          onClose={() => setJitsiRoom(null)}
        />
      )}

      <div className="page-wrapper container">
        {/* Header */}
        <div className="section-header flex-between">
          <div>
            <Link to="/instructor" className="btn btn-secondary btn-sm" style={{ marginBottom: '0.5rem' }}>
              ← Back to Dashboard
            </Link>
            <h2 style={{ marginTop: '0.5rem' }}>🎥 Live Classes</h2>
            <p>Schedule and host live video sessions for your students.</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(s => !s)}
            id="instructor-schedule-live-class-btn"
          >
            {showForm ? '✕ Cancel' : '+ Schedule Live Class'}
          </button>
        </div>

        {/* Schedule Form */}
        {showForm && (
          <div className="card box-glow" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: 'var(--text-lg)' }}>Schedule a New Live Class</h3>
            <form onSubmit={handleSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.3rem' }}>
                  Course
                </label>
                <select
                  id="live-class-course-select"
                  value={form.course_id}
                  onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: 'var(--text-sm)' }}
                >
                  {courses.length === 0
                    ? <option value="">No published courses</option>
                    : courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)
                  }
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.3rem' }}>
                  Session Title
                </label>
                <input
                  id="live-class-title-input"
                  type="text"
                  placeholder="e.g. Week 3 Q&A Session"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: 'var(--text-sm)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.3rem' }}>
                    Date & Time
                  </label>
                  <input
                    id="live-class-datetime-input"
                    type="datetime-local"
                    value={form.scheduled_at}
                    onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: 'var(--text-sm)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.3rem' }}>
                    Duration (minutes)
                  </label>
                  <input
                    id="live-class-duration-input"
                    type="number"
                    min={5}
                    max={480}
                    value={form.duration_minutes}
                    onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: 'var(--text-sm)' }}
                  />
                </div>
              </div>

              {formError && (
                <p style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)', margin: 0 }}>{formError}</p>
              )}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  id="live-class-schedule-submit-btn"
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || courses.length === 0}
                >
                  {submitting ? 'Scheduling…' : '📅 Schedule Session'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
              </div>
              {courses.length === 0 && (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  You need at least one published course to schedule a live class.{' '}
                  <Link to="/instructor">Back to Dashboard</Link>
                </p>
              )}
            </form>
          </div>
        )}

        {/* Live Classes Table */}
        {liveClasses.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-icon">🎥</div>
            <h3>No live classes yet</h3>
            <p>Click "Schedule Live Class" to get started.</p>
          </div>
        ) : (
          <div className="table-wrapper box-glow">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Course</th>
                  <th>Scheduled At</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {liveClasses.map(lc => (
                  <tr key={lc.id}>
                    <td><strong>{lc.title}</strong></td>
                    <td>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        {lc.course_title || '—'}
                      </span>
                    </td>
                    <td>{formatDateTime(lc.scheduled_at)}</td>
                    <td>{lc.duration_minutes} min</td>
                    <td><StatusBadge status={lc.status} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex" style={{ gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {lc.status === 'scheduled' && (
                          <>
                            <button
                              id={`instructor-start-live-class-${lc.id}`}
                              className="btn btn-success btn-sm"
                              onClick={() => handleStart(lc)}
                            >
                              ▶ Start
                            </button>
                            <button
                              id={`instructor-cancel-live-class-${lc.id}`}
                              className="btn btn-danger btn-sm"
                              onClick={() => handleCancel(lc)}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {lc.status === 'live' && (
                          <>
                            <button
                              id={`instructor-rejoin-live-class-${lc.id}`}
                              className="btn btn-primary btn-sm"
                              onClick={() => handleRejoin(lc)}
                            >
                              🔴 Re-join Room
                            </button>
                            <button
                              id={`instructor-end-live-class-${lc.id}`}
                              className="btn btn-danger btn-sm"
                              onClick={() => handleEnd(lc)}
                            >
                              ■ End Session
                            </button>
                          </>
                        )}
                        {lc.status === 'ended' && (
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                            Session ended
                          </span>
                        )}
                      </div>
                      {actionError[lc.id] && (
                        <p style={{ color: 'var(--color-danger)', fontSize: 'var(--text-xs)', marginTop: '0.25rem' }}>
                          {actionError[lc.id]}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
