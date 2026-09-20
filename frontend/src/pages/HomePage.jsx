/**
 * HomePage.jsx — Public landing page (pre-login).
 *
 * Sections:
 *   1. Hero          — headline + CTA
 *   2. Search bar    — real categories from /public/categories
 *   3. Featured courses — real data from /public/courses (page 1)
 *   4. Categories    — clickable pills from /public/categories
 *   5. How it works  — static 4-step section
 *   6. Final CTA banner
 *   7. Footer        — real internal links only
 *
 * No fake testimonials, no fabricated numbers. Every count shown
 * is derived from actual backend query results.
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import CourseCard from "../components/CourseCard";
import SearchBar from "../components/SearchBar";
import LoadingSpinner from "../components/LoadingSpinner";
import "./HomePage.css";

// ── Inline SVG icons (zero external deps) ────────────────────────────

function IconPlay() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
      <polygon points="10,8 16,12 10,16" fill="currentColor" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  );
}
function IconEnroll() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0056D2" strokeWidth="1.8" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0056D2" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function IconProgress() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0056D2" strokeWidth="1.8" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function IconBadge() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0056D2" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M8 14H6a2 2 0 0 0-2 2v4l4-1 4 1v-4a2 2 0 0 0-2-2h-2z" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const HOW_STEPS = [
  {
    icon: <IconSearch />,
    step: "01",
    title: "Browse the Catalog",
    desc: "Search and filter courses by topic or category to find what suits your goals.",
  },
  {
    icon: <IconEnroll />,
    step: "02",
    title: "Enroll in a Course",
    desc: "Enroll and get immediate access to video lessons, resources, and live sessions.",
  },
  {
    icon: <IconProgress />,
    step: "03",
    title: "Track Your Progress",
    desc: "Your learning dashboard shows exactly where you are in each course.",
  },
  {
    icon: <IconBadge />,
    step: "04",
    title: "Complete & Grow",
    desc: "Finish your course, earn your achievement, and move on to the next challenge.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const navigate = useNavigate();

  // ── Data from backend ────────────────────────────────────────────────
  const [featuredCourses, setFeaturedCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [totalCourses, setTotalCourses] = useState(0);
  const [loading, setLoading] = useState(true);

  // ── Search / results state ───────────────────────────────────────────
  const [searchActive, setSearchActive] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState({ search: "", category: "" });

  const catalogRef = useRef(null);
  const howRef = useRef(null);

  // ── Fetch on mount ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const [coursesRes, catsRes] = await Promise.all([
          api.get("/public/courses", { params: { page: 1, page_size: 8 } }),
          api.get("/public/categories"),
        ]);
        if (cancelled) return;
        setFeaturedCourses(coursesRes.data.courses);
        setTotalCourses(coursesRes.data.total);
        setCategories(catsRes.data);
      } catch (err) {
        if (!cancelled) console.error("Homepage data fetch failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  // ── Search handler ────────────────────────────────────────────────────
  const handleSearch = async (filters) => {
    setActiveFilters(filters);
    setSearchPage(1);
    setSearchActive(true);
    setSearchLoading(true);
    try {
      const params = { page: 1, page_size: 12 };
      if (filters.search) params.search = filters.search;
      if (filters.category) params.category = filters.category;
      const res = await api.get("/public/courses", { params });
      setSearchResults(res.data.courses);
      setSearchTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchLoading(false);
      setTimeout(
        () => catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        120
      );
    }
  };

  const handleSearchPage = async (newPage) => {
    setSearchPage(newPage);
    setSearchLoading(true);
    try {
      const params = { page: newPage, page_size: 12 };
      if (activeFilters.search) params.search = activeFilters.search;
      if (activeFilters.category) params.category = activeFilters.category;
      const res = await api.get("/public/courses", { params });
      setSearchResults(res.data.courses);
      setSearchTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleCategoryClick = (cat) => {
    handleSearch({ search: "", category: cat });
  };

  const clearSearch = () => {
    setSearchActive(false);
    setSearchResults([]);
    setActiveFilters({ search: "", category: "" });
  };

  const searchTotalPages = Math.ceil(searchTotal / 12);

  const scrollToCatalog = () =>
    catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const scrollToHow = () =>
    howRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="hp-wrapper">

      {/* ════════════════════════════════════════
          1. HERO
          ════════════════════════════════════════ */}
      <section className="hp-hero" aria-label="Hero">
        <div className="hp-hero-bg" aria-hidden="true" />
        <div className="hp-hero-inner">

          {/* Copy */}
          <div className="hp-hero-copy">
            <p className="hp-hero-eyebrow">Professional Learning Platform</p>
            <h1 className="hp-hero-headline">
              Build real-world skills<br />
              <span className="hp-hero-accent">at your own pace.</span>
            </h1>
            <p className="hp-hero-sub">
              Expert-led courses in technology, business, and design.
              Start free. Learn on your schedule.
            </p>
            <div className="hp-hero-actions">
              <button
                className="hp-btn-primary"
                id="hero-explore-btn"
                onClick={scrollToCatalog}
              >
                Explore Courses
              </button>
              <button
                className="hp-btn-ghost"
                id="hero-how-btn"
                onClick={scrollToHow}
              >
                <IconPlay /> How it works
              </button>
            </div>
          </div>

          {/* Stats card */}
          <div className="hp-hero-card" aria-label="Live platform statistics">
            <div className="hp-hero-card-inner">
              <p className="hp-card-label">Live on the platform</p>
              <div className="hp-stat-row">
                <div className="hp-stat">
                  <span className="hp-stat-number" aria-live="polite">
                    {loading ? "…" : totalCourses}
                  </span>
                  <span className="hp-stat-label">
                    {totalCourses === 1 ? "Course" : "Courses"}
                  </span>
                </div>
                <div className="hp-stat-divider" aria-hidden="true" />
                <div className="hp-stat">
                  <span className="hp-stat-number" aria-live="polite">
                    {loading ? "…" : categories.length}
                  </span>
                  <span className="hp-stat-label">
                    {categories.length === 1 ? "Category" : "Categories"}
                  </span>
                </div>
              </div>
              <ul className="hp-feature-list" aria-label="Platform features">
                <li><IconClock /><span>Learn on your schedule</span></li>
                <li><IconEnroll /><span>Expert instructors</span></li>
                <li><IconProgress /><span>Progress tracking</span></li>
              </ul>
            </div>
          </div>

        </div>
      </section>

      {/* ════════════════════════════════════════
          2. SEARCH BAR
          ════════════════════════════════════════ */}
      <section className="hp-search-section" aria-label="Search courses">
        <div className="hp-search-wrap">
          <SearchBar onSearch={handleSearch} categories={categories} />
        </div>
      </section>

      {/* ════════════════════════════════════════
          3a. SEARCH RESULTS (conditional)
          ════════════════════════════════════════ */}
      {searchActive && (
        <section
          className="hp-section hp-catalog-section"
          ref={catalogRef}
          aria-label="Search results"
        >
          <div className="hp-section-inner">
            <div className="hp-section-head">
              <div>
                <h2 className="hp-section-title">
                  {activeFilters.category
                    ? `"${activeFilters.category}"`
                    : activeFilters.search
                    ? `Results for "${activeFilters.search}"`
                    : "All Courses"}
                </h2>
                <p className="hp-section-sub">
                  {searchTotal} course{searchTotal !== 1 ? "s" : ""} found
                </p>
              </div>
              <button
                className="hp-btn-ghost hp-btn-sm"
                onClick={clearSearch}
                id="clear-search-btn"
              >
                ✕ Clear
              </button>
            </div>

            {searchLoading ? (
              <LoadingSpinner message="Searching…" />
            ) : searchResults.length === 0 ? (
              <div className="hp-empty-state">
                <span className="hp-empty-icon" aria-hidden="true"></span>
                <h3>No courses found</h3>
                <p>Try different keywords or pick a category below.</p>
              </div>
            ) : (
              <>
                <div className="hp-courses-grid">
                  {searchResults.map((c) => (
                    <CourseCard key={c.id} course={c} />
                  ))}
                </div>
                {searchTotalPages > 1 && (
                  <div className="hp-pagination">
                    <button
                      className="hp-btn-ghost hp-btn-sm"
                      onClick={() => handleSearchPage(Math.max(1, searchPage - 1))}
                      disabled={searchPage === 1}
                      id="search-prev-btn"
                    >
                      ← Previous
                    </button>
                    <span className="hp-page-info">
                      Page {searchPage} of {searchTotalPages}
                    </span>
                    <button
                      className="hp-btn-ghost hp-btn-sm"
                      onClick={() => handleSearchPage(Math.min(searchTotalPages, searchPage + 1))}
                      disabled={searchPage === searchTotalPages}
                      id="search-next-btn"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════
          3b. FEATURED COURSES (when not searching)
          ════════════════════════════════════════ */}
      {!searchActive && (
        <section
          className="hp-section"
          id="featured-courses"
          ref={catalogRef}
          aria-label="Featured courses"
        >
          <div className="hp-section-inner">
            <div className="hp-section-head">
              <div>
                <h2 className="hp-section-title">Featured Courses</h2>
                <p className="hp-section-sub">
                  {loading
                    ? "Loading…"
                    : totalCourses > 0
                    ? `${totalCourses} course${totalCourses !== 1 ? "s" : ""} available`
                    : "Content is being added soon"}
                </p>
              </div>
              {totalCourses > 8 && (
                <button
                  className="hp-btn-outline hp-btn-sm"
                  onClick={() => handleSearch({ search: "", category: "" })}
                  id="view-all-courses-btn"
                >
                  View all {totalCourses} courses →
                </button>
              )}
            </div>

            {loading ? (
              <LoadingSpinner message="Loading courses…" />
            ) : featuredCourses.length === 0 ? (
              <div className="hp-empty-state">
                <span className="hp-empty-icon" aria-hidden="true"></span>
                <h3>No published courses yet</h3>
                <p>Instructors are building content. Check back soon.</p>
              </div>
            ) : (
              <div className="hp-courses-grid">
                {featuredCourses.map((c) => (
                  <CourseCard key={c.id} course={c} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════
          4. CATEGORIES
          ════════════════════════════════════════ */}
      {categories.length > 0 && (
        <section className="hp-section hp-section-alt" aria-label="Browse by category">
          <div className="hp-section-inner">
            <h2 className="hp-section-title hp-center">Browse by Category</h2>
            <p className="hp-section-sub hp-center">
              Click a topic to filter the course catalog.
            </p>
            <div className="hp-category-grid" role="list">
              {categories.map((cat) => (
                <button
                  key={cat}
                  role="listitem"
                  className="hp-category-pill"
                  onClick={() => handleCategoryClick(cat)}
                  id={`cat-pill-${cat.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════
          5. HOW IT WORKS
          ════════════════════════════════════════ */}
      <section
        className="hp-section hp-how-section"
        ref={howRef}
        aria-label="How it works"
      >
        <div className="hp-section-inner">
          <h2 className="hp-section-title hp-center">How It Works</h2>
          <p className="hp-section-sub hp-center">
            Four simple steps to go from curious to capable.
          </p>
          <div className="hp-steps-grid">
            {HOW_STEPS.map((s) => (
              <div key={s.step} className="hp-step-card">
                <div className="hp-step-number" aria-hidden="true">{s.step}</div>
                <div className="hp-step-icon" aria-hidden="true">{s.icon}</div>
                <h3 className="hp-step-title">{s.title}</h3>
                <p className="hp-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          6. CTA BANNER
          ════════════════════════════════════════ */}
      <section className="hp-cta-banner" aria-label="Get started call to action">
        <div className="hp-cta-inner">
          <h2 className="hp-cta-headline">Ready to start learning?</h2>
          <p className="hp-cta-sub">
            Browse the catalog and find your first course today.
          </p>
          <button
            className="hp-btn-cta"
            id="cta-get-started-btn"
            onClick={scrollToCatalog}
          >
            Get Started — It&apos;s Free
          </button>
        </div>
      </section>

      {/* ════════════════════════════════════════
          7. FOOTER
          ════════════════════════════════════════ */}
      <footer className="hp-footer" role="contentinfo">
        <div className="hp-footer-inner">
          <div className="hp-footer-brand">
            <span className="hp-footer-logo" aria-hidden="true"></span>
            <span className="hp-footer-name">CourseHub</span>
          </div>
          <nav className="hp-footer-links" aria-label="Footer navigation">
            <button className="hp-footer-link" onClick={scrollToCatalog}>
              Course Catalog
            </button>
            <span className="hp-footer-sep" aria-hidden="true">·</span>
            <button
              className="hp-footer-link"
              onClick={() => handleSearch({ search: "", category: "" })}
            >
              All Courses
            </button>
            {categories.length > 0 && (
              <>
                <span className="hp-footer-sep" aria-hidden="true">·</span>
                <button
                  className="hp-footer-link"
                  onClick={() =>
                    document
                      .querySelector(".hp-category-grid")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Categories
                </button>
              </>
            )}
          </nav>
          <p className="hp-footer-copy">
            © {new Date().getFullYear()} CourseHub · Peoplepro Technologies
          </p>
        </div>
      </footer>

    </div>
  );
}
