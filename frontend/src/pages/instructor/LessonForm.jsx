/**
 * LessonForm.jsx — Create/Edit lesson used inside the modal in SectionManager.
 */

import { useState } from 'react';
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
    
    try {
      if (isEditing) {
        await api.put(`/instructor/lessons/${existingLesson.id}`, formData);
      } else {
        await api.post(`/instructor/sections/${sectionId}/lessons`, formData);
      }
      onSuccess();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error saving lesson');
      setSubmitting(false);
    }
  };

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

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save Lesson'}
        </button>
      </div>
    </form>
  );
}
