/**
 * LessonForm.jsx — Create/Edit lesson with quiz and assignment authoring.
 */

import { useState, useRef, useEffect } from 'react';
import api from '../../api/axios';
import { HelpCircle, ClipboardList, Plus, Check } from 'lucide-react';

export default function LessonForm({ sectionId, existingLesson, onSuccess, orderIndex = 0 }) {
  const isEditing = !!existingLesson;

  const [formData, setFormData] = useState({
    title: existingLesson?.title || '',
    content: existingLesson?.content || '',
    duration: existingLesson?.duration || 0,
    order_index: existingLesson?.order_index ?? orderIndex
  });
  const [submitting, setSubmitting] = useState(false);

  // Video upload
  const videoFileRef = useRef(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadError, setUploadError] = useState('');

  // Saved lesson ID (set after create/update)
  const [savedLessonId, setSavedLessonId] = useState(existingLesson?.id || null);

  // ── Quiz state ─────────────────────────────────────────────────────
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    options: ['', '', '', ''],
    correct_option_index: 0,
    explanation: '',
  });
  const [addingQuiz, setAddingQuiz] = useState(false);
  const [quizError, setQuizError] = useState('');

  // ── Assignment state ───────────────────────────────────────────────
  const [assignments, setAssignments] = useState([]);
  const [newAssignment, setNewAssignment] = useState({ title: '', instructions: '' });
  const [addingAssignment, setAddingAssignment] = useState(false);
  const [assignmentError, setAssignmentError] = useState('');

  // Load existing quiz/assignment data when editing
  useEffect(() => {
    if (existingLesson?.id) {
      api.get(`/instructor/lessons/${existingLesson.id}/quiz-questions`)
        .then(r => setQuizQuestions(r.data))
        .catch(() => {});
      api.get(`/instructor/lessons/${existingLesson.id}/assignments`)
        .then(r => setAssignments(r.data))
        .catch(() => {});
    }
  }, [existingLesson?.id]);

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

    let lessonId = existingLesson?.id;

    try {
      if (isEditing) {
        await api.put(`/instructor/lessons/${existingLesson.id}`, formData);
      } else {
        const res = await api.post(`/instructor/sections/${sectionId}/lessons`, formData);
        lessonId = res.data.id;
        setSavedLessonId(lessonId);
      }

      // Video upload
      const videoFile = videoFileRef.current?.files?.[0];
      if (videoFile && lessonId) {
        setUploadStatus('uploading');
        setUploadProgress(0);
        setUploadError('');
        const formPayload = new FormData();
        formPayload.append('video', videoFile);
        try {
          await api.post(`/instructor/lessons/${lessonId}/upload-video`, formPayload, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (evt) => {
              if (evt.total) {
                const pct = Math.round((evt.loaded / evt.total) * 100);
                setUploadProgress(pct);
                if (pct === 100) setUploadStatus('processing');
              }
            },
          });
          setUploadStatus('done');
        } catch (uploadErr) {
          setUploadStatus('error');
          setUploadError(uploadErr.response?.data?.detail || 'Video upload failed');
          setSubmitting(false);
          return;
        }
      }

      onSuccess();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error saving lesson');
      setSubmitting(false);
    }
  };

  // ── Quiz handlers ──────────────────────────────────────────────────
  const handleAddQuiz = async () => {
    const lid = savedLessonId || existingLesson?.id;
    if (!lid) { setQuizError('Save the lesson first before adding quiz questions.'); return; }
    if (!newQuestion.question_text.trim()) { setQuizError('Question text is required.'); return; }
    if (newQuestion.options.some(o => !o.trim())) { setQuizError('All 4 options are required.'); return; }
    setAddingQuiz(true);
    setQuizError('');
    try {
      const res = await api.post(`/instructor/lessons/${lid}/quiz-questions`, newQuestion);
      setQuizQuestions(prev => [...prev, res.data]);
      setNewQuestion({ question_text: '', options: ['', '', '', ''], correct_option_index: 0, explanation: '' });
    } catch (err) {
      setQuizError(err.response?.data?.detail || 'Failed to add question');
    } finally {
      setAddingQuiz(false);
    }
  };

  const handleDeleteQuiz = async (qid) => {
    try {
      await api.delete(`/instructor/quiz-questions/${qid}`);
      setQuizQuestions(prev => prev.filter(q => q.id !== qid));
    } catch { alert('Failed to delete question'); }
  };

  // ── Assignment handlers ────────────────────────────────────────────
  const handleAddAssignment = async () => {
    const lid = savedLessonId || existingLesson?.id;
    if (!lid) { setAssignmentError('Save the lesson first before adding an assignment.'); return; }
    if (!newAssignment.title.trim() || !newAssignment.instructions.trim()) { setAssignmentError('Title and instructions are required.'); return; }
    setAddingAssignment(true);
    setAssignmentError('');
    try {
      const res = await api.post(`/instructor/lessons/${lid}/assignments`, newAssignment);
      setAssignments(prev => [...prev, res.data]);
      setNewAssignment({ title: '', instructions: '' });
    } catch (err) {
      setAssignmentError(err.response?.data?.detail || 'Failed to add assignment');
    } finally {
      setAddingAssignment(false);
    }
  };

  const handleDeleteAssignment = async (aid) => {
    try {
      await api.delete(`/instructor/assignments/${aid}`);
      setAssignments(prev => prev.filter(a => a.id !== aid));
    } catch { alert('Failed to delete assignment'); }
  };

  const statusLabel = {
    idle: '', uploading: `Uploading… ${uploadProgress}%`,
    processing: 'Processing video…', done: 'Video uploaded',
    error: `Upload error: ${uploadError}`,
  }[uploadStatus];

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex-col gap-md">
        <div className="form-group">
          <label>Lesson Title</label>
          <input type="text" name="title" required value={formData.title} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Duration (minutes)</label>
          <input type="number" name="duration" min="0" value={formData.duration} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Lesson Content (optional text/notes)</label>
          <textarea name="content" rows="5" value={formData.content} onChange={handleChange}
            placeholder="Enter lesson notes or markdown content..." />
        </div>

        <div className="form-group">
          <label>Video File (optional)</label>
          <input ref={videoFileRef} type="file" accept="video/*" style={{ color: 'var(--color-text-primary)' }} />
          {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
            <progress value={uploadStatus === 'processing' ? undefined : uploadProgress}
              max="100" style={{ width: '100%', height: '8px', marginTop: '0.5rem' }} />
          )}
          {statusLabel && (
            <p style={{ marginTop: '0.5rem', fontSize: 'var(--text-sm)',
              color: uploadStatus === 'error' ? 'var(--color-danger, #ef4444)' : 'var(--color-text-muted)' }}>
              {statusLabel}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Save Lesson'}
          </button>
        </div>
      </form>

      {/* ── Quiz Section ─────────────────────────────────────────── */}
      <div style={{ marginTop: '2rem', borderTop: '2px solid #e0e0e0', paddingTop: '1.5rem' }}>
        <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HelpCircle size={18} /> Quiz Questions
        </h4>

        {quizQuestions.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            {quizQuestions.map((q, i) => (
              <div key={q.id} style={{ background: '#f8f9fa', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <strong>Q{i + 1}:</strong> {q.question_text}
                  <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '0.25rem' }}>
                    Correct: <em>{q.options[q.correct_option_index]}</em>
                  </div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteQuiz(q.id)} style={{ flexShrink: 0, marginLeft: '1rem' }}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: '#f0f4ff', padding: '1rem', borderRadius: '8px', border: '1px solid #d0deff' }}>
          <p style={{ fontSize: '0.85rem', color: '#444', marginBottom: '0.75rem', fontWeight: 600 }}>Add a new question:</p>
          <div className="form-group">
            <label style={{ fontSize: '0.85rem' }}>Question Text</label>
            <input type="text" value={newQuestion.question_text}
              onChange={e => setNewQuestion(p => ({ ...p, question_text: e.target.value }))}
              placeholder="e.g. What does VLOOKUP stand for?" />
          </div>
          {[0, 1, 2, 3].map(i => (
            <div className="form-group" key={i} style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="radio" name="correct_option"
                  checked={newQuestion.correct_option_index === i}
                  onChange={() => setNewQuestion(p => ({ ...p, correct_option_index: i }))} />
                Option {i + 1} {newQuestion.correct_option_index === i && <span style={{ color: '#0056D2', fontSize: '0.75rem' }}>(correct)</span>}
              </label>
              <input type="text" value={newQuestion.options[i]}
                onChange={e => setNewQuestion(p => {
                  const opts = [...p.options]; opts[i] = e.target.value; return { ...p, options: opts };
                })}
                placeholder={`Option ${i + 1}`} />
            </div>
          ))}
          <div className="form-group">
            <label style={{ fontSize: '0.85rem' }}>Explanation (shown after answering)</label>
            <textarea rows="2" value={newQuestion.explanation}
              onChange={e => setNewQuestion(p => ({ ...p, explanation: e.target.value }))}
              placeholder="Explain why the correct answer is right..." />
          </div>
          {quizError && <p style={{ color: '#dc3545', fontSize: '0.85rem' }}>{quizError}</p>}
          <button className="btn btn-primary btn-sm flex-center" style={{ gap: '4px' }} onClick={handleAddQuiz} disabled={addingQuiz}>
            {addingQuiz ? 'Adding…' : <><Plus size={14} /> Add Question</>}
          </button>
        </div>
      </div>

      {/* ── Assignment Section ───────────────────────────────────── */}
      <div style={{ marginTop: '1.5rem', borderTop: '2px solid #e0e0e0', paddingTop: '1.5rem' }}>
        <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ClipboardList size={18} /> Assignment
        </h4>

        {assignments.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            {assignments.map(a => (
              <div key={a.id} style={{ background: '#f8f9fa', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <strong>{a.title}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '0.25rem' }}>{a.instructions.substring(0, 80)}…</div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteAssignment(a.id)} style={{ flexShrink: 0, marginLeft: '1rem' }}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: '#fff8f0', padding: '1rem', borderRadius: '8px', border: '1px solid #ffe0b2' }}>
          <p style={{ fontSize: '0.85rem', color: '#444', marginBottom: '0.75rem', fontWeight: 600 }}>Add an assignment:</p>
          <div className="form-group">
            <label style={{ fontSize: '0.85rem' }}>Assignment Title</label>
            <input type="text" value={newAssignment.title}
              onChange={e => setNewAssignment(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Build a Sales Dashboard" />
          </div>
          <div className="form-group">
            <label style={{ fontSize: '0.85rem' }}>Instructions</label>
            <textarea rows="4" value={newAssignment.instructions}
              onChange={e => setNewAssignment(p => ({ ...p, instructions: e.target.value }))}
              placeholder="Describe what the learner needs to do and how to submit..." />
          </div>
          {assignmentError && <p style={{ color: '#dc3545', fontSize: '0.85rem' }}>{assignmentError}</p>}
          <button className="btn btn-primary btn-sm flex-center" style={{ gap: '4px' }} onClick={handleAddAssignment} disabled={addingAssignment}>
            {addingAssignment ? 'Adding…' : <><Plus size={14} /> Add Assignment</>}
          </button>
        </div>
      </div>
    </div>
  );
}
