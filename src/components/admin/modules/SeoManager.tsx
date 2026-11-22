import { useEffect, useState } from 'react';
import { api, AdminApiError } from '../../../lib/admin/api-client';
import { toast } from '../../../lib/admin/toast';
import { SelectField, TextField, TextAreaField, CheckboxField } from '../ui/fields';
import MediaPickerField from '../ui/MediaPickerField';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';

const ENTITY_TYPES = [
  { value: 'service', label: 'Service', endpoint: '/api/services' },
  { value: 'blog_post', label: 'Blog Post', endpoint: '/api/blog-posts' },
  { value: 'portfolio_project', label: 'Portfolio Project', endpoint: '/api/portfolio-projects' },
  { value: 'case_study', label: 'Case Study', endpoint: '/api/case-studies' },
  { value: 'page', label: 'Website Page', endpoint: '/api/website-pages' },
] as const;

interface EntityOption {
  id: string;
  title: string;
}

interface SeoMetadata {
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  ogImageId: string | null;
  noIndex: boolean;
}

const EMPTY: SeoMetadata = {
  metaTitle: '',
  metaDescription: '',
  canonicalUrl: '',
  ogImageId: null,
  noIndex: false,
};

export default function SeoManager({ canWrite }: { canWrite: boolean }) {
  const [entityType, setEntityType] = useState<string>(ENTITY_TYPES[0].value);
  const [entities, setEntities] = useState<EntityOption[]>([]);
  const [entityId, setEntityId] = useState('');
  const [form, setForm] = useState<SeoMetadata>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const current = ENTITY_TYPES.find((t) => t.value === entityType)!;

  useEffect(() => {
    setEntityId('');
    setForm(EMPTY);
    api
      .list<{ id: string; title: string }>(current.endpoint, { page: 1, pageSize: 100 })
      .then((res) => setEntities(res.data.map((row) => ({ id: row.id, title: row.title }))))
      .catch(() => setEntities([]));
  }, [entityType]);

  useEffect(() => {
    if (!entityId) {
      setForm(EMPTY);
      return;
    }
    setLoading(true);
    api
      .get<SeoMetadata>(`/api/seo-metadata/${entityType}/${entityId}`)
      .then((data) =>
        setForm({
          metaTitle: data.metaTitle ?? '',
          metaDescription: data.metaDescription ?? '',
          canonicalUrl: data.canonicalUrl ?? '',
          ogImageId: data.ogImageId ?? null,
          noIndex: data.noIndex ?? false,
        }),
      )
      .catch(() => setForm(EMPTY))
      .finally(() => setLoading(false));
  }, [entityId, entityType]);

  async function handleSave() {
    setSaving(true);
    try {
      await api.put(`/api/seo-metadata/${entityType}/${entityId}`, {
        metaTitle: form.metaTitle || null,
        metaDescription: form.metaDescription || null,
        canonicalUrl: form.canonicalUrl || null,
        ogImageId: form.ogImageId,
        noIndex: form.noIndex,
      });
      toast.success('SEO metadata saved.');
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">SEO Manager</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Per-page meta title, description, canonical URL, and social preview image.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Content type"
          value={entityType}
          onChange={setEntityType}
          options={ENTITY_TYPES.map((t) => ({ value: t.value, label: t.label }))}
        />
        <SelectField
          label="Item"
          value={entityId}
          onChange={setEntityId}
          options={entities.map((e) => ({ value: e.id, label: e.title }))}
          placeholder="Choose an item…"
        />
      </div>

      {loading && (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      )}

      {!loading && entityId && (
        <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <TextField
            label="SEO title"
            value={form.metaTitle ?? ''}
            onChange={(v) => setForm((p) => ({ ...p, metaTitle: v }))}
            hint="Falls back to the page's own title if left blank."
          />
          <TextAreaField
            label="SEO description"
            value={form.metaDescription ?? ''}
            onChange={(v) => setForm((p) => ({ ...p, metaDescription: v }))}
            rows={3}
          />
          <TextField
            label="Canonical URL"
            type="url"
            value={form.canonicalUrl ?? ''}
            onChange={(v) => setForm((p) => ({ ...p, canonicalUrl: v }))}
          />
          <MediaPickerField
            label="Open Graph image"
            value={form.ogImageId}
            onChange={(id) => setForm((p) => ({ ...p, ogImageId: id }))}
          />
          <CheckboxField
            label="No-index this page"
            checked={form.noIndex}
            onChange={(v) => setForm((p) => ({ ...p, noIndex: v }))}
            hint="Tells search engines not to index this page."
          />
          {canWrite && (
            <Button variant="primary" className="w-fit" disabled={saving} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save SEO settings'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
