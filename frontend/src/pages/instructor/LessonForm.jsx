/**
 * LessonForm.jsx — Create/Edit lesson used inside the modal in SectionManager.
 *
 * Includes:
 *  - Title, Duration, Content (Markdown) fields (unchanged)
 *  - Optional video file upload with progress bar
 */

import { useState, useRef, useEffect } from 'react';
import api from '../../api/axios';
import VideoPlayer from '../../components/VideoPlayer';
import keycloak from '../../auth/keycloak';

export default function LessonForm({ sectionId, existingLesson, onSuccess, orderIndex = 0 }) {
  const isEditing = !!existingLesson;

  const [formData, setFormData] = useState({
    title: existingLesson?.title || '',
    content: existingLesson?.content || '',
    duration: existingLesson?.duration || 0,
    order_index: existingLesson?.order_index ?? orderIndex,
    video_url: existingLesson?.video_url || '',
    thumbnail_url: existingLesson?.thumbnail_url || ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Video upload state
  const videoFileRef = useRef(null);
  const thumbnailFileRef = useRef(null);
  const [uploadProgress, setUploadProgress] = useState(0); // 0-100
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle | uploading | processing | done | error
  const [uploadError, setUploadError] = useState('');

  // Quizzes & Assignments state
  const [quizzes, setQuizzes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [canUploadVideo, setCanUploadVideo] = useState(true);

  useEffect(() => {
    api.get('/instructor/profile')
      .then(res => {
        if (res.data && res.data.can_upload_video === false) {
          setCanUploadVideo(false);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (isEditing && existingLesson?.id) {
      api.get(`/instructor/lessons/${existingLesson.id}/quiz-questions`)
         .then(res => setQuizzes(res.data))
         .catch(console.error);
      
      api.get(`/instructor/lessons/${existingLesson.id}/assignments`)
         .then(res => setAssignments(res.data))
         .catch(console.error);
    }
  }, [isEditing, existingLesson]);

  const handleDeleteQuiz = async (index) => {
    const q = quizzes[index];
    if (q.id) {
      if (!window.confirm("Delete this quiz question?")) return;
      try {
        await api.delete(`/instructor/quiz-questions/${q.id}`);
      } catch (e) {
        console.error(e);
      }
    }
    setQuizzes(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteAssignment = async (index) => {
    const a = assignments[index];
    if (a.id) {
      if (!window.confirm("Delete this assignment?")) return;
      try {
        await api.delete(`/instructor/assignments/${a.id}`);
      } catch (e) {
        console.error(e);
      }
    }
    setAssignments(prev => prev.filter((_, i) => i !== index));
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    let savedLessonId = existingLesson?.id;

    try {
      // ── Step 1: Save text fields ──────────────────────────────────
      if (isEditing) {
        await api.put(`/instructor/lessons/${existingLesson.id}`, formData);
      } else {
        const res = await api.post(`/instructor/sections/${sectionId}/lessons`, formData);
        savedLessonId = res.data.id;
      }

      // ── Step 2: Upload video if a file was selected ───────────────
      const videoFile = videoFileRef.current?.files?.[0];
      if (videoFile && savedLessonId) {
        setUploadStatus('uploading');
        setUploadProgress(0);
        setUploadError('');

        const formPayload = new FormData();
        formPayload.append('video', videoFile);

        try {
          await api.post(
            `/instructor/lessons/${savedLessonId}/upload-video`,
            formPayload,
            {
              headers: { 'Content-Type': 'multipart/form-data' },
              onUploadProgress: (evt) => {
                if (evt.total) {
                  const pct = Math.round((evt.loaded / evt.total) * 100);
                  setUploadProgress(pct);
                  // Once the bytes are fully sent the server is still transcoding
                  if (pct === 100) setUploadStatus('processing');
                }
              },
            }
          );
          setUploadStatus('done');
        } catch (uploadErr) {
          const msg = uploadErr.response?.data?.detail || 'Video upload failed';
          setUploadStatus('error');
          setUploadError(msg);
          setSubmitting(false);
          return; // Stay open so user can see error and retry
        }
      }

      // ── Step 2.5: Upload thumbnail if a file was selected ─────────
      const thumbnailFile = thumbnailFileRef.current?.files?.[0];
      if (thumbnailFile && savedLessonId) {
        const thumbPayload = new FormData();
        thumbPayload.append('thumbnail', thumbnailFile);
        try {
          await api.post(`/instructor/lessons/${savedLessonId}/upload-thumbnail`, thumbPayload, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } catch (err) {
          console.error("Failed to upload thumbnail", err);
        }
      }

      // ── Step 3: Save Quizzes and Assignments ───────────────────────
      for (const quiz of quizzes) {
        if (quiz.id) {
          await api.put(`/instructor/quiz-questions/${quiz.id}`, quiz);
        } else {
          await api.post(`/instructor/lessons/${savedLessonId}/quiz-questions`, quiz);
        }
      }

      for (const a of assignments) {
        if (a.id) {
          await api.put(`/instructor/assignments/${a.id}`, a);
        } else {
          await api.post(`/instructor/lessons/${savedLessonId}/assignments`, a);
        }
      }

      onSuccess();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error saving lesson');
      setSubmitting(false);
    }
  };

  // Upload status metadata: { text, color }
  const statusMeta = {
    idle:       null,
    uploading:  { text: `Uploading ${uploadProgress}%`,                         color: 'var(--color-text-muted)' },
    processing: { text: 'File uploaded. Transcoding in progress — you can close this form.', color: 'var(--color-success, #22c55e)' },
    done:       { text: 'Video queued for transcoding.',                          color: 'var(--color-success, #22c55e)' },
    error:      { text: `Upload error: ${uploadError}`,                          color: 'var(--color-danger, #ef4444)' },
  }[uploadStatus];

  return (
    <form onSubmit={handleSubmit} className="flex-col gap-md">
      <div className="form-group">
        <label>Lesson Title</label>
        <input
          type="text"
          name="title"
          required
          value={formData.title}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label>Duration (minutes)</label>
        <input
          type="number"
          name="duration"
          min="0"
          value={formData.duration}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label>Lesson Content (Markdown optional)</label>
        <textarea
          name="content"
          rows="8"
          value={formData.content}
          onChange={handleChange}
          placeholder="Enter the lesson text or markdown here..."
        />
      </div>

      {/* ── Video upload ──────────────────────────────────────────── */}
      {canUploadVideo && (
      <div className="form-group" style={{ padding: '1rem', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <h4 style={{ marginBottom: '1rem' }}>Video Source</h4>
        
        <div className="form-group">
          <label>YouTube URL (Optional)</label>
          <input
            type="text"
            name="video_url"
            value={formData.video_url?.startsWith('/') || formData.video_url?.startsWith('processing:') ? '' : formData.video_url}
            onChange={handleChange}
            placeholder="e.g. https://www.youtube.com/watch?v=..."
          />
          {(formData.video_url?.startsWith('/') || formData.video_url?.startsWith('processing:')) && (
            <small style={{ color: 'var(--color-text-muted)' }}>Currently using an uploaded video. Entering a YouTube URL will replace it.</small>
          )}
        </div>

        <div style={{ margin: '1rem 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>— OR —</div>

        <div className="form-group">
          <label>Upload Video File (Optional)</label>
          {existingLesson?.video_url && (
          <div style={{ marginBottom: '1rem' }}>
            {existingLesson.video_url.startsWith('processing:') ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-warning, #f59e0b)',
                padding: '0.5rem 0.75rem',
                background: 'rgba(245,158,11,0.1)',
                borderRadius: '6px',
                border: '1px solid rgba(245,158,11,0.3)',
              }}>
                Video is being transcoded in the background. Refresh the lesson in a few minutes to see it.
              </div>
            ) : (
              <>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                  Current video preview:
                </p>
                <VideoPlayer
                  src={
                    existingLesson.video_url.startsWith('/media/videos/')
                      ? `http://localhost:8000/api/v1/learner/lessons/${existingLesson.id}/video?token=${keycloak.token}`
                      : `http://localhost:8000/api/v1${existingLesson.video_url}?token=${keycloak.token}`
                  }
                />
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                  Selecting a new file will replace the current video.
                </p>
              </>
            )}
          </div>
        )}
        <input
          ref={videoFileRef}
          type="file"
          accept="video/*"
          style={{ color: 'var(--color-text-primary)' }}
        />

        {/* Progress bar — shown while uploading or processing */}
        {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
          <div style={{ marginTop: '0.75rem' }}>
            <progress
              value={uploadStatus === 'processing' ? undefined : uploadProgress}
              max="100"
              style={{ width: '100%', height: '8px', borderRadius: '4px' }}
            />
          </div>
        )}

        {/* Status text */}
        {statusMeta && (
          <p style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            marginTop: '0.5rem',
            fontSize: 'var(--text-sm)',
            color: statusMeta.color,
          }}>
            {statusMeta.text}
          </p>
        )}
      </div>

      <div className="form-group">
        <label>Thumbnail URL (Optional)</label>
        <input
          type="text"
          name="thumbnail_url"
          value={formData.thumbnail_url?.startsWith('/') ? '' : formData.thumbnail_url}
          onChange={handleChange}
          placeholder="e.g. https://example.com/thumb.jpg"
        />
        {formData.thumbnail_url?.startsWith('/') && (
          <small style={{ color: 'var(--color-text-muted)' }}>Currently using an uploaded thumbnail. Entering a URL will replace it.</small>
        )}

        <div style={{ margin: '1rem 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>— OR —</div>
        
        <label>Upload Thumbnail File (Optional)</label>
        {existingLesson?.thumbnail_url?.startsWith('/') && (
          <div style={{ marginBottom: '1rem' }}>
            <img 
              src={`http://localhost:8000${existingLesson.thumbnail_url}`} 
              alt="Thumbnail" 
              style={{ maxWidth: '200px', borderRadius: '4px' }} 
            />
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
              Selecting a new file will replace the current thumbnail.
            </p>
          </div>
        )}
        <input
          ref={thumbnailFileRef}
          type="file"
          accept="image/*"
          style={{ color: 'var(--color-text-primary)' }}
        />
      </div>
      </div>
      )}

      {/* ── Quizzes ─────────────────────────────────────────────────── */}
      <div className="form-group" style={{ padding: '1rem', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ margin: 0 }}>Quiz Questions</h4>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setQuizzes(prev => [...prev, { question_text: '', options: ['', '', '', ''], correct_option_index: 0, explanation: '' }])}>
            Add Question
          </button>
        </div>
        
        {quizzes.length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>No quiz questions.</p>}
        {quizzes.map((q, idx) => (
          <div key={idx} style={{ padding: '1rem', background: 'var(--color-bg-secondary)', borderRadius: '8px', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <strong>Question {idx + 1}</strong>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDeleteQuiz(idx)}>Remove</button>
            </div>
            <input type="text" placeholder="Question Text" value={q.question_text} style={{ marginBottom: '0.5rem' }} onChange={e => {
              const newQuizzes = [...quizzes];
              newQuizzes[idx].question_text = e.target.value;
              setQuizzes(newQuizzes);
            }} required />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {q.options.map((opt, oIdx) => (
                <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="radio" name={`correct-${idx}`} checked={q.correct_option_index === oIdx} onChange={() => {
                    const newQuizzes = [...quizzes];
                    newQuizzes[idx].correct_option_index = oIdx;
                    setQuizzes(newQuizzes);
                  }} />
                  <input type="text" placeholder={`Option ${oIdx + 1}`} value={opt} onChange={e => {
                    const newQuizzes = [...quizzes];
                    newQuizzes[idx].options[oIdx] = e.target.value;
                    setQuizzes(newQuizzes);
                  }} required />
                </div>
              ))}
            </div>
            <input type="text" placeholder="Explanation (Optional)" value={q.explanation} onChange={e => {
              const newQuizzes = [...quizzes];
              newQuizzes[idx].explanation = e.target.value;
              setQuizzes(newQuizzes);
            }} />
          </div>
        ))}
      </div>

      {/* ── Assignments ─────────────────────────────────────────────── */}
      <div className="form-group" style={{ padding: '1rem', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ margin: 0 }}>Assignments</h4>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAssignments(prev => [...prev, { title: '', instructions: '' }])}>
            Add Assignment
          </button>
        </div>
        
        {assignments.length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>No assignments.</p>}
        {assignments.map((a, idx) => (
          <div key={idx} style={{ padding: '1rem', background: 'var(--color-bg-secondary)', borderRadius: '8px', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <strong>Assignment {idx + 1}</strong>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDeleteAssignment(idx)}>Remove</button>
            </div>
            <input type="text" placeholder="Assignment Title" value={a.title} style={{ marginBottom: '0.5rem' }} onChange={e => {
              const newAssignments = [...assignments];
              newAssignments[idx].title = e.target.value;
              setAssignments(newAssignments);
            }} required />
            <textarea placeholder="Instructions..." value={a.instructions} rows={3} onChange={e => {
              const newAssignments = [...assignments];
              newAssignments[idx].instructions = e.target.value;
              setAssignments(newAssignments);
            }} required />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save Lesson'}
        </button>
      </div>
    </form>
  );
}
