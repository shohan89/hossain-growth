import { useEffect, useRef, useState } from 'react';
import { api } from '../../../lib/admin/api-client';
import { toast } from '../../../lib/admin/toast';
import Modal from './Modal';
import Button from './Button';
import Icon from './Icon';
import SearchInput from './SearchInput';
import Spinner from './Spinner';
import EmptyState from './EmptyState';

export interface MediaAsset {
  id: string;
  fileName: string;
  mimeType: string;
  altText: string | null;
}

export function Thumb({ asset }: { asset: MediaAsset }) {
  if (asset.mimeType.startsWith('image/')) {
    return (
      <img
        src={`/media/${asset.id}`}
        alt={asset.altText ?? asset.fileName}
        className="h-full w-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--color-surface-muted)]">
      <Icon name="filetext" className="h-6 w-6 text-[var(--color-text-muted)]" />
    </div>
  );
}

export function PickerModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: MediaAsset) => void;
}) {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .list<MediaAsset>('/api/media', { page: 1, pageSize: 40, search: search || undefined })
      .then((res) => setItems(res.data))
      .catch(() => toast.error('Failed to load media library.'))
      .finally(() => setLoading(false));
  }, [open, search]);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const asset = await api.upload<MediaAsset>('/api/media', formData);
      toast.success('File uploaded.');
      onSelect(asset);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Select media" size="lg">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search media…" />
          <Button
            variant="primary"
            size="sm"
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon name="upload" className="h-3.5 w-3.5" /> {uploading ? 'Uploading…' : 'Upload new'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
              e.target.value = '';
            }}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="image"
            title="No media found"
            description="Upload a file to get started."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {items.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => onSelect(asset)}
                className="flex flex-col gap-1 rounded-lg border border-[var(--color-border)] p-2 text-left hover:border-lime-500"
              >
                <div className="aspect-square overflow-hidden rounded-md">
                  <Thumb asset={asset} />
                </div>
                <span className="truncate text-xs text-[var(--color-text-muted)]">
                  {asset.fileName}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function MediaPickerField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string | null;
  onChange: (mediaAssetId: string | null) => void;
  hint?: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [asset, setAsset] = useState<MediaAsset | null>(null);

  useEffect(() => {
    if (!value) {
      setAsset(null);
      return;
    }
    api
      .get<MediaAsset>(`/api/media/${value}`)
      .then(setAsset)
      .catch(() => setAsset(null));
  }, [value]);

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-[var(--color-text)]">{label}</span>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
          {asset ? (
            <Thumb asset={asset} />
          ) : (
            <Icon name="image" className="h-5 w-5 text-[var(--color-text-muted)]" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs text-[var(--color-text-muted)]">
            {asset?.fileName ?? 'No file selected'}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setPickerOpen(true)}>
              Choose
            </Button>
            {value && (
              <Button variant="ghost" size="sm" type="button" onClick={() => onChange(null)}>
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>
      {hint && <span className="text-xs text-[var(--color-text-muted)]">{hint}</span>}
      <PickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(selected) => {
          onChange(selected.id);
          setAsset(selected);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
