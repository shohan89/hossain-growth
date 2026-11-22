import { useEffect, useState } from 'react';
import { onToast, type ToastDetail } from '../../../lib/admin/toast';
import Icon from './Icon';

interface Entry extends ToastDetail {
  id: number;
}

let nextId = 1;

const STYLES: Record<ToastDetail['type'], string> = {
  success: 'bg-success-muted text-success',
  error: 'bg-danger-muted text-danger',
  info: 'bg-[var(--color-surface-muted)] text-[var(--color-text)]',
};

export default function ToastHost() {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    return onToast((detail) => {
      const id = nextId++;
      setEntries((prev) => [...prev, { ...detail, id }]);
      setTimeout(() => {
        setEntries((prev) => prev.filter((e) => e.id !== id));
      }, 4500);
    });
  }, []);

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[100] flex flex-col gap-2">
      {entries.map((entry) => (
        <div
          key={entry.id}
          role="status"
          className={`pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${STYLES[entry.type]}`}
        >
          <Icon
            name={entry.type === 'error' ? 'alertTriangle' : 'check'}
            className="h-4 w-4 shrink-0"
          />
          {entry.message}
        </div>
      ))}
    </div>
  );
}
