import AccountsSidebarLayout from './AccountsSidebarLayout';
import AdminSupportInbox from '../shared/AdminSupportInbox';

export default function ACSupportTickets() {
  return (
    <AccountsSidebarLayout>
      <AdminSupportInbox apiPrefix="/accounts" roleName="Accounts" hideCategoryFilter={true} />
    </AccountsSidebarLayout>
  );
}
