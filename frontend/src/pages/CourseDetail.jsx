/**
 * CourseDetail.jsx — Full course detail page.
 *
 * Shows: course info, instructor, curriculum (sections/lessons),
 * reviews, and enroll button for learners.
 *
 * Curriculum access logic:
 *   - is_preview lesson: visible to everyone, inline preview
 *   - enrolled + approved: all lessons clickable → LessonViewer
 *   - non-enrolled / logged-out: locked with enroll prompt
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import useAuth from '../hooks/useAuth';
import StarRating from '../components/StarRating';
import ProgressBar from '../components/ProgressBar';
import LoadingSpinner from '../components/LoadingSpinner';
import './CourseDetail.css';

export default function CourseDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { primaryRole, login, authenticated } = useAuth();

  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState(null); // null | "pending" | "approved" | "revoked" | etc.
  const [expandedSections, setExpandedSections] = useState({});
  const [previewLesson, setPreviewLesson] = useState(null); // lesson being previewed inline
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [togglingWishlist, setTogglingWishlist] = useState(false);

  const isEnrolledAndApproved = enrollmentStatus === 'approved';

  useEffect(() => {
    api.get(`/public/courses/${courseId}`)
      .then((res) => {
        setCourse(res.data.course);
        setSections(res.data.sections);
        setReviews(res.data.reviews);
        // Auto-expand first section
        if (res.data.sections.length > 0) {
          setExpandedSections({ [res.data.sections[0].id]: true });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Check enrollment status (only if authenticated learner)
    if (authenticated && primaryRole === 'learner') {
      api.get('/learner/courses')
        .then((res) => {
          const enrollment = res.data.find((e) => e.course_id === courseId);
          setEnrollmentStatus(enrollment?.status || null);
        })
        .catch(() => {});
        
      api.get('/learner/wishlist')
        .then((res) => {
          setIsWishlisted(res.data.some(w => w.course_id === courseId));
        })
        .catch(() => {});
    }
  }, [courseId, primaryRole, authenticated]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await api.post(`/learner/enroll/${courseId}`);
      setEnrollmentStatus('pending');
    } catch (err) {
      alert(err.response?.data?.detail || 'Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  };

  const handleWishlistToggle = async () => {
    if (!authenticated) {
      login();
      return;
    }
    setTogglingWishlist(true);
    try {
      if (isWishlisted) {
        await api.delete(`/learner/wishlist/${courseId}`);
        setIsWishlisted(false);
      } else {
        await api.post(`/learner/wishlist/${courseId}`);
        setIsWishlisted(true);
      }
    } catch (err) {
      alert("Failed to update wishlist");
    } finally {
      setTogglingWishlist(false);
    }
  };

  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const handleLessonClick = (lesson) => {
    if (lesson.is_preview) {
      // Toggle inline preview panel
      setPreviewLesson(prev => prev?.id === lesson.id ? null : lesson);
      return;
    }
    if (isEnrolledAndApproved) {
      navigate(`/learner/courses/${courseId}`);
      return;
    }
    // Not accessible — scroll to enroll CTA
    document.getElementById('enroll-cta')?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) return <div className="page-wrapper"><LoadingSpinner /></div>;
  if (!course) return <div className="page-wrapper container"><div className="empty-state"><h3>Course not found</h3></div></div>;

  const totalLessons = sections.reduce((acc, s) => acc + (s.lessons?.length || 0), 0);
  const totalDuration = sections.reduce(
    (acc, s) => acc + (s.lessons?.reduce((a, l) => a + (l.duration || 0), 0) || 0),
    0
  );

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="course-detail-layout animate-fade-in">
          {/* ── Main Content ──────────────────────────────────────── */}
          <div className="course-detail-main">
            {/* Header */}
            <div className="course-detail-header">
              <span className="badge badge-primary">{course.category}</span>
              <h1 className="course-detail-title">{course.title}</h1>
              <div className="course-detail-meta">
                <div className="course-meta-item">
                  <StarRating rating={course.avg_rating || 0} />
                  <span>{(course.avg_rating || 0).toFixed(1)} ({reviews.length} reviews)</span>
                </div>
                <span className="meta-divider">•</span>
                <span>{totalLessons} lessons</span>
                <span className="meta-divider">•</span>
                <span>{totalDuration} min total</span>
              </div>
              <p className="course-detail-desc">{course.description}</p>
            </div>

            {/* Curriculum */}
            <div className="course-curriculum">
              <h2>Curriculum</h2>
              {!isEnrolledAndApproved && (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                  🔓 Preview lessons are free. All other lessons require enrollment.
                </p>
              )}
              {sections.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)' }}>No content yet.</p>
              ) : (
                <div className="curriculum-list">
                  {sections.map((section) => (
                    <div key={section.id} className="curriculum-section card-glass">
                      <div
                        className="section-header-row"
                        onClick={() => toggleSection(section.id)}
                      >
                        <div className="section-title-row">
                          <span className="section-toggle">
                            {expandedSections[section.id] ? '▾' : '▸'}
                          </span>
                          <h4>{section.title}</h4>
                        </div>
                        <span className="section-lesson-count">
                          {section.lessons?.length || 0} lessons
                        </span>
                      </div>

                      {expandedSections[section.id] && (
                        <div className="section-lessons">
                          {section.lessons?.map((lesson) => {
                            const canAccess = lesson.is_preview || isEnrolledAndApproved;
                            return (
                              <div key={lesson.id}>
                                <div
                                  className={`lesson-row ${canAccess ? 'lesson-accessible' : 'lesson-locked'}`}
                                  onClick={() => handleLessonClick(lesson)}
                                  style={{ cursor: canAccess ? 'pointer' : 'default' }}
                                >
                                  <span className="lesson-icon">
                                    {lesson.is_preview ? '▶' : isEnrolledAndApproved ? '📄' : '🔒'}
                                  </span>
                                  <span className="lesson-title">{lesson.title}</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                                    {lesson.is_preview && (
                                      <span style={{
                                        fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px',
                                        background: '#22c55e', color: '#fff',
                                        borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em'
                                      }}>
                                        Free Preview
                                      </span>
                                    )}
                                    {lesson.duration > 0 && (
                                      <span className="lesson-duration">{lesson.duration} min</span>
                                    )}
                                  </div>
                                </div>

                                {/* Inline preview panel — visible only when this preview lesson is active */}
                                {previewLesson?.id === lesson.id && lesson.is_preview && (
                                  <div style={{
                                    background: 'rgba(0,0,0,0.04)', borderRadius: '8px',
                                    margin: '0.5rem 1rem 1rem', padding: '1rem',
                                    borderLeft: '3px solid var(--color-primary)'
                                  }}>
                                    <div style={{ fontWeight: '600', marginBottom: '0.75rem' }}>
                                      ▶ Preview: {lesson.title}
                                    </div>
                                    {lesson.video_url ? (
                                      <video
                                        controls
                                        style={{ width: '100%', borderRadius: '6px', maxHeight: '360px' }}
                                        src={`http://localhost:8000/api/v1/public/lessons/${lesson.id}/preview/video`}
                                      />
                                    ) : lesson.content ? (
                                      <p style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)', margin: 0 }}>{lesson.content}</p>
                                    ) : (
                                      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', margin: 0 }}>
                                        No preview content available for this lesson.
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Enroll-to-unlock prompt at bottom of each locked section */}
                          {!isEnrolledAndApproved && section.lessons?.some(l => !l.is_preview) && (
                            <div style={{
                              padding: '0.75rem 1rem',
                              background: 'rgba(0,86,210,0.07)',
                              borderRadius: '6px',
                              margin: '0.25rem 0',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              fontSize: 'var(--text-sm)'
                            }}>
                              <span>🔒 {section.lessons.filter(l => !l.is_preview).length} lesson{section.lessons.filter(l => !l.is_preview).length !== 1 ? 's' : ''} locked</span>
                              <button
                                className="btn btn-primary"
                                style={{ padding: '4px 14px', fontSize: '0.8rem' }}
                                onClick={() => document.getElementById('enroll-cta')?.scrollIntoView({ behavior: 'smooth' })}
                              >
                                Enroll to unlock
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reviews */}
            <div className="course-reviews">
              <h2>Reviews</h2>
              {reviews.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)' }}>No reviews yet.</p>
              ) : (
                <div className="reviews-list">
                  {reviews.map((review) => (
                    <div key={review.id} className="review-card card-glass">
                      <div className="review-header">
                        <div className="review-author">
                          <div className="review-avatar">
                            {review.learner_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <strong>{review.learner_name || 'Anonymous'}</strong>
                            <StarRating rating={review.rating} size="small" />
                          </div>
                        </div>
                        <span className="review-date">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {review.comment && <p className="review-comment">{review.comment}</p>}
                      {review.instructor_reply && (
                        <div className="review-instructor-reply" style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', borderLeft: '3px solid var(--color-primary)' }}>
                          <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: '0.25rem', fontWeight: 'bold' }}>Instructor Reply</div>
                          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{review.instructor_reply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Sidebar ───────────────────────────────────────────── */}
          <aside className="course-detail-sidebar">
            <div className="sidebar-card card" id="enroll-cta">
              {course.thumbnail_url ? (
                <img src={course.thumbnail_url} alt={course.title} className="sidebar-thumb" />
              ) : (
                <div className="sidebar-thumb-placeholder">📚</div>
              )}

              <div className="sidebar-price">
                {course.price > 0 ? `$${course.price.toFixed(2)}` : 'Free'}
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <button
                  className="btn btn-outline"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={handleWishlistToggle}
                  disabled={togglingWishlist}
                >
                  <span style={{ color: isWishlisted ? 'red' : 'inherit' }}>
                    {isWishlisted ? '❤️' : '🤍'}
                  </span>
                  {isWishlisted ? 'Wishlisted' : 'Add to Wishlist'}
                </button>
              </div>

              {/* Visitor: not logged in */}
              {!authenticated && (
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={login}
                  id="enroll-login-button"
                >
                  Log in to Enroll
                </button>
              )}

              {/* Authenticated learner */}
              {authenticated && primaryRole === 'learner' && (
                isEnrolledAndApproved ? (
                  <button
                    className="btn btn-success"
                    style={{ width: '100%' }}
                    onClick={() => navigate(`/learner/courses/${courseId}`)}
                  >
                    ✓ Enrolled — Start Learning
                  </button>
                ) : enrollmentStatus === 'pending' ? (
                  <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(255,150,0,0.1)', borderRadius: '8px', fontSize: 'var(--text-sm)' }}>
                    ⏳ Enrollment pending approval
                  </div>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={handleEnroll}
                    disabled={enrolling}
                    id="enroll-button"
                  >
                    {enrolling ? 'Enrolling...' : 'Enroll Now'}
                  </button>
                )
              )}

              <div className="sidebar-stats">
                <div className="sidebar-stat">
                  <span>📚</span> {totalLessons} Lessons
                </div>
                <div className="sidebar-stat">
                  <span>⏱️</span> {totalDuration} Minutes
                </div>
                <div className="sidebar-stat">
                  <span>📂</span> {sections.length} Sections
                </div>
                <div className="sidebar-stat">
                  <span>⭐</span> {(course.avg_rating || 0).toFixed(1)} Rating
                </div>
              </div>

              {/* Instructor Info */}
              {course.instructor && (
                <div className="sidebar-instructor">
                  <h4>Instructor</h4>
                  <div className="instructor-info">
                    <div className="instructor-avatar">
                      {course.instructor.name?.charAt(0) || '?'}
                    </div>
                    <span>{course.instructor.name}</span>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
