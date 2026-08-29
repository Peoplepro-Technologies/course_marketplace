/**
 * LearnerDashboard.jsx — Dashboard for external learners.
 *
 * Shows:
 *   - Enrolled courses with progress bars
 *   - Link to resume learning (LessonViewer)
 *   - "Request Refund" button for courses with approved enrollment status
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import ProgressBar from '../../components/ProgressBar';
import LoadingSpinner from '../../components/LoadingSpinner';

/** Inline refund request form rendered below a course card. */
function RefundRequestForm({ enrollmentId, onSuccess, onCancel }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setErr('Please enter a reason for your refund request.');
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      await api.post('/learner/refund-request', {
        enrollment_id: enrollmentId,
        reason: reason.trim(),
      });
      onSuccess();
    } catch (e) {
      setErr(e.response?.data?.detail || 'Failed to submit refund request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 'var(--radius-md)',
      padding: 'var(--space-md)', marginTop: 'var(--space-sm)',
    }}>
      <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 'var(--space-xs)' }}>
        Reason for refund:
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Describe why you are requesting a refund..."
        rows={3}
        style={{
          width: '100%', boxSizing: 'border-box', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-border)', padding: '8px', fontSize: 'var(--text-sm)',
          resize: 'vertical', marginBottom: 'var(--space-xs)',
        }}
      />
      {err && <p style={{ color: '#dc3545', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-xs)' }}>{err}</p>}
      <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleSubmit}
          disabled={submitting}
          style={{ fontSize: '12px' }}
        >
          {submitting ? 'Submitting...' : 'Submit Request'}
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={onCancel}
          disabled={submitting}
          style={{ fontSize: '12px' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function LearnerDashboard() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refundOpen, setRefundOpen] = useState({}); // { [enrollmentId]: bool }
  const [refundSuccess, setRefundSuccess] = useState({}); // { [enrollmentId]: bool }
  const [toast, setToast] = useState(null);

  const loadEnrollments = () => {
    api.get('/learner/courses')
      .then((res) => setEnrollments(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadEnrollments(); }, []);

  const handleRefundSuccess = (enrollmentId) => {
    setRefundOpen((prev) => ({ ...prev, [enrollmentId]: false }));
    setRefundSuccess((prev) => ({ ...prev, [enrollmentId]: true }));
    setToast('Refund request submitted! The accounts team will review it shortly.');
    setTimeout(() => setToast(null), 4000);
    loadEnrollments(); // refresh to show has_pending_refund = true
  };

  if (loading) return <div className="page-wrapper"><LoadingSpinner /></div>;

  return (
    <div className="page-wrapper container">
      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: 80, right: 24, zIndex: 9999,
          background: '#d4edda', color: '#155724',
          padding: '12px 20px', borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)', fontWeight: 600, fontSize: 'var(--text-sm)',
          maxWidth: 360,
        }}>
          ✓ {toast}
        </div>
      )}

      <div className="section-header flex-between">
        <div>
          <h2>My Learning</h2>
          <p>Pick up where you left off</p>
        </div>
        <div className="flex" style={{ gap: '0.75rem' }}>
          <Link to="/learner/live-classes" className="btn btn-secondary" id="learner-nav-live-classes">
            🎥 Live Classes
          </Link>
          <Link to="/learner/purchases" className="btn btn-secondary">
            🧾 Purchases
          </Link>
        </div>
      </div>

      {enrollments.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon">🎒</div>
          <h3>You aren't enrolled in any courses</h3>
          <p style={{ marginBottom: '1.5rem' }}>Start exploring the catalog to find your next course.</p>
          <Link to="/" className="btn btn-primary">Browse Catalog</Link>
        </div>
      ) : (
        <div className="grid grid-3">
          {enrollments.map((enrollment) => {
            const isRefunded = enrollment.enrollment_status === 'refunded';
            const isPendingRefund = enrollment.has_pending_refund;
            const canRefund = enrollment.enrollment_status === 'approved' && !isPendingRefund;
            const showRefundForm = refundOpen[enrollment.enrollment_id];

            return (
              <div key={enrollment.enrollment_id} className="card flex-col gap-sm" style={{ padding: 0, overflow: 'hidden', opacity: isRefunded ? 0.75 : 1 }}>
                {/* Thumbnail */}
                <div style={{ height: '140px', background: 'var(--color-bg-tertiary)', position: 'relative' }}>
                  {enrollment.course_thumbnail ? (
                    <img src={enrollment.course_thumbnail} alt={enrollment.course_title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div className="flex-center" style={{ width: '100%', height: '100%', fontSize: '2rem' }}>📚</div>
                  )}
                  <div style={{ position: 'absolute', bottom: '0.5rem', left: '0.5rem', background: 'rgba(0,0,0,0.6)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                    {enrollment.course_category}
                  </div>
                  {/* Refunded badge */}
                  {isRefunded && (
                    <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: '#dc3545', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                      Refunded
                    </div>
                  )}
                </div>

                {/* Content */}
                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h4 style={{ fontSize: 'var(--text-base)', lineHeight: 1.4, margin: 0 }}>
                    {enrollment.course_title}
                  </h4>
                  <div style={{ flex: 1 }}>
                    <ProgressBar percent={enrollment.progress_percent} label={`${enrollment.completed_lessons} / ${enrollment.total_lessons} lessons`} />
                  </div>

                  {/* Action row */}
                  <div className="flex-between" style={{ marginTop: 'auto' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      Enrolled {new Date(enrollment.enrolled_at).toLocaleDateString()}
                    </span>
                    {isRefunded ? (
                      <span style={{ fontSize: 'var(--text-xs)', color: '#dc3545', fontWeight: 600 }}>Access revoked</span>
                    ) : (
                      <Link to={`/learner/course/${enrollment.course_id}/learn`} className="btn btn-primary btn-sm">
                        {enrollment.progress_percent === 0 ? 'Start' : 'Resume'}
                      </Link>
                    )}
                  </div>

                  {/* Refund section — only for approved enrollments */}
                  {!isRefunded && (
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-sm)' }}>
                      {isPendingRefund ? (
                        <div style={{ fontSize: 'var(--text-xs)', color: '#856404', background: '#FFF3CD', padding: '4px 10px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                          ⏳ Refund request pending review
                        </div>
                      ) : canRefund ? (
                        <>
                          {!showRefundForm ? (
                            <button
                              id={`learner-refund-btn-${enrollment.enrollment_id}`}
                              className="btn btn-secondary btn-sm"
                              onClick={() => setRefundOpen((prev) => ({ ...prev, [enrollment.enrollment_id]: true }))}
                              style={{ width: '100%', fontSize: '12px', color: '#dc3545', borderColor: '#dc3545' }}
                            >
                              💸 Request Refund
                            </button>
                          ) : (
                            <RefundRequestForm
                              enrollmentId={enrollment.enrollment_id}
                              onSuccess={() => handleRefundSuccess(enrollment.enrollment_id)}
                              onCancel={() => setRefundOpen((prev) => ({ ...prev, [enrollment.enrollment_id]: false }))}
                            />
                          )}
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
