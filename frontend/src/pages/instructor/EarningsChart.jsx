/**
 * EarningsChart.jsx — Instructor earnings stub page.
 *
 * The finance/payout module has not been built yet (no transactions table).
 * This page shows a clearly-labelled "Coming Soon" state with a placeholder
 * Recharts area chart using empty data.
 *
 * Replace the stub API call and empty data arrays when the finance
 * milestone is implemented.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../../api/axios';
import './EarningsChart.css';

// ── Placeholder months shown in the empty chart ──────────────────────
const PLACEHOLDER_MONTHS = [
  { month: 'Jan' }, { month: 'Feb' }, { month: 'Mar' },
  { month: 'Apr' }, { month: 'May' }, { month: 'Jun' },
  { month: 'Jul' }, { month: 'Aug' }, { month: 'Sep' },
  { month: 'Oct' }, { month: 'Nov' }, { month: 'Dec' },
];

// ── Custom empty-state tooltip ───────────────────────────────────────
function PendingTooltip() {
  return (
    <div className="ec-tooltip">
      <span>Data pending</span>
    </div>
  );
}

export default function EarningsChart() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/instructor/earnings')
      .then((res) => setData(res.data))
      .catch(() => setData({ total_earnings: 0, pending_payout: 0, monthly: [], note: 'Finance module pending' }))
      .finally(() => setLoading(false));
  }, []);

  const note = data?.note || 'Finance module pending';
  const isPending = !data?.monthly?.length;

  return (
    <div className="page-wrapper container animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="section-header flex-between">
        <div>
          <h2>💰 Earnings</h2>
          <p>Track your revenue and upcoming payouts.</p>
        </div>
        <Link to="/instructor" className="btn btn-secondary">
          ← Dashboard
        </Link>
      </div>

      {/* ── Pending Integration Banner ──────────────────────────────── */}
      <div className="ec-pending-banner" role="status" aria-label="Feature status">
        <span className="ec-pending-icon">🔧</span>
        <div>
          <strong>Backend integration pending</strong>
          <p>{note} — no real data is displayed below.</p>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-2 ec-stats" style={{ marginBottom: '2rem' }}>
        <div className="stat-card ec-stat-card">
          <div className="ec-stat-label">Total Earnings</div>
          <div className="ec-stat-value ec-muted">—</div>
          <div className="ec-stat-sub">Available when finance module is live</div>
        </div>
        <div className="stat-card ec-stat-card">
          <div className="ec-stat-label">Pending Payout</div>
          <div className="ec-stat-value ec-muted">—</div>
          <div className="ec-stat-sub">Available when finance module is live</div>
        </div>
      </div>

      {/* ── Chart Section ────────────────────────────────────────────── */}
      <div className="ec-chart-card">
        <div className="ec-chart-header">
          <h3>Monthly Revenue</h3>
          <span className="ec-coming-soon-badge">Coming Soon</span>
        </div>

        {/* Empty-state overlay */}
        {isPending && (
          <div className="ec-chart-overlay">
            <div className="ec-overlay-icon">📊</div>
            <h4>No earnings data yet</h4>
            <p>Revenue chart will populate once the finance module is connected.</p>
          </div>
        )}

        {/* Placeholder chart — renders flat zero line to show the shape */}
        <div className={`ec-chart-wrap ${isPending ? 'ec-chart-dimmed' : ''}`}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart
              data={isPending ? PLACEHOLDER_MONTHS : data.monthly}
              margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0056D2" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0056D2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: '#888' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#888' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip content={isPending ? <PendingTooltip /> : undefined} />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#0056D2"
                strokeWidth={2}
                fill="url(#earningsGrad)"
                strokeDasharray={isPending ? '6 4' : undefined}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <p className="ec-footnote">
          ⚠️ Placeholder only — data key <code>monthly[].amount</code> will be populated by the finance API.
        </p>
      </div>

    </div>
  );
}
