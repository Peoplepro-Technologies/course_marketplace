/**
 * HomePage.jsx — Public course catalog / landing page.
 *
 * Features:
 *   - Hero section with gradient text
 *   - Search bar with category filter
 *   - Paginated course grid
 */

import { useState, useEffect } from 'react';
import api from '../api/axios';
import CourseCard from '../components/CourseCard';
import SearchBar from '../components/SearchBar';
import LoadingSpinner from '../components/LoadingSpinner';
import './HomePage.css';

export default function HomePage() {
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', category: '' });

  // Fetch categories on mount
  useEffect(() => {
    api.get('/public/categories')
      .then((res) => setCategories(res.data))
      .catch(console.error);
  }, []);

  // Fetch courses when page or filters change
  useEffect(() => {
    setLoading(true);
    const params = { page, page_size: 12 };
    if (filters.search) params.search = filters.search;
    if (filters.category) params.category = filters.category;

    api.get('/public/courses', { params })
      .then((res) => {
        setCourses(res.data.courses);
        setTotal(res.data.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, filters]);

  const handleSearch = (newFilters) => {
    setPage(1);
    setFilters(newFilters);
  };

  const totalPages = Math.ceil(total / 12);

  return (
    <div className="page-wrapper">
      {/* ── Hero Section ────────────────────────────────────────────── */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-content animate-fade-in-up">
            <h1 className="hero-title">
              Unlock Your <span className="gradient-text">Potential</span>
            </h1>
            <p className="hero-subtitle">
              Discover world-class courses taught by expert instructors.
              Learn at your own pace, anywhere, anytime.
            </p>
          </div>
        </div>
        <div className="hero-glow" />
      </section>

      {/* ── Search & Filter ─────────────────────────────────────────── */}
      <section className="container" style={{ marginTop: '-2rem', position: 'relative', zIndex: 10 }}>
        <SearchBar onSearch={handleSearch} categories={categories} />
      </section>

      {/* ── Course Grid ─────────────────────────────────────────────── */}
      <section className="container" style={{ marginTop: '2rem' }}>
        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: 'var(--text-2xl)' }}>
            {filters.search || filters.category ? 'Search Results' : 'Explore Courses'}
          </h2>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            {total} course{total !== 1 ? 's' : ''} found
          </span>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading courses..." />
        ) : courses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No courses found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-3">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Previous
                </button>
                <span className="page-info">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
