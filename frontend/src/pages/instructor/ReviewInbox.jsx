/**
 * ReviewInbox.jsx — Instructor review inbox with reply functionality.
 *
 * Shows all reviews across instructor's courses.
 * Allows adding or editing a reply per review inline.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import './ReviewInbox.css';

function StarRating({ rating }) {
  return (
    <span className="stars" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`star${n <= rating ? ' filled' : ''}`}>★</span>
      ))}
    </span>
  );
}

export default function ReviewInbox() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Per-review state: { [reviewId]: { draft, saving, saved, error } }
  const [replyState, setReplyState] = useState({});

  useEffect(() => {
    api.get('/instructor/reviews')
      .then((res) => {
        setReviews(res.data);
        // Pre-fill draft with any existing reply
        const initial = {};
        res.data.forEach((r) => {
          initial[r.id] = {
            draft: r.instructor_reply || '',
            saving: false,
            saved: false,
            error: null,
          };
        });
        setReplyState(initial);
      })
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load reviews'))
      .finally(() => setLoading(false));
  }, []);

  const handleDraftChange = (reviewId, value) => {
    setReplyState((prev) => ({
      ...prev,
      [reviewId]: { ...prev[reviewId], draft: value, saved: false, error: null },
    }));
  };

  const submitReply = async (reviewId) => {
    const draft = replyState[reviewId]?.draft?.trim();
    if (!draft) return;

    setReplyState((prev) => ({
      ...prev,
      [reviewId]: { ...prev[reviewId], saving: true, error: null, saved: false },
    }));

    try {
      const res = await api.put(`/instructor/reviews/${reviewId}/reply`, { reply: draft });
      // Update the review list so the saved reply shows immediately
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, instructor_reply: res.data.instructor_reply } : r
        )
      );
      setReplyState((prev) => ({
        ...prev,
        [reviewId]: { ...prev[reviewId], saving: false, saved: true },
      }));
    } catch (err) {
      setReplyState((prev) => ({
        ...prev,
        [reviewId]: {
          ...prev[reviewId],
          saving: false,
          error: err.response?.data?.detail || 'Failed to save reply',
        },
      }));
    }
  };

  if (loading) return <div className="page-wrapper"><LoadingSpinner /></div>;

  return (
    <div className="page-wrapper container animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="section-header flex-between">
        <div>
          <h2>📬 Review Inbox</h2>
          <p>Read learner feedback and reply to reviews on your courses.</p>
        </div>
        <Link to="/instructor" className="btn btn-secondary">
          ← Dashboard
        </Link>
      </div>

      {/* ── Error ──────────────────────────────────────────────────── */}
      {error && (
        <div className="ri-alert ri-alert-error">
          ⚠️ {error}
        </div>
      )}

      {/* ── Empty State ─────────────────────────────────────────────── */}
      {!error && reviews.length === 0 && (
        <div className="empty-state ri-empty">
          <div className="empty-icon">💬</div>
          <h3>No reviews yet</h3>
          <p>Learner reviews on your published courses will appear here.</p>
        </div>
      )}

      {/* ── Review Cards ────────────────────────────────────────────── */}
      <div className="ri-list">
        {reviews.map((review, idx) => {
          const rs = replyState[review.id] || { draft: '', saving: false, saved: false, error: null };
          const hasExistingReply = Boolean(review.instructor_reply);
          const draftChanged = rs.draft.trim() !== (review.instructor_reply || '').trim();

          return (
            <div
              key={review.id}
              className="ri-card animate-fade-in-up"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              {/* ── Top row: course badge + date ─── */}
              <div className="ri-card-header">
                <span className="ri-course-badge">📚 {review.course_title}</span>
                <span className="ri-date">
                  {new Date(review.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </span>
              </div>

              {/* ── Learner info + stars ─────────── */}
              <div className="ri-learner-row">
                <div className="ri-avatar">{review.learner_name?.[0]?.toUpperCase() || '?'}</div>
                <div>
                  <span className="ri-learner-name">{review.learner_name}</span>
                  <div className="ri-stars-row">
                    <StarRating rating={review.rating} />
                    <span className="ri-rating-num">{review.rating}/5</span>
                  </div>
                </div>
              </div>

              {/* ── Comment ─────────────────────── */}
              {review.comment && (
                <p className="ri-comment">"{review.comment}"</p>
              )}

              {/* ── Existing reply quote ─────────── */}
              {hasExistingReply && !draftChanged && (
                <div className="ri-existing-reply">
                  <span className="ri-reply-label">Your reply</span>
                  <p>{review.instructor_reply}</p>
                </div>
              )}

              {/* ── Reply textarea + submit ──────── */}
              <div className="ri-reply-form">
                <label htmlFor={`reply-${review.id}`} className="ri-textarea-label">
                  {hasExistingReply ? 'Edit your reply' : 'Write a reply'}
                </label>
                <textarea
                  id={`reply-${review.id}`}
                  className="ri-textarea"
                  rows={3}
                  placeholder="Share your thoughts with the learner…"
                  value={rs.draft}
                  onChange={(e) => handleDraftChange(review.id, e.target.value)}
                  disabled={rs.saving}
                />

                <div className="ri-reply-actions">
                  {rs.error && <span className="ri-inline-error">⚠️ {rs.error}</span>}
                  {rs.saved && <span className="ri-inline-success">✓ Reply saved</span>}
                  <button
                    id={`submit-reply-${review.id}`}
                    className="btn btn-primary btn-sm"
                    onClick={() => submitReply(review.id)}
                    disabled={rs.saving || !rs.draft.trim() || !draftChanged}
                  >
                    {rs.saving ? 'Saving…' : hasExistingReply ? 'Update Reply' : 'Post Reply'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
