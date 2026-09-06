/**
 * keycloak.js — Keycloak instance configuration.
 *
 * Initializes keycloak-js with PKCE (S256) for the course-marketplace realm.
 * Tokens are kept in memory (on the Keycloak instance), never in localStorage.
 */

import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'course-marketplace',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'course-frontend',
});

export default keycloak;
