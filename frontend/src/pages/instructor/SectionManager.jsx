/**
 * SectionManager.jsx — Manage curriculum (sections and lessons) of a course.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Modal from '../../components/Modal';
import LessonForm from './LessonForm';

export default function SectionManager() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  // States for new section creation
  const [newSectionTitle, setNewSectionTitle] = useState('');
  
  // State for lesson modal
  const [lessonModal, setLessonModal] = useState({ isOpen: false, sectionId: null, lesson: null });

  const fetchCurriculum = () => {
    api.get(`/instructor/courses/${courseId}`)
      .then(res => {
        setCourse(res.data.course);
        setSections(res.data.sections);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCurriculum();
  }, [courseId]);

  const handleAddSection = async (e) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;
    try {
      await api.post(`/instructor/courses/${courseId}/sections`, {
        title: newSectionTitle,
        order_index: sections.length
      });
      setNewSectionTitle('');
      fetchCurriculum();
    } catch (err) {
      alert('Failed to add section');
    }
  };

  const handleDeleteSection = async (sectionId) => {
    if (!window.confirm('Delete this section and ALL its lessons?')) return;
    try {
      await api.delete(`/instructor/sections/${sectionId}`);
      fetchCurriculum();
    } catch (err) {
      alert('Failed to delete section');
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm('Delete this lesson?')) return;
    try {
      await api.delete(`/instructor/lessons/${lessonId}`);
      fetchCurriculum();
    } catch (err) {
      alert('Failed to delete lesson');
    }
  };

  if (loading) return null;

  return (
    <div className="page-wrapper container" style={{ maxWidth: '900px' }}>
      <div className="section-header flex-between">
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/instructor')} style={{ marginBottom: '1rem' }}>
            ← Back to Dashboard
          </button>
          <h2>Curriculum for: {course?.title}</h2>
        </div>
        <div>
          <span className={`badge badge-${course?.status === 'published' ? 'success' : 'warning'}`}>
            {course?.status}
          </span>
        </div>
      </div>

      <div className="flex-col gap-lg">
        {sections.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-icon">📂</div>
            <h3>No curriculum yet</h3>
            <p>Start by creating your first section below.</p>
          </div>
        ) : (
          sections.map((section, idx) => (
            <div key={section.id} className="card-glass flex-col gap-md" style={{ padding: '1.5rem' }}>
              <div className="flex-between">
                <h3 style={{ fontSize: 'var(--text-lg)' }}>
                  Section {idx + 1}: {section.title}
                </h3>
                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteSection(section.id)}>
                  Delete Section
                </button>
              </div>
              
              <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                {section.lessons?.length === 0 ? (
                  <div style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                    No lessons in this section.
                  </div>
                ) : (
                  section.lessons?.map((lesson, lIdx) => (
                    <div key={lesson.id} className="flex-between" style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)' }}>
                      <div>
                        <strong style={{ marginRight: '0.5rem' }}>{lIdx + 1}.</strong>
                        {lesson.title} <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginLeft: '1rem' }}>{lesson.duration} min</span>
                      </div>
                      <div className="flex gap-sm">
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => setLessonModal({ isOpen: true, sectionId: section.id, lesson })}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => handleDeleteLesson(lesson.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <button 
                className="btn btn-secondary btn-sm" 
                style={{ alignSelf: 'flex-start' }}
                onClick={() => setLessonModal({ isOpen: true, sectionId: section.id, lesson: null })}
              >
                + Add Lesson
              </button>
            </div>
          ))
        )}

        {/* Add Section Form */}
        <form onSubmit={handleAddSection} className="card flex gap-md" style={{ alignItems: 'flex-end', marginTop: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <label>New Section Title</label>
            <input 
              type="text" 
              value={newSectionTitle} 
              onChange={e => setNewSectionTitle(e.target.value)} 
              placeholder="e.g. Introduction" 
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={!newSectionTitle.trim()}>
            Add Section
          </button>
        </form>
      </div>

      <Modal 
        isOpen={lessonModal.isOpen} 
        onClose={() => setLessonModal({ isOpen: false, sectionId: null, lesson: null })}
        title={lessonModal.lesson ? 'Edit Lesson' : 'Add New Lesson'}
      >
        <LessonForm 
          sectionId={lessonModal.sectionId} 
          existingLesson={lessonModal.lesson}
          onSuccess={() => {
            setLessonModal({ isOpen: false, sectionId: null, lesson: null });
            fetchCurriculum();
          }}
          orderIndex={lessonModal.sectionId ? (sections.find(s => s.id === lessonModal.sectionId)?.lessons?.length || 0) : 0}
        />
      </Modal>
    </div>
  );
}
