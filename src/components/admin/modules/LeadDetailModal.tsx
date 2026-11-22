import { useEffect, useState } from 'react';
import { api, AdminApiError } from '../../../lib/admin/api-client';
import { toast } from '../../../lib/admin/toast';
import { toDateTimeLocalValue } from '../../../lib/admin/datetime';
import { LEAD_STATUSES, type LeadStatus } from './leadTypes';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import StatusBadge from '../ui/StatusBadge';
import Spinner from '../ui/Spinner';
import { SelectField, TextAreaField, DateField } from '../ui/fields';

interface LeadNote {
  id: string;
  note: string;
  createdAt: string;
  authorName: string | null;
}

interface LeadDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  country: string | null;
  budget: string | null;
  message: string | null;
  source: string;
  serviceInterest: string[];
  status: LeadStatus;
  assignedTo: string | null;
  followUpDate: string | null;
  createdAt: string;
  notes: LeadNote[];
}

interface AssignableUser {
  id: string;
  name: string;
}

const STATUS_TONE: Record<LeadStatus, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
  new: 'info',
  contacted: 'neutral',
  qualified: 'warning',
  proposal_sent: 'warning',
  won: 'success',
  lost: 'danger',
};

export default function LeadDetailModal({
  leadId,
  onClose,
  onChanged,
  canWrite,
  canAssign,
  canDelete,
}: {
  leadId: string | null;
  onClose: () => void;
  onChanged: () => void;
  canWrite: boolean;
  canAssign: boolean;
  canDelete: boolean;
}) {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    if (!leadId) return;
    setLoading(true);
    Promise.all([
      api.get<LeadDetail>(`/api/leads/${leadId}`),
      api.get<AssignableUser[]>('/api/admin-users/assignable').catch(() => []),
    ])
      .then(([leadData, userList]) => {
        setLead(leadData);
        setUsers(userList);
      })
      .catch(() => toast.error('Failed to load lead.'))
      .finally(() => setLoading(false));
  }, [leadId]);

  async function updateField(patch: Record<string, unknown>) {
    if (!lead) return;
    setSaving(true);
    try {
      const updated = await api.patch<LeadDetail>(`/api/leads/${lead.id}`, patch);
      setLead((prev) => (prev ? { ...prev, ...updated } : prev));
      toast.success('Lead updated.');
      onChanged();
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : 'Update failed.');
    } finally {
      setSaving(false);
    }
  }

  async function addNote() {
    if (!lead || !newNote.trim()) return;
    setAddingNote(true);
    try {
      const note = await api.post<LeadNote>(`/api/leads/${lead.id}/notes`, {
        note: newNote.trim(),
      });
      setLead((prev) => (prev ? { ...prev, notes: [...prev.notes, note] } : prev));
      setNewNote('');
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : 'Failed to add note.');
    } finally {
      setAddingNote(false);
    }
  }

  async function handleDelete() {
    if (!lead) return;
    if (!window.confirm(`Delete the lead from "${lead.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/leads/${lead.id}`);
      toast.success('Lead deleted.');
      onChanged();
      onClose();
    } catch (err) {
      toast.error(err instanceof AdminApiError ? err.message : 'Delete failed.');
    }
  }

  return (
    <Modal open={Boolean(leadId)} onClose={onClose} title={lead ? lead.name : 'Lead'} size="lg">
      {loading || !lead ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--color-text-muted)]">Email</span>
              <a
                href={`mailto:${lead.email}`}
                className="font-medium text-[var(--color-text)] hover:underline"
              >
                {lead.email}
              </a>
            </div>
            {lead.phone && (
              <div className="flex flex-col gap-1 text-sm">
                <span className="text-[var(--color-text-muted)]">Phone</span>
                <span className="font-medium">{lead.phone}</span>
              </div>
            )}
            {lead.company && (
              <div className="flex flex-col gap-1 text-sm">
                <span className="text-[var(--color-text-muted)]">Company</span>
                <span className="font-medium">{lead.company}</span>
              </div>
            )}
            {lead.country && (
              <div className="flex flex-col gap-1 text-sm">
                <span className="text-[var(--color-text-muted)]">Country</span>
                <span className="font-medium">{lead.country}</span>
              </div>
            )}
            {lead.budget && (
              <div className="flex flex-col gap-1 text-sm">
                <span className="text-[var(--color-text-muted)]">Budget</span>
                <span className="font-medium">{lead.budget}</span>
              </div>
            )}
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--color-text-muted)]">Source</span>
              <span className="font-medium">{lead.source}</span>
            </div>
            {lead.serviceInterest.length > 0 && (
              <div className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span className="text-[var(--color-text-muted)]">Service interest</span>
                <div className="flex flex-wrap gap-1.5">
                  {lead.serviceInterest.map((s) => (
                    <StatusBadge key={s} tone="neutral" label={s} />
                  ))}
                </div>
              </div>
            )}
            {lead.message && (
              <div className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span className="text-[var(--color-text-muted)]">Message</span>
                <p className="rounded-lg bg-[var(--color-surface-muted)] p-3">{lead.message}</p>
              </div>
            )}
          </div>

          <div className="grid gap-4 border-t border-[var(--color-border)] pt-4 sm:grid-cols-3">
            <SelectField
              label="Status"
              value={lead.status}
              onChange={(v) => updateField({ status: v })}
              options={LEAD_STATUSES.map((s) => ({ value: s, label: s.replace('_', ' ') }))}
              disabled={!canWrite || saving}
            />
            <SelectField
              label="Assigned to"
              value={lead.assignedTo ?? ''}
              onChange={(v) => updateField({ assignedTo: v || null })}
              options={users.map((u) => ({ value: u.id, label: u.name }))}
              placeholder="Unassigned"
              disabled={!canAssign || saving}
            />
            <DateField
              label="Follow-up"
              value={toDateTimeLocalValue(lead.followUpDate)}
              onChange={(v) => updateField({ followUpDate: v || null })}
            />
          </div>
          <div className="-mt-2">
            <StatusBadge tone={STATUS_TONE[lead.status]} label={lead.status.replace('_', ' ')} />
          </div>

          <div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-4">
            <h3 className="font-semibold">Notes</h3>
            <div className="flex flex-col gap-3">
              {lead.notes.length === 0 && (
                <p className="text-sm text-[var(--color-text-muted)]">No notes yet.</p>
              )}
              {lead.notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-lg bg-[var(--color-surface-muted)] p-3 text-sm"
                >
                  <p>{note.note}</p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {note.authorName ?? 'Unknown'} · {new Date(note.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            {canWrite && (
              <div className="flex flex-col gap-2">
                <TextAreaField label="Add a note" value={newNote} onChange={setNewNote} rows={3} />
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-fit"
                  disabled={addingNote || !newNote.trim()}
                  onClick={addNote}
                >
                  {addingNote ? 'Adding…' : 'Add note'}
                </Button>
              </div>
            )}
          </div>

          {canDelete && (
            <div className="flex justify-end border-t border-[var(--color-border)] pt-4">
              <Button variant="danger" size="sm" onClick={handleDelete}>
                Delete lead
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
