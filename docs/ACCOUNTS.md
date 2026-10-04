# Accounts Role Documentation

## Dashboard Overview
The Accounts Dashboard is strictly for financial operations. This role is responsible for overseeing platform revenue, handling transactions, approving manual enrollments (e.g. offline payments), managing refunds, and executing instructor payouts.

### Navigation Sidebar
When an Accounts user logs in, they see the following items:
- **Dashboard**: High-level KPI overview (e.g., total revenue, pending payouts).
- **Course Earnings**: Financial breakdown per course.
- **Transactions**: Ledger of all monetary transactions on the platform.
- **Payments & Refunds**: Dedicated queue for processing learner refund requests.
- **Instructor Payouts**: Grouped balances for each instructor to process their earnings.
- **Invoices**: Searchable archive of all generated transaction invoices.
- **Financial Reports**: Generated CSV/PDF financial summaries over time.
- **Learner Approvals**: Queue for manually approving pending course enrollments (e.g., B2B bulk purchases or bank transfers).
- **Reconciliation**: (Coming Soon) Tools to match platform ledger against actual bank statements.
- **Support**: Ticketing system to get help from platform administrators.

---

## Feature-by-Feature Breakdown

### 1. Dashboard (KPIs)
- **What it does**: Provides a snapshot of the platform's financial health, including pending refund counts, total revenue, and pending payouts.
- **User Interaction**: Data loads automatically on page load. User can view high-level stats before diving into specific queues.
- **Backend API Endpoints**:
  - `GET /accounts/dashboard/kpis`
    - **Purpose**: Fetches the dashboard KPIs.
    - **Role Restriction**: `accounts` (requires backend verification of exact role name).

### 2. Course Earnings
- **What it does**: Displays how much revenue each individual course has generated.
- **User Interaction**: Accounts user views a table of courses, sorted by revenue or enrollments.
- **Backend API Endpoints**:
  - `GET /accounts/course-earnings`
    - **Purpose**: Fetches revenue grouped by course.
    - **Role Restriction**: `accounts`

### 3. Transactions
- **What it does**: A master ledger of every purchase, refund, or payout on the platform.
- **User Interaction**: User can paginate through the history of transactions.
- **Backend API Endpoints**:
  - `GET /accounts/transactions?page={page}&page_size={PAGE_SIZE}`
    - **Purpose**: Retrieves a paginated list of all transactions.
    - **Role Restriction**: `accounts`

### 4. Payments & Refunds
- **What it does**: A queue for processing refunds requested by learners.
- **User Interaction**: User views transactions marked as 'refund_requested'. They can click "Approve" (which revokes learner access and issues the refund) or "Reject".
- **Backend API Endpoints**:
  - `GET /accounts/refunds` (implied by dynamic `url` variable in the page)
    - **Purpose**: Fetches pending refund requests.
  - `PUT /accounts/refunds/{refundId}/approve`
  - `PUT /accounts/refunds/{refundId}/reject`
    - **Purpose**: Actions a refund request.
    - **Role Restriction**: `accounts`

### 5. Instructor Payouts
- **What it does**: Groups all instructor earnings and shows who is owed what.
- **User Interaction**: Accounts staff reviews the owed amounts and payout details (e.g., PayPal email). Once the money is sent via the external system, they click "Mark Paid" here to zero out the balance and record the payout transaction.
- **Backend API Endpoints**:
  - `GET /accounts/payouts`
    - **Purpose**: Lists instructors and their accumulated unpaid earnings.
  - `POST /accounts/payouts/{instructorId}/mark-paid`
    - **Purpose**: Records that a payout has been manually processed, resetting the owed balance.
    - **Role Restriction**: `accounts`

### 6. Invoices
- **What it does**: A searchable table of invoices generated for learners/B2B clients.
- **User Interaction**: User paginates through invoices.
- **Backend API Endpoints**:
  - `GET /accounts/invoices`
    - **Purpose**: Fetches a paginated list of invoice records.
    - **Role Restriction**: `accounts`

### 7. Financial Reports
- **What it does**: A reporting interface to view aggregated financial data over specific periods.
- **User Interaction**: User selects date ranges to view or export financial data.
- **Backend API Endpoints**:
  - `GET /accounts/financial-reports`
    - **Purpose**: Generates the financial report data.
    - **Role Restriction**: `accounts`

### 8. Learner Approvals (Enrollments)
- **What it does**: Manages enrollments that require manual financial clearance (e.g., waiting for a bank transfer to clear).
- **User Interaction**: Accounts user views a list of pending enrollments. They can approve (granting course access to the learner) or reject them.
- **Backend API Endpoints**:
  - `GET /accounts/enrollments`
    - **Purpose**: Fetches pending enrollments.
  - `PUT /accounts/enrollments/{enrollmentId}/approve`
  - `PUT /accounts/enrollments/{enrollmentId}/reject`
    - **Purpose**: Processes the pending enrollment. Approving grants access; rejecting denies it.
    - **Role Restriction**: `accounts`

### 9. Reconciliation (Coming Soon)
- **What it does**: Will allow matching internal transactions with external bank statement records.
- **Backend API Endpoints**: Currently hitting `/accounts/transactions?page_size=20` as a placeholder.

### 10. Support
- **What it does**: Allows Accounts to manage support tickets assigned to the billing team.
- **Backend API Endpoints**:
  - `GET /api/v1/accounts/support-tickets`
    - **Purpose**: Lists all support tickets assigned to the 'accounts' team.
  - `GET /api/v1/accounts/support-tickets/unread-count`
    - **Purpose**: Fetches the count of unread tickets for the badge.
  - `PUT /api/v1/accounts/support-tickets/{ticket_id}`
    - **Purpose**: Update ticket status.
  - `POST /api/v1/accounts/support-tickets/{ticket_id}/reply`
    - **Purpose**: Reply to a support ticket.
  - `POST /api/v1/accounts/support-tickets/{ticket_id}/read`
    - **Purpose**: Mark a ticket as read to clear the unread badge.
