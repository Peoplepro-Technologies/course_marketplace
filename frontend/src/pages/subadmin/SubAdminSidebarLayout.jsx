/**
 * SubAdminSidebarLayout.jsx — Shared sidebar wrapper for all Sub Admin sub-pages.
 *
 * Provides consistent navigation sidebar with active state tracking.
 * Reuses the layout styles from Super Admin dashboard for visual consistency.
 */

import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, BookOpen, Tag, CheckSquare, Star, LifeBuoy, BarChart2, Wrench,
} from 'lucide-react';
import '../RoleDashboard.css';
import '../superadmin/SuperAdminDashboard.css';

const SIDEBAR_ITEMS = [
  { Icon: LayoutDashboard, label: 'Dashboard',            path: '/sub-admin' },
  { Icon: Users,           label: 'User Management',      path: '/sub-admin/users' },
  { Icon: BookOpen,        label: 'Course Management',    path: '/sub-admin/courses' },
  { Icon: Tag,             label: 'Categories',           path: '/sub-admin/categories' },
  { Icon: CheckSquare,     label: 'Approvals',            path: '/sub-admin/approvals' },
  { Icon: Star,            label: 'Reviews & Moderation', path: '/sub-admin/reviews' },
  { Icon: LifeBuoy,        label: 'Support',              path: '/sub-admin/support' },
  { Icon: BarChart2,       label: 'Reports',              path: '/sub-admin/reports' },
];

export { SIDEBAR_ITEMS };

export default function SubAdminSidebarLayout({ children }) {
  const location = useLocation();

  return (
    <div className="role-dashboard" id="sub-admin-dashboard">
      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className="role-sidebar">
        <div className="role-sidebar-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wrench size={18} /> Sub Admin
          </h3>
          <p>Delegated Management</p>
        </div>
        <ul className="sidebar-nav">
          {SIDEBAR_ITEMS.map((item) => {
            const isPlaceholder = false;
            return (
              <Link to={item.path} key={item.label} style={{ textDecoration: 'none' }}>
                <li className={`sidebar-nav-item${location.pathname === item.path ? ' active' : ''}`}>
                  <span className="sidebar-nav-icon"><item.Icon size={16} /></span>
                  {item.label}
                  {isPlaceholder && (
                    <span className="sidebar-coming-soon">Soon</span>
                  )}
                </li>
              </Link>
            );
          })}
        </ul>
      </aside>

      {/* ── Main Content ───────────────────────────────────────────── */}
      <main className="role-main">
        {children}
      </main>
    </div>
  );
}
