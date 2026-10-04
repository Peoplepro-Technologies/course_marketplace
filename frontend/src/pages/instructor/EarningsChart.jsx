/**
 * EarningsChart.jsx — Instructor earnings page.
 *
 * Displays total earnings, pending payouts, and monthly revenue.
 * Data is computed dynamically from enrollment records (Course.price × Enrollment).
 * Access-controlled: only shows data for courses owned by current_user.
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

// ── Placeholder months shown in the empty / loading chart ──────────────
const PLACEHOLDER_MONTHS = [
  { month: 'Jan' }, { month: 'Feb' }, { month: 'Mar' },
  { month: 'Apr' }, { month: 'May' }, { month: 'Jun' },
  { month: 'Jul' }, { month: 'Aug' }, { month: 'Sep' },
  { month: 'Oct' }, { month: 'Nov' }, { month: 'Dec' },
];

// ── Custom tooltip shown when hovering real data points ─────────────────
function RealTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ec-tooltip">
      <strong>{label}</strong>
      <span>₹{Number(payload[0].value).toFixed(2)}</span>
    </div>
  );
}

// ── Custom empty-state tooltip ───────────────────────────────────────────
function PendingTooltip() {
  return (
    <div className="ec-tooltip">
      <span>No data yet</span>
    </div>
  );
}

// ── Skeleton loader card ─────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="stat-card ec-stat-card ec-skeleton">
      <div className="ec-skel-label" />
      <div className="ec-skel-value" />
      <div className="ec-skel-sub" />
    </div>
  );
}

export default function EarningsChart() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/instructor/earnings')
      .then((res) => setData(res.data))
      .catch((err) => {
        console.error('Error fetching earnings:', err);
        setError('Failed to load earnings data. Please try again.');
      })
      .finally(() => setLoading(false));
  }, []);

  const hasData = data?.monthly?.length > 0;

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

      {/* ── Error State ──────────────────────────────────────────────── */}
      {error && (
        <div className="ec-error-banner">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* ── Stat Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-2 ec-stats" style={{ marginBottom: '2rem' }}>
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <div className="stat-card ec-stat-card">
              <div className="ec-stat-label">Total Earnings</div>
              <div className="ec-stat-value">₹{data?.total_earnings?.toFixed(2) || '0.00'}</div>
              <div className="ec-stat-sub">Lifetime course sales</div>
            </div>
            <div className="stat-card ec-stat-card">
              <div className="ec-stat-label">Pending Payout</div>
              <div className="ec-stat-value">₹{data?.pending_payout?.toFixed(2) || '0.00'}</div>
              <div className="ec-stat-sub">Waiting to be settled</div>
            </div>
          </>
        )}
      </div>

      {/* ── Chart Section ────────────────────────────────────────────── */}
      <div className="ec-chart-card">
        <div className="ec-chart-header">
          <h3>Monthly Revenue</h3>
          {hasData && (
            <span className="ec-data-badge">Live Data</span>
          )}
        </div>

        {/* Empty-state overlay — shown only when loaded and no data */}
        {!hasData && !loading && !error && (
          <div className="ec-chart-overlay">
            <div className="ec-overlay-icon">📊</div>
            <h4>No earnings data yet</h4>
            <p>Your revenue chart will populate once you get your first enrollment on a paid course.</p>
          </div>
        )}

        {/* Chart */}
        <div className={`ec-chart-wrap ${!hasData ? 'ec-chart-dimmed' : ''}`}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart
              data={hasData ? data.monthly : PLACEHOLDER_MONTHS}
              margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0056D2" stopOpacity={0.18} />
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
                tickFormatter={(v) => `₹${v}`}
              />
              <Tooltip
                content={hasData ? <RealTooltip /> : <PendingTooltip />}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#0056D2"
                strokeWidth={2}
                fill="url(#earningsGrad)"
                strokeDasharray={!hasData ? '6 4' : undefined}
                dot={hasData ? { r: 4, fill: '#0056D2', strokeWidth: 0 } : false}
                activeDot={hasData ? { r: 6 } : false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Footnote */}
        <p className="ec-footnote">
          Earnings are computed from <code>Enrollment × Course.price</code>.
          Payout settlement requires the finance module (coming soon).
        </p>
      </div>

    </div>
  );
}
