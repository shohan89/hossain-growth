import { useEffect, useState } from 'react';
import { api, AdminApiError } from '../../../lib/admin/api-client';
import { toast } from '../../../lib/admin/toast';
import type { MediaAsset } from '../ui/MediaPickerField';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import ConfirmDialog from '../ui/ConfirmDialog';
import Spinner from '../ui/Spinner';

export default function OrphanedFilesPanel({
  canDelete,
  onCleaned,
}: {
  canDelete: boolean;
  onCleaned: () => void;
}) {
  const [orphans, setOrphans] = useState<MediaAsset[] | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function load() {
    api
      .get<MediaAsset[]>('/api/media/orphaned')
      .then(setOrphans)
      .catch(() => setOrphans(null));
  }

  useEffect(load, []);

  async function handleCleanup() {
    try {
      const result = await api.post<{ deleted: number }>('/api/media/orphaned', {});
      toast.success(`Removed ${result.deleted} unused file${result.deleted === 1 ? '' : 's'}.`);
      setConfirmOpen(false);
      load();
      onCleaned();
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : 'Cleanup failed.');
    }
  }

  if (orphans === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Spinner className="h-4 w-4" /> Checking for unused files…
      </div>
    );
  }

  if (orphans.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-[var(--color-border)] p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--color-surface-muted)]">
          <Icon name="folder" className="h-4 w-4 text-[var(--color-text-muted)]" />
        </span>
        <p className="text-sm">
          <strong>{orphans.length}</strong> uploaded file{orphans.length === 1 ? '' : 's'} not used
          anywhere on the site (uploaded over an hour ago).
        </p>
      </div>
      {canDelete && (
        <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
          <Icon name="trash" className="h-3.5 w-3.5" /> Clean up
        </Button>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete unused files"
        description={`This permanently deletes ${orphans.length} file${orphans.length === 1 ? '' : 's'} from storage. Only files not referenced by any service, project, post, testimonial, or SEO entry are included.`}
        confirmLabel="Delete all"
        onConfirm={handleCleanup}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
