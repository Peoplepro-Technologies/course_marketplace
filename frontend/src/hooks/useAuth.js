/**
 * useAuth.js — Custom hook for accessing auth context.
 *
 * Usage:
 *   const { user, roles, hasRole, logout } = useAuth();
 */

import { useContext } from 'react';
import { AuthContext } from '../auth/AuthProvider';

export default function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
