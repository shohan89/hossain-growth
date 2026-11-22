import { useEffect, useState } from 'react';
import { api } from '../../../lib/admin/api-client';
import ResourceManager, { type FieldConfig } from '../ResourceManager';
import StatusBadge from '../ui/StatusBadge';
import type { Column } from '../ui/Table';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  featuredImageId: string | null;
  authorId: string | null;
  categoryId: string | null;
  status: 'draft' | 'scheduled' | 'published';
  scheduledAt: string | null;
  publishedAt: string | null;
}

interface BlogCategory {
  id: string;
  name: string;
}

interface BlogTag {
  id: string;
  name: string;
}

interface AssignableUser {
  id: string;
  name: string;
}

const STATUS_TONE = {
  draft: 'neutral',
  scheduled: 'warning',
  published: 'success',
} as const;

export default function BlogPostsManager({
  canWrite,
  canDelete,
  canPublish,
}: {
  canWrite: boolean;
  canDelete: boolean;
  canPublish: boolean;
}) {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [users, setUsers] = useState<AssignableUser[]>([]);

  useEffect(() => {
    api
      .list<BlogCategory>('/api/blog-categories', { page: 1, pageSize: 100 })
      .then((res) => setCategories(res.data))
      .catch(() => setCategories([]));
    api
      .list<BlogTag>('/api/blog-tags', { page: 1, pageSize: 100 })
      .then((res) => setTags(res.data))
      .catch(() => setTags([]));
    api
      .get<AssignableUser[]>('/api/admin-users/assignable')
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  const authorName = (id: string | null) => users.find((u) => u.id === id)?.name ?? '—';

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    ...(canPublish
      ? [
          { value: 'scheduled', label: 'Scheduled' },
          { value: 'published', label: 'Published' },
        ]
      : []),
  ];

  const fields: FieldConfig[] = [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'slug', label: 'Slug', type: 'text', required: true },
    {
      name: 'categoryId',
      label: 'Category',
      type: 'select',
      options: categories.map((c) => ({ value: c.id, label: c.name })),
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: statusOptions,
      hint: canPublish ? undefined : 'Publishing requires the blog.publish permission.',
    },
    { name: 'scheduledAt', label: 'Scheduled for', type: 'date' },
    { name: 'publishedAt', label: 'Publish date', type: 'date' },
    { name: 'featuredImageId', label: 'Featured image', type: 'media' },
    { name: 'excerpt', label: 'Excerpt', type: 'textarea', fullWidth: true },
    {
      name: 'tagIds',
      label: 'Tags',
      type: 'tags',
      fullWidth: true,
      tagOptions: tags.map((t) => ({ id: t.id, label: t.name })),
    },
    { name: 'content', label: 'Content', type: 'richtext', required: true, fullWidth: true },
  ];

  const columns: Column<BlogPost>[] = [
    { key: 'title', label: 'Title', sortable: true },
    {
      key: 'categoryId',
      label: 'Category',
      render: (row) => categories.find((c) => c.id === row.categoryId)?.name ?? '—',
    },
    { key: 'authorId', label: 'Author', render: (row) => authorName(row.authorId) },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row) => <StatusBadge tone={STATUS_TONE[row.status]} label={row.status} />,
    },
    {
      key: 'publishedAt',
      label: 'Published',
      sortable: true,
      render: (row) => (row.publishedAt ? new Date(row.publishedAt).toLocaleDateString() : '—'),
    },
  ];

  return (
    <ResourceManager<BlogPost>
      title="Blog Post"
      description="Articles published to /blog. Rich text, categories, tags, and scheduled publishing."
      endpoint="/api/blog-posts"
      columns={columns}
      searchPlaceholder="Search posts…"
      fields={fields}
      defaultValues={{
        title: '',
        slug: '',
        categoryId: '',
        status: 'draft',
        scheduledAt: '',
        publishedAt: '',
        featuredImageId: null,
        excerpt: '',
        tagIds: [],
        content: '',
      }}
      canWrite={canWrite}
      canDelete={canDelete}
      defaultSortBy="createdAt"
      emptyIcon="edit"
      filters={[
        {
          key: 'status',
          label: 'Status',
          options: [
            { value: 'draft', label: 'Draft' },
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'published', label: 'Published' },
          ],
        },
        {
          key: 'categoryId',
          label: 'Category',
          options: categories.map((c) => ({ value: c.id, label: c.name })),
        },
      ]}
      beforeEdit={(row) =>
        api
          .get<BlogPost & { tags: { id: string }[] }>(`/api/blog-posts/${row.id}`)
          .then((full) => ({
            tagIds: full.tags.map((t) => t.id),
          }))
      }
      transformSubmit={(values) => ({
        ...values,
        categoryId: values.categoryId || null,
      })}
      deleteWarning={(row) => `"${row.title}" will be permanently removed.`}
    />
  );
}
