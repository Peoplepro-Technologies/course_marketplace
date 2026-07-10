/**
 * ProtectedRoute.jsx — Role-based route guard.
 *
 * Wraps a route component and checks if the user has the required role.
 * If not, redirects to the home page or shows access denied.
 */

import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function ProtectedRoute({ role, children }) {
  const { hasRole, authenticated } = useAuth();

  if (!authenticated) {
    return <Navigate to="/" replace />;
  }

  if (role && !hasRole(role)) {
    return (
      <div className="page-wrapper container animate-fade-in">
        <div className="empty-state">
          <div className="empty-icon">🚫</div>
          <h2>Access Denied</h2>
          <p style={{ marginTop: '0.5rem' }}>
            You don't have the <strong>{role}</strong> role to access this page.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
