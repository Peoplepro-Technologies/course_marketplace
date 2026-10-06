import React from 'react';

export default function EmptyState({ title, message }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      textAlign: 'center',
      background: 'white',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)'
    }}>
      <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-h)', fontSize: '18px', fontWeight: 600 }}>
        {title}
      </h3>
      <p style={{ margin: 0, color: 'var(--text)', fontSize: '14px', maxWidth: '400px' }}>
        {message}
      </p>
    </div>
  );
}
