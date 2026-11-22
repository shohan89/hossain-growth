import ResourceManager, { type FieldConfig } from '../ResourceManager';
import Tabs from '../ui/Tabs';
import type { Column } from '../ui/Table';

interface Taxonomy {
  id: string;
  slug: string;
  name: string;
}

const fields: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  {
    name: 'slug',
    label: 'Slug',
    type: 'text',
    required: true,
    hint: 'Lowercase, hyphen-separated',
  },
];

const columns: Column<Taxonomy>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'slug', label: 'Slug', sortable: true },
];

export default function CategoriesTagsManager({
  canWrite,
  canDelete,
}: {
  canWrite: boolean;
  canDelete: boolean;
}) {
  return (
    <Tabs
      tabs={[
        {
          key: 'categories',
          label: 'Blog Categories',
          content: (
            <ResourceManager<Taxonomy>
              title="Blog Category"
              description="Used to organize and filter blog posts."
              endpoint="/api/blog-categories"
              columns={columns}
              searchPlaceholder="Search categories…"
              fields={fields}
              defaultValues={{ name: '', slug: '' }}
              canWrite={canWrite}
              canDelete={canDelete}
              defaultSortBy="name"
              emptyIcon="tag"
              deleteWarning={(row) => `"${row.name}" will be permanently removed.`}
            />
          ),
        },
        {
          key: 'tags',
          label: 'Blog Tags',
          content: (
            <ResourceManager<Taxonomy>
              title="Blog Tag"
              description="Attached to posts for finer-grained topic filtering."
              endpoint="/api/blog-tags"
              columns={columns}
              searchPlaceholder="Search tags…"
              fields={fields}
              defaultValues={{ name: '', slug: '' }}
              canWrite={canWrite}
              canDelete={canDelete}
              defaultSortBy="name"
              emptyIcon="tag"
              deleteWarning={(row) => `"${row.name}" will be permanently removed.`}
            />
          ),
        },
      ]}
    />
  );
}
