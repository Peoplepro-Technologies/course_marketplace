/**
 * ProgressBar.jsx — Visual progress indicator.
 *
 * Props:
 *   - percent: number (0-100)
 *   - label: optional string label
 */

export default function ProgressBar({ percent = 0, label }) {
  const clampedPercent = Math.min(100, Math.max(0, percent));

  return (
    <div className="progress-wrapper">
      {label && (
        <div className="progress-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{label}</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {Math.round(clampedPercent)}%
          </span>
        </div>
      )}
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
    </div>
  );
}
