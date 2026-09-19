import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { Receipt } from 'lucide-react';
import '../RoleDashboard.css';

export default function PurchasesHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Refund modal state
  const [showModal, setShowModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);
  const [refundLoading, setRefundLoading] = useState(false);

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/learner/transactions');
      setTransactions(response.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load transaction history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleRequestRefund = (transactionId) => {
    setSelectedTransactionId(transactionId);
    setShowModal(true);
  };

  const submitRefundRequest = async () => {
    if (!refundReason.trim()) {
      alert("Please enter a reason for the refund.");
      return;
    }
    
    setRefundLoading(true);
    try {
      await api.post(`/learner/transactions/${selectedTransactionId}/request-refund`, {
        reason: refundReason
      });
      setShowModal(false);
      setRefundReason('');
      setSelectedTransactionId(null);
      // Refresh the list to show updated status
      fetchTransactions();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to request refund.");
    } finally {
      setRefundLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="section-header">
        <h2>Purchase History</h2>
        <p>View your past purchases and download invoices.</p>
      </div>

      {loading ? (
        <p>Loading transactions...</p>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : transactions.length > 0 ? (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Refund Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td>{t.course_title}</td>
                  <td>{new Date(t.created_at).toLocaleDateString()}</td>
                  <td>${t.amount?.toFixed(2)}</td>
                  <td>
                    <StatusBadge status={t.status} />
                  </td>
                  <td>
                    {(!t.refund_status || t.refund_status === 'none') ? (
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Eligible</span>
                    ) : (
                      <StatusBadge status={t.refund_status} />
                    )}
                  </td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/learner/transactions/${t.id}/invoice`)}
                    >
                      View Invoice
                    </button>
                    
                    {(!t.refund_status || t.refund_status === 'none') && t.status !== 'refunded' && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleRequestRefund(t.id)}
                      >
                        Request Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState 
          icon={Receipt}
          title="No purchases found"
          message="You haven't purchased any courses yet."
        />
      )}

      {/* Simple Modal for Refund Reason */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', 
          justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'white', padding: '24px', borderRadius: '8px', 
            width: '90%', maxWidth: '400px'
          }}>
            <h3 style={{ marginTop: 0 }}>Request Refund</h3>
            <p>Please provide a reason for your refund request.</p>
            <textarea 
              style={{ width: '100%', minHeight: '100px', marginBottom: '16px', padding: '8px' }}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Reason for refund..."
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={refundLoading}>Cancel</button>
              <button className="btn btn-primary" onClick={submitRefundRequest} disabled={refundLoading}>
                {refundLoading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
