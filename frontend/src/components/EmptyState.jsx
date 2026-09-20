import React from 'react';
import { FileSearch } from 'lucide-react';

export default function EmptyState({ icon: Icon = FileSearch, title, message }) {
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
      <div style={{
        backgroundColor: 'var(--bg)',
        padding: '16px',
        borderRadius: '50%',
        marginBottom: '16px',
        color: 'var(--text)'
      }}>
        <Icon size={32} strokeWidth={1.5} />
      </div>
      <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-h)', fontSize: '18px', fontWeight: 600 }}>
        {title}
      </h3>
      <p style={{ margin: 0, color: 'var(--text)', fontSize: '14px', maxWidth: '400px' }}>
        {message}
      </p>
    </div>
  );
}
