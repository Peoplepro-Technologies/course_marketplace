import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { BookOpen, CheckCircle, TrendingUp, BarChart2 } from 'lucide-react';
import EmptyState from '../../components/EmptyState';

function ProgressBar({ value }) {
  const pct = Math.min(100, Math.max(0, value || 0));
  return (
    <div style={{ background: '#f3f4f6', borderRadius: '999px', height: '8px', overflow: 'hidden', flex: 1 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#16a34a' : '#0056D2', borderRadius: '999px', transition: 'width 0.4s' }} />
    </div>
  );
}

export default function LearnerProgress() {
  const [enrollments, setEnrollments] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/learner/courses'),
      api.get('/learner/progress-overview'),
    ]).then(([enrRes, ovrRes]) => {
      setEnrollments(enrRes.data);
      setOverview(ovrRes.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '24px' }}>Loading progress...</div>;

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <TrendingUp size={24} /> My Progress
      </h1>
      <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '28px' }}>
        Your learning progress across all enrolled courses.
      </p>

      {/* Summary Cards */}
      {overview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {[
            { icon: BookOpen, label: 'Enrolled Courses', value: overview.total_enrolled, color: '#0056D2' },
            { icon: CheckCircle, label: 'Completed', value: overview.completed_courses, color: '#16a34a' },
            { icon: BarChart2, label: 'Avg. Progress', value: `${overview.average_progress}%`, color: '#7c3aed' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', border: '1px solid #eaeaea' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color, marginBottom: '8px' }}>
                <Icon size={18} />
                <span style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280' }}>{label}</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Per-course progress */}
      {enrollments.length === 0 ? (
        <EmptyState icon={BookOpen} title="No Courses" message="You are not enrolled in any courses." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {enrollments.map(enr => {
            const pct = Math.min(100, Math.max(0, enr.progress_percent || 0));
            return (
              <div key={enr.enrollment_id} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', border: '1px solid #eaeaea' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BookOpen size={16} color="#0056D2" />
                    <span style={{ fontWeight: '600', fontSize: '15px' }}>
                      {enr.course_title || `Course`}
                    </span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: pct >= 100 ? '#16a34a' : '#0056D2' }}>
                    {pct}%
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ProgressBar value={pct} />
                  {pct >= 100 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '13px', whiteSpace: 'nowrap' }}>
                      <CheckCircle size={14} /> Done
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
