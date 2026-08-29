import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import './InvoiceView.css';

export default function InvoiceView() {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await api.get(`/learner/transactions/${transactionId}/invoice`);
        setInvoice(response.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load invoice or you are not authorized to view it.');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [transactionId]);

  if (loading) {
    return <div className="container" style={{ padding: 'var(--space-xl) 0' }}>Loading invoice...</div>;
  }

  if (error) {
    return (
      <div className="container" style={{ padding: 'var(--space-xl) 0' }}>
        <div className="alert alert-danger">{error}</div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="invoice-container container">
      <div className="invoice-actions no-print">
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>Back</button>
        <button className="btn btn-primary" onClick={() => window.print()}>Print Invoice</button>
      </div>

      <div className="invoice-paper" id="invoice-paper">
        <div className="invoice-header">
          <div className="invoice-branding">
            <h1>CourseHub</h1>
            <p>123 Learning Lane<br />Knowledge City, ED 90210</p>
          </div>
          <div className="invoice-details">
            <h2>INVOICE</h2>
            <p><strong>Invoice Number:</strong> {invoice.invoice_number}</p>
            <p><strong>Date:</strong> {new Date(invoice.date).toLocaleDateString()}</p>
            <p>
              <strong>Status:</strong>{' '}
              <span style={{ color: invoice.status === 'completed' ? 'green' : 'inherit' }}>
                {invoice.status.toUpperCase()}
              </span>
            </p>
          </div>
        </div>

        <div className="invoice-bill-to">
          <h3>Bill To:</h3>
          <p><strong>{invoice.learner_name}</strong></p>
          <p>{invoice.learner_email}</p>
        </div>

        <table className="invoice-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Instructor</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{invoice.course_title}</td>
              <td>{invoice.instructor_name}</td>
              <td className="text-right">${invoice.amount?.toFixed(2)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="2" className="text-right"><strong>Total:</strong></td>
              <td className="text-right"><strong>${invoice.amount?.toFixed(2)}</strong></td>
            </tr>
          </tfoot>
        </table>

        <div className="invoice-footer">
          <p>Thank you for learning with CourseHub!</p>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: 'var(--space-sm)' }}>
            This is a computer-generated invoice and requires no signature.
          </p>
        </div>
      </div>
    </div>
  );
}
