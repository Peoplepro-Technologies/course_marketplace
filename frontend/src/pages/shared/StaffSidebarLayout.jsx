/**
 * StaffSidebarLayout.jsx — Uniform sidebar layout for ALL department staff.
 *
 * Works for: Academic Operations, Academic Team, HR, IT/Technical Support,
 *            MIS & Reporting, Student Support, Finance, any future dept.
 *
 * The sidebar header/name comes from the user's department_id → dynamic.
 * Data in the content area is department-specific from the backend.
 * Zero hardcoding per department.
 */

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import './StaffLayout.css';

// Sidebar nav items — same for every department
const NAV_ITEMS = [
  { path: '/staff',                 label: 'Dashboard' },
  { path: '/staff/queue',           label: 'My Queue' },
  { path: '/staff/all',             label: 'All Tickets' },
  { path: '/staff/resolved',        label: 'Resolved' },
];

// Dept-specific accent colors to differentiate visually
const DEPT_COLORS = {
  'accounts':           '#3b82f6',
  'finance':            '#3b82f6',
  'hr':                 '#ec4899',
  'it':                 '#6366f1',
  'technical':          '#6366f1',
  'academic operations':'#f59e0b',
  'academic team':      '#f59e0b',
  'student support':    '#10b981',
  'mis':                '#8b5cf6',
  'reporting':          '#8b5cf6',
  'course coordination':'#06b6d4',
};

function getDeptColor(deptName = '') {
  const lower = deptName.toLowerCase();
  for (const [key, color] of Object.entries(DEPT_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return '#6366f1'; // default
}

export default function StaffSidebarLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const deptName = user?.department_name || 'Staff Portal';
  const accentColor = getDeptColor(deptName);
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="staff-layout" id="staff-layout">
      {/* Sidebar */}
      <aside className={`staff-sidebar ${collapsed ? 'collapsed' : ''}`} style={{ '--accent': accentColor }}>
        {/* Dept Brand */}
        <div className="staff-brand">
          {!collapsed && (
            <div className="staff-brand-text">
              <div className="staff-dept-name">{deptName}</div>
              <div className="staff-dept-sub">Staff Portal</div>
            </div>
          )}
          <button className="staff-collapse-btn" onClick={() => setCollapsed(c => !c)}>
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        {/* User info */}
        {!collapsed && (
          <div className="staff-user-info">
            <div className="staff-avatar" style={{ background: accentColor }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'S'}
            </div>
            <div>
              <div className="staff-user-name">{user?.name || 'Staff'}</div>
              <div className="staff-user-email">{user?.email || ''}</div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="staff-nav">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`staff-nav-item ${isActive(item.path) ? 'active' : ''}`}
              style={isActive(item.path) ? { '--item-color': accentColor } : {}}
              title={collapsed ? item.label : undefined}
            >
              {!collapsed && <span className="staff-nav-label">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <button className="staff-logout" onClick={logout} title="Logout">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          {!collapsed && <span>Logout</span>}
        </button>
      </aside>

      {/* Main content */}
      <main className="staff-main">
        {children}
      </main>
    </div>
  );
}
