import { useEffect, useRef } from 'react';
import Icon from './Icon';
import type { AdminIconName } from '../../../lib/admin/icons';

interface ToolbarButton {
  icon: AdminIconName;
  label: string;
  command: string;
  value?: string;
}

const TOOLBAR: ToolbarButton[] = [
  { icon: 'edit', label: 'Bold', command: 'bold' },
  { icon: 'edit', label: 'Italic', command: 'italic' },
  { icon: 'filetext', label: 'Heading', command: 'formatBlock', value: 'h2' },
  { icon: 'filetext', label: 'Subheading', command: 'formatBlock', value: 'h3' },
  { icon: 'menu', label: 'Bullet list', command: 'insertUnorderedList' },
  { icon: 'grid', label: 'Numbered list', command: 'insertOrderedList' },
  { icon: 'quote', label: 'Quote', command: 'formatBlock', value: 'blockquote' },
  { icon: 'externalLink', label: 'Link', command: 'createLink' },
  { icon: 'x', label: 'Clear formatting', command: 'removeFormat' },
];

/**
 * Minimal custom rich text editor (contentEditable + execCommand). Kept
 * dependency-free on purpose — this is intentionally a lightweight editor
 * covering the formatting an agency blog post actually needs, not a full
 * WYSIWYG framework.
 */
export default function RichTextEditor({
  value,
  onChange,
  resetKey,
}: {
  value: string;
  onChange: (html: string) => void;
  resetKey: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastResetKey = useRef<string | null>(null);

  useEffect(() => {
    if (ref.current && lastResetKey.current !== resetKey) {
      ref.current.innerHTML = value;
      lastResetKey.current = resetKey;
    }
  }, [resetKey]);

  function runCommand(button: ToolbarButton) {
    ref.current?.focus();
    let commandValue = button.value;
    if (button.command === 'createLink') {
      commandValue = window.prompt('Link URL') ?? undefined;
      if (!commandValue) return;
    }
    document.execCommand(button.command, false, commandValue);
    if (ref.current) onChange(ref.current.innerHTML);
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex flex-wrap gap-1 border-b border-[var(--color-border)] p-2">
        {TOOLBAR.map((button) => (
          <button
            key={button.label}
            type="button"
            title={button.label}
            onClick={() => runCommand(button)}
            className="rounded-md p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
          >
            <Icon name={button.icon} className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className="prose-content min-h-[220px] max-w-none px-4 py-3 text-sm text-[var(--color-text)] focus:outline-none [&_blockquote]:border-l-2 [&_blockquote]:border-lime-500 [&_blockquote]:pl-3 [&_blockquote]:italic [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-bold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
      />
    </div>
  );
}
