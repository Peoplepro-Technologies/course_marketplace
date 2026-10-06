/**
 * SAServiceRequests.jsx — Super Admin: Platform-wide Service Request analytics.
 *
 * Part 5: KPI cards + filterable ticket table.
 * SLA: High > 3 days, Medium > 5 days, Low > 7 days = Overdue.
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import SASidebarLayout from './SASidebarLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';

const PRIORITY_COLORS = {
  high: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  medium: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  low: { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
};

const ROLES = ['learner', 'instructor', 'coursecoordinator'];

export default function SAServiceRequests() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);

  const [filters, setFilters] = useState({
    role: '', department_id: '', category: '', priority: '', status: '',
    date_from: '', date_to: '',
  });

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    api.get('/support-tickets/analytics', { params })
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    api.get('/superadmin/departments').then(res => setDepartments(res.data)).catch(() => {});
  }, []);

  const kpis = data?.kpis || {};
  const tickets = data?.tickets || [];

  const KPI_CARDS = [
    { label: 'Total Requests', value: kpis.total || 0, color: '#6366f1', },
    { label: 'Open', value: kpis.open || 0, color: '#3b82f6', },
    { label: 'In Progress', value: kpis.in_progress || 0, color: '#f59e0b', },
    { label: 'Resolved', value: kpis.resolved || 0, color: '#10b981', },
    { label: 'Overdue', value: kpis.overdue || 0, color: '#ef4444', },
  ];

  return (
    <SASidebarLayout>
      <div className="sa-page-header">
        <div>
          <h2>Service Requests</h2>
          <p>Platform-wide analytics for all support tickets and service requests.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchData} disabled={loading}>
          {loading ? '...' : 'Refresh'}
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {KPI_CARDS.map(card => (
          <div key={card.label} style={{
            background: 'var(--color-surface)', border: `1px solid ${card.color}33`,
            borderRadius: '12px', padding: '1.25rem', textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>{card.label}</div>
            {card.label === 'Overdue' && kpis.overdue > 0 && (
              <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '4px' }}>SLA breached</div>
            )}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem',
      }}>
        <select className="form-control" value={filters.role}
          onChange={e => setFilters(f => ({ ...f, role: e.target.value }))}>
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <select className="form-control" value={filters.department_id}
          onChange={e => setFilters(f => ({ ...f, department_id: e.target.value }))}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <input className="form-control" placeholder="Category..." value={filters.category}
          onChange={e => setFilters(f => ({ ...f, category: e.target.value }))} />

        <select className="form-control" value={filters.priority}
          onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select className="form-control" value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>

        <input className="form-control" type="date" value={filters.date_from}
          onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />

        <input className="form-control" type="date" value={filters.date_to}
          onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />

        <button className="btn btn-secondary btn-sm" onClick={() => setFilters({
          role: '', department_id: '', category: '', priority: '', status: '', date_from: '', date_to: '',
        })}>
          Clear Filters
        </button>
      </div>

      {/* Ticket Table */}
      {loading ? <LoadingSpinner /> : (
        <div className="sa-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Raised By</th>
                <th>Role</th>
                <th>Category</th>
                <th>Request</th>
                <th>Department</th>
                <th style={{ textAlign: 'center' }}>Priority</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th>Assigned To</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                  No tickets match the current filters.
                </td></tr>
              ) : tickets.map(t => (
                <tr key={t.id}>
                  <td>
                    <code style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '2px 8px', borderRadius: '5px', fontSize: '0.8rem' }}>
                      {t.ticket_number}
                    </code>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t.raised_by_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t.raised_by_email}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.78rem', textTransform: 'capitalize', color: 'var(--color-text-muted)' }}>
                      {t.role_context}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{t.category}</td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{t.subcategory || '—'}</td>
                  <td>
                    <span style={{
                      background: 'rgba(99,102,241,0.1)', color: '#818cf8',
                      padding: '2px 8px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600,
                    }}>
                      {t.department_name || '—'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      ...PRIORITY_COLORS[t.priority],
                      padding: '2px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600,
                    }}>
                      {t.priority}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <StatusBadge status={t.status} />
                  </td>
                  <td style={{ fontSize: '0.83rem', color: 'var(--color-text-muted)' }}>
                    {t.assigned_to_name || '—'}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SASidebarLayout>
  );
}
