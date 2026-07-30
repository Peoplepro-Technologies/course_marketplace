/**
 * LessonViewer.jsx — Interface for viewing course lessons and updating progress.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import ReviewForm from './ReviewForm';
import VideoPlayer from '../../components/VideoPlayer';
import keycloak from '../../auth/keycloak';
import './LessonViewer.css';

export default function LessonViewer() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [activeLesson, setActiveLesson] = useState(null);
  const [progressData, setProgressData] = useState({});
  const [loading, setLoading] = useState(true);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  useEffect(() => {
    // We need the curriculum and the user's progress. 
    // Since we don't have a specific endpoint for "learner course detail with progress",
    // we'll fetch the public course detail, then loop over lessons and construct progress map,
    // or just track it locally. Actually, learner can fetch public detail. 
    // Wait, we need an endpoint to get the user's progress. We don't have a GET /learner/progress endpoint.
    // We'll manage progress locally for the UI based on what we submit, or just show completion toggle.

    api.get(`/public/courses/${courseId}`)
      .then((res) => {
        setCourse(res.data.course);
        setSections(res.data.sections);
        // Default to first lesson
        if (res.data.sections.length > 0 && res.data.sections[0].lessons.length > 0) {
          setActiveLesson(res.data.sections[0].lessons[0]);
        }
      })
      .catch((err) => {
        console.error(err);
        alert('Could not load course');
        navigate('/learner');
      })
      .finally(() => setLoading(false));
  }, [courseId, navigate]);

  const handleLessonSelect = (lesson) => {
    setActiveLesson(lesson);
  };

  const markComplete = async () => {
    if (!activeLesson) return;
    try {
      await api.put('/learner/progress', {
        lesson_id: activeLesson.id,
        status: 'completed'
      });
      setProgressData((prev) => ({ ...prev, [activeLesson.id]: 'completed' }));
      // Optional: Auto-advance to next lesson
    } catch (err) {
      console.error(err);
      alert('Failed to update progress');
    }
  };

  if (loading) return <div className="page-wrapper"><LoadingSpinner /></div>;
  if (!course) return null;

  return (
    <div className="lesson-viewer-layout">
      {/* ── Sidebar Curriculum ────────────────────────────────────────── */}
      <aside className="lesson-sidebar">
        <div className="sidebar-header">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/learner')} style={{ marginBottom: '1rem', width: '100%' }}>
            ← Back to Dashboard
          </button>
          <h3 style={{ fontSize: 'var(--text-lg)' }}>{course.title}</h3>
        </div>
        <div className="sidebar-sections">
          {sections.map((section) => (
            <div key={section.id} className="sidebar-section">
              <div className="section-title">{section.title}</div>
              <div className="section-lessons-list">
                {section.lessons?.map((lesson) => (
                  <div
                    key={lesson.id}
                    className={`sidebar-lesson ${activeLesson?.id === lesson.id ? 'active' : ''} ${progressData[lesson.id] === 'completed' ? 'completed' : ''}`}
                    onClick={() => handleLessonSelect(lesson)}
                  >
                    <span className="status-icon">
                      {progressData[lesson.id] === 'completed' ? '✓' : '○'}
                    </span>
                    <span className="lesson-name">{lesson.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main Content Area ─────────────────────────────────────────── */}
      <main className="lesson-content-area">
        <header className="content-header">
          <h2>{activeLesson ? activeLesson.title : 'Select a lesson'}</h2>
          <div className="header-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => setReviewModalOpen(true)}>
              ★ Leave a Review
            </button>
            <button 
              className={`btn ${progressData[activeLesson?.id] === 'completed' ? 'btn-success' : 'btn-primary'} btn-sm`}
              onClick={markComplete}
              disabled={!activeLesson || progressData[activeLesson.id] === 'completed'}
            >
              {progressData[activeLesson?.id] === 'completed' ? '✓ Completed' : 'Mark as Complete'}
            </button>
          </div>
        </header>

        <div className="content-body card-glass">
          {activeLesson ? (
            <div className="lesson-text-content">
              {/* Video player — shown above text when lesson has a video */}
              {activeLesson.video_url && (
                <VideoPlayer
                  src={
                    activeLesson.video_url.startsWith('/media/videos/')
                      ? `http://localhost:8000/api/v1/learner/lessons/${activeLesson.id}/video?token=${keycloak.token}`
                      : `http://localhost:8000/api/v1${activeLesson.video_url}?token=${keycloak.token}`
                  }
                />
              )}
              {/* Text / markdown content */}
              <p style={{ whiteSpace: 'pre-wrap' }}>{activeLesson.content || (activeLesson.video_url ? '' : 'No content provided for this lesson.')}</p>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">☝️</div>
              <h3>Select a lesson from the sidebar to begin</h3>
            </div>
          )}
        </div>
      </main>

      <Modal isOpen={reviewModalOpen} onClose={() => setReviewModalOpen(false)} title="Review Course">
        <ReviewForm courseId={courseId} onSuccess={() => setReviewModalOpen(false)} />
      </Modal>
    </div>
  );
}
