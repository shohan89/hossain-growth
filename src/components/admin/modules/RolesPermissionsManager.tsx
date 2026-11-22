import { useEffect, useState } from 'react';
import { api, AdminApiError } from '../../../lib/admin/api-client';
import { toast } from '../../../lib/admin/toast';
import { PERMISSIONS } from '../../../lib/auth/permissions';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import Spinner from '../ui/Spinner';
import { TextField, TextAreaField } from '../ui/fields';

interface Role {
  id: string;
  key: string;
  name: string;
  description: string | null;
  permissions: string[];
}

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

function groupPermissions() {
  const groups: Record<string, string[]> = {};
  for (const key of ALL_PERMISSIONS) {
    const [group] = key.split('.');
    groups[group] ??= [];
    groups[group].push(key);
  }
  return groups;
}

function CreateRoleModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/api/roles', { key, name, description: description || undefined });
      toast.success('Role created.');
      setKey('');
      setName('');
      setDescription('');
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Failed to create role.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New role">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <TextField label="Key" value={key} onChange={setKey} required hint="lowercase_snake_case" />
        <TextField label="Name" value={name} onChange={setName} required />
        <TextAreaField label="Description" value={description} onChange={setDescription} rows={2} />
        {error && <p className="text-danger text-sm">{error}</p>}
        <div className="flex justify-end gap-3 border-t border-[var(--color-border)] pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create role'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function RolesPermissionsManager({ canManage }: { canManage: boolean }) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  function load() {
    setLoading(true);
    api
      .get<Role[]>('/api/roles')
      .then((rows) => {
        setRoles(rows);
        if (!selectedId && rows.length) setSelectedId(rows[0].id);
      })
      .catch(() => toast.error('Failed to load roles.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const selected = roles.find((r) => r.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) return;
    setName(selected.name);
    setDescription(selected.description ?? '');
    setPermissions(new Set(selected.permissions));
  }, [selected?.id]);

  async function saveDetails() {
    if (!selected) return;
    setSavingDetails(true);
    try {
      await api.patch(`/api/roles/${selected.id}`, { name, description: description || undefined });
      toast.success('Role updated.');
      load();
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : 'Update failed.');
    } finally {
      setSavingDetails(false);
    }
  }

  async function savePermissions() {
    if (!selected) return;
    setSavingPermissions(true);
    try {
      await api.put(`/api/roles/${selected.id}/permissions`, { permissionKeys: [...permissions] });
      toast.success('Permissions updated.');
      load();
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : 'Update failed.');
    } finally {
      setSavingPermissions(false);
    }
  }

  async function handleDeleteRole() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/roles/${deleteTarget.id}`);
      toast.success('Role deleted.');
      setDeleteTarget(null);
      setSelectedId(null);
      load();
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : 'Delete failed.');
    }
  }

  function toggle(key: string) {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const groups = groupPermissions();

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        {canManage && (
          <Button variant="secondary" size="sm" onClick={() => setCreateOpen(true)}>
            <Icon name="plus" className="h-3.5 w-3.5" /> New role
          </Button>
        )}
        {roles.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => setSelectedId(role.id)}
            className={`rounded-lg px-3 py-2 text-left text-sm font-medium ${
              role.id === selectedId
                ? 'bg-ink-900 text-bone-50'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            {role.name}
          </button>
        ))}
      </div>

      {selected && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{selected.key}</h2>
              {canManage && (
                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(selected)}>
                  <Icon name="trash" className="h-3.5 w-3.5" /> Delete role
                </Button>
              )}
            </div>
            <TextField label="Name" value={name} onChange={setName} disabled={!canManage} />
            <TextAreaField
              label="Description"
              value={description}
              onChange={setDescription}
              rows={2}
            />
            {canManage && (
              <Button
                variant="secondary"
                className="w-fit"
                disabled={savingDetails}
                onClick={saveDetails}
              >
                {savingDetails ? 'Saving…' : 'Save details'}
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h2 className="font-semibold">Permissions</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {Object.entries(groups).map(([group, keys]) => (
                <div key={group} className="flex flex-col gap-2">
                  <span className="text-xs font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">
                    {group.replace('_', ' ')}
                  </span>
                  {keys.map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={permissions.has(key)}
                        disabled={!canManage}
                        onChange={() => toggle(key)}
                        className="h-4 w-4 rounded border-[var(--color-border)] accent-lime-500"
                      />
                      {key}
                    </label>
                  ))}
                </div>
              ))}
            </div>
            {canManage && (
              <Button
                variant="primary"
                className="w-fit"
                disabled={savingPermissions}
                onClick={savePermissions}
              >
                {savingPermissions ? 'Saving…' : 'Save permissions'}
              </Button>
            )}
          </div>
        </div>
      )}

      <CreateRoleModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete role"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" will be permanently removed. This fails if any admin user is still assigned to it.`
            : ''
        }
        onConfirm={handleDeleteRole}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
