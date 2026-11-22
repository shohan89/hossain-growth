import { useEffect, useState } from 'react';
import { api } from '../../../lib/admin/api-client';
import ResourceManager, { type FieldConfig } from '../ResourceManager';
import Tabs from '../ui/Tabs';
import StatusBadge from '../ui/StatusBadge';
import type { Column } from '../ui/Table';

interface Service {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  content: string | null;
  categoryId: string | null;
  icon: string | null;
  orderIndex: number;
  isPublished: boolean;
}

interface ServiceCategory {
  id: string;
  slug: string;
  name: string;
  orderIndex: number;
}

export default function ServicesManager({
  canWrite,
  canDelete,
}: {
  canWrite: boolean;
  canDelete: boolean;
}) {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);

  useEffect(() => {
    api
      .list<ServiceCategory>('/api/service-categories', {
        page: 1,
        pageSize: 100,
        sortBy: 'orderIndex',
        sortDir: 'asc',
      })
      .then((res) => setCategories(res.data))
      .catch(() => setCategories([]));
  }, []);

  const serviceFields: FieldConfig[] = [
    { name: 'title', label: 'Title', type: 'text', required: true },
    {
      name: 'slug',
      label: 'Slug',
      type: 'text',
      required: true,
      hint: 'Lowercase, hyphen-separated',
    },
    {
      name: 'categoryId',
      label: 'Category',
      type: 'select',
      options: categories.map((c) => ({ value: c.id, label: c.name })),
    },
    { name: 'summary', label: 'Summary', type: 'textarea', fullWidth: true },
    { name: 'content', label: 'Content', type: 'richtext', fullWidth: true },
    {
      name: 'icon',
      label: 'Icon key',
      type: 'text',
      hint: 'Optional identifier used on the public site',
    },
    { name: 'orderIndex', label: 'Order', type: 'number' },
    { name: 'isPublished', label: 'Published', type: 'checkbox' },
  ];

  const serviceColumns: Column<Service>[] = [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'slug', label: 'Slug', sortable: true },
    {
      key: 'categoryId',
      label: 'Category',
      render: (row) => categories.find((c) => c.id === row.categoryId)?.name ?? '—',
    },
    { key: 'orderIndex', label: 'Order', sortable: true },
    {
      key: 'isPublished',
      label: 'Status',
      render: (row) =>
        row.isPublished ? (
          <StatusBadge tone="success" label="Published" />
        ) : (
          <StatusBadge tone="neutral" label="Draft" />
        ),
    },
  ];

  const categoryFields: FieldConfig[] = [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'slug', label: 'Slug', type: 'text', required: true },
    { name: 'orderIndex', label: 'Order', type: 'number' },
  ];

  const categoryColumns: Column<ServiceCategory>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'slug', label: 'Slug', sortable: true },
    { key: 'orderIndex', label: 'Order', sortable: true },
  ];

  return (
    <Tabs
      tabs={[
        {
          key: 'services',
          label: 'Services',
          content: (
            <ResourceManager<Service>
              title="Service"
              description="The six core service offerings shown across the public site."
              endpoint="/api/services"
              columns={serviceColumns}
              searchPlaceholder="Search services…"
              fields={serviceFields}
              defaultValues={{
                title: '',
                slug: '',
                categoryId: '',
                summary: '',
                content: '',
                icon: '',
                orderIndex: 0,
                isPublished: false,
              }}
              canWrite={canWrite}
              canDelete={canDelete}
              defaultSortBy="orderIndex"
              emptyIcon="layers"
              filters={[
                {
                  key: 'isPublished',
                  label: 'Status',
                  options: [
                    { value: 'true', label: 'Published' },
                    { value: 'false', label: 'Draft' },
                  ],
                },
              ]}
              transformSubmit={(values) => ({
                ...values,
                categoryId: values.categoryId || null,
                orderIndex: Number(values.orderIndex) || 0,
              })}
              deleteWarning={(row) => `"${row.title}" will be permanently removed.`}
            />
          ),
        },
        {
          key: 'categories',
          label: 'Categories',
          content: (
            <ResourceManager<ServiceCategory>
              title="Category"
              description="Groupings used to organize services."
              endpoint="/api/service-categories"
              columns={categoryColumns}
              searchPlaceholder="Search categories…"
              fields={categoryFields}
              defaultValues={{ name: '', slug: '', orderIndex: 0 }}
              canWrite={canWrite}
              canDelete={canDelete}
              defaultSortBy="orderIndex"
              emptyIcon="layers"
              transformSubmit={(values) => ({
                ...values,
                orderIndex: Number(values.orderIndex) || 0,
              })}
              deleteWarning={(row) => `"${row.name}" will be permanently removed.`}
            />
          ),
        },
      ]}
    />
  );
}
