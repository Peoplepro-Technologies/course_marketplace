import SASidebarLayout from './SASidebarLayout';
import AdminSupportInbox from '../shared/AdminSupportInbox';

export default function SASupportTickets() {
  return (
    <SASidebarLayout>
      <AdminSupportInbox apiPrefix="/superadmin" roleName="Super Admin" />
    </SASidebarLayout>
  );
}
