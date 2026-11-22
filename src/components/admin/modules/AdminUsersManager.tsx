import { useEffect, useState } from 'react';
import { api } from '../../../lib/admin/api-client';
import ResourceManager, { type FieldConfig } from '../ResourceManager';
import StatusBadge from '../ui/StatusBadge';
import type { Column } from '../ui/Table';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  roleId: string;
  roleKey: string;
  isActive: boolean;
  lastLoginAt: string | null;
}

interface Role {
  id: string;
  name: string;
}

export default function AdminUsersManager({ canManage }: { canManage: boolean }) {
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    api
      .get<Role[]>('/api/roles')
      .then(setRoles)
      .catch(() => setRoles([]));
  }, []);

  const fields: FieldConfig[] = [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    {
      name: 'roleId',
      label: 'Role',
      type: 'select',
      required: true,
      options: roles.map((r) => ({ value: r.id, label: r.name })),
    },
    {
      name: 'password',
      label: 'Password',
      type: 'password',
      hint: 'Required when creating a user. Leave blank when editing to keep the current password.',
    },
    { name: 'isActive', label: 'Active', type: 'checkbox' },
  ];

  const columns: Column<AdminUser>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'roleKey', label: 'Role' },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) =>
        row.isActive ? (
          <StatusBadge tone="success" label="Active" />
        ) : (
          <StatusBadge tone="neutral" label="Inactive" />
        ),
    },
    {
      key: 'lastLoginAt',
      label: 'Last login',
      render: (row) => (row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : 'Never'),
    },
  ];

  return (
    <ResourceManager<AdminUser>
      title="Admin User"
      description="People with access to this dashboard."
      endpoint="/api/admin-users"
      columns={columns}
      searchPlaceholder="Search by name…"
      fields={fields}
      defaultValues={{ name: '', email: '', roleId: '', password: '', isActive: true }}
      canWrite={canManage}
      canDelete={canManage}
      defaultSortBy="createdAt"
      emptyIcon="users"
      transformSubmit={(values) => {
        const { password, ...rest } = values;
        return password ? { ...rest, password } : rest;
      }}
      deleteWarning={(row) =>
        `"${row.name}" will be deactivated and will no longer be able to sign in.`
      }
    />
  );
}
