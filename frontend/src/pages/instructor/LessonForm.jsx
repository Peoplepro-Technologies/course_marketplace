/**
 * LessonForm.jsx — Create/Edit lesson used inside the modal in SectionManager.
 *
 * Includes:
 *  - Title, Duration, Content (Markdown) fields (unchanged)
 *  - Optional video file upload with progress bar
 */

import { useState, useRef } from 'react';
import api from '../../api/axios';

export default function LessonForm({ sectionId, existingLesson, onSuccess, orderIndex = 0 }) {
  const isEditing = !!existingLesson;

  const [formData, setFormData] = useState({
    title: existingLesson?.title || '',
    content: existingLesson?.content || '',
    duration: existingLesson?.duration || 0,
    order_index: existingLesson?.order_index ?? orderIndex
  });
  const [submitting, setSubmitting] = useState(false);

  // Video upload state
  const videoFileRef = useRef(null);
  const [uploadProgress, setUploadProgress] = useState(0); // 0-100
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle | uploading | processing | done | error
  const [uploadError, setUploadError] = useState('');

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
          // Don't block the overall success — lesson text was saved
        }
      }

      onSuccess();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error saving lesson');
      setSubmitting(false);
    }
  };

  // Human-readable upload status label
  const statusLabel = {
    idle: '',
    uploading: `Uploading… ${uploadProgress}%`,
    processing: 'Processing video with ffmpeg…',
    done: '✓ Video uploaded',
    error: `Upload error: ${uploadError}`,
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
      <div className="form-group">
        <label>Video File (optional)</label>
        {existingLesson?.video_url && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
            ✓ A video is already attached. Selecting a new file will replace it.
          </p>
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
        {statusLabel && (
          <p style={{
            marginTop: '0.5rem',
            fontSize: 'var(--text-sm)',
            color: uploadStatus === 'error' ? 'var(--color-danger, #ef4444)' : 'var(--color-text-muted)',
          }}>
            {statusLabel}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save Lesson'}
        </button>
      </div>
    </form>
  );
}
