/**
 * axios.js — Pre-configured Axios instance with Keycloak token interceptor.
 *
 * Every outgoing request automatically includes the Bearer token.
 * If the token is about to expire, it attempts a silent refresh first.
 */

import axios from 'axios';
import keycloak from '../auth/keycloak';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor ──────────────────────────────────────────────
// Attaches the Keycloak access token to every request.
api.interceptors.request.use(
  async (config) => {
    if (keycloak.authenticated) {
      try {
        // Try to refresh the token if it expires within 30 seconds
        await keycloak.updateToken(30);
      } catch {
        // If refresh fails, redirect to login
        keycloak.login();
        return Promise.reject(new Error('Token refresh failed'));
      }

      config.headers.Authorization = `Bearer ${keycloak.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ─────────────────────────────────────────────
// Handle 401 responses by redirecting to login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      keycloak.login();
    }
    return Promise.reject(error);
  }
);

export default api;
