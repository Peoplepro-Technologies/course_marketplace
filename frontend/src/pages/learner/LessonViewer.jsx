import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import ReviewForm from './ReviewForm';
import keycloak from '../../auth/keycloak';
import { PenTool, ClipboardList, CheckCircle2, Star, BookOpen } from 'lucide-react';
import EmptyState from '../../components/EmptyState';
import './LessonViewer.css';

/** Extract YouTube video ID from a URL (watch?v=, youtu.be/, /embed/) */
function getYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

/** Renders either a YouTube iframe or a local <video> tag based on URL */
function LessonVideoPlayer({ url, lessonId, token }) {
  const ytId = getYouTubeId(url);
  if (ytId) {
    return (
      <div style={{ position: 'relative', paddingTop: '56.25%', marginBottom: '1.5rem', borderRadius: '8px', overflow: 'hidden' }}>
        <iframe
          src={`https://www.youtube.com/embed/${ytId}`}
          title="Lesson video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    );
  }
  // Local stored file
  const src = url.startsWith('/media/videos/')
    ? `http://localhost:8000/api/v1/learner/lessons/${lessonId}/video?token=${token}`
    : `http://localhost:8000/api/v1${url}?token=${token}`;
  return (
    <video controls style={{ width: '100%', borderRadius: '8px', marginBottom: '1.5rem' }} src={src} />
  );
}

function QuizViewer({ quizzes }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState({});
  if (!quizzes || quizzes.length === 0) return null;

  return (
    <div className="quiz-container" style={{ marginTop: '2rem' }}>
      <h3 style={{ marginBottom: '1rem', color: '#0056D2', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <PenTool size={20} /> Quiz: Knowledge Check
      </h3>
      {quizzes.map((quiz, index) => {
        const isSubmitted = submitted[quiz.id];
        const isCorrect = answers[quiz.id] === quiz.correct_option_index;
        return (
          <div key={quiz.id} style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e0e0e0' }}>
            <h4 style={{ marginBottom: '1rem' }}>Q{index + 1}: {quiz.question_text}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {quiz.options.map((opt, i) => {
                let bg = 'transparent';
                if (isSubmitted) {
                  if (i === quiz.correct_option_index) bg = '#d4edda';
                  else if (i === answers[quiz.id]) bg = '#f8d7da';
                }
                return (
                  <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: isSubmitted ? 'default' : 'pointer', padding: '0.5rem 0.75rem', borderRadius: '6px', background: bg, transition: 'background 0.2s' }}>
                    <input
                      type="radio"
                      className="reset-radio"
                      name={`quiz-${quiz.id}`}
                      checked={answers[quiz.id] === i}
                      onChange={() => !isSubmitted && setAnswers(prev => ({ ...prev, [quiz.id]: i }))}
                      disabled={isSubmitted}
                    />
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
            {!isSubmitted && (
              <button
                className="btn btn-primary btn-sm"
                style={{ marginTop: '1rem' }}
                onClick={() => setSubmitted(prev => ({ ...prev, [quiz.id]: true }))}
                disabled={answers[quiz.id] === undefined}
              >
                Check Answer
              </button>
            )}
            {isSubmitted && (
              <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: '8px', background: isCorrect ? '#d4edda' : '#f8d7da', color: isCorrect ? '#155724' : '#721c24' }}>
                <strong>{isCorrect ? 'Correct!' : 'Incorrect.'}</strong> {quiz.explanation}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AssignmentViewer({ assignments }) {
  const [texts, setTexts] = useState({});
  const [submitted, setSubmitted] = useState({});
  if (!assignments || assignments.length === 0) return null;

  return (
    <div style={{ marginTop: '2rem' }}>
      <h3 style={{ marginBottom: '1rem', color: '#0056D2', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ClipboardList size={20} /> Assignment
      </h3>
      {assignments.map(a => (
        <div key={a.id} style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderLeft: '4px solid #0056D2' }}>
          <h4 style={{ marginBottom: '0.5rem' }}>{a.title}</h4>
          <p style={{ whiteSpace: 'pre-wrap', color: '#555', marginTop: '0.5rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>{a.instructions}</p>
          <textarea
            style={{ width: '100%', minHeight: '140px', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.9rem' }}
            placeholder="Type your submission here..."
            value={texts[a.id] || ''}
            onChange={e => setTexts(prev => ({ ...prev, [a.id]: e.target.value }))}
            disabled={submitted[a.id]}
          />
          <button
            className="btn btn-primary"
            style={{ marginTop: '0.75rem' }}
            onClick={() => setSubmitted(prev => ({ ...prev, [a.id]: true }))}
            disabled={submitted[a.id] || !texts[a.id]?.trim()}
          >
            {submitted[a.id] ? 'Submitted' : 'Submit Assignment'}
          </button>
        </div>
      ))}
    </div>
  );
}

export default function LessonViewer() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [activeLesson, setActiveLesson] = useState(null);
  const [progressData, setProgressData] = useState({});
  const [loading, setLoading] = useState(true);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [token, setToken] = useState(keycloak.token || '');

  useEffect(() => {
    // Use the learner detail endpoint (returns full video_url + quiz + assignment)
    const detailPromise = api.get(`/learner/courses/${courseId}/detail`);
    const progressPromise = api.get(`/learner/courses/${courseId}/progress`);

    Promise.all([detailPromise, progressPromise])
      .then(([detailRes, progressRes]) => {
        setCourse(detailRes.data.course);
        setSections(detailRes.data.sections);
        const completedIds = progressRes.data.completed_lesson_ids || [];
        const progressMap = {};
        completedIds.forEach(id => { progressMap[id] = 'completed'; });
        setProgressData(progressMap);
        if (detailRes.data.sections.length > 0 && detailRes.data.sections[0].lessons.length > 0) {
          setActiveLesson(detailRes.data.sections[0].lessons[0]);
        }
      })
      .catch(err => {
        const status = err.response?.status;
        if (status === 403 || status === 401) {
          navigate(`/courses/${courseId}`);
        } else {
          console.error(err);
          alert('Could not load course');
          navigate('/learner');
        }
      })
      .finally(() => setLoading(false));
  }, [courseId, navigate]);

  const handleLessonSelect = lesson => setActiveLesson(lesson);

  const markComplete = async () => {
    if (!activeLesson) return;
    try {
      await api.put('/learner/progress', { lesson_id: activeLesson.id, status: 'completed' });
      setProgressData(prev => ({ ...prev, [activeLesson.id]: 'completed' }));
    } catch (err) {
      console.error(err);
      alert('Failed to update progress');
    }
  };

  if (loading) return <div className="page-wrapper"><LoadingSpinner /></div>;
  if (!course) return null;

  return (
    <div className="lesson-viewer-layout">
      <aside className="lesson-sidebar">
        <div className="sidebar-header">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/learner')} style={{ marginBottom: '1rem', width: '100%' }}>
            ← Back to Dashboard
          </button>
          <h3 style={{ fontSize: 'var(--text-lg)' }}>{course.title}</h3>
        </div>
        <div className="sidebar-sections">
          {sections.map(section => (
            <div key={section.id} className="sidebar-section">
              <div className="section-title">{section.title}</div>
              <div className="section-lessons-list">
                {section.lessons?.map(lesson => (
                  <div
                    key={lesson.id}
                    className={`sidebar-lesson ${activeLesson?.id === lesson.id ? 'active' : ''} ${progressData[lesson.id] === 'completed' ? 'completed' : ''}`}
                    onClick={() => handleLessonSelect(lesson)}
                  >
                    <span className="status-icon">{progressData[lesson.id] === 'completed' ? '✓' : ' '}</span>
                    <span className="lesson-name">{lesson.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="lesson-content-area">
        <header className="content-header">
          <h2>{activeLesson ? activeLesson.title : 'Select a lesson'}</h2>
          <div className="header-actions">
            <button className="btn btn-secondary btn-sm flex-center" style={{ gap: '6px' }} onClick={() => setReviewModalOpen(true)}>
              <Star size={14} /> Leave a Review
            </button>
            <button
              className={`btn ${progressData[activeLesson?.id] === 'completed' ? 'btn-success' : 'btn-primary'} btn-sm flex-center`}
              style={{ gap: '6px' }}
              onClick={markComplete}
              disabled={!activeLesson || progressData[activeLesson.id] === 'completed'}
            >
              {progressData[activeLesson?.id] === 'completed' ? <><CheckCircle2 size={14} /> Completed</> : 'Mark as Complete'}
            </button>
          </div>
        </header>

        <div className="content-body card-glass">
          {activeLesson ? (
            <div className="lesson-text-content">
              {activeLesson.video_url && (
                <LessonVideoPlayer url={activeLesson.video_url} lessonId={activeLesson.id} token={token} />
              )}
              {activeLesson.content && (
                <p style={{ whiteSpace: 'pre-wrap' }}>{activeLesson.content}</p>
              )}
              <QuizViewer quizzes={activeLesson.quiz_questions} />
              <AssignmentViewer assignments={activeLesson.assignments} />

              <div style={{ marginTop: '3rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input
                  type="checkbox"
                  className="reset-checkbox"
                  id="markCompleteBottom"
                  checked={progressData[activeLesson.id] === 'completed'}
                  onChange={markComplete}
                  disabled={progressData[activeLesson.id] === 'completed'}
                  style={{ cursor: progressData[activeLesson.id] === 'completed' ? 'default' : 'pointer' }}
                />
                <label htmlFor="markCompleteBottom" style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: progressData[activeLesson.id] === 'completed' ? '#155724' : '#333', cursor: progressData[activeLesson.id] === 'completed' ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {progressData[activeLesson.id] === 'completed' ? <><CheckCircle2 size={18} /> Lesson Completed</> : 'Mark Lesson as Complete'}
                </label>
              </div>
            </div>
          ) : (
            <EmptyState 
              icon={BookOpen}
              title="Select a lesson from the sidebar to begin"
              message="Choose a lesson on the left to start learning."
            />
          )}
        </div>
      </main>

      <Modal isOpen={reviewModalOpen} onClose={() => setReviewModalOpen(false)} title="Review Course">
        <ReviewForm courseId={courseId} onSuccess={() => setReviewModalOpen(false)} />
      </Modal>
    </div>
  );
}
