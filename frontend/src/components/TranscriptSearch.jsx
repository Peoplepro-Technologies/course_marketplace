import React, { useState } from 'react';

export default function TranscriptSearch({ courseId, onJumpToLesson, sections }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) {
      setResults([]);
      return;
    }
    
    // Mock search across lessons
    const found = [];
    sections.forEach(section => {
      section.lessons?.forEach(lesson => {
        if (lesson.title.toLowerCase().includes(query.toLowerCase()) || 
            (lesson.content && lesson.content.toLowerCase().includes(query.toLowerCase()))) {
          found.push({
            lessonId: lesson.id,
            title: lesson.title,
            sectionTitle: section.title,
            startSeconds: 0 // Mock starting time since we don't have transcript text here
          });
        }
      });
    });
    setResults(found);
  };

  return (
    <div className="transcript-search" style={{ marginBottom: '2rem', padding: '2.5rem 2rem', borderRadius: '12px', background: '#fff', border: '2px solid var(--accent-border)', boxShadow: '0 4px 12px rgba(0, 86, 210, 0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '1.5rem', color: 'var(--accent)' }}>🔍</span>
        <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 'bold', color: 'var(--text-h)' }}>Search this course's lectures</h2>
      </div>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <input 
          type="text" 
          value={query} 
          onChange={e => setQuery(e.target.value)} 
          placeholder="Search for a concept or keyword..."
          style={{ flex: 1, padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: '#F7F9FA', color: 'var(--text-h)', outline: 'none', fontSize: '1rem', transition: 'border-color 0.2s' }}
          onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
        />
        <button type="submit" className="btn btn-primary" style={{ padding: '0.85rem 2rem', fontWeight: 'bold', fontSize: '1.05rem' }}>Search</button>
      </form>
      
      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {results.map((res, idx) => (
            <div 
              key={idx} 
              style={{ padding: '1rem', background: '#FAFBFC', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => onJumpToLesson(res.lessonId, res.startSeconds)}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#FAFBFC'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ fontWeight: '600', marginBottom: '0.25rem', color: 'var(--accent)' }}>{res.title}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{res.sectionTitle}</div>
            </div>
          ))}
        </div>
      )}
      {query && results.length === 0 && (
        <p style={{ color: 'var(--text-muted)' }}>No results found.</p>
      )}
    </div>
  );
}
