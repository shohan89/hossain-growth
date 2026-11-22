import { useState, type ReactNode } from 'react';
import { api, AdminApiError } from '../../lib/admin/api-client';
import { toast } from '../../lib/admin/toast';
import { useResourceList } from '../../lib/admin/useResourceList';
import { toDateTimeLocalValue } from '../../lib/admin/datetime';
import Table, { type Column } from './ui/Table';
import Pagination from './ui/Pagination';
import SearchInput from './ui/SearchInput';
import FilterSelect, { type FilterOption } from './ui/FilterSelect';
import Button from './ui/Button';
import Icon from './ui/Icon';
import Modal from './ui/Modal';
import ConfirmDialog from './ui/ConfirmDialog';
import EmptyState from './ui/EmptyState';
import { TextField, TextAreaField, SelectField, CheckboxField, DateField } from './ui/fields';
import RichTextEditor from './ui/RichTextEditor';
import TagMultiSelect, { type SelectOption } from './ui/TagMultiSelect';
import KeyValueEditor from './ui/KeyValueEditor';
import MediaPickerField from './ui/MediaPickerField';
import ImageGalleryField from './ui/ImageGalleryField';

export type FieldType =
  | 'text'
  | 'email'
  | 'url'
  | 'password'
  | 'number'
  | 'textarea'
  | 'richtext'
  | 'select'
  | 'checkbox'
  | 'date'
  | 'tags'
  | 'media'
  | 'gallery'
  | 'json-kv';

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  hint?: string;
  options?: { value: string; label: string }[];
  tagOptions?: SelectOption[];
  fullWidth?: boolean;
  /** Converts a loaded record's raw value into what the form field should display. */
  toFormValue?: (raw: unknown) => unknown;
  /** Converts the form field's value back into what the API expects. */
  toPayloadValue?: (formValue: unknown) => unknown;
}

export interface ResourceManagerProps<T extends { id: string }> {
  title: string;
  description?: string;
  endpoint: string;
  columns: Column<T>[];
  searchPlaceholder?: string;
  filters?: { key: string; label: string; options: FilterOption[] }[];
  fields: FieldConfig[];
  defaultValues: Record<string, unknown>;
  canWrite: boolean;
  canDelete: boolean;
  deleteWarning?: (row: T) => string;
  transformSubmit?: (values: Record<string, unknown>, isEdit: boolean) => Record<string, unknown>;
  /** Runs after a successful create/update, before the modal closes — e.g. to upsert related SEO metadata. */
  onSaved?: (
    saved: T,
    formValues: Record<string, unknown>,
    isEdit: boolean,
  ) => Promise<void> | void;
  /** Fetches extra fields the list row doesn't include (e.g. joined tags) once the edit modal is open. */
  beforeEdit?: (row: T) => Promise<Record<string, unknown>>;
  defaultSortBy?: string;
  emptyIcon?: Parameters<typeof EmptyState>[0]['icon'];
  extraHeaderActions?: ReactNode;
}

