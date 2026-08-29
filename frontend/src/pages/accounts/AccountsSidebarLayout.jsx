/**
 * AccountsSidebarLayout.jsx — Shared sidebar wrapper for all Accounts sub-pages.
 *
 * Provides consistent navigation sidebar with active state tracking via
 * React Router's useLocation(). Mirrors the SubAdminSidebarLayout pattern.
 */

import { Link, useLocation } from 'react-router-dom';
import '../RoleDashboard.css';

const SIDEBAR_ITEMS = [
  { icon: '📊', label: 'Dashboard',           path: '/accounts' },
  { icon: '💰', label: 'Transactions',         path: '/accounts/transactions' },
  { icon: '💳', label: 'Payments & Refunds',   path: '/accounts/refunds' },
  { icon: '🏦', label: 'Instructor Payouts',   path: '/accounts/payouts' },
  { icon: '🧾', label: 'Invoices',             path: '/accounts/invoices' },
  { icon: '📈', label: 'Financial Reports',    path: '/accounts/reports' },
  { icon: '🔄', label: 'Reconciliation',       path: '/accounts/reconciliation', comingSoon: true },
];

export { SIDEBAR_ITEMS };

export default function AccountsSidebarLayout({ children }) {
  const location = useLocation();

  return (
    <div className="role-dashboard" id="accounts-dashboard">
      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className="role-sidebar">
        <div className="role-sidebar-header">
          <h3>💰 Accounts</h3>
          <p>Financial Operations</p>
        </div>
        <ul className="sidebar-nav">
          {SIDEBAR_ITEMS.map((item) => (
            <Link to={item.path} key={item.label} style={{ textDecoration: 'none' }}>
              <li className={`sidebar-nav-item${location.pathname === item.path ? ' active' : ''}`}>
                <span className="sidebar-nav-icon">{item.icon}</span>
                {item.label}
                {item.comingSoon && (
                  <span className="sidebar-coming-soon">Soon</span>
                )}
              </li>
            </Link>
          ))}
        </ul>
      </aside>

      {/* ── Main Content ───────────────────────────────────────────── */}
      <main className="role-main">
        {children}
      </main>
    </div>
  );
}
