/**
 * keycloak.js — Keycloak instance configuration.
 *
 * Initializes keycloak-js with PKCE (S256) for the course-marketplace realm.
 * Tokens are kept in memory (on the Keycloak instance), never in localStorage.
 */

import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'http://localhost:8080',
  realm: 'course-marketplace',
  clientId: 'course-frontend',
});

export default keycloak;
