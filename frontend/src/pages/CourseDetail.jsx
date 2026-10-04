/**
 * CourseDetail.jsx — Full course detail page.
 *
 * Shows: course info, instructor, curriculum (sections/lessons),
 * reviews, and enroll button for learners.
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
  const [enrolled, setEnrolled] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [previewLesson, setPreviewLesson] = useState(null);

  // Extract YouTube ID helper
  const getYouTubeId = (url) => {
    if (!url) return null;
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  };

  useEffect(() => {
    api.get(`/public/courses/${courseId}`)
      .then((res) => {
        setCourse(res.data.course);
        setSections(res.data.sections);
        setReviews(res.data.reviews);
        // Auto-expand the first section so the preview is immediately visible
        if (res.data.sections?.length > 0) {
          setExpandedSections({ [res.data.sections[0].id]: true });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Check if the learner is already enrolled (only if authenticated learner)
    if (authenticated && primaryRole === 'learner') {
      api.get('/learner/courses')
        .then((res) => {
          const enrollData = res.data.find((e) => e.course_id === courseId);
          if (enrollData) {
            setEnrolled(true);
            setEnrollmentStatus(enrollData.enrollment_status);
          }
        })
        .catch(() => {});
    }
  }, [courseId, primaryRole, authenticated]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await api.post(`/learner/enroll/${courseId}`);
      setEnrolled(true);
      setEnrollmentStatus('pending');
    } catch (err) {
      alert(err.response?.data?.detail || 'Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  };

  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  if (loading) return <div className="page-wrapper"><LoadingSpinner /></div>;
  if (!course) return <div className="page-wrapper container"><div className="empty-state"><h3>Course not found</h3></div></div>;

  const totalLessons = sections.reduce((acc, s) => acc + (s.lessons?.length || 0), 0);
  const totalDuration = sections.reduce(
    (acc, s) => acc + (s.lessons?.reduce((a, l) => a + (l.duration || 0), 0) || 0),
    0
  );

  const ytId = previewLesson ? getYouTubeId(previewLesson.video_url) : null;

  return (
    <div className="page-wrapper">
      {/* ── Preview Modal ───────────────────────────────────────────── */}
      {previewLesson && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setPreviewLesson(null)}
        >
          <div
            style={{ width: '100%', maxWidth: '860px', background: '#111', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.7)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#0056D2', fontWeight: 700, letterSpacing: '0.05em' }}>Free Preview</span>
                <h3 style={{ margin: '0.25rem 0 0', color: '#fff', fontSize: '1.1rem' }}>{previewLesson.title}</h3>
              </div>
              <button
                onClick={() => setPreviewLesson(null)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✕</button>
            </div>
            <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000' }}>
              {ytId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                  title={previewLesson.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                />
              ) : previewLesson.video_url ? (
                <video
                  src={
                    previewLesson.video_url.startsWith('/media/videos/')
                    || previewLesson.video_url.startsWith('/instructor/')
                    || previewLesson.video_url.startsWith('/learner/lessons/')
                      ? `http://localhost:8000/api/v1/public/lessons/${previewLesson.id}/preview/video`
                      : `http://localhost:8000/api/v1${previewLesson.video_url}`
                  }
                  poster={
                    previewLesson.thumbnail_url
                      ? (previewLesson.thumbnail_url.startsWith('/media/') ? `http://localhost:8000${previewLesson.thumbnail_url}` : previewLesson.thumbnail_url)
                      : undefined
                  }
                  controls
                  autoPlay
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                />
              ) : (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                  No video available for this preview lesson.
                </div>
              )}
            </div>
            {previewLesson.content && (
              <div style={{ padding: '1rem 1.25rem', color: '#ccc', fontSize: '0.9rem', maxHeight: '120px', overflowY: 'auto', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                {previewLesson.content}
              </div>
            )}
            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
              {!authenticated ? (
                <button className="btn btn-primary" onClick={login}>
                  Log in to Access Full Course
                </button>
              ) : primaryRole === 'learner' && !enrolled ? (
                <button className="btn btn-primary" onClick={() => { setPreviewLesson(null); handleEnroll(); }}>
                  Enroll Now to Access All Lessons
                </button>
              ) : primaryRole === 'learner' && enrollmentStatus === 'pending' ? (
                <button className="btn btn-secondary" disabled>
                  Enrollment Pending
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

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
                          {section.lessons?.map((lesson) => (
                            <div key={lesson.id} className="lesson-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span className="lesson-icon" style={{ color: lesson.is_preview ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                                {lesson.is_preview ? '▶' : '—'}
                              </span>
                              <span className="lesson-title" style={{ flex: 1 }}>{lesson.title}</span>
                              {lesson.is_preview && (
                                <button
                                  onClick={() => setPreviewLesson(lesson)}
                                  style={{
                                    background: 'linear-gradient(135deg, #0056D2, #0099ff)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '20px',
                                    padding: '0.2rem 0.75rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    letterSpacing: '0.03em',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  ▶ Preview
                                </button>
                              )}
                              {lesson.duration > 0 && (
                                <span className="lesson-duration">{lesson.duration} min</span>
                              )}
                            </div>
                          ))}
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
            <div className="sidebar-card card">
              {course.thumbnail_url ? (
                <img src={course.thumbnail_url.startsWith('/media/') ? `http://localhost:8000${course.thumbnail_url}` : course.thumbnail_url} alt={course.title} className="sidebar-thumb" />
              ) : (
                <div className="sidebar-thumb-placeholder">📚</div>
              )}

              <div className="sidebar-price">
                {course.price > 0 ? `₹${course.price.toFixed(2)}` : 'Free'}
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
                enrolled ? (
                  enrollmentStatus === 'pending' ? (
                    <button className="btn btn-secondary" style={{ width: '100%' }} disabled>
                      Enrollment Pending
                    </button>
                  ) : (
                    <button
                      className="btn btn-success"
                      style={{ width: '100%' }}
                      onClick={() => navigate('/learner')}
                    >
                      ✓ Enrolled — Go to Dashboard
                    </button>
                  )
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
