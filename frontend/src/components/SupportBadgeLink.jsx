import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api/axios';
import useAuth from '../hooks/useAuth';

export default function SupportBadgeLink({ label, path, apiEndpoint }) {
  const location = useLocation();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    
    const fetchUnread = () => {
      api.get(apiEndpoint)
        .then(res => setUnreadCount(res.data.unread_count))
        .catch(err => console.error("Failed to fetch unread support count", err));
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [apiEndpoint, user]);

  return (
    <Link to={path} style={{ textDecoration: 'none' }}>
      <li className={`sidebar-nav-item${location.pathname.startsWith(path) ? ' active' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          {label}
        </div>
        {unreadCount > 0 && (
          <span className="badge" style={{ backgroundColor: 'var(--color-danger)', color: 'white', fontSize: '0.75rem', padding: '0.15rem 0.4rem', borderRadius: '1rem' }}>
            {unreadCount}
          </span>
        )}
      </li>
    </Link>
  );
}
