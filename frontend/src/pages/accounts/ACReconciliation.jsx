/**
 * ACReconciliation.jsx — Transaction reconciliation simulation for Accounts role.
 * 
 * Simulates matching internal transaction records against a mock external
 * settlement import, allowing accounts to flag matched vs discrepancy records.
 */

import React, { useState, useEffect } from 'react';
import AccountsSidebarLayout from './AccountsSidebarLayout';
import api from '../../api/axios';
import { RefreshCcw, CheckCircle, AlertTriangle, Download, Upload } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';

const STATUS_COLORS = {
  completed: { bg: '#f0fdf4', text: '#15803d', icon: <CheckCircle size={14} /> },
  pending: { bg: '#fefce8', text: '#ca8a04', icon: <RefreshCcw size={14} /> },
  flagged: { bg: '#fef2f2', text: '#dc2626', icon: <AlertTriangle size={14} /> },
};

function ReconciliationBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: s.bg, color: s.text,
      padding: '3px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: '600'
    }}>
      {s.icon} {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function ACReconciliation() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState({});
  const [imported, setImported] = useState(false);

  useEffect(() => {
    api.get('/accounts/transactions?page_size=20')
      .then(res => {
        const txns = res.data?.transactions || res.data || [];
        setTransactions(txns);
        // Initialize reconciliation statuses - simulate some discrepancies
        const init = {};
        txns.forEach((t, i) => {
          init[t.id] = i % 5 === 4 ? 'flagged' : (t.status === 'completed' ? 'completed' : 'pending');
        });
        setStatuses(init);
      })
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, []);

  const toggleStatus = (id) => {
    setStatuses(prev => {
      const current = prev[id];
      const next = current === 'completed' ? 'flagged' : current === 'flagged' ? 'pending' : 'completed';
      return { ...prev, [id]: next };
    });
  };

  const handleSimulateImport = () => {
    // Simulate a "settlement import" by randomizing some statuses
    const updated = { ...statuses };
    Object.keys(updated).forEach(id => {
      if (Math.random() > 0.8) updated[id] = 'flagged';
      else if (Math.random() > 0.5) updated[id] = 'completed';
    });
    setStatuses(updated);
    setImported(true);
    setTimeout(() => setImported(false), 3000);
  };

  const summary = Object.values(statuses).reduce((acc, s) => {
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  return (
    <AccountsSidebarLayout>
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <RefreshCcw size={24} /> Reconciliation
            </h1>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              Match internal transactions against simulated gateway records. Flag discrepancies for review.
            </p>
          </div>
          <button
            onClick={handleSimulateImport}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: '#0056D2', color: 'white',
              border: 'none', borderRadius: '8px',
              padding: '10px 16px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
            }}
          >
            <Upload size={15} /> Simulate Settlement Import
          </button>
        </div>

        {imported && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
            Settlement file imported. Statuses updated.
          </div>
        )}

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Matched', key: 'completed', color: '#15803d', bg: '#f0fdf4' },
            { label: 'Pending', key: 'pending', color: '#ca8a04', bg: '#fefce8' },
            { label: 'Discrepancies', key: 'flagged', color: '#dc2626', bg: '#fef2f2' },
          ].map(({ label, key, color, bg }) => (
            <div key={key} style={{ background: bg, borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color }}>{summary[key] || 0}</div>
              <div style={{ fontSize: '13px', color, fontWeight: '500' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Transactions Table */}
        {loading ? (
          <p>Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center' }}>No transactions found.</p>
        ) : (
          <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #eaeaea', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #eaeaea' }}>
                  {['Transaction ID', 'Amount', 'Status', 'Date', 'Reconciliation', 'Action'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#374151', fontSize: '13px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, idx) => (
                  <tr key={t.id} style={{ borderBottom: idx < transactions.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#6b7280', fontSize: '12px' }}>
                      {t.id?.slice(0, 12)}...
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: '600' }}>
                      Rs. {parseFloat(t.amount || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <StatusBadge status={t.status} />
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                      {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <ReconciliationBadge status={statuses[t.id] || 'pending'} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => toggleStatus(t.id)}
                        style={{
                          background: 'none', border: '1px solid #d1d5db',
                          borderRadius: '6px', padding: '4px 10px',
                          fontSize: '12px', cursor: 'pointer', color: '#374151',
                        }}
                      >
                        Toggle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AccountsSidebarLayout>
  );
}
