import ResourceManager, { type FieldConfig } from '../ResourceManager';
import StatusBadge from '../ui/StatusBadge';
import type { Column } from '../ui/Table';

interface WebsitePage {
  id: string;
  slug: string;
  title: string;
  content: unknown;
  template: string;
  isPublished: boolean;
  publishedAt: string | null;
}

const fields: FieldConfig[] = [
  { name: 'title', label: 'Title', type: 'text', required: true },
  { name: 'slug', label: 'Slug', type: 'text', required: true },
  { name: 'template', label: 'Template', type: 'text', hint: 'e.g. "default", "landing"' },
  {
    name: 'content',
    label: 'Content (JSON)',
    type: 'textarea',
    fullWidth: true,
    hint: 'Raw JSON block content for this page.',
    toFormValue: (raw) => (raw ? JSON.stringify(raw, null, 2) : ''),
    toPayloadValue: (formValue) => {
      const text = typeof formValue === 'string' ? formValue.trim() : '';
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch {
        throw new Error('Content must be valid JSON.');
      }
    },
  },
  { name: 'isPublished', label: 'Published', type: 'checkbox' },
  { name: 'publishedAt', label: 'Publish date', type: 'date' },
];

const columns: Column<WebsitePage>[] = [
  { key: 'title', label: 'Title', sortable: true },
  { key: 'slug', label: 'Slug', sortable: true },
  { key: 'template', label: 'Template' },
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

export default function WebsitePagesManager({
  canWrite,
  canDelete,
}: {
  canWrite: boolean;
  canDelete: boolean;
}) {
  return (
    <ResourceManager<WebsitePage>
      title="Website Page"
      description="Freeform CMS pages. The main public site is built from dedicated templates — these are supplementary pages."
      endpoint="/api/website-pages"
      columns={columns}
      searchPlaceholder="Search pages…"
      fields={fields}
      defaultValues={{
        title: '',
        slug: '',
        template: 'default',
        content: '',
        isPublished: false,
        publishedAt: '',
      }}
      canWrite={canWrite}
      canDelete={canDelete}
      defaultSortBy="updatedAt"
      emptyIcon="filetext"
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
      deleteWarning={(row) => `"${row.title}" will be permanently removed.`}
    />
  );
}
