import { Link, useLocation } from 'react-router-dom';
import SupportBadgeLink from '../../components/SupportBadgeLink';
import '../RoleDashboard.css';

const SIDEBAR_ITEMS = [
  { label: 'My Courses', path: '/learner/dashboard' },
  { label: 'Wishlist', path: '/learner/wishlist' },
  { label: 'Purchase History', path: '/learner/purchases' },
  { label: 'Progress', path: '/learner/progress' },
  { label: 'My Reviews', path: '/learner/my-reviews' },
  { label: 'Live Classes', path: '/learner/live-classes' },
  { label: 'Support', path: '/learner/support' },
];

export { SIDEBAR_ITEMS };

export default function LearnerSidebarLayout({ children }) {
  const location = useLocation();

  return (
    <div className="role-dashboard" id="learner-dashboard">
      <aside className="role-sidebar">
        <div className="role-sidebar-header">
          <h3>Learner</h3>
          <p>My Learning Journey</p>
        </div>
        <ul className="sidebar-nav">
          {SIDEBAR_ITEMS.map((item) => {
            if (item.label === 'Support') {
              return (
                <SupportBadgeLink 
                  key={item.label}
                  label={item.label}
                  path={item.path}
                  apiEndpoint="/support-tickets/unread-count"
                />
              );
            }
            return (
              <Link to={item.path} key={item.label} style={{ textDecoration: 'none' }}>
                <li className={`sidebar-nav-item${location.pathname.startsWith(item.path) ? ' active' : ''}`}>
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
