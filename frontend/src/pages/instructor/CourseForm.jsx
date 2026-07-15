/**
 * CourseForm.jsx — Create or edit course information.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const CATEGORIES = ['Programming', 'Design', 'Business', 'Marketing', 'Photography', 'Music', 'General'];

export default function CourseForm() {
  const { courseId } = useParams(); // URL parameter
  const navigate = useNavigate();
  const isEditing = !!courseId;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'General',
    thumbnail_url: '',
    price: 0.0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditing) {
      api.get(`/instructor/courses/${courseId}`)
        .then(res => {
          const c = res.data.course;
          setFormData({
            title: c.title,
            description: c.description || '',
            category: c.category,
            thumbnail_url: c.thumbnail_url || '',
            price: c.price || 0,
          });
        })
        .catch(err => {
          console.error(err);
          setError('Failed to load course data');
        });
    }
  }, [isEditing, courseId]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (isEditing) {
        await api.put(`/instructor/courses/${courseId}`, formData);
        navigate(`/instructor/course/${courseId}/curriculum`);
      } else {
        const res = await api.post('/instructor/courses', formData);
        navigate(`/instructor/course/${res.data.id}/curriculum`);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred saving the course');
      setSubmitting(false);
    }
  };

  return (
    <div className="page-wrapper container" style={{ maxWidth: '800px' }}>
      <div className="section-header">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/instructor')} style={{ marginBottom: '1rem' }}>
          ← Back
        </button>
        <h2>{isEditing ? 'Edit Course Info' : 'Create New Course'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="card-glass flex-col gap-lg" style={{ padding: '2rem' }}>
        {error && <div className="badge badge-danger" style={{ display: 'block', textTransform: 'none' }}>{error}</div>}

        <div className="form-group">
          <label htmlFor="title">Course Title</label>
          <input
            id="title"
            name="title"
            type="text"
            required
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Complete Web Development 2030"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
            >
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="price">Price ($)</label>
            <input
              id="price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="thumbnail_url">Thumbnail URL (Optional)</label>
          <input
            id="thumbnail_url"
            name="thumbnail_url"
            type="url"
            value={formData.thumbnail_url}
            onChange={handleChange}
            placeholder="https://example.com/image.jpg"
          />
          {formData.thumbnail_url && (
            <div style={{ marginTop: '1rem', width: '200px', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <img src={formData.thumbnail_url} alt="Thumbnail preview" style={{ width: '100%', display: 'block' }} />
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            rows="6"
            value={formData.description}
            onChange={handleChange}
            placeholder="What will students learn in this course?"
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create & Continue to Curriculum')}
          </button>
        </div>
      </form>
    </div>
  );
}
