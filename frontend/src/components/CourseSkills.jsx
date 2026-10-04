import React from 'react';

export default function CourseSkills({ sections, course }) {
  if (!sections || sections.length === 0) return null;
  
  // Use explicit learning_outcomes if available; fallback to section titles
  const hasOutcomes = course?.learning_outcomes && course.learning_outcomes.length > 0;
  const skills = hasOutcomes ? course.learning_outcomes : sections.map(s => s.title);

  // Use explicit skills if available; fallback to derived lesson titles
  const hasSkills = course?.skills && course.skills.length > 0;
  const tagChips = hasSkills ? course.skills : [];
  
  if (!hasSkills) {
    sections.forEach(s => {
      if (s.lessons) {
        s.lessons.forEach(l => {
          if (l.title && !tagChips.includes(l.title) && tagChips.length < 10) {
            tagChips.push(l.title);
          }
        });
      }
    });
  }

  return (
    <div className="course-skills" style={{ marginBottom: '2rem', padding: '2rem', borderRadius: '12px', background: '#fff', border: '1px solid var(--border)' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontWeight: 'bold', color: 'var(--text-h)' }}>What you'll learn</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: tagChips.length > 0 ? '2.5rem' : '0' }}>
        {skills.map((skill, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>✓</span>
            <span style={{ fontSize: '0.95rem', lineHeight: '1.4', color: 'var(--text-h)' }}>{skill}</span>
          </div>
        ))}
      </div>
      
      {tagChips.length > 0 && (
        <>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: '600', color: 'var(--text-h)' }}>Skills you'll gain</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {tagChips.map((tag, idx) => (
              <span key={idx} style={{ 
                background: 'var(--accent-bg)', 
                color: 'var(--accent)', 
                padding: '0.4rem 0.8rem', 
                borderRadius: '999px', 
                fontSize: '0.85rem',
                fontWeight: '600'
              }}>
                {tag}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
