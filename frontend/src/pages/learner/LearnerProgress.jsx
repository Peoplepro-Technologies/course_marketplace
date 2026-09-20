/**
 * LearnerProgress.jsx — My Progress page for learners.
 *
 * Shows:
 *  - Summary cards: total enrolled, completed, avg progress
 *  - IN-PROGRESS courses section
 *  - COMPLETED courses section
 *
 * Data source: GET /learner/courses (already returns progress_percent, total_lessons, completed_lessons)
 *              GET /learner/progress-overview (summary stats)
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { BookOpen, CheckCircle, TrendingUp, BarChart2, PlayCircle, Trophy } from 'lucide-react';
import EmptyState from '../../components/EmptyState';

function ProgressBar({ value }) {
  const pct = Math.min(100, Math.max(0, value || 0));
  return (
    <div style={{ background: '#e5e7eb', borderRadius: '999px', height: '8px', overflow: 'hidden', flex: 1 }}>
      <div style={{
        width: `${pct}%`,
        height: '100%',
        background: pct >= 100 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#0056D2',
        borderRadius: '999px',
        transition: 'width 0.5s ease',
      }} />
    </div>
  );
}

function CourseCard({ enr }) {
  const pct = Math.min(100, Math.max(0, enr.progress_percent || 0));
  const isDone = pct >= 100;

  return (
    <div style={{
      background: 'var(--color-bg-secondary, white)',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      border: `1px solid ${isDone ? '#bbf7d0' : 'var(--color-border, #eaeaea)'}`,
      transition: 'box-shadow 0.2s, transform 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
            background: isDone ? 'linear-gradient(135deg, #16a34a, #22c55e)' : 'linear-gradient(135deg, #0056D2, #7B2FBE)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
          }}>
            {isDone ? <Trophy size={16} /> : <BookOpen size={16} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--color-text-primary, #111827)', lineHeight: '1.3', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {enr.course_title}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted, #6b7280)' }}>
              {enr.instructor_name && `by ${enr.instructor_name}`}
            </div>
          </div>
        </div>
        <span style={{
          fontSize: '15px', fontWeight: '800', flexShrink: 0,
          color: isDone ? '#16a34a' : '#0056D2',
        }}>
          {pct}%
        </span>
      </div>

      {/* Progress Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        <ProgressBar value={pct} />
        {isDone && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>
            <CheckCircle size={13} /> Done
          </span>
        )}
      </div>

      {/* Lesson count + CTA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: 'var(--color-text-muted, #6b7280)' }}>
          {enr.completed_lessons ?? 0} / {enr.total_lessons ?? '?'} lessons
        </span>
        <Link
          to={`/learner/course/${enr.course_id}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            fontSize: '13px', fontWeight: '600', textDecoration: 'none',
            color: isDone ? '#16a34a' : '#0056D2',
          }}
        >
          <PlayCircle size={14} /> {isDone ? 'Review' : 'Resume'}
        </Link>
      </div>
    </div>
  );
}

export default function LearnerProgress() {
  const [enrollments, setEnrollments] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/learner/courses'),
      api.get('/learner/progress-overview'),
    ]).then(([enrRes, ovrRes]) => {
      setEnrollments(enrRes.data || []);
      setOverview(ovrRes.data);
    }).catch(err => {
      console.error(err);
      setError('Failed to load progress data.');
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted, #6b7280)' }}>
        Loading progress…
      </div>
    );
  }

  const inProgress = enrollments.filter(e => (e.progress_percent || 0) < 100);
  const completed  = enrollments.filter(e => (e.progress_percent || 0) >= 100);

  return (
    <div style={{ padding: '24px', maxWidth: '900px' }}>

      {/* ── Page header ─────────────────────────────────────────────── */}
      <h1 style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '22px' }}>
        <TrendingUp size={24} /> My Progress
      </h1>
      <p style={{ color: 'var(--color-text-muted, #6b7280)', fontSize: '14px', marginBottom: '28px' }}>
        Your learning journey across all enrolled courses.
      </p>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '12px 16px', color: '#b91c1c', marginBottom: '24px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* ── Summary cards ───────────────────────────────────────────── */}
      {overview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '36px' }}>
          {[
            { icon: BookOpen,    label: 'Enrolled',       value: overview.total_enrolled,       color: '#0056D2' },
            { icon: CheckCircle, label: 'Completed',      value: overview.completed_courses,     color: '#16a34a' },
            { icon: BarChart2,   label: 'Avg. Progress',  value: `${overview.average_progress}%`, color: '#7c3aed' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} style={{ background: 'var(--color-bg-secondary, white)', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', border: '1px solid var(--color-border, #eaeaea)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Icon size={16} color={color} />
                <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-muted, #6b7280)' }}>{label}</span>
              </div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--color-text-primary, #111827)' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── No enrollments at all ────────────────────────────────────── */}
      {enrollments.length === 0 && !error && (
        <EmptyState icon={BookOpen} title="No Courses Yet" message="Enrol in a course to track your progress here." />
      )}

      {/* ── IN PROGRESS section ──────────────────────────────────────── */}
      {inProgress.length > 0 && (
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <PlayCircle size={18} color="#0056D2" />
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text-primary, #111827)', margin: 0 }}>
              In Progress <span style={{ fontWeight: '400', color: 'var(--color-text-muted, #6b7280)', fontSize: '13px' }}>({inProgress.length})</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
            {inProgress.map(enr => <CourseCard key={enr.enrollment_id} enr={enr} />)}
          </div>
        </div>
      )}

      {/* ── COMPLETED section ────────────────────────────────────────── */}
      {completed.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Trophy size={18} color="#16a34a" />
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#16a34a', margin: 0 }}>
              Completed <span style={{ fontWeight: '400', color: 'var(--color-text-muted, #6b7280)', fontSize: '13px' }}>({completed.length})</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
            {completed.map(enr => <CourseCard key={enr.enrollment_id} enr={enr} />)}
          </div>
        </div>
      )}

    </div>
  );
}
