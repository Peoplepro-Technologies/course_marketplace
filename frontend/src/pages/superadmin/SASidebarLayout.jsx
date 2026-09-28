/**
 * SASidebarLayout.jsx — Shared sidebar wrapper for all Super Admin sub-pages.
 *
 * Provides consistent navigation sidebar with active state tracking.
 * Pattern follows CoordinatorDashboard.jsx sidebar implementation.
 */

import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Lock, BookOpen, Tag, CheckSquare,
  CreditCard, BarChart2, Star, LifeBuoy, Settings, ClipboardList, Shield,
} from 'lucide-react';
import '../RoleDashboard.css';
import './SuperAdminDashboard.css';

const SIDEBAR_ITEMS = [
  { Icon: LayoutDashboard, label: 'Dashboard',           path: '/super-admin' },
  { Icon: Users,           label: 'User Management',     path: '/super-admin/users' },
  { Icon: Lock,            label: 'Roles & Permissions', path: '/super-admin/roles' },
  { Icon: BookOpen,        label: 'Course Management',   path: '/super-admin/courses' },
  { Icon: Tag,             label: 'Categories',          path: '/super-admin/categories' },
  { Icon: CheckSquare,     label: 'Approvals',           path: '/super-admin/approvals' },
  { Icon: CreditCard,      label: 'Payments & Finance',  path: '/super-admin/finance' },
  { Icon: BarChart2,       label: 'Reports & Analytics', path: '/super-admin/analytics' },
  { Icon: Star,            label: 'Reviews & Moderation',path: '/super-admin/reviews' },
  { Icon: LifeBuoy,        label: 'Support',             path: '/super-admin/support' },
  { Icon: Settings,        label: 'Platform Settings',   path: '/super-admin/settings' },
  { Icon: ClipboardList,   label: 'Audit Logs',          path: '/super-admin/audit-logs' },
];

export { SIDEBAR_ITEMS };

export default function SASidebarLayout({ children }) {
  const location = useLocation();

  return (
    <div className="role-dashboard" id="super-admin-dashboard">
      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className="role-sidebar">
        <div className="role-sidebar-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} /> Super Admin
          </h3>
          <p>Full Platform Control</p>
        </div>
        <ul className="sidebar-nav">
          {SIDEBAR_ITEMS.map((item) => {
            const isPlaceholder = item.path === '/super-admin/settings';
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
