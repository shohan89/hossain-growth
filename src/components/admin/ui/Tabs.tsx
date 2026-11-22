import { useState, type ReactNode } from 'react';

export default function Tabs({
  tabs,
}: {
  tabs: { key: string; label: string; content: ReactNode }[];
}) {
  const [active, setActive] = useState(tabs[0]?.key);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 border-b border-[var(--color-border)]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              active === tab.key
                ? 'border-ink-900 dark:border-bone-50 border-b-2 text-[var(--color-text)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div key={tab.key} className={tab.key === active ? 'block' : 'hidden'}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}
