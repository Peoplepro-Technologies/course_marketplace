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
  const { user, primaryRole, login, register, logout, authenticated } = useAuth();
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

          {primaryRole === 'super_admin' && (
            <Link
              to="/super-admin"
              className={`nav-link ${isActive('/super-admin') ? 'active' : ''}`}
            >
              Super Admin
            </Link>
          )}

          {primaryRole === 'sub_admin' && (
            <Link
              to="/sub-admin"
              className={`nav-link ${isActive('/sub-admin') ? 'active' : ''}`}
            >
              Sub Admin
            </Link>
          )}

          {primaryRole === 'coursecoordinator' && (
            <Link
              to="/coordinator"
              className={`nav-link ${isActive('/coordinator') ? 'active' : ''}`}
            >
              Coordinator
            </Link>
          )}

          {primaryRole === 'accounts' && (
            <Link
              to="/accounts"
              className={`nav-link ${isActive('/accounts') ? 'active' : ''}`}
            >
              Accounts
            </Link>
          )}
        </div>

        {/* ── User Info & Auth Buttons ──────────────────────────────── */}
        <div className="navbar-user">
          {authenticated ? (
            <>
              <div className="user-info">
                <span className="user-avatar">
                  {user?.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
                <div className="user-details">
                  <span className="user-name">{user?.name || 'User'}</span>
                  <span className={`badge badge-${
                    primaryRole === 'admin' || primaryRole === 'super_admin' ? 'danger'
                    : primaryRole === 'sub_admin' ? 'warning'
                    : primaryRole === 'instructor' ? 'warning'
                    : primaryRole === 'coursecoordinator' ? 'success'
                    : primaryRole === 'accounts' ? 'primary'
                    : 'primary'
                  }`}>
                    {primaryRole === 'super_admin' ? 'super admin'
                      : primaryRole === 'sub_admin' ? 'sub admin'
                      : primaryRole === 'coursecoordinator' ? 'coordinator'
                      : primaryRole}
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
            </>
          ) : (
            <div className="navbar-auth-buttons">
              <button className="btn btn-secondary btn-sm" onClick={login} id="navbar-login-button">
                Log in
              </button>
              <button className="btn btn-primary btn-sm" onClick={register} id="navbar-signup-button">
                Sign up
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
