import { useEffect, useState } from 'react';
import { api, AdminApiError } from '../../../lib/admin/api-client';
import { toast } from '../../../lib/admin/toast';
import { useResourceList } from '../../../lib/admin/useResourceList';
import { BUDGET_BANDS } from '../../../lib/leads-constants';
import { LEAD_STATUSES } from './leadTypes';
import LeadDetailModal from './LeadDetailModal';
import Table, { type Column } from '../ui/Table';
import Pagination from '../ui/Pagination';
import SearchInput from '../ui/SearchInput';
import FilterSelect from '../ui/FilterSelect';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import Modal from '../ui/Modal';
import StatusBadge from '../ui/StatusBadge';
import EmptyState from '../ui/EmptyState';
import { TextField, SelectField, TextAreaField } from '../ui/fields';

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  country: string | null;
  budget: string | null;
  status: (typeof LEAD_STATUSES)[number];
  assignedTo: string | null;
  followUpDate: string | null;
  serviceInterest: string[];
  createdAt: string;
}

interface Service {
  id: string;
  slug: string;
  title: string;
}

interface AssignableUser {
  id: string;
  name: string;
}

const STATUS_TONE: Record<Lead['status'], 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
  new: 'info',
  contacted: 'neutral',
  qualified: 'warning',
  proposal_sent: 'warning',
  won: 'success',
  lost: 'danger',
};

function CreateLeadModal({
  open,
  onClose,
  onCreated,
  services,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  services: Service[];
}) {
  const [values, setValues] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    country: '',
    budget: '',
    source: 'manual',
    serviceInterest: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/api/leads', {
        ...values,
        phone: values.phone || undefined,
        company: values.company || undefined,
        country: values.country || undefined,
        budget: values.budget || undefined,
        message: values.message || undefined,
        serviceInterest: values.serviceInterest ? [values.serviceInterest] : undefined,
      });
      toast.success('Lead added.');
      setValues({
        name: '',
        email: '',
        phone: '',
        company: '',
        country: '',
        budget: '',
        source: 'manual',
        serviceInterest: '',
        message: '',
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Failed to add lead.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Log a new lead">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Name"
            value={values.name}
            onChange={(v) => setValues((p) => ({ ...p, name: v }))}
            required
          />
          <TextField
            label="Email"
            type="email"
            value={values.email}
            onChange={(v) => setValues((p) => ({ ...p, email: v }))}
            required
          />
          <TextField
            label="Phone"
            value={values.phone}
            onChange={(v) => setValues((p) => ({ ...p, phone: v }))}
          />
          <TextField
            label="Company"
            value={values.company}
            onChange={(v) => setValues((p) => ({ ...p, company: v }))}
          />
          <TextField
            label="Country"
            value={values.country}
            onChange={(v) => setValues((p) => ({ ...p, country: v }))}
          />
          <SelectField
            label="Budget"
            value={values.budget}
            onChange={(v) => setValues((p) => ({ ...p, budget: v }))}
            options={BUDGET_BANDS.map((b) => ({ value: b, label: b }))}
          />
          <SelectField
            label="Service interest"
            value={values.serviceInterest}
            onChange={(v) => setValues((p) => ({ ...p, serviceInterest: v }))}
            options={services.map((s) => ({ value: s.slug, label: s.title }))}
          />
          <TextField
            label="Source"
            value={values.source}
            onChange={(v) => setValues((p) => ({ ...p, source: v }))}
          />
        </div>
        <TextAreaField
          label="Message"
          value={values.message}
          onChange={(v) => setValues((p) => ({ ...p, message: v }))}
        />
        {error && <p className="text-danger text-sm">{error}</p>}
        <div className="flex justify-end gap-3 border-t border-[var(--color-border)] pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Add lead'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function LeadsManager({
  canWrite,
  canAssign,
  canDelete,
  canExport,
}: {
  canWrite: boolean;
  canAssign: boolean;
  canDelete: boolean;
  canExport: boolean;
}) {
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const list = useResourceList<Lead>({
    endpoint: '/api/leads',
    defaultSortBy: 'createdAt',
    filters: filterValues,
  });
  const [services, setServices] = useState<Service[]>([]);
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    api
      .list<Service>('/api/services', { page: 1, pageSize: 100 })
      .then((res) => setServices(res.data))
      .catch(() => setServices([]));
    api
      .get<AssignableUser[]>('/api/admin-users/assignable')
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  function exportCsv() {
    const params = new URLSearchParams();
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    if (list.search) params.set('search', list.search);
    window.location.href = `/api/leads/export?${params.toString()}`;
  }

  const columns: Column<Lead>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'company', label: 'Company' },
    { key: 'country', label: 'Country' },
    { key: 'budget', label: 'Budget' },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row) => (
        <StatusBadge tone={STATUS_TONE[row.status]} label={row.status.replace('_', ' ')} />
      ),
    },
    {
      key: 'assignedTo',
      label: 'Assigned to',
      render: (row) => users.find((u) => u.id === row.assignedTo)?.name ?? '—',
    },
    {
      key: 'createdAt',
      label: 'Received',
      sortable: true,
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Leads / CRM</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Every inquiry from the public contact form, plus anything logged manually.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canExport && (
            <Button variant="secondary" onClick={exportCsv}>
              <Icon name="download" className="h-4 w-4" /> Export CSV
            </Button>
          )}
          {canWrite && (
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <Icon name="plus" className="h-4 w-4" /> Log lead
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={list.search}
          onChange={list.setSearch}
          placeholder="Search name, email…"
        />
        <FilterSelect
          label="Status"
          value={filterValues.status ?? ''}
          options={LEAD_STATUSES.map((s) => ({ value: s, label: s.replace('_', ' ') }))}
          onChange={(v) => setFilterValues((p) => ({ ...p, status: v }))}
        />
        <FilterSelect
          label="Budget"
          value={filterValues.budget ?? ''}
          options={BUDGET_BANDS.map((b) => ({ value: b, label: b }))}
          onChange={(v) => setFilterValues((p) => ({ ...p, budget: v }))}
        />
        <FilterSelect
          label="Service"
          value={filterValues.serviceInterest ?? ''}
          options={services.map((s) => ({ value: s.slug, label: s.title }))}
          onChange={(v) => setFilterValues((p) => ({ ...p, serviceInterest: v }))}
        />
        <input
          type="text"
          placeholder="Country"
          value={filterValues.country ?? ''}
          onChange={(e) => setFilterValues((p) => ({ ...p, country: e.target.value }))}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
        />
      </div>

      {list.error && (
        <p className="bg-danger-muted text-danger rounded-lg px-4 py-2 text-sm">{list.error}</p>
      )}

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <Table
          columns={columns}
          rows={list.data}
          loading={list.loading}
          sortBy={list.sortBy}
          sortDir={list.sortDir}
          onSort={list.setSort}
          emptyState={
            <EmptyState
              icon="users"
              title="No leads yet"
              description="New inquiries will appear here."
            />
          }
          rowActions={(row) => (
            <Button variant="ghost" size="sm" onClick={() => setActiveLeadId(row.id)}>
              View
            </Button>
          )}
        />
        <Pagination pagination={list.pagination} onPageChange={list.setPage} />
      </div>

      <LeadDetailModal
        leadId={activeLeadId}
        onClose={() => setActiveLeadId(null)}
        onChanged={list.refetch}
        canWrite={canWrite}
        canAssign={canAssign}
        canDelete={canDelete}
      />

      <CreateLeadModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={list.refetch}
        services={services}
      />
    </div>
  );
}
