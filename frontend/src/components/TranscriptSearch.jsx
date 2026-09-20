import React, { useState } from 'react';
import api from '../api/axios';

/**
 * TranscriptSearch — Searches lesson transcripts (via real API) across the whole course.
 *
 * Falls back to title/content matching when a lesson has no transcript yet.
 */
export default function TranscriptSearch({ courseId, onJumpToLesson, sections }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      return;
    }

    setSearching(true);
    setResults([]);

    // Collect all lessons
    const lessonMap = {};
    sections.forEach(section => {
      section.lessons?.forEach(lesson => {
        lessonMap[lesson.id] = { lesson, sectionTitle: section.title };
      });
    });

    const found = [];

    // Try to fetch transcript for each lesson with a video and search within it
    await Promise.allSettled(
      Object.entries(lessonMap).map(async ([lessonId, { lesson, sectionTitle }]) => {
        if (lesson.video_url) {
          try {
            const res = await api.get(`/transcripts/lesson/${lessonId}`);
            const transcript = res.data;
            if (transcript?.segments) {
              const matchingSegments = transcript.segments.filter(seg =>
                seg.text.toLowerCase().includes(q.toLowerCase())
              );
              if (matchingSegments.length > 0) {
                matchingSegments.forEach(seg => {
                  found.push({
                    lessonId,
                    title: lesson.title,
                    sectionTitle,
                    snippet: seg.text,
                    startSeconds: seg.start,
                    source: 'transcript',
                  });
                });
                return;
              }
            }
          } catch {
            // 404 = no transcript yet — fall through to title/content match
          }
        }

        // Fallback: title / content match
        const titleMatch = lesson.title.toLowerCase().includes(q.toLowerCase());
        const contentMatch = lesson.content && lesson.content.toLowerCase().includes(q.toLowerCase());
        if (titleMatch || contentMatch) {
          found.push({
            lessonId,
            title: lesson.title,
            sectionTitle,
            snippet: contentMatch ? lesson.content?.slice(0, 120) + '…' : null,
            startSeconds: 0,
            source: 'title',
          });
        }
      })
    );

    // Sort: transcript hits first, then title hits
    found.sort((a, b) => (a.source === 'transcript' ? -1 : 1));
    setResults(found);
    setSearched(true);
    setSearching(false);
  };

  return (
    <div
      className="transcript-search"
      style={{
        marginBottom: '2rem',
        padding: '2.5rem 2rem',
        borderRadius: '12px',
        background: '#fff',
        border: '2px solid var(--accent-border)',
        boxShadow: '0 4px 12px rgba(0, 86, 210, 0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '1.5rem', color: 'var(--accent)' }}>🔍</span>
        <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 'bold', color: 'var(--text-h)' }}>
          Search this course's lectures
        </h2>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search for a concept or keyword in transcripts…"
          style={{
            flex: 1,
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: '#F7F9FA',
            color: 'var(--text-h)',
            outline: 'none',
            fontSize: '1rem',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={searching}
          style={{ padding: '0.85rem 2rem', fontWeight: 'bold', fontSize: '1.05rem', minWidth: '110px' }}
        >
          {searching ? '…' : 'Search'}
        </button>
      </form>

      {searching && (
        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Searching transcripts…</p>
      )}

      {!searching && searched && results.length === 0 && (
        <p style={{ color: 'var(--text-muted)' }}>
          No results found for "<strong>{query}</strong>".
        </p>
      )}

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </p>
          {results.map((res, idx) => (
            <div
              key={idx}
              style={{
                padding: '1rem 1.25rem',
                background: '#FAFBFC',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => onJumpToLesson(res.lessonId, res.startSeconds)}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.borderColor = 'var(--accent-border)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#FAFBFC';
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem', color: 'var(--accent)' }}>
                    {res.title}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: res.snippet ? '0.5rem' : 0 }}>
                    {res.sectionTitle}
                  </div>
                  {res.snippet && (
                    <div style={{
                      fontSize: '0.88rem',
                      color: 'var(--text)',
                      background: 'rgba(0,86,210,0.04)',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '6px',
                      borderLeft: '3px solid var(--accent)',
                      fontStyle: 'italic',
                    }}>
                      "…{res.snippet}…"
                    </div>
                  )}
                </div>
                {res.source === 'transcript' && res.startSeconds > 0 && (
                  <span style={{
                    flexShrink: 0,
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: '#fff',
                    background: 'var(--accent)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                  }}>
                    {Math.floor(res.startSeconds / 60)}:{String(Math.floor(res.startSeconds % 60)).padStart(2, '0')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
