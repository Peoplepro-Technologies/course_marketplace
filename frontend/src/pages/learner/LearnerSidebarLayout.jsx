import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Heart, Clock, FileText, LifeBuoy, TrendingUp, MessageSquare } from 'lucide-react';
import '../RoleDashboard.css';

const SIDEBAR_ITEMS = [
  { icon: BookOpen, label: 'My Courses', path: '/learner/dashboard' },
  { icon: Heart, label: 'Wishlist', path: '/learner/wishlist' },
  { icon: FileText, label: 'Purchase History', path: '/learner/purchases' },
  { icon: TrendingUp, label: 'Progress', path: '/learner/progress' },
  { icon: MessageSquare, label: 'My Reviews', path: '/learner/my-reviews' },
  { icon: Clock, label: 'Live Classes', path: '/learner/live-classes' },
  { icon: LifeBuoy, label: 'Support', path: '/learner/support' },
];

export { SIDEBAR_ITEMS };

export default function LearnerSidebarLayout({ children }) {
  const location = useLocation();

  return (
    <div className="role-dashboard" id="learner-dashboard">
      <aside className="role-sidebar">
        <div className="role-sidebar-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <BookOpen size={20} />
            Learner
          </h3>
          <p>My Learning Journey</p>
        </div>
        <ul className="sidebar-nav">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link to={item.path} key={item.label} style={{ textDecoration: 'none' }}>
                <li className={`sidebar-nav-item${location.pathname.startsWith(item.path) ? ' active' : ''}`}>
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
