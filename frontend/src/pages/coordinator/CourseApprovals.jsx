import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import '../RoleDashboard.css';
import './CoursePreviewModal.css';

export default function CourseApprovals() {
  const [data, setData] = useState({ courses: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Reject workflow state
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState(null);

  // Preview modal state
  const [preview, setPreview] = useState(null); // { course, sections } | null
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  // Reject state inside modal
  const [modalRejectOpen, setModalRejectOpen] = useState(false);
  const [modalRejectReason, setModalRejectReason] = useState('');

  const fetchPending = () => {
    setLoading(true);
    api.get('/coordinator/courses/pending')
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.detail || 'Failed to load courses'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPending();
  }, []);

  // ── Approve / Reject handlers (list) ──────────────────────────────
  const handleApprove = (id) => {
    if (!window.confirm('Approve this course and publish it?')) return;
    setProcessingId(id);
    api.put(`/coordinator/courses/${id}/approve`)
      .then(() => fetchPending())
      .catch(err => alert(err.response?.data?.detail || 'Failed to approve'))
      .finally(() => setProcessingId(null));
  };

  const handleRejectSubmit = (id, reason) => {
    if (!reason.trim()) return alert('Reason is required');
    setProcessingId(id);
    api.put(`/coordinator/courses/${id}/reject`, { reason })
      .then(() => {
        setRejectId(null);
        setRejectReason('');
        fetchPending();
      })
      .catch(err => alert(err.response?.data?.detail || 'Failed to reject'))
      .finally(() => setProcessingId(null));
  };

  // ── Preview modal handlers ─────────────────────────────────────────
  const openPreview = (courseId) => {
    setPreview(null);
    setPreviewError(null);
    setExpandedSections({});
    setModalRejectOpen(false);
    setModalRejectReason('');
    setPreviewLoading(true);
    api.get(`/coordinator/courses/${courseId}/preview`)
      .then(res => setPreview(res.data))
      .catch(err => setPreviewError(err.response?.data?.detail || 'Failed to load preview'))
      .finally(() => setPreviewLoading(false));
  };

  const closePreview = () => {
    setPreview(null);
    setPreviewError(null);
    setPreviewLoading(false);
    setModalRejectOpen(false);
    setModalRejectReason('');
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // Approve from modal
  const handleModalApprove = () => {
    if (!preview) return;
    const courseId = preview.course.id;
    if (!window.confirm('Approve this course and publish it?')) return;
    setProcessingId(courseId);
    api.put(`/coordinator/courses/${courseId}/approve`)
      .then(() => {
        closePreview();
        fetchPending();
      })
      .catch(err => alert(err.response?.data?.detail || 'Failed to approve'))
      .finally(() => setProcessingId(null));
  };

  // Reject from modal
  const handleModalRejectSubmit = () => {
    if (!preview) return;
    const courseId = preview.course.id;
    if (!modalRejectReason.trim()) return alert('Reason is required');
    setProcessingId(courseId);
    api.put(`/coordinator/courses/${courseId}/reject`, { reason: modalRejectReason })
      .then(() => {
        closePreview();
        fetchPending();
      })
      .catch(err => alert(err.response?.data?.detail || 'Failed to reject'))
      .finally(() => setProcessingId(null));
  };

  // ── Derived values ─────────────────────────────────────────────────
  const previewCourse = preview?.course;
  const previewSections = preview?.sections || [];
  const totalLessons = previewSections.reduce((acc, s) => acc + (s.lessons?.length || 0), 0);
  const isProcessingPreview = previewCourse && processingId === previewCourse.id;

  if (loading) return <div className="page-wrapper"><LoadingSpinner /></div>;

  return (
    <div className="page-wrapper container animate-fade-in">
      <div className="section-header flex-between">
        <div>
          <h2>✅ Course Approvals</h2>
          <p>Review and approve newly submitted courses.</p>
        </div>
        <Link to="/coordinator" className="btn btn-secondary">← Dashboard</Link>
      </div>

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      {!error && data.courses.length === 0 && (
        <div className="empty-state">
          <h3>No pending approvals</h3>
          <p>All courses have been reviewed.</p>
        </div>
      )}

      {data.courses.length > 0 && (
        <div className="table-wrapper box-glow">
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Instructor</th>
                <th>Category</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.courses.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.title}</strong></td>
                  <td>{c.instructor?.name || 'Unknown'}</td>
                  <td>{c.category}</td>
                  <td>{new Date(c.created_at).toLocaleDateString()}</td>
                  <td>
                    {rejectId === c.id ? (
                      <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                        <textarea
                          className="form-control"
                          placeholder="Reason for rejection..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          rows={2}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleRejectSubmit(c.id, rejectReason)}
                            disabled={processingId === c.id}
                          >Confirm Reject</button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => { setRejectId(null); setRejectReason(''); }}
                            disabled={processingId === c.id}
                          >Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          id={`preview-btn-${c.id}`}
                          onClick={() => openPreview(c.id)}
                          disabled={processingId === c.id}
                        >🔍 Preview</button>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleApprove(c.id)}
                          disabled={processingId === c.id}
                        >Approve</button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setRejectId(c.id)}
                          disabled={processingId === c.id}
                        >Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Preview Modal ─────────────────────────────────────────────── */}
      {(previewLoading || previewError || preview) && (
        <div className="preview-overlay" onClick={(e) => { if (e.target === e.currentTarget) closePreview(); }}>
          <div className="preview-modal" role="dialog" aria-modal="true" aria-label="Course Preview">
            {/* Header */}
            <div className="preview-modal-header">
              <div>
                <span className="badge badge-warning" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
                  Pending Review
                </span>
                <h2 className="preview-modal-title">
                  {previewLoading ? 'Loading preview…' : previewCourse?.title || 'Course Preview'}
                </h2>
              </div>
              <button
                className="preview-close-btn"
                onClick={closePreview}
                aria-label="Close preview"
              >✕</button>
            </div>

            {/* Body */}
            <div className="preview-modal-body">
              {previewLoading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
                  <LoadingSpinner />
                </div>
              )}

              {previewError && (
                <div className="alert alert-error">⚠️ {previewError}</div>
              )}

              {preview && previewCourse && (
                <div className="preview-content">
                  {/* ── Course Meta ──────────────────────────────── */}
                  <div className="preview-meta-grid">
                    <div className="preview-thumb-wrap">
                      {previewCourse.thumbnail_url ? (
                        <img src={previewCourse.thumbnail_url} alt={previewCourse.title} className="preview-thumb" />
                      ) : (
                        <div className="preview-thumb-placeholder">📚</div>
                      )}
                    </div>
                    <div className="preview-info-block">
                      <div className="preview-info-row">
                        <span className="preview-label">Category</span>
                        <span className="badge badge-primary">{previewCourse.category}</span>
                      </div>
                      <div className="preview-info-row">
                        <span className="preview-label">Price</span>
                        <strong className="preview-price">
                          {previewCourse.price > 0 ? `$${Number(previewCourse.price).toFixed(2)}` : 'Free'}
                        </strong>
                      </div>
                      <div className="preview-info-row">
                        <span className="preview-label">Instructor</span>
                        <span className="preview-instructor-chip">
                          <span className="preview-instructor-avatar">
                            {previewCourse.instructor?.name?.charAt(0) || '?'}
                          </span>
                          {previewCourse.instructor?.name || 'Unknown'}
                        </span>
                      </div>
                      <div className="preview-info-row">
                        <span className="preview-label">Curriculum</span>
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                          {previewSections.length} sections · {totalLessons} lessons
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── Description ─────────────────────────────── */}
                  {previewCourse.description && (
                    <div className="preview-section-block">
                      <h3 className="preview-section-heading">Description</h3>
                      <p className="preview-description">{previewCourse.description}</p>
                    </div>
                  )}

                  {/* ── Curriculum ──────────────────────────────── */}
                  <div className="preview-section-block">
                    <h3 className="preview-section-heading">Curriculum</h3>
                    {previewSections.length === 0 ? (
                      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                        No sections added yet.
                      </p>
                    ) : (
                      <div className="preview-curriculum">
                        {previewSections.map((section, idx) => (
                          <div key={section.id} className="preview-curriculum-section card-glass">
                            <div
                              className="preview-section-header"
                              onClick={() => toggleSection(section.id)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => e.key === 'Enter' && toggleSection(section.id)}
                            >
                              <div className="preview-section-title-row">
                                <span className="preview-section-number">Section {idx + 1}</span>
                                <span className="preview-section-toggle">
                                  {expandedSections[section.id] ? '▾' : '▸'}
                                </span>
                                <h4>{section.title}</h4>
                              </div>
                              <span className="preview-lesson-count">
                                {section.lessons?.length || 0} lessons
                              </span>
                            </div>

                            {expandedSections[section.id] && (
                              <div className="preview-lessons-list">
                                {(section.lessons || []).length === 0 ? (
                                  <div className="preview-lesson-row" style={{ color: 'var(--color-text-muted)' }}>
                                    No lessons in this section.
                                  </div>
                                ) : (
                                  section.lessons.map((lesson, lIdx) => (
                                    <div key={lesson.id} className="preview-lesson-row">
                                      <span className="preview-lesson-num">{lIdx + 1}.</span>
                                      <span className="preview-lesson-icon">
                                        {lesson.video_url ? '🎬' : '📄'}
                                      </span>
                                      <span className="preview-lesson-title">{lesson.title}</span>
                                      {lesson.duration > 0 && (
                                        <span className="preview-lesson-duration">{lesson.duration} min</span>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Footer: Approve / Reject actions ────────────────────────── */}
            {preview && previewCourse && (
              <div className="preview-modal-footer">
                {modalRejectOpen ? (
                  <div className="preview-reject-form">
                    <textarea
                      className="form-control"
                      placeholder="Reason for rejection (required)…"
                      value={modalRejectReason}
                      onChange={(e) => setModalRejectReason(e.target.value)}
                      rows={3}
                      autoFocus
                    />
                    <div className="preview-footer-actions">
                      <button
                        className="btn btn-danger"
                        onClick={handleModalRejectSubmit}
                        disabled={isProcessingPreview}
                        id="modal-confirm-reject-btn"
                      >
                        {isProcessingPreview ? 'Rejecting…' : '✕ Confirm Reject'}
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => { setModalRejectOpen(false); setModalRejectReason(''); }}
                        disabled={isProcessingPreview}
                      >Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="preview-footer-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={closePreview}
                      disabled={isProcessingPreview}
                    >Close</button>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        className="btn btn-danger"
                        onClick={() => setModalRejectOpen(true)}
                        disabled={isProcessingPreview}
                        id="modal-reject-btn"
                      >✕ Reject</button>
                      <button
                        className="btn btn-success"
                        onClick={handleModalApprove}
                        disabled={isProcessingPreview}
                        id="modal-approve-btn"
                      >
                        {isProcessingPreview ? 'Approving…' : '✓ Approve'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
