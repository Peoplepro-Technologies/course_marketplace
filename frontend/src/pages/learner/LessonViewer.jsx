/**
 * LessonViewer.jsx — Interface for viewing course lessons and updating progress.
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams, setSearchParams] = useSearchParams();

  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [activeLesson, setActiveLesson] = useState(null);
  const [progressData, setProgressData] = useState({});
  const [loading, setLoading] = useState(true);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [transcript, setTranscript] = useState(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(true); // Open by default for easier viewing
  const [transcriptTab, setTranscriptTab] = useState('timestamps'); // 'timestamps' | 'text'
  const [searchQuery, setSearchQuery] = useState('');

  const playerRef = useRef(null);

  useEffect(() => {
    // Fetch the authenticated learner course detail (contains full video_url and content)
    const courseDetailPromise = api.get(`/learner/courses/${courseId}`);
    // Fetch persisted progress — this also verifies enrollment (403 if not enrolled)
    const progressPromise = api.get(`/learner/courses/${courseId}/progress`);

    Promise.all([courseDetailPromise, progressPromise])
      .then(([courseRes, progressRes]) => {
        setCourse(courseRes.data.course);
        setSections(courseRes.data.sections);
        // Restore progress from backend
        const completedIds = progressRes.data.completed_lesson_ids || [];
        const progressMap = {};
        completedIds.forEach((id) => { progressMap[id] = 'completed'; });
        setProgressData(progressMap);
        // Default to lesson from URL or first lesson
        let defaultLesson = null;
        const initialLessonId = searchParams.get('lessonId');
        if (initialLessonId && courseRes.data.sections) {
          for (const sec of courseRes.data.sections) {
            const found = sec.lessons?.find(l => String(l.id) === initialLessonId);
            if (found) {
              defaultLesson = found;
              break;
            }
          }
        }
        if (!defaultLesson && courseRes.data.sections.length > 0 && courseRes.data.sections[0].lessons?.length > 0) {
          defaultLesson = courseRes.data.sections[0].lessons[0];
        }
        if (defaultLesson) {
          setActiveLesson(defaultLesson);
        }
      })
      .catch((err) => {
        const status = err.response?.status;
        if (status === 403 || status === 401) {
          // Not enrolled or not authenticated — redirect to course page
          navigate(`/course/${courseId}`);
        } else {
          console.error(err);
          alert('Could not load course');
          navigate('/learner');
        }
      })
      .finally(() => setLoading(false));
  }, [courseId, navigate]);

  // Fetch transcript whenever the active lesson changes (only if it has a video)
  useEffect(() => {
    if (!activeLesson?.video_url) {
      setTranscript(null);
      return;
    }
    setTranscriptLoading(true);
    setTranscript(null);
    api.get(`/transcripts/lesson/${activeLesson.id}`)
      .then((res) => setTranscript(res.data))
      .catch(() => setTranscript(null))  // 404 means not ready yet — silently hide panel
      .finally(() => setTranscriptLoading(false));
  }, [activeLesson?.id]);

  const handleLessonSelect = (lesson) => {
    setActiveLesson(lesson);
    setSearchQuery('');
    setSearchParams(params => {
      params.set('lessonId', lesson.id);
      params.delete('t');
      return params;
    }, { replace: true });
  };

  const formatTime = (seconds) => {
    if (seconds == null || isNaN(seconds)) return '00:00';
    const totalSecs = Math.floor(seconds);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (seconds) => {
    if (playerRef.current) {
      playerRef.current.currentTime(seconds);
      playerRef.current.play();
    }
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

  const filteredSegments = (transcript?.segments || []).filter((seg) => {
    if (!searchQuery.trim()) return true;
    return seg.text.toLowerCase().includes(searchQuery.toLowerCase());
  });

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
                  onPlayerReady={(p) => { 
                    playerRef.current = p; 
                    const initialSeekTime = searchParams.get('t');
                    if (initialSeekTime) {
                      p.currentTime(parseFloat(initialSeekTime));
                      p.play();
                      setSearchParams(params => {
                        params.delete('t');
                        return params;
                      }, { replace: true });
                    }
                  }}
                />
              )}

              {/* Transcript Panel */}
              {activeLesson.video_url && (
                <div className="transcript-panel card-glass">
                  <div className="transcript-header-bar">
                    <button
                      id={`transcript-toggle-${activeLesson.id}`}
                      className="transcript-toggle-btn"
                      onClick={() => setTranscriptOpen((prev) => !prev)}
                      aria-expanded={transcriptOpen}
                    >
                      <span className="transcript-icon">📝</span>
                      <span>Transcript & Timestamps</span>
                      {transcript?.status === 'completed' && (
                        <span className="badge badge-success">Ready</span>
                      )}
                      {transcript?.status === 'processing' && (
                        <span className="badge badge-warning">Processing…</span>
                      )}
                      {transcript?.status === 'failed' && (
                        <span className="badge badge-danger">Failed</span>
                      )}
                      {transcriptLoading && (
                        <span className="badge badge-muted">Loading…</span>
                      )}
                      <span className="transcript-chevron">{transcriptOpen ? '▲' : '▼'}</span>
                    </button>

                    {transcriptOpen && transcript?.status === 'completed' && (
                      <div className="transcript-controls">
                        <div className="transcript-tab-buttons">
                          <button
                            type="button"
                            className={`transcript-tab-btn ${transcriptTab === 'timestamps' ? 'active' : ''}`}
                            onClick={() => setTranscriptTab('timestamps')}
                          >
                            ⏱️ Timestamps
                          </button>
                          <button
                            type="button"
                            className={`transcript-tab-btn ${transcriptTab === 'text' ? 'active' : ''}`}
                            onClick={() => setTranscriptTab('text')}
                          >
                            📄 Full Text
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {transcriptOpen && (
                    <div className="transcript-body">
                      {!transcript && !transcriptLoading && (
                        <p className="transcript-empty">
                          No transcript available yet. It will appear here once the video is processed.
                        </p>
                      )}
                      {transcript?.status === 'processing' && (
                        <p className="transcript-empty">Transcription is currently processing — check back in a moment.</p>
                      )}
                      {transcript?.status === 'failed' && (
                        <p className="transcript-empty transcript-error">
                          Transcription failed: {transcript.error_message || 'Unknown error'}
                        </p>
                      )}
                      {transcript?.status === 'completed' && (
                        <div className="transcript-content">
                          <div className="transcript-meta-row">
                            {transcript.language && (
                              <span className="transcript-meta-tag">
                                Language: <strong>{transcript.language.toUpperCase()}</strong>
                              </span>
                            )}
                            {transcript.duration_seconds && (
                              <span className="transcript-meta-tag">
                                Duration: <strong>{formatTime(transcript.duration_seconds)}</strong>
                              </span>
                            )}
                            {transcriptTab === 'timestamps' && (
                              <input
                                type="text"
                                className="transcript-search-input"
                                placeholder="🔍 Search transcript..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                              />
                            )}
                          </div>

                          {transcriptTab === 'timestamps' ? (
                            <div className="transcript-timeline">
                              {filteredSegments.length > 0 ? (
                                filteredSegments.map((seg, idx) => (
                                  <div
                                    key={idx}
                                    className="transcript-cue-row"
                                    onClick={() => handleSeek(seg.start)}
                                  >
                                    <button
                                      type="button"
                                      className="transcript-timestamp-btn"
                                      title={`Seek to ${formatTime(seg.start)}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSeek(seg.start);
                                      }}
                                    >
                                      ⏱️ {formatTime(seg.start)}
                                    </button>
                                    <span className="transcript-cue-text">{seg.text}</span>
                                  </div>
                                ))
                              ) : (
                                <p className="transcript-empty">No matching lines found.</p>
                              )}
                            </div>
                          ) : (
                            <p className="transcript-full-text">{transcript.full_text}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
