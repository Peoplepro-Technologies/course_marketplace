/**
 * LiveClassManager.jsx — Instructor-side live class management with Recording capabilities.
 *
 * Features:
 *   - Schedule new live classes with a form (title, date/time, duration)
 *   - List all scheduled/live/ended classes with status & recording badges
 *   - Start / End / Cancel actions per class
 *   - Browser-based Live Recording using MediaRecorder API + getDisplayMedia
 *   - Manual video file upload for ended sessions
 *   - Preview uploaded recording using VideoPlayer
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import JitsiRoomModal from '../../components/JitsiRoomModal';
import VideoPlayer from '../../components/VideoPlayer';
import Modal from '../../components/Modal';
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

function RecordingBadge({ status }) {
  const map = {
    none: { bg: '#f8fafc', color: '#64748b', label: 'No Recording' },
    recording: { bg: '#fef2f2', color: '#dc2626', label: '🔴 Recording' },
    processing: { bg: '#fef3c7', color: '#d97706', label: '⏳ Processing' },
    ready: { bg: '#dcfce7', color: '#15803d', label: '📹 Ready' },
    failed: { bg: '#fee2e2', color: '#991b1b', label: '⚠️ Failed' },
  };
  const s = map[status] || { bg: '#f8fafc', color: '#64748b', label: status };
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
  const [jitsiRoom, setJitsiRoom] = useState(null); // { roomName, displayName, liveClass }
  const [actionError, setActionError] = useState({});

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [activeRecordingClassId, setActiveRecordingClassId] = useState(null);
  const [uploadModalClass, setUploadModalClass] = useState(null); // LiveClass object for manual upload
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [previewClass, setPreviewClass] = useState(null); // LiveClass object for previewing recording

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recordedChunksRef = useRef([]);

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

  const uploadRecordingFile = async (liveClassId, fileOrBlob, filename) => {
    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    const formData = new FormData();
    formData.append('video', fileOrBlob, filename || 'recording.mp4');

    try {
      await api.post(`/instructor/live-classes/${liveClassId}/recording`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) {
            const pct = Math.round((e.loaded * 100) / e.total);
            setUploadProgress(pct);
          }
        },
      });
      setUploadModalClass(null);
      setSelectedFile(null);
      fetchClasses();
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err.response?.data?.detail || 'Failed to upload recording.');
    } finally {
      setUploading(false);
    }
  };

  const startBrowserRecording = async (liveClassId) => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' },
        audio: true,
      });

      mediaStreamRef.current = stream;
      recordedChunksRef.current = [];

      let options = { mimeType: 'video/webm;codecs=vp9,opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm' };
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'video/webm' });
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
        }
        setIsRecording(false);
        setActiveRecordingClassId(null);

        if (blob.size > 0) {
          alert('Class session recording captured! Uploading to server...');
          await uploadRecordingFile(liveClassId, blob, `live_recording_${liveClassId}.webm`);
        }
      };

      // If user stops sharing stream via browser bar
      stream.getVideoTracks()[0].onended = () => {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      };

      recorder.start(1000);
      setIsRecording(true);
      setActiveRecordingClassId(liveClassId);
    } catch (err) {
      console.error('Screen capture failed:', err);
      alert('Screen/Tab capture failed or was cancelled: ' + err.message);
    }
  };

  const stopBrowserRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

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

  const handleStart = async (lc, recordOption = false) => {
    try {
      await api.put(`/instructor/live-classes/${lc.id}/start`);
      fetchClasses();
      setJitsiRoom({ roomName: lc.room_name, displayName, liveClass: lc });
      if (recordOption) {
        startBrowserRecording(lc.id);
      }
    } catch (err) {
      setActionError(prev => ({ ...prev, [lc.id]: err.response?.data?.detail || 'Failed to start' }));
    }
  };

  const handleEnd = async (lc) => {
    if (!window.confirm('End this live session for all participants?')) return;
    try {
      if (isRecording && activeRecordingClassId === lc.id) {
        stopBrowserRecording();
      }
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
    setJitsiRoom({ roomName: lc.room_name, displayName, liveClass: lc });
  };

  const handleManualUploadSubmit = (e) => {
    e.preventDefault();
    if (!selectedFile || !uploadModalClass) return;
    uploadRecordingFile(uploadModalClass.id, selectedFile, selectedFile.name);
  };

  if (loading) return <div className="page-wrapper"><LoadingSpinner /></div>;

  return (
    <>
      {/* Jitsi Room Overlay */}
      {jitsiRoom && (
        <JitsiRoomModal
          roomName={jitsiRoom.roomName}
          displayName={jitsiRoom.displayName}
          onClose={() => setJitsiRoom(null)}
        />
      )}

      {/* Manual Recording Upload Modal */}
      <Modal
        isOpen={Boolean(uploadModalClass)}
        onClose={() => { if (!uploading) setUploadModalClass(null); }}
        title={`Upload Recording — ${uploadModalClass?.title || ''}`}
      >
        <form onSubmit={handleManualUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
            Select a recorded MP4/WebM video file for this live class.
          </p>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '0.4rem' }}>
              Video File (.mp4, .webm)
            </label>
            <input
              type="file"
              accept="video/mp4,video/webm,video/*"
              onChange={(e) => setSelectedFile(e.target.files[0] || null)}
              disabled={uploading}
              style={{ width: '100%', fontSize: 'var(--text-sm)' }}
            />
          </div>

          {uploading && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: '0.2rem' }}>
                <span>Uploading video…</span>
                <span>{uploadProgress}%</span>
              </div>
              <progress value={uploadProgress} max={100} style={{ width: '100%' }} />
            </div>
          )}

          {uploadError && (
            <p style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)', margin: 0 }}>{uploadError}</p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setUploadModalClass(null)}
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={!selectedFile || uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Video'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Preview Recording Modal */}
      <Modal
        isOpen={Boolean(previewClass)}
        onClose={() => setPreviewClass(null)}
        title={`Recording Preview — ${previewClass?.title || ''}`}
      >
        {previewClass && (
          <VideoPlayer
            src={`http://localhost:8000/api/v1/learner/live-classes/${previewClass.id}/recording?token=${keycloak.token}`}
          />
        )}
      </Modal>

      <div className="page-wrapper container">
        {/* Active Recording Notice Banner */}
        {isRecording && (
          <div className="card box-glow" style={{
            marginBottom: '1.5rem', background: '#fef2f2', border: '1.5px solid #ef4444',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{
                width: 12, height: 12, borderRadius: '50%', background: '#dc2626',
                boxShadow: '0 0 0 4px rgba(220,38,38,0.25)', display: 'inline-block',
                animation: 'pulse-live 1.5s infinite',
              }} />
              <div>
                <strong style={{ color: '#991b1b' }}>Session Recording Active</strong>
                <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: '#7f1d1d' }}>
                  Capturing instructor browser/tab audio and video. Click "Stop & Upload" when class ends.
                </p>
              </div>
            </div>
            <button
              className="btn btn-danger btn-sm"
              onClick={stopBrowserRecording}
            >
              Stop & Upload Recording
            </button>
          </div>
        )}

        {/* Header */}
        <div className="section-header flex-between">
          <div>
            <Link to="/instructor" className="btn btn-secondary btn-sm" style={{ marginBottom: '0.5rem' }}>
              ← Back to Dashboard
            </Link>
            <h2 style={{ marginTop: '0.5rem' }}>🎥 Live Classes & Recordings</h2>
            <p>Schedule, host, record live video sessions, and upload class recordings for students.</p>
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
                  <th>Session Status</th>
                  <th>Recording Status</th>
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
                    <td><RecordingBadge status={lc.recording_status || 'none'} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex" style={{ gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {lc.status === 'scheduled' && (
                          <>
                            <button
                              id={`instructor-start-live-class-${lc.id}`}
                              className="btn btn-success btn-sm"
                              onClick={() => handleStart(lc, false)}
                            >
                              ▶ Start
                            </button>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleStart(lc, true)}
                              title="Start session and capture browser screen/tab recording"
                            >
                              🎥 Start & Record
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

                            {!isRecording ? (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => startBrowserRecording(lc.id)}
                              >
                                🔴 Record Screen
                              </button>
                            ) : activeRecordingClassId === lc.id ? (
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={stopBrowserRecording}
                              >
                                ⏹ Stop Record
                              </button>
                            ) : null}

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
                          <>
                            {lc.recording_status === 'ready' && (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setPreviewClass(lc)}
                              >
                                📹 Watch Recording
                              </button>
                            )}
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                setUploadModalClass(lc);
                                setUploadError(null);
                                setSelectedFile(null);
                              }}
                            >
                              {lc.recording_status === 'ready' ? 'Re-upload Recording' : '⬆ Upload Recording'}
                            </button>
                          </>
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
