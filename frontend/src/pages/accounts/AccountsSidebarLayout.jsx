/**
 * AccountsSidebarLayout.jsx — Shared sidebar wrapper for all Accounts sub-pages.
 *
 * Provides consistent navigation sidebar with active state tracking via
 * React Router's useLocation(). Mirrors the SubAdminSidebarLayout pattern.
 */

import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, DollarSign, CreditCard, Building2, FileText, BarChart2, RefreshCcw, Wallet, LifeBuoy,
} from 'lucide-react';
import '../RoleDashboard.css';

const SIDEBAR_ITEMS = [
  { Icon: LayoutDashboard, label: 'Dashboard',           path: '/accounts' },
  { Icon: DollarSign,      label: 'Transactions',        path: '/accounts/transactions' },
  { Icon: CreditCard,      label: 'Payments & Refunds',  path: '/accounts/refunds' },
  { Icon: Building2,       label: 'Instructor Payouts',  path: '/accounts/payouts' },
  { Icon: FileText,        label: 'Invoices',            path: '/accounts/invoices' },
  { Icon: BarChart2,       label: 'Financial Reports',   path: '/accounts/reports' },
  { Icon: RefreshCcw,      label: 'Reconciliation',      path: '/accounts/reconciliation', comingSoon: true },
  { Icon: LifeBuoy,        label: 'Support',             path: '/accounts/support' },
];

export { SIDEBAR_ITEMS };

export default function AccountsSidebarLayout({ children }) {
  const location = useLocation();

  return (
    <div className="role-dashboard" id="accounts-dashboard">
      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className="role-sidebar">
        <div className="role-sidebar-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wallet size={18} /> Accounts
          </h3>
          <p>Financial Operations</p>
        </div>
        <ul className="sidebar-nav">
          {SIDEBAR_ITEMS.map((item) => (
            <Link to={item.path} key={item.label} style={{ textDecoration: 'none' }}>
              <li className={`sidebar-nav-item${location.pathname === item.path ? ' active' : ''}`}>
                <span className="sidebar-nav-icon"><item.Icon size={16} /></span>
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
