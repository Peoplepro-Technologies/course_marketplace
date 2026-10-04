import SubAdminSidebarLayout from './SubAdminSidebarLayout';
import AdminSupportInbox from '../shared/AdminSupportInbox';

export default function SubAdminSupportTickets() {
  return (
    <SubAdminSidebarLayout>
      <AdminSupportInbox apiPrefix="/subadmin" roleName="Sub Admin" />
    </SubAdminSidebarLayout>
  );
}
