import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookPlus, Users, DollarSign, Video, MessageSquare, LifeBuoy, FileText, User } from 'lucide-react';
import '../RoleDashboard.css';

const SIDEBAR_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/instructor/dashboard' },
  { icon: BookPlus, label: 'My Courses', path: '/instructor/courses' },
  { icon: FileText, label: 'Submissions & Status', path: '/instructor/submissions' },
  { icon: Users, label: 'Students', path: '/instructor/students' },
  { icon: DollarSign, label: 'Earnings', path: '/instructor/earnings' },
  { icon: Video, label: 'Live Classes', path: '/instructor/live-classes' },
  { icon: MessageSquare, label: 'Reviews', path: '/instructor/reviews' },
  { icon: LifeBuoy, label: 'Support', path: '/instructor/support' },
  { icon: User, label: 'Profile & Payout', path: '/instructor/profile' },
];

export { SIDEBAR_ITEMS };

export default function InstructorSidebarLayout({ children }) {
  const location = useLocation();

  return (
    <div className="role-dashboard" id="instructor-dashboard">
      <aside className="role-sidebar">
        <div className="role-sidebar-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <LayoutDashboard size={20} />
            Instructor
          </h3>
          <p>Manage Your Teaching</p>
        </div>
        <ul className="sidebar-nav">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            // Exact match for dashboard, prefix match for others to keep active state when on sub-routes
            const isActive = item.path === '/instructor/dashboard' 
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);

            return (
              <Link to={item.path} key={item.label} style={{ textDecoration: 'none' }}>
                <li className={`sidebar-nav-item${isActive ? ' active' : ''}`}>
                  <span className="sidebar-nav-icon"><Icon size={18} strokeWidth={2} /></span>
                  {item.label}
                </li>
              </Link>
            );
          })}
        </ul>
      </aside>

      <main className="role-main">
        {children}
      </main>
    </div>
  );
}
