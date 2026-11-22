import { useEffect, useState } from 'react';
import { api } from '../../../lib/admin/api-client';
import ResourceManager, { type FieldConfig } from '../ResourceManager';
import Tabs from '../ui/Tabs';
import StatusBadge from '../ui/StatusBadge';
import type { Column } from '../ui/Table';

interface NavigationItem {
  id: string;
  label: string;
  linkType: 'page' | 'url';
  pageId: string | null;
  url: string | null;
  parentId: string | null;
  orderIndex: number;
  location: 'header' | 'footer';
  isVisible: boolean;
}

interface Redirect {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: number;
}

function NavigationTab({ canWrite, canDelete }: { canWrite: boolean; canDelete: boolean }) {
  const [items, setItems] = useState<NavigationItem[]>([]);

  useEffect(() => {
    api
      .list<NavigationItem>('/api/navigation-items', { page: 1, pageSize: 100 })
      .then((res) => setItems(res.data))
      .catch(() => setItems([]));
  }, []);

  const fields: FieldConfig[] = [
    { name: 'label', label: 'Label', type: 'text', required: true },
    {
      name: 'url',
      label: 'URL',
      type: 'text',
      required: true,
      hint: 'e.g. /services or https://example.com',
    },
    {
      name: 'location',
      label: 'Location',
      type: 'select',
      options: [
        { value: 'header', label: 'Header' },
        { value: 'footer', label: 'Footer' },
      ],
    },
    {
      name: 'parentId',
      label: 'Parent item',
      type: 'select',
      options: items.map((item) => ({ value: item.id, label: item.label })),
      hint: 'Optional — for nested menus',
    },
    { name: 'orderIndex', label: 'Order', type: 'number' },
    { name: 'isVisible', label: 'Visible', type: 'checkbox' },
  ];

  const columns: Column<NavigationItem>[] = [
    { key: 'label', label: 'Label', sortable: true },
    { key: 'url', label: 'URL' },
    { key: 'location', label: 'Location', sortable: true },
    { key: 'orderIndex', label: 'Order', sortable: true },
    {
      key: 'isVisible',
      label: 'Status',
      render: (row) =>
        row.isVisible ? (
          <StatusBadge tone="success" label="Visible" />
        ) : (
          <StatusBadge tone="neutral" label="Hidden" />
        ),
    },
  ];

  return (
    <ResourceManager<NavigationItem>
      title="Navigation Item"
      description="Header and footer menu links."
      endpoint="/api/navigation-items"
      columns={columns}
      searchPlaceholder="Search navigation…"
      fields={fields}
      defaultValues={{
        label: '',
        url: '',
        location: 'header',
        parentId: '',
        orderIndex: 0,
        isVisible: true,
      }}
      canWrite={canWrite}
      canDelete={canDelete}
      defaultSortBy="orderIndex"
      emptyIcon="menu"
      filters={[
        {
          key: 'location',
          label: 'Location',
          options: [
            { value: 'header', label: 'Header' },
            { value: 'footer', label: 'Footer' },
          ],
        },
      ]}
      transformSubmit={(values) => ({
        ...values,
        linkType: 'url',
        pageId: null,
        parentId: values.parentId || null,
        orderIndex: Number(values.orderIndex) || 0,
      })}
      deleteWarning={(row) => `"${row.label}" will be permanently removed from the menu.`}
    />
  );
}

function RedirectsTab({ canWrite, canDelete }: { canWrite: boolean; canDelete: boolean }) {
  const fields: FieldConfig[] = [
    {
      name: 'fromPath',
      label: 'From path',
      type: 'text',
      required: true,
      hint: 'Must start with /',
    },
    { name: 'toPath', label: 'To path', type: 'text', required: true },
    {
      name: 'statusCode',
      label: 'Status code',
      type: 'select',
      options: [
        { value: '301', label: '301 — Permanent' },
        { value: '302', label: '302 — Temporary' },
        { value: '307', label: '307 — Temporary (method preserved)' },
        { value: '308', label: '308 — Permanent (method preserved)' },
      ],
    },
  ];

  const columns: Column<Redirect>[] = [
    { key: 'fromPath', label: 'From', sortable: true },
    { key: 'toPath', label: 'To' },
    { key: 'statusCode', label: 'Status' },
  ];

  return (
    <ResourceManager<Redirect>
      title="Redirect"
      description="301/302 redirects for retired or moved URLs."
      endpoint="/api/redirects"
      columns={columns}
      searchPlaceholder="Search redirects…"
      fields={fields}
      defaultValues={{ fromPath: '', toPath: '', statusCode: '301' }}
      canWrite={canWrite}
      canDelete={canDelete}
      defaultSortBy="createdAt"
      emptyIcon="externalLink"
      transformSubmit={(values) => ({ ...values, statusCode: Number(values.statusCode) || 301 })}
      deleteWarning={(row) => `The redirect from "${row.fromPath}" will be permanently removed.`}
    />
  );
}

export default function NavigationManager({
  canWrite,
  canDelete,
  canManageRedirects,
}: {
  canWrite: boolean;
  canDelete: boolean;
  canManageRedirects: boolean;
}) {
  const tabs = [
    {
      key: 'nav',
      label: 'Navigation',
      content: <NavigationTab canWrite={canWrite} canDelete={canDelete} />,
    },
  ];

  if (canManageRedirects) {
    tabs.push({
      key: 'redirects',
      label: 'Redirects',
      content: <RedirectsTab canWrite={canManageRedirects} canDelete={canManageRedirects} />,
    });
  }

  return <Tabs tabs={tabs} />;
}
