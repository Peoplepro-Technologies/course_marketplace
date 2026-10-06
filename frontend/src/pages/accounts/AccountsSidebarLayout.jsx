/**
 * AccountsSidebarLayout.jsx — Shared sidebar wrapper for all Accounts sub-pages.
 *
 * Provides consistent navigation sidebar with active state tracking via
 * React Router's useLocation(). Mirrors the SubAdminSidebarLayout pattern.
 */

import { Link, useLocation } from 'react-router-dom';
import SupportBadgeLink from '../../components/SupportBadgeLink';
import '../RoleDashboard.css';

const SIDEBAR_ITEMS = [
  { label: 'Dashboard',           path: '/accounts' },
  { label: 'Course Earnings',     path: '/accounts/course-earnings' },
  { label: 'Transactions',        path: '/accounts/transactions' },
  { label: 'Payments & Refunds',  path: '/accounts/refunds' },
  { label: 'Instructor Payouts',  path: '/accounts/payouts' },
  { label: 'Invoices',            path: '/accounts/invoices' },
  { label: 'Financial Reports',   path: '/accounts/reports' },
  { label: 'Learner Approvals',   path: '/accounts/enrollments' },
  { label: 'Reconciliation',      path: '/accounts/reconciliation', comingSoon: true },
  { label: 'Support',             path: '/accounts/support' },
];

export { SIDEBAR_ITEMS };

export default function AccountsSidebarLayout({ children }) {
  const location = useLocation();

  return (
    <div className="role-dashboard" id="accounts-dashboard">
      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className="role-sidebar">
        <div className="role-sidebar-header">
          <h3>Accounts</h3>
          <p>Financial Operations</p>
        </div>
        <ul className="sidebar-nav">
          {SIDEBAR_ITEMS.map((item) => {
            if (item.label === 'Support') {
              return (
                <SupportBadgeLink 
                  key={item.label}
                  label={item.label}
                  path={item.path}
                  apiEndpoint="/accounts/support-tickets/unread-count"
                />
              );
            }
            return (
              <Link to={item.path} key={item.label} style={{ textDecoration: 'none' }}>
                <li className={`sidebar-nav-item${location.pathname === item.path ? ' active' : ''}`}>
                  {item.label}
                  {item.comingSoon && (
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
