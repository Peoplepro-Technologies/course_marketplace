import SASidebarLayout from './SASidebarLayout';
import AdminSupportInbox from '../shared/AdminSupportInbox';

export default function SASupportTickets() {
  return (
    <SASidebarLayout>
      <AdminSupportInbox apiPrefix="/api/v1/superadmin" roleName="Super Admin" />
    </SASidebarLayout>
  );
}
