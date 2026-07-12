/**
 * StarRating.jsx — Star rating display and input component.
 *
 * Props:
 *   - rating: number (0-5) — current rating value
 *   - onRate: function(rating) — callback when a star is clicked (makes it interactive)
 *   - size: "small" | "normal" | "large"
 */

export default function StarRating({ rating = 0, onRate, size = 'normal' }) {
  const stars = [1, 2, 3, 4, 5];

  const sizeMap = {
    small: '0.875rem',
    normal: '1.25rem',
    large: '1.75rem',
  };

  return (
    <div className="stars" style={{ fontSize: sizeMap[size] }}>
      {stars.map((star) => (
        <span
          key={star}
          className={`star ${star <= Math.round(rating) ? 'filled' : ''} ${onRate ? 'clickable' : ''}`}
          onClick={() => onRate && onRate(star)}
          role={onRate ? 'button' : undefined}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}
