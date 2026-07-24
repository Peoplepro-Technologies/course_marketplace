/**
 * AuthProvider.jsx — React context provider for Keycloak authentication.
 *
 * Wraps the entire app and provides:
 *   - keycloak instance
 *   - authenticated state
 *   - user info (parsed from token)
 *   - roles array
 *   - login/logout/hasRole helpers
 */

import { createContext, useState, useEffect, useCallback } from 'react';
import keycloak from './keycloak';

export const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize Keycloak with login-required mode and PKCE
    keycloak
      .init({
        onLoad: 'login-required',
        pkceMethod: 'S256',
        checkLoginIframe: false,
      })
      .then((auth) => {
        setAuthenticated(auth);

        if (auth && keycloak.tokenParsed) {
          // Extract user info from the token
          const tokenData = keycloak.tokenParsed;
          setUser({
            sub: tokenData.sub,
            name: tokenData.name || tokenData.preferred_username || '',
            email: tokenData.email || '',
            preferredUsername: tokenData.preferred_username || '',
          });

          // Extract realm roles
          const realmRoles = tokenData.realm_access?.roles || [];
          setRoles(realmRoles);
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error('Keycloak init failed:', err);
        setLoading(false);
      });

    // Set up automatic token refresh
    // Refresh the token 60 seconds before it expires
    const refreshInterval = setInterval(() => {
      if (keycloak.authenticated) {
        keycloak
          .updateToken(60)
          .then((refreshed) => {
            if (refreshed) {
              console.log('Token refreshed');
            }
          })
          .catch(() => {
            console.warn('Token refresh failed, logging out');
            keycloak.logout();
          });
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(refreshInterval);
  }, []);

  const login = useCallback(() => {
    keycloak.login();
  }, []);

  const logout = useCallback(() => {
    keycloak.logout({ redirectUri: window.location.origin });
  }, []);

  const hasRole = useCallback(
    (role) => roles.includes(role),
    [roles]
  );

  /**
   * Determine the user's primary role for dashboard routing.
   * Priority: super_admin > admin > sub_admin > course_coordinator > accounts > instructor > learner
   */
  const primaryRole = roles.includes('super_admin')
    ? 'super_admin'
    : roles.includes('admin')
    ? 'admin'
    : roles.includes('sub_admin')
    ? 'sub_admin'
    : roles.includes('course_coordinator')
    ? 'course_coordinator'
    : roles.includes('accounts')
    ? 'accounts'
    : roles.includes('instructor')
    ? 'instructor'
    : 'learner';

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0a0a1a',
        color: '#f0f0ff',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid rgba(124, 58, 237, 0.3)',
            borderTopColor: '#7c3aed',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem',
          }} />
          <p>Authenticating...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        keycloak,
        authenticated,
        user,
        roles,
        primaryRole,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
