import { useEffect, useState } from 'react';
import { api, AdminApiError } from '../../../lib/admin/api-client';
import { toast } from '../../../lib/admin/toast';
import { TextField } from '../ui/fields';
import KeyValueEditor from '../ui/KeyValueEditor';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import Spinner from '../ui/Spinner';

interface SettingRow {
  key: string;
  value: unknown;
}

const KNOWN_KEYS = ['contact_email', 'contact_phone', 'social_links'];

export default function SiteSettingsManager({ canWrite }: { canWrite: boolean }) {
  const [loading, setLoading] = useState(true);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [customSettings, setCustomSettings] = useState<SettingRow[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  function load() {
    setLoading(true);
    api
      .get<SettingRow[]>('/api/site-settings')
      .then((rows) => {
        setContactEmail(String(rows.find((r) => r.key === 'contact_email')?.value ?? ''));
        setContactPhone(String(rows.find((r) => r.key === 'contact_phone')?.value ?? ''));
        setSocialLinks(
          (rows.find((r) => r.key === 'social_links')?.value as Record<string, string>) ?? {},
        );
        setCustomSettings(rows.filter((r) => !KNOWN_KEYS.includes(r.key)));
      })
      .catch(() => toast.error('Failed to load settings.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function saveKey(key: string, value: unknown) {
    setSavingKey(key);
    try {
      await api.put(`/api/site-settings/${key}`, { value });
      toast.success('Setting saved.');
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : 'Save failed.');
    } finally {
      setSavingKey(null);
    }
  }

  async function addCustomSetting() {
    if (!newKey.trim()) return;
    let parsed: unknown = newValue;
    try {
      parsed = JSON.parse(newValue);
    } catch {
      // Not valid JSON — store the raw string as-is.
    }
    await saveKey(newKey.trim(), parsed);
    setNewKey('');
    setNewValue('');
    load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Site Settings</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Global settings used across the public website.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="font-semibold">Contact details</h2>
        <TextField
          label="Contact email"
          type="email"
          value={contactEmail}
          onChange={setContactEmail}
        />
        <TextField label="Contact phone" value={contactPhone} onChange={setContactPhone} />
        {canWrite && (
          <Button
            variant="primary"
            className="w-fit"
            disabled={savingKey !== null}
            onClick={async () => {
              await saveKey('contact_email', contactEmail);
              await saveKey('contact_phone', contactPhone);
            }}
          >
            Save contact details
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="font-semibold">Social links</h2>
        <KeyValueEditor label="Platform → URL" value={socialLinks} onChange={setSocialLinks} />
        {canWrite && (
          <Button
            variant="primary"
            className="w-fit"
            disabled={savingKey !== null}
            onClick={() => saveKey('social_links', socialLinks)}
          >
            Save social links
          </Button>
        )}
      </div>

      {customSettings.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="font-semibold">Other settings</h2>
          {customSettings.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{row.key}</span>
              <code className="truncate text-[var(--color-text-muted)]">
                {JSON.stringify(row.value)}
              </code>
            </div>
          ))}
        </div>
      )}

      {canWrite && (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-[var(--color-border)] p-5">
          <h2 className="font-semibold">Add a custom setting</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Key" value={newKey} onChange={setNewKey} />
            <TextField label="Value (JSON or text)" value={newValue} onChange={setNewValue} />
          </div>
          <Button variant="secondary" className="w-fit" onClick={addCustomSetting}>
            <Icon name="plus" className="h-3.5 w-3.5" /> Add setting
          </Button>
        </div>
      )}
    </div>
  );
}
