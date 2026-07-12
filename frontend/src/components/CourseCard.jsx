/**
 * CourseCard.jsx — Reusable course card for catalog/dashboard displays.
 */

import { Link } from 'react-router-dom';
import StarRating from './StarRating';
import './CourseCard.css';

export default function CourseCard({ course, showStatus = false }) {
  return (
    <Link to={`/course/${course.id}`} className="course-card animate-fade-in" id={`course-card-${course.id}`}>
      {/* Thumbnail */}
      <div className="course-card-thumb">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} />
        ) : (
          <div className="course-card-thumb-placeholder">
            <span>📚</span>
          </div>
        )}
        {showStatus && (
          <span className={`badge badge-${
            course.status === 'published' ? 'success' :
            course.status === 'draft' ? 'warning' :
            course.status === 'flagged' ? 'danger' : 'primary'
          } course-status-badge`}>
            {course.status}
          </span>
        )}
        <div className="course-card-category">{course.category}</div>
      </div>

      {/* Info */}
      <div className="course-card-body">
        <h4 className="course-card-title">{course.title}</h4>
        <p className="course-card-desc">
          {course.description?.substring(0, 100)}
          {course.description?.length > 100 ? '...' : ''}
        </p>

        <div className="course-card-footer">
          <div className="course-card-rating">
            <StarRating rating={course.avg_rating || 0} size="small" />
            <span className="rating-value">{(course.avg_rating || 0).toFixed(1)}</span>
          </div>
          <div className="course-card-price">
            {course.price > 0 ? `$${course.price.toFixed(2)}` : 'Free'}
          </div>
        </div>
      </div>
    </Link>
  );
}
