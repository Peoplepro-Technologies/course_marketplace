/**
 * InstructorDashboard.jsx
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { Plus, Video, DollarSign, MessageSquare, BookOpen, Layers } from 'lucide-react';
import './InstructorDashboard.css';

export default function InstructorDashboard() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [coursesRes, earningsRes] = await Promise.all([
        api.get('/instructor/courses'),
        api.get('/instructor/earnings').catch(() => ({ data: { total_earnings: 0 } }))
      ]);
      
      const fetchedCourses = coursesRes.data;
      setCourses(fetchedCourses);
      setTotalEarnings(earningsRes.data.total_earnings || 0);

      // Fetch students for all courses
      const studentPromises = fetchedCourses.map(c => 
        api.get(`/instructor/courses/${c.id}/students`).catch(() => ({ data: [] }))
      );
      const studentResponses = await Promise.all(studentPromises);
      let studentCount = 0;
      studentResponses.forEach(res => {
        studentCount += (res.data ? res.data.length : 0);
      });
      setTotalStudents(studentCount);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const deleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    try {
      await api.delete(`/instructor/courses/${courseId}`);
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete course');
    }
  };

  const togglePublish = async (courseId) => {
    try {
      await api.put(`/instructor/courses/${courseId}/publish`);
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update course status');
    }
  };

  if (loading) return <div className="page-wrapper"><LoadingSpinner /></div>;

  const publishedCount = courses.filter(c => c.status === 'published').length;
  const pendingCount = courses.filter(c => c.status === 'pending_review').length;

  return (
    <div className="page-wrapper">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Instructor Dashboard</h2>
          <p>Manage your courses and track performance.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link to="/instructor/live-classes" className="btn btn-secondary flex-center" style={{ gap: '6px' }}>
            <Video size={16} /> Live Classes
          </Link>
          <Link to="/instructor/earnings" className="btn btn-secondary flex-center" style={{ gap: '6px' }}>
            <DollarSign size={16} /> Earnings
          </Link>
          <Link to="/instructor/reviews" className="btn btn-secondary flex-center" style={{ gap: '6px' }}>
            <MessageSquare size={16} /> Review Inbox
          </Link>
          <Link to="/instructor/course/new" className="btn btn-primary flex-center" style={{ gap: '6px' }}>
            <Plus size={16} /> Create New Course
          </Link>
        </div>
      </div>

      <div className="id-stats-grid">
        <div className="id-stat-card dashboard-card">
          <span className="id-stat-label">Total Courses</span>
          <span className="id-stat-value">{courses.length}</span>
        </div>
        <div className="id-stat-card dashboard-card">
          <span className="id-stat-label">Published</span>
          <span className="id-stat-value">{publishedCount}</span>
        </div>
        <div className="id-stat-card dashboard-card">
          <span className="id-stat-label">Pending Review</span>
          <span className="id-stat-value">{pendingCount}</span>
        </div>
        <div className="id-stat-card dashboard-card">
          <span className="id-stat-label">Total Students</span>
          <span className="id-stat-value">{totalStudents}</span>
        </div>
        <div className="id-stat-card dashboard-card">
          <span className="id-stat-label">Total Earnings</span>
          <span className="id-stat-value">₹{Number(totalEarnings).toFixed(2)}</span>
        </div>
      </div>

      <h3 style={{ marginBottom: '1.5rem' }}>Your Courses</h3>
      
      {courses.length === 0 ? (
        <EmptyState 
          icon={Layers}
          title="You haven't created any courses yet"
          message="Start sharing your knowledge by creating your first course."
        />
      ) : (
        <div className="id-courses-grid">
          {courses.map(course => (
            <div key={course.id} className="id-course-card dashboard-card">
              {course.thumbnail_url ? (
                <img 
                  src={course.thumbnail_url} 
                  alt={course.title} 
                  className="id-card-thumbnail"
                />
              ) : (
                <div style={{ height: '180px', width: '100%', background: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                  <BookOpen size={48} strokeWidth={1} />
                </div>
              )}
              <div className="id-card-content">
                <div className="id-card-header">
                  <span className="id-card-category">{course.category}</span>
                  <StatusBadge status={course.status} />
                </div>
                <h4 className="id-card-title">{course.title}</h4>
                <div className="id-card-meta">
                  <span className="id-card-price" style={{ fontWeight: 600 }}>
                    {course.price > 0 ? `₹${Number(course.price).toFixed(2)}` : 'Free'}
                  </span>
                </div>
                
                {course.status === 'rejected' && course.rejection_reason && (
                  <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--color-danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>
                    <strong>Reason:</strong> {course.rejection_reason}
                  </div>
                )}
                
                <div className="id-btn-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '1rem' }}>
                  <Link to={`/instructor/course/${course.id}/edit`} className="btn btn-outline btn-sm" style={{ padding: '0.5rem' }}>
                    Edit Info
                  </Link>
                  <Link to={`/instructor/course/${course.id}/curriculum`} className="btn btn-outline btn-sm" style={{ padding: '0.5rem' }}>
                    Curriculum
                  </Link>
                  <Link to={`/instructor/course/${course.id}/students`} className="btn btn-outline btn-sm" style={{ padding: '0.5rem' }}>
                    Students
                  </Link>
                  {course.status === 'pending_review' ? (
                    <button className="btn btn-secondary btn-sm" style={{ padding: '0.5rem' }} disabled>
                      Pending
                    </button>
                  ) : (
                    <button 
                      className={`btn ${course.status === 'published' ? 'btn-warning' : 'btn-primary'} btn-sm`}
                      style={{ padding: '0.5rem' }}
                      onClick={() => togglePublish(course.id)}
                    >
                      {course.status === 'published' ? 'Unpublish' : 
                       course.status === 'rejected' ? 'Resubmit' : 
                       'Publish'}
                    </button>
                  )}
                  {course.status !== 'published' && course.status !== 'pending_review' && (
                    <button className="btn btn-danger btn-sm" style={{ padding: '0.5rem', gridColumn: 'span 2' }} onClick={() => deleteCourse(course.id)}>
                      Delete Course
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
