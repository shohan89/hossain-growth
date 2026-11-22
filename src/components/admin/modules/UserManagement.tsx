import Tabs from '../ui/Tabs';
import AdminUsersManager from './AdminUsersManager';
import RolesPermissionsManager from './RolesPermissionsManager';

export default function UserManagement({ canManage }: { canManage: boolean }) {
  return (
    <Tabs
      tabs={[
        {
          key: 'users',
          label: 'Admin Users',
          content: <AdminUsersManager canManage={canManage} />,
        },
        {
          key: 'roles',
          label: 'Roles & Permissions',
          content: <RolesPermissionsManager canManage={canManage} />,
        },
      ]}
    />
  );
}
