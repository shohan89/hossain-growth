import { useRef, useState } from 'react';
import { api, AdminApiError } from '../../../lib/admin/api-client';
import { toast } from '../../../lib/admin/toast';
import { useResourceList } from '../../../lib/admin/useResourceList';
import { Thumb } from '../ui/MediaPickerField';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import SearchInput from '../ui/SearchInput';
import Pagination from '../ui/Pagination';
import Spinner from '../ui/Spinner';
import EmptyState from '../ui/EmptyState';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import { TextField } from '../ui/fields';
import OrphanedFilesPanel from './OrphanedFilesPanel';

interface MediaAsset {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  createdAt: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function EditAssetModal({
  asset,
  onClose,
  onSaved,
}: {
  asset: MediaAsset | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fileName, setFileName] = useState(asset?.fileName ?? '');
  const [altText, setAltText] = useState(asset?.altText ?? '');
  const [saving, setSaving] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  if (!asset) return null;
  const current = asset;

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch(`/api/media/${current.id}`, { fileName, altText: altText || null });
      toast.success('Media updated.');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : 'Update failed.');
    } finally {
      setSaving(false);
    }
  }

  async function handleReplace(file: File) {
    setReplacing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.upload(`/api/media/${current.id}/replace`, formData);
      toast.success('File replaced.');
      onSaved();
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : 'Replace failed.');
    } finally {
      setReplacing(false);
    }
  }

  function copyUrl() {
    const url = `${window.location.origin}/media/${current.id}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success('Public URL copied.'),
      () => toast.error('Could not copy URL.'),
    );
  }

  return (
    <Modal open={Boolean(asset)} onClose={onClose} title="Edit media">
      <div className="flex flex-col gap-4">
        <div className="h-40 w-full overflow-hidden rounded-lg border border-[var(--color-border)]">
          <Thumb asset={asset} />
        </div>
        <TextField label="File name" value={fileName} onChange={setFileName} />
        <TextField
          label="Alt text"
          value={altText}
          onChange={setAltText}
          hint="Shown to screen readers and search engines."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={copyUrl}>
            <Icon name="copy" className="h-3.5 w-3.5" /> Copy public URL
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={replacing}
            onClick={() => replaceInputRef.current?.click()}
          >
            <Icon name="upload" className="h-3.5 w-3.5" />{' '}
            {replacing ? 'Replacing…' : 'Replace file'}
          </Button>
          <input
            ref={replaceInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleReplace(file);
              e.target.value = '';
            }}
          />
        </div>
        <div className="flex justify-end gap-3 border-t border-[var(--color-border)] pt-4">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function MediaLibraryManager({
  canWrite,
  canDelete,
}: {
  canWrite: boolean;
  canDelete: boolean;
}) {
  const list = useResourceList<MediaAsset>({
    endpoint: '/api/media',
    pageSize: 24,
    defaultSortBy: 'createdAt',
  });
  const [uploading, setUploading] = useState(false);
  const [editingAsset, setEditingAsset] = useState<MediaAsset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(files: FileList) {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        await api.upload('/api/media', formData);
      }
      toast.success(`${files.length} file${files.length > 1 ? 's' : ''} uploaded.`);
      list.refetch();
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/media/${deleteTarget.id}`);
      toast.success('File deleted.');
      setDeleteTarget(null);
      list.refetch();
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : 'Delete failed.');
    }
  }

  function copyUrl(asset: MediaAsset) {
    const url = `${window.location.origin}/media/${asset.id}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success('Public URL copied.'),
      () => toast.error('Could not copy URL.'),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Media Library</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Images and files stored in Cloudflare R2.
          </p>
        </div>
        {canWrite && (
          <Button
            variant="primary"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon name="upload" className="h-4 w-4" /> {uploading ? 'Uploading…' : 'Upload'}
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void handleUpload(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      <OrphanedFilesPanel canDelete={canDelete} onCleaned={list.refetch} />

      <SearchInput
        value={list.search}
        onChange={list.setSearch}
        placeholder="Search by file name…"
      />

      {list.error && (
        <p className="bg-danger-muted text-danger rounded-lg px-4 py-2 text-sm">{list.error}</p>
      )}

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        {list.loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : list.data.length === 0 ? (
          <EmptyState
            icon="folder"
            title="No media yet"
            description="Upload an image or file to get started."
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {list.data.map((asset) => (
              <div
                key={asset.id}
                className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] p-2"
              >
                <button
                  type="button"
                  onClick={() => setEditingAsset(asset)}
                  className="aspect-square overflow-hidden rounded-lg"
                >
                  <Thumb asset={asset} />
                </button>
                <div className="flex flex-col gap-0.5">
                  <span className="truncate text-xs font-medium text-[var(--color-text)]">
                    {asset.fileName}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {formatBytes(asset.sizeBytes)}
                    {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => copyUrl(asset)}
                    aria-label="Copy public URL"
                    className="rounded-md p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  >
                    <Icon name="copy" className="h-3.5 w-3.5" />
                  </button>
                  {canWrite && (
                    <button
                      type="button"
                      onClick={() => setEditingAsset(asset)}
                      aria-label="Edit"
                      className="rounded-md p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    >
                      <Icon name="edit" className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(asset)}
                      aria-label="Delete"
                      className="hover:text-danger rounded-md p-1 text-[var(--color-text-muted)]"
                    >
                      <Icon name="trash" className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <Pagination pagination={list.pagination} onPageChange={list.setPage} />
      </div>

      <EditAssetModal
        asset={editingAsset}
        onClose={() => setEditingAsset(null)}
        onSaved={() => {
          list.refetch();
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete file"
        description={
          deleteTarget ? `"${deleteTarget.fileName}" will be permanently deleted from storage.` : ''
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
