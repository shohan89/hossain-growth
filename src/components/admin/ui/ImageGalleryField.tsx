import { useEffect, useState } from 'react';
import { api } from '../../../lib/admin/api-client';
import { PickerModal, Thumb, type MediaAsset } from './MediaPickerField';
import Button from './Button';
import Icon from './Icon';

export default function ImageGalleryField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string[];
  onChange: (ids: string[]) => void;
  hint?: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [assets, setAssets] = useState<Record<string, MediaAsset>>({});

  useEffect(() => {
    value.forEach((id) => {
      if (assets[id]) return;
      api
        .get<MediaAsset>(`/api/media/${id}`)
        .then((asset) => setAssets((prev) => ({ ...prev, [id]: asset })))
        .catch(() => {});
    });
  }, [value, assets]);

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-[var(--color-text)]">{label}</span>
      <div className="flex flex-wrap gap-3">
        {value.map((id) => (
          <div
            key={id}
            className="relative h-20 w-20 overflow-hidden rounded-lg border border-[var(--color-border)]"
          >
            {assets[id] ? <Thumb asset={assets[id]} /> : null}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== id))}
              aria-label="Remove image"
              className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white"
            >
              <Icon name="x" className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-lime-500"
        >
          <Icon name="plus" className="h-5 w-5" />
        </button>
      </div>
      <Button
        variant="secondary"
        size="sm"
        type="button"
        className="w-fit"
        onClick={() => setPickerOpen(true)}
      >
        Add image
      </Button>
      {hint && <span className="text-xs text-[var(--color-text-muted)]">{hint}</span>}
      <PickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(asset) => {
          if (!value.includes(asset.id)) onChange([...value, asset.id]);
          setAssets((prev) => ({ ...prev, [asset.id]: asset }));
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
