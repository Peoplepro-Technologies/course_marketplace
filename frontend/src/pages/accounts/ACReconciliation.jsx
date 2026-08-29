/**
 * ACReconciliation.jsx — Reconciliation placeholder for Accounts role.
 *
 * Reconciliation requires a real payment gateway to compare against.
 * Since no gateway is connected, this section remains "Coming Soon"
 * with a clear explanation of what it would involve.
 */

import AccountsSidebarLayout from './AccountsSidebarLayout';

export default function ACReconciliation() {
  return (
    <AccountsSidebarLayout>
      <div className="role-welcome">
        <h1>🔄 <span>Reconciliation</span></h1>
        <p>Payment gateway reconciliation</p>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3xl)', maxWidth: 600, margin: '0 auto' }}>
        <div style={{ fontSize: '4rem', marginBottom: 'var(--space-lg)' }}>🔄</div>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: 'var(--space-md)' }}>
          Coming Soon
        </h2>
        <div style={{
          background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 'var(--radius-md)',
          padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)', textAlign: 'left',
        }}>
          <strong style={{ display: 'block', marginBottom: 'var(--space-sm)' }}>
            ⚠️ Why this section is not yet implemented
          </strong>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Reconciliation involves comparing the platform's internal transaction records against
            actual payment gateway records (e.g., Razorpay, Stripe, PayPal) to identify discrepancies,
            missing payments, or double-charges.
          </p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginTop: 'var(--space-sm)' }}>
            Since this platform does not yet have a real payment gateway integrated, there are no
            gateway records to reconcile against. This section will become functional once a payment
            provider is connected and real transaction data is available.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', textAlign: 'left' }}>
          <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>What this will include when ready:</strong>
          {[
            'Gateway transaction ID matching',
            'Settlement report imports (CSV/API)',
            'Discrepancy flagging and resolution workflow',
            'Automated daily reconciliation jobs',
          ].map((item) => (
            <div key={item} style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', fontSize: 'var(--text-sm)' }}>
              <span style={{ color: '#0056D2', fontWeight: 700 }}>→</span> {item}
            </div>
          ))}
        </div>
      </div>
    </AccountsSidebarLayout>
  );
}
