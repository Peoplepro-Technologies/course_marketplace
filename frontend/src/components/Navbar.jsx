/**
 * Navbar.jsx — Shared navigation bar displayed on every page.
 *
 * Shows:
 *   - App logo/name
 *   - Navigation links based on role
 *   - User info (name, role badge)
 *   - Logout button
 */

import { Link, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import './Navbar.css';

export default function Navbar() {
  const { user, primaryRole, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-inner container">
        {/* ── Logo ──────────────────────────────────────────────────── */}
        <Link to="/" className="navbar-brand">
          <span className="navbar-logo">🎓</span>
          <span className="navbar-title">CourseHub</span>
        </Link>

        {/* ── Navigation Links ──────────────────────────────────────── */}
        <div className="navbar-links">
          <Link
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            Catalog
          </Link>

          {primaryRole === 'learner' && (
            <Link
              to="/learner"
              className={`nav-link ${isActive('/learner') ? 'active' : ''}`}
            >
              My Learning
            </Link>
          )}

          {primaryRole === 'instructor' && (
            <Link
              to="/instructor"
              className={`nav-link ${isActive('/instructor') ? 'active' : ''}`}
            >
              My Courses
            </Link>
          )}

          {primaryRole === 'admin' && (
            <Link
              to="/admin"
              className={`nav-link ${isActive('/admin') ? 'active' : ''}`}
            >
              Admin Panel
            </Link>
          )}
        </div>

        {/* ── User Info & Logout ────────────────────────────────────── */}
        <div className="navbar-user">
          <div className="user-info">
            <span className="user-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </span>
            <div className="user-details">
              <span className="user-name">{user?.name || 'User'}</span>
              <span className={`badge badge-${primaryRole === 'admin' ? 'danger' : primaryRole === 'instructor' ? 'warning' : 'primary'}`}>
                {primaryRole}
              </span>
            </div>
          </div>
          <button className="btn-logout" onClick={logout} id="logout-button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
