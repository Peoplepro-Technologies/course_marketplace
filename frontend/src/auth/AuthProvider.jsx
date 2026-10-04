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

import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import keycloak from './keycloak';

export const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const isRun = useRef(false);

  useEffect(() => {
    if (isRun.current) return;
    isRun.current = true;

    // Initialize Keycloak with login-required mode and PKCE
    keycloak
      .init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
        pkceMethod: 'S256',
        checkLoginIframe: false,
      })
      .then((auth) => {
        setAuthenticated(auth);

        if (auth && keycloak.tokenParsed) {
          // Extract user info from the token
          const tokenData = keycloak.tokenParsed;
          console.log("RAW KEYCLOAK TOKEN:", tokenData);

          setUser({
            sub: tokenData.sub,
            name: tokenData.name || tokenData.preferred_username || '',
            email: tokenData.email || '',
            preferredUsername: tokenData.preferred_username || '',
          });

          // Extract realm roles
          const realmRoles = (tokenData.realm_access?.roles || []).map(r => r.toLowerCase());
          console.log("EXTRACTED ROLES:", realmRoles);
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

  const register = useCallback(() => {
    keycloak.register();
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
   * Priority: super_admin > admin > sub_admin > coursecoordinator > accounts > instructor > learner
   */
  const primaryRole = roles.includes('super_admin')
    ? 'super_admin'
    : roles.includes('admin')
    ? 'admin'
    : roles.includes('sub_admin')
    ? 'sub_admin'
    : roles.includes('coursecoordinator')
    ? 'coursecoordinator'
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
        background: '#F7F9FA',
        color: '#1F1F1F',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid rgba(0, 86, 210, 0.15)',
            borderTopColor: '#0056D2',
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
        register,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
