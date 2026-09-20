import React from 'react';

export default function StatusBadge({ status }) {
  if (!status) return null;

  const normalized = status.toLowerCase();
  
  let bgVar = '--badge-gray-bg';
  let textVar = '--badge-gray-text';

  if (['published', 'approved', 'active'].includes(normalized)) {
    bgVar = '--badge-green-bg';
    textVar = '--badge-green-text';
  } else if (['pending', 'in_progress', 'review'].includes(normalized)) {
    bgVar = '--badge-amber-bg';
    textVar = '--badge-amber-text';
  } else if (['rejected', 'failed', 'error'].includes(normalized)) {
    bgVar = '--badge-red-bg';
    textVar = '--badge-red-text';
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 12px',
      borderRadius: '9999px',
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'capitalize',
      backgroundColor: `var(${bgVar})`,
      color: `var(${textVar})`,
      whiteSpace: 'nowrap'
    }}>
      {normalized}
    </span>
  );
}
