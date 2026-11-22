import { useEffect, useState } from 'react';
import { api } from '../../../lib/admin/api-client';
import ResourceManager, { type FieldConfig } from '../ResourceManager';
import StatusBadge from '../ui/StatusBadge';
import type { Column } from '../ui/Table';

interface Testimonial {
  id: string;
  clientName: string;
  clientTitle: string | null;
  clientCompany: string | null;
  content: string;
  rating: number | null;
  avatarMediaId: string | null;
  portfolioProjectId: string | null;
  isPublished: boolean;
  orderIndex: number;
}

interface PortfolioProject {
  id: string;
  title: string;
}

export default function TestimonialsManager({
  canWrite,
  canDelete,
}: {
  canWrite: boolean;
  canDelete: boolean;
}) {
  const [projects, setProjects] = useState<PortfolioProject[]>([]);

  useEffect(() => {
    api
      .list<PortfolioProject>('/api/portfolio-projects', { page: 1, pageSize: 100 })
      .then((res) => setProjects(res.data))
      .catch(() => setProjects([]));
  }, []);

  const fields: FieldConfig[] = [
    { name: 'clientName', label: 'Client name', type: 'text', required: true },
    { name: 'clientTitle', label: 'Client title', type: 'text' },
    { name: 'clientCompany', label: 'Client company', type: 'text' },
    {
      name: 'rating',
      label: 'Rating',
      type: 'select',
      options: [1, 2, 3, 4, 5].map((n) => ({
        value: String(n),
        label: `${n} star${n > 1 ? 's' : ''}`,
      })),
    },
    {
      name: 'portfolioProjectId',
      label: 'Related project',
      type: 'select',
      options: projects.map((p) => ({ value: p.id, label: p.title })),
    },
    { name: 'avatarMediaId', label: 'Avatar', type: 'media' },
    { name: 'content', label: 'Testimonial', type: 'textarea', required: true, fullWidth: true },
    { name: 'orderIndex', label: 'Display order', type: 'number' },
    { name: 'isPublished', label: 'Published', type: 'checkbox' },
  ];

  const columns: Column<Testimonial>[] = [
    { key: 'clientName', label: 'Client', sortable: true },
    { key: 'clientCompany', label: 'Company' },
    { key: 'rating', label: 'Rating', sortable: true },
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

  return (
    <ResourceManager<Testimonial>
      title="Testimonial"
      description="Client quotes shown on the homepage and portfolio pages."
      endpoint="/api/testimonials"
      columns={columns}
      searchPlaceholder="Search testimonials…"
      fields={fields}
      defaultValues={{
        clientName: '',
        clientTitle: '',
        clientCompany: '',
        rating: '',
        portfolioProjectId: '',
        avatarMediaId: null,
        content: '',
        orderIndex: 0,
        isPublished: true,
      }}
      canWrite={canWrite}
      canDelete={canDelete}
      defaultSortBy="orderIndex"
      emptyIcon="quote"
      filters={[
        {
          key: 'isPublished',
          label: 'Status',
          options: [
            { value: 'true', label: 'Published' },
            { value: 'false', label: 'Hidden' },
          ],
        },
      ]}
      transformSubmit={(values) => ({
        ...values,
        portfolioProjectId: values.portfolioProjectId || null,
        rating: values.rating ? Number(values.rating) : null,
        orderIndex: Number(values.orderIndex) || 0,
      })}
      deleteWarning={(row) =>
        `The testimonial from "${row.clientName}" will be permanently removed.`
      }
    />
  );
}
