import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Tag, BookOpen, Search } from 'lucide-react';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/public/categories-with-count')
      .then(res => setCategories(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCategoryClick = (catName) => {
    navigate(`/?category=${encodeURIComponent(catName)}`);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0056D2, #1565c0)', padding: '64px 24px', textAlign: 'center', color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <Tag size={40} />
        </div>
        <h1 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '12px' }}>Browse Categories</h1>
        <p style={{ fontSize: '18px', opacity: 0.85, maxWidth: '520px', margin: '0 auto 28px' }}>
          Explore our course library by subject area. Click a category to browse all related courses.
        </p>
        <div style={{ position: 'relative', maxWidth: '440px', margin: '0 auto' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
          <input
            placeholder="Filter categories..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '12px 12px 12px 42px',
              borderRadius: '8px', border: 'none', fontSize: '15px',
              boxSizing: 'border-box', color: '#111827',
            }}
          />
        </div>
      </div>

      {/* Categories Grid */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 24px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#6b7280' }}>Loading categories...</p>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280' }}>No categories found.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
            {filtered.map(cat => (
              <button
                key={cat.name}
                onClick={() => handleCategoryClick(cat.name)}
                style={{
                  background: 'white',
                  border: '1px solid #eaeaea',
                  borderRadius: '12px',
                  padding: '24px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'box-shadow 0.2s, transform 0.2s',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,86,210,0.12)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ background: '#eff6ff', borderRadius: '8px', padding: '10px', display: 'inline-flex', marginBottom: '14px' }}>
                  <BookOpen size={22} color="#0056D2" />
                </div>
                <div style={{ fontWeight: '700', fontSize: '16px', color: '#111827', marginBottom: '6px' }}>{cat.name}</div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  {cat.course_count} {cat.course_count === 1 ? 'Course' : 'Courses'}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