export default function ResourceManager<T extends { id: string }>({
  title,
  description,
  endpoint,
  columns,
  searchPlaceholder,
  filters = [],
  fields,
  defaultValues,
  canWrite,
  canDelete,
  deleteWarning,
  transformSubmit,
  onSaved,
  beforeEdit,
  defaultSortBy,
  emptyIcon = 'folder',
  extraHeaderActions,
}: ResourceManagerProps<T>) {
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const list = useResourceList<T>({ endpoint, defaultSortBy, filters: filterValues });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>(defaultValues);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  function openCreate() {
    setEditing(null);
    setValues(defaultValues);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(row: T) {
    setEditing(row);
    const merged: Record<string, unknown> = { ...defaultValues, ...row };
    for (const field of fields) {
      if (field.type === 'date') merged[field.name] = toDateTimeLocalValue(merged[field.name]);
      if (field.toFormValue) merged[field.name] = field.toFormValue(merged[field.name]);
    }
    setValues(merged);
    setFormError(null);
    setModalOpen(true);

    if (beforeEdit) {
      beforeEdit(row)
        .then((extra) => setValues((prev) => ({ ...prev, ...extra })))
        .catch(() => toast.error('Failed to load full record details.'));
    }
  }

  function setField(name: string, value: unknown) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setFormError(null);
    try {
      const normalized: Record<string, unknown> = { ...values };
      for (const field of fields) {
        if (field.type === 'date' && normalized[field.name] === '') normalized[field.name] = null;
        if (field.toPayloadValue)
          normalized[field.name] = field.toPayloadValue(normalized[field.name]);
      }
      const payload = transformSubmit ? transformSubmit(normalized, Boolean(editing)) : normalized;
      let saved: T;
      if (editing) {
        saved = await api.patch<T>(`${endpoint}/${editing.id}`, payload);
        toast.success(`${title} updated.`);
      } else {
        saved = await api.post<T>(endpoint, payload);
        toast.success(`${title} created.`);
      }
      if (onSaved) await onSaved(saved, normalized, Boolean(editing));
      setModalOpen(false);
      list.refetch();
    } catch (err) {
      if (err instanceof AdminApiError || err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Something went wrong.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`${endpoint}/${deleteTarget.id}`);
      toast.success(`${title} deleted.`);
      setDeleteTarget(null);
      list.refetch();
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : 'Delete failed.');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-text)]">{title}</h1>
            {description && <p className="text-sm text-[var(--color-text-muted)]">{description}</p>}
          </div>
          <div className="flex items-center gap-2">
            {extraHeaderActions}
            {canWrite && (
              <Button variant="primary" onClick={openCreate}>
                <Icon name="plus" className="h-4 w-4" /> New
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={list.search}
          onChange={list.setSearch}
          placeholder={searchPlaceholder}
        />
        {filters.map((filter) => (
          <FilterSelect
            key={filter.key}
            label={filter.label}
            value={filterValues[filter.key] ?? ''}
            options={filter.options}
            onChange={(v) => setFilterValues((prev) => ({ ...prev, [filter.key]: v }))}
          />
        ))}
      </div>

      {list.error && (
        <p className="bg-danger-muted text-danger rounded-lg px-4 py-2 text-sm">{list.error}</p>
      )}

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <Table
          columns={columns}
          rows={list.data}
          loading={list.loading}
          sortBy={list.sortBy}
          sortDir={list.sortDir}
          onSort={list.setSort}
          emptyState={<EmptyState icon={emptyIcon} title={`No ${title.toLowerCase()} yet`} />}
          rowActions={(row) => (
            <div className="flex justify-end gap-1">
              {canWrite && (
                <button
                  type="button"
                  onClick={() => openEdit(row)}
                  className="rounded-md p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                  aria-label="Edit"
                >
                  <Icon name="edit" className="h-4 w-4" />
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setDeleteTarget(row)}
                  className="hover:bg-danger-muted hover:text-danger rounded-md p-1.5 text-[var(--color-text-muted)]"
                  aria-label="Delete"
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        />
        <Pagination pagination={list.pagination} onPageChange={list.setPage} />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${title}` : `New ${title}`}
        size="lg"
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => {
              const wrapperClass = field.fullWidth ? 'sm:col-span-2' : '';
              const rawValue = values[field.name];

              if (field.type === 'richtext') {
                return (
                  <div key={field.name} className={`flex flex-col gap-1.5 ${wrapperClass}`}>
                    <span className="text-sm font-medium text-[var(--color-text)]">
                      {field.label}
                    </span>
                    <RichTextEditor
                      value={typeof rawValue === 'string' ? rawValue : ''}
                      onChange={(html) => setField(field.name, html)}
                      resetKey={editing?.id ?? 'new'}
                    />
                  </div>
                );
              }

              if (field.type === 'tags') {
                return (
                  <div key={field.name} className={wrapperClass}>
                    <TagMultiSelect
                      label={field.label}
                      options={field.tagOptions ?? []}
                      value={Array.isArray(rawValue) ? (rawValue as string[]) : []}
                      onChange={(ids) => setField(field.name, ids)}
                      hint={field.hint}
                    />
                  </div>
                );
              }

              if (field.type === 'media') {
                return (
                  <div key={field.name} className={wrapperClass}>
                    <MediaPickerField
                      label={field.label}
                      value={typeof rawValue === 'string' ? rawValue : null}
                      onChange={(id) => setField(field.name, id)}
                      hint={field.hint}
                    />
                  </div>
                );
              }

              if (field.type === 'gallery') {
                return (
                  <div key={field.name} className={wrapperClass}>
                    <ImageGalleryField
                      label={field.label}
                      value={Array.isArray(rawValue) ? (rawValue as string[]) : []}
                      onChange={(ids) => setField(field.name, ids)}
                      hint={field.hint}
                    />
                  </div>
                );
              }

              if (field.type === 'json-kv') {
                return (
                  <div key={field.name} className={wrapperClass}>
                    <KeyValueEditor
                      label={field.label}
                      value={(rawValue as Record<string, string>) ?? {}}
                      onChange={(v) => setField(field.name, v)}
                      hint={field.hint}
                    />
                  </div>
                );
              }

              if (field.type === 'textarea') {
                return (
                  <div key={field.name} className={wrapperClass}>
                    <TextAreaField
                      label={field.label}
                      value={typeof rawValue === 'string' ? rawValue : ''}
                      onChange={(v) => setField(field.name, v)}
                      required={field.required}
                      hint={field.hint}
                    />
                  </div>
                );
              }

              if (field.type === 'select') {
                return (
                  <div key={field.name} className={wrapperClass}>
                    <SelectField
                      label={field.label}
                      value={typeof rawValue === 'string' ? rawValue : ''}
                      onChange={(v) => setField(field.name, v)}
                      options={field.options ?? []}
                      required={field.required}
                      hint={field.hint}
                    />
                  </div>
                );
              }

              if (field.type === 'checkbox') {
                return (
                  <div key={field.name} className={wrapperClass}>
                    <CheckboxField
                      label={field.label}
                      checked={Boolean(rawValue)}
                      onChange={(v) => setField(field.name, v)}
                      hint={field.hint}
                    />
                  </div>
                );
              }

              if (field.type === 'date') {
                return (
                  <div key={field.name} className={wrapperClass}>
                    <DateField
                      label={field.label}
                      value={typeof rawValue === 'string' ? rawValue : ''}
                      onChange={(v) => setField(field.name, v)}
                      hint={field.hint}
                    />
                  </div>
                );
              }

              return (
                <div key={field.name} className={wrapperClass}>
                  <TextField
                    label={field.label}
                    value={rawValue === null || rawValue === undefined ? '' : String(rawValue)}
                    onChange={(v) => setField(field.name, v)}
                    type={field.type === 'number' ? 'number' : field.type}
                    required={field.required}
                    hint={field.hint}
                  />
                </div>
              );
            })}
          </div>

          {formError && <p className="text-danger text-sm">{formError}</p>}

          <div className="flex justify-end gap-3 border-t border-[var(--color-border)] pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${title}`}
        description={
          deleteTarget && deleteWarning ? deleteWarning(deleteTarget) : 'This cannot be undone.'
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
