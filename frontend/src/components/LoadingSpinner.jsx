/**
 * LoadingSpinner.jsx — Full-page or inline loading indicator.
 */

export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex-center" style={{ padding: '4rem', flexDirection: 'column', gap: '1rem' }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid var(--color-border)',
        borderTopColor: 'var(--color-accent-primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>{message}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
