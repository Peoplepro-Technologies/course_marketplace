/**
 * ReviewForm.jsx — Form to submit a course review.
 */

import { useState } from 'react';
import api from '../../api/axios';
import StarRating from '../../components/StarRating';

export default function ReviewForm({ courseId, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Please select a star rating.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.post('/learner/reviews', {
        course_id: courseId,
        rating,
        comment,
      });
      alert('Review submitted successfully!');
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex-col gap-md">
      {error && <div className="badge badge-danger" style={{ padding: '0.5rem', display: 'block', textTransform: 'none' }}>{error}</div>}
      
      <div className="form-group">
        <label>Rating</label>
        <StarRating rating={rating} onRate={setRating} size="large" />
      </div>

      <div className="form-group">
        <label htmlFor="comment">Comment (Optional)</label>
        <textarea
          id="comment"
          rows="4"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What did you think of the course?"
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
        <button type="button" className="btn btn-secondary" onClick={onSuccess}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting || rating === 0}>
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </form>
  );
}
