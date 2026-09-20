import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { BookOpen, AlertCircle, FileText, CheckCircle, Clock } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';

export default function SubmissionsStatus() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await api.get('/instructor/courses');
      setCourses(res.data);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'published':
        return <CheckCircle size={16} />;
      case 'pending_review':
        return <Clock size={16} />;
      case 'rejected':
      case 'flagged':
      case 'removed':
        return <AlertCircle size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  if (loading) {
    return <div className="loading">Loading submissions...</div>;
  }

  return (
    <div className="submissions-status-page" style={{ padding: '24px' }}>
      <h1 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <BookOpen size={24} /> Course Submissions & Status
      </h1>
      
      {courses.length === 0 ? (
        <EmptyState 
          icon={FileText} 
          title="No Courses Yet"
          message="You haven't created any courses yet." 
        />
      ) : (
        <div className="course-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {courses.map(course => (
            <div key={course.id} className="course-card" style={{ 
              background: 'white', 
              borderRadius: '8px', 
              padding: '20px', 
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              border: '1px solid #eaeaea'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>{course.title}</h3>
                  <div style={{ color: '#666', fontSize: '14px', display: 'flex', gap: '16px' }}>
                    <span>Category: {course.category}</span>
                    <span>Last Updated: {new Date(course.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {getStatusIcon(course.status)}
                  <StatusBadge status={course.status} />
                </div>
              </div>
              
              {(course.status === 'rejected' || course.status === 'flagged' || course.status === 'removed') && course.rejection_reason && (
                <div style={{ 
                  background: '#fef2f2', 
                  color: '#991b1b', 
                  padding: '12px', 
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  fontSize: '14px'
                }}>
                  <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <strong>Reason for {course.status}:</strong>
                    <p style={{ margin: '4px 0 0 0' }}>{course.rejection_reason}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
