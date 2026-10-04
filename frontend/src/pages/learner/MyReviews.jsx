import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Star, BookOpen, MessageSquare, Calendar } from 'lucide-react';
import EmptyState from '../../components/EmptyState';

function StarRating({ rating }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          size={14}
          fill={s <= rating ? '#f59e0b' : 'none'}
          color={s <= rating ? '#f59e0b' : '#d1d5db'}
        />
      ))}
    </div>
  );
}

export default function MyReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/learner/my-reviews')
      .then(res => setReviews(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '24px' }}>Loading your reviews...</div>;

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <MessageSquare size={24} /> My Reviews
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '28px', fontSize: '14px' }}>
        All reviews you have submitted across courses.
      </p>

      {reviews.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No Reviews Yet" message="You haven't reviewed any courses yet." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reviews.map(review => (
            <div key={review.id} style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
              border: '1px solid #eaeaea',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <BookOpen size={18} color="#0056D2" />
                  <span style={{ fontWeight: '600', fontSize: '15px' }}>{review.course_title}</span>
                </div>
                <StarRating rating={review.rating} />
              </div>
              {review.comment && (
                <p style={{ color: '#374151', fontSize: '14px', lineHeight: 1.6, margin: '0 0 12px 0' }}>
                  "{review.comment}"
                </p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9ca3af', fontSize: '13px' }}>
                <Calendar size={13} />
                {new Date(review.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
