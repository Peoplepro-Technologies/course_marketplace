/**
 * CourseCard.jsx — Reusable course card for catalog/dashboard displays.
 *
 * Shows: thumbnail (consistent 16:9 aspect via object-fit:cover),
 *        category badge, title, instructor name (secondary/muted),
 *        star rating, and price.
 */

import { Link } from "react-router-dom";
import StarRating from "./StarRating";
import { BookOpen } from "lucide-react";
import "./CourseCard.css";

export default function CourseCard({ course, showStatus = false }) {
  const instructorName = course.instructor?.name || null;
  const rating = course.avg_rating || 0;

  return (
    <Link
      to={`/course/${course.id}`}
      className="course-card animate-fade-in"
      id={`course-card-${course.id}`}
    >
      {/* ── Thumbnail ─────────────────────────────────────────── */}
      <div className="course-card-thumb">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            loading="lazy"
          />
        ) : (
          <div className="course-card-thumb-placeholder">
            <span className="thumb-icon" aria-hidden="true">
              <BookOpen size={48} strokeWidth={1} />
            </span>
          </div>
        )}

        <div className="course-card-category">
          {course.category}
        </div>

        {showStatus && (
          <span
            className={`badge badge-${
              course.status === "published" ? "success"
              : course.status === "draft" ? "warning"
              : course.status === "flagged" ? "danger"
              : "primary"
            } course-status-badge`}
          >
            {course.status}
          </span>
        )}
      </div>

      {/* ── Body ──────────────────────────────────────────────── */}
      <div className="course-card-body">
        <h4 className="course-card-title">{course.title}</h4>

        {instructorName && (
          <p className="course-card-instructor">
            {instructorName}
          </p>
        )}

        {/* Rating row */}
        <div className="course-card-rating">
          <span className="rating-value">{rating.toFixed(1)}</span>
          <StarRating rating={rating} size="small" />
        </div>

        {/* Footer: price */}
        <div className="course-card-footer">
          <div className="course-card-price">
            {course.price > 0 ? (
              <>
                <span className="price-currency">₹</span>
                {course.price.toFixed(2)}
              </>
            ) : (
              <span className="price-free">Free</span>
            )}
          </div>
          <span className="course-card-cta">View course →</span>
        </div>
      </div>
    </Link>
  );
}
