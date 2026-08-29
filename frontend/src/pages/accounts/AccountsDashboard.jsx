import { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import api from '../../api/axios';
import '../RoleDashboard.css';

const SIDEBAR_ITEMS = [
  { id: 'transactions', icon: '💰', label: 'Transactions' },
  { id: 'refunds', icon: '💸', label: 'Refunds Queue' },
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'payments', icon: '💳', label: 'Payments & Refunds' },
  { id: 'payouts', icon: '🏦', label: 'Instructor Payouts' },
  { id: 'invoices', icon: '🧾', label: 'Invoices' },
];

export default function AccountsDashboard() {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('transactions');
  
  // Transactions state
  const [transactions, setTransactions] = useState([]);
  const [transLoading, setTransLoading] = useState(false);
  const [transError, setTransError] = useState('');
  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Refunds state
  const [refunds, setRefunds] = useState([]);
  const [refundsLoading, setRefundsLoading] = useState(false);
  const [refundsError, setRefundsError] = useState('');

  // Payouts state
  const [payouts, setPayouts] = useState([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [payoutsError, setPayoutsError] = useState('');
  const [runPayoutLoading, setRunPayoutLoading] = useState(false);

  // Reports state
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchTransactions = async () => {
    setTransLoading(true);
    try {
      const response = await api.get(`/accounts/transactions?skip=${skip}&limit=${limit}`);
      setTransactions(response.data.items);
      setTotal(response.data.total);
      setTransError('');
    } catch (err) {
      console.error(err);
      setTransError('Failed to fetch transactions.');
    } finally {
      setTransLoading(false);
    }
  };

  const fetchRefunds = async () => {
    setRefundsLoading(true);
    try {
      const response = await api.get('/accounts/refunds/pending');
      setRefunds(response.data);
      setRefundsError('');
    } catch (err) {
      console.error(err);
      setRefundsError('Failed to fetch pending refunds.');
    } finally {
      setRefundsLoading(false);
    }
  };

  const fetchPayouts = async () => {
    setPayoutsLoading(true);
    try {
      const response = await api.get('/accounts/payouts');
      setPayouts(response.data.items);
      setPayoutsError('');
    } catch (err) {
      console.error(err);
      setPayoutsError('Failed to fetch payouts.');
    } finally {
      setPayoutsLoading(false);
    }
  };

  const fetchReport = async () => {
    setReportLoading(true);
    try {
      let url = '/accounts/reports/summary';
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', new Date(startDate).toISOString());
      if (endDate) params.append('end_date', new Date(endDate).toISOString());
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await api.get(url);
      setReport(response.data);
      setReportError('');
    } catch (err) {
      console.error(err);
      setReportError('Failed to fetch report.');
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions();
    } else if (activeTab === 'refunds') {
      fetchRefunds();
    } else if (activeTab === 'payouts') {
      fetchPayouts();
    } else if (activeTab === 'dashboard') {
      fetchReport();
    }
  }, [activeTab, skip]);

  const handleNext = () => {
    if (skip + limit < total) {
      setSkip(skip + limit);
    }
  };

  const handlePrev = () => {
    if (skip - limit >= 0) {
      setSkip(skip - limit);
    }
  };

  const handleApproveRefund = async (transactionId) => {
    if (!window.confirm("Are you sure you want to approve this refund and revoke the learner's access?")) return;
    
    try {
      await api.put(`/accounts/transactions/${transactionId}/refund/approve`);
      alert("Refund approved successfully.");
      fetchRefunds(); // refresh list
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to approve refund");
    }
  };

  const handleRejectRefund = async (transactionId) => {
    if (!window.confirm("Are you sure you want to reject this refund?")) return;
    
    try {
      await api.put(`/accounts/transactions/${transactionId}/refund/reject`, { reason: "" });
      alert("Refund rejected successfully.");
      fetchRefunds(); // refresh list
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to reject refund");
    }
  };

  const handleRunPayout = async () => {
    if (!window.confirm("Are you sure you want to run the payout generator? This will bundle all valid transactions into pending payouts.")) return;
    setRunPayoutLoading(true);
    try {
      const response = await api.post('/accounts/payouts/run');
      alert(response.data.message);
      fetchPayouts();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to run payouts");
    } finally {
      setRunPayoutLoading(false);
    }
  };

  const handleReleasePayout = async (payoutId) => {
    if (!window.confirm("Are you sure you want to mark this payout as released?")) return;
    try {
      await api.put(`/accounts/payouts/${payoutId}/release`);
      alert("Payout released successfully.");
      fetchPayouts();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to release payout");
    }
  };

  return (
    <div className="role-dashboard" id="accounts-dashboard">
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className="role-sidebar">
        <div className="role-sidebar-header">
          <h3>💰 Accounts</h3>
          <p>Financial Operations</p>
        </div>
        <ul className="sidebar-nav">
          {SIDEBAR_ITEMS.map((item) => {
            const isClickable = item.id === 'transactions' || item.id === 'refunds' || item.id === 'payouts' || item.id === 'dashboard';
            return (
              <li
                key={item.id}
                className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''} ${!isClickable ? 'disabled' : ''}`}
                onClick={() => isClickable && setActiveTab(item.id)}
                style={{ cursor: isClickable ? 'pointer' : 'default' }}
              >
                <span className="sidebar-nav-icon">{item.icon}</span>
                {item.label}
                {!isClickable && (
                  <span className="sidebar-coming-soon">Soon</span>
                )}
              </li>
            );
          })}
        </ul>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="role-main">
        <div className="role-welcome">
          <h1>
            Welcome, <span>Accounts Manager</span>
          </h1>
          <p>
            Hello {user?.name || 'Accounts Manager'}! Manage transactions,
            payouts, invoices, and financial reconciliation.
          </p>
        </div>

        {activeTab === 'transactions' && (
          <>
            <h3 style={{ marginBottom: 'var(--space-md)' }}>Platform Transactions</h3>
            
            {transLoading && transactions.length === 0 ? (
              <p>Loading transactions...</p>
            ) : transError ? (
              <div className="alert alert-danger">{transError}</div>
            ) : (
              <div className="dashboard-card">
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Learner</th>
                        <th>Course</th>
                        <th>Instructor</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.length > 0 ? (
                        transactions.map((t) => (
                          <tr key={t.id}>
                            <td>{new Date(t.date).toLocaleDateString()}</td>
                            <td>{t.learner_name}</td>
                            <td>{t.course_title}</td>
                            <td>{t.instructor_name}</td>
                            <td>${t.amount?.toFixed(2)}</td>
                            <td>
                              <span className={`badge badge-${t.status === 'completed' ? 'success' : t.status === 'refunded' ? 'danger' : 'warning'}`}>
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="text-center">No transactions found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                <div className="pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-md)' }}>
                  <div>
                    Showing {transactions.length > 0 ? skip + 1 : 0} to {Math.min(skip + limit, total)} of {total} entries
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={handlePrev} 
                      disabled={skip === 0}
                    >
                      Previous
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={handleNext} 
                      disabled={skip + limit >= total}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'refunds' && (
          <>
            <h3 style={{ marginBottom: 'var(--space-md)' }}>Pending Refund Requests</h3>
            
            {refundsLoading ? (
              <p>Loading refunds...</p>
            ) : refundsError ? (
              <div className="alert alert-danger">{refundsError}</div>
            ) : (
              <div className="dashboard-card">
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date Requested</th>
                        <th>Learner</th>
                        <th>Course</th>
                        <th>Amount</th>
                        <th>Reason</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {refunds.length > 0 ? (
                        refunds.map((r) => (
                          <tr key={r.id}>
                            <td>{new Date(r.date).toLocaleDateString()}</td>
                            <td>{r.learner_name}</td>
                            <td>{r.course_title}</td>
                            <td>${r.amount?.toFixed(2)}</td>
                            <td style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.refund_reason}>
                              {r.refund_reason || "No reason provided"}
                            </td>
                            <td style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                className="btn btn-success btn-sm" 
                                onClick={() => handleApproveRefund(r.id)}
                              >
                                Approve
                              </button>
                              <button 
                                className="btn btn-danger btn-sm" 
                                onClick={() => handleRejectRefund(r.id)}
                              >
                                Reject
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="text-center">No pending refund requests.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'payouts' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
              <h3>Instructor Payouts</h3>
              <button 
                className="btn btn-primary" 
                onClick={handleRunPayout}
                disabled={runPayoutLoading}
              >
                {runPayoutLoading ? 'Running...' : 'Run Payout Generator'}
              </button>
            </div>
            
            {payoutsLoading ? (
              <p>Loading payouts...</p>
            ) : payoutsError ? (
              <div className="alert alert-danger">{payoutsError}</div>
            ) : (
              <div className="dashboard-card">
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date Created</th>
                        <th>Instructor</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Released At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.length > 0 ? (
                        payouts.map((p) => (
                          <tr key={p.id}>
                            <td>{new Date(p.created_at).toLocaleDateString()}</td>
                            <td>{p.instructor_name}</td>
                            <td>${p.total_amount?.toFixed(2)}</td>
                            <td>
                              <span className={`badge badge-${p.status === 'released' ? 'success' : 'warning'}`}>
                                {p.status}
                              </span>
                            </td>
                            <td>{p.released_at ? new Date(p.released_at).toLocaleDateString() : '-'}</td>
                            <td>
                              {p.status === 'pending' && (
                                <button 
                                  className="btn btn-success btn-sm" 
                                  onClick={() => handleReleasePayout(p.id)}
                                >
                                  Release Funds
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="text-center">No payouts found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'dashboard' && (
          <>
            <h3 style={{ marginBottom: 'var(--space-md)' }}>Financial Reports</h3>
            <div className="dashboard-card" style={{ marginBottom: 'var(--space-md)' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>Start Date</label>
                  <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>End Date</label>
                  <input type="date" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <button className="btn btn-primary" onClick={fetchReport} disabled={reportLoading}>
                  {reportLoading ? 'Generating...' : 'Generate Report'}
                </button>
              </div>
            </div>

            {reportError ? (
              <div className="alert alert-danger">{reportError}</div>
            ) : report ? (
              <div className="grid grid-2">
                <div className="stat-card">
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>Total Revenue</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>${report.total_revenue?.toFixed(2)}</div>
                  <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '4px' }}>From {report.transaction_count} completed transactions</div>
                </div>
                <div className="stat-card">
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>Total Refunded</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#d32f2f' }}>${report.total_refunded?.toFixed(2)}</div>
                  <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '4px' }}>Across {report.refund_count} approved refunds</div>
                </div>
                <div className="stat-card">
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>Total Paid Out</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f57c00' }}>${report.total_paid_out?.toFixed(2)}</div>
                  <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '4px' }}>To Instructors</div>
                </div>
                <div className="stat-card" style={{ background: '#f5f9ff', borderColor: '#cfe2ff' }}>
                  <div style={{ fontSize: '0.9rem', color: '#084298' }}>Net Platform Position (Retained)</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#084298' }}>${report.net_retained?.toFixed(2)}</div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
