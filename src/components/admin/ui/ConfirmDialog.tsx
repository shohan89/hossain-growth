import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import Icon from './Icon';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  danger = true,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          {danger && (
            <span className="bg-danger-muted text-danger flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
              <Icon name="alertTriangle" />
            </span>
          )}
          {description && <p className="text-sm text-[var(--color-text-muted)]">{description}</p>}
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
