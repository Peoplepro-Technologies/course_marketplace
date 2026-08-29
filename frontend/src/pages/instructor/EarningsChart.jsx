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
  
  const [payouts, setPayouts] = useState([]);
  const [payoutsLoading, setPayoutsLoading] = useState(true);
  const [payoutsError, setPayoutsError] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/instructor/earnings').then((res) => setData(res.data)),
      api.get('/instructor/payouts').then((res) => setPayouts(res.data))
    ])
      .catch((err) => {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again.');
        setPayoutsError('Failed to load payouts.');
      })
      .finally(() => {
        setLoading(false);
        setPayoutsLoading(false);
      });
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
          Earnings are computed from <code>Transaction</code> history.
        </p>
      </div>

      {/* ── Payouts History ────────────────────────────────────────────── */}
      <div className="ec-chart-card" style={{ marginTop: '2rem' }}>
        <div className="ec-chart-header">
          <h3>Payout History</h3>
        </div>
        {payoutsLoading ? (
          <p style={{ padding: '20px', textAlign: 'center' }}>Loading payouts...</p>
        ) : payoutsError ? (
          <div className="ec-error-banner" style={{ margin: '20px' }}>
            <span>⚠️</span> {payoutsError}
          </div>
        ) : (
          <div className="table-responsive" style={{ padding: '0 20px 20px' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Period</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Amount</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Released At</th>
                </tr>
              </thead>
              <tbody>
                {payouts.length > 0 ? (
                  payouts.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px' }}>
                        {p.period_start ? new Date(p.period_start).toLocaleDateString() : 'All Time'} 
                        {' - '} 
                        {p.period_end ? new Date(p.period_end).toLocaleDateString() : 'Present'}
                      </td>
                      <td style={{ padding: '12px' }}>₹{p.total_amount?.toFixed(2)}</td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge badge-${p.status === 'released' ? 'success' : 'warning'}`} style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: p.status === 'released' ? '#e6f4ea' : '#fef7e0', color: p.status === 'released' ? '#137333' : '#b06000' }}>
                          {p.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {p.released_at ? new Date(p.released_at).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
                      No payouts generated yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
