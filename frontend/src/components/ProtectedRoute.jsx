/**
 * ProtectedRoute.jsx — Role-based route guard.
 *
 * Wraps a route component and checks if the user has the required role.
 * If not, redirects to the home page or shows access denied.
 */

import useAuth from '../hooks/useAuth';

export default function ProtectedRoute({ role, children }) {
  const { hasRole, authenticated, login } = useAuth();

  if (!authenticated) {
    // Trigger the Keycloak login flow so the user is prompted to log in
    login();
    return null;
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
