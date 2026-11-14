import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Pencil, Plus, Trash2, Download } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button, Card, ConfirmButton, Field, Input, Modal, PageHeader, Pagination, SearchInput, Select, Table, Textarea, Toggle, type Column } from './ui';

export interface FieldDef {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'toggle' | 'email' | 'tel' | 'datetime-local';
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  hint?: string;
  span?: 1 | 2;
}

export interface CrudConfig {
  title: string;
  subtitle?: string;
  endpoint: string; // e.g. /tenant/guests
  queryKey: string;
  columns: Column<any>[];
  fields: FieldDef[];
  defaults?: Record<string, any>;
  canteenScoped?: boolean;
  searchPlaceholder?: string;
  extraFilters?: ReactNode;
  extraQuery?: Record<string, any>;
  rowActions?: (row: any) => ReactNode;
  headerActions?: ReactNode;
  csv?: boolean;
  canWrite?: boolean;
  embedded?: boolean; // render without page header
  addLabel?: string;
}

export function useCrudForm(cfg: CrudConfig) {
  const { canteenId } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const save = useMutation({
    mutationFn: (vals: any) => {
      const body: any = {};
      for (const f of cfg.fields) {
        let v = vals[f.name];
        if (f.type === 'number') v = v === '' || v === undefined || v === null ? null : Number(v);
        if (v === '') v = null;
        body[f.name] = v;
      }
      if (cfg.canteenScoped && !body.canteenId) body.canteenId = canteenId;
      return vals.id ? api.patch(`${cfg.endpoint}/${vals.id}`, body) : api.post(cfg.endpoint, body);
    },
    onSuccess: () => {
      toast.success('Saved');
      setEditing(null);
      qc.invalidateQueries({ queryKey: [cfg.queryKey] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  return { editing, setEditing, save };
}

export function CrudForm({ cfg, value, onChange }: { cfg: CrudConfig; value: any; onChange: (v: any) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cfg.fields.map((f) => {
        let v = value[f.name] ?? '';
        if (v && f.type === 'datetime-local') v = String(v).slice(0, 16);
        if (v && f.type === 'date') v = String(v).slice(0, 10);
        const set = (x: any) => onChange({ ...value, [f.name]: x });
        const span = f.span === 2 || f.type === 'textarea' ? 'sm:col-span-2' : '';
        if (f.type === 'toggle')
          return (
            <div key={f.name} className={`rounded-xl border border-slate-200 px-4 py-3 ${span}`}>
              <Toggle checked={!!value[f.name]} onChange={set} label={f.label} description={f.hint} />
            </div>
          );
        return (
          <Field key={f.name} label={f.label + (f.required ? ' *' : '')} hint={f.hint} className={span}>
            {f.type === 'select' ? (
              <Select value={v} onChange={(e) => set(e.target.value)} required={f.required}>
                <option value="">— Select —</option>
                {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            ) : f.type === 'textarea' ? (
              <Textarea value={v} onChange={(e) => set(e.target.value)} placeholder={f.placeholder} required={f.required} />
            ) : (
              <Input type={f.type ?? 'text'} value={v} onChange={(e) => set(e.target.value)} placeholder={f.placeholder} required={f.required} step={f.type === 'number' ? 'any' : undefined} />
            )}
          </Field>
        );
      })}
    </div>
  );
}

export default function CrudPage({ cfg }: { cfg: CrudConfig }) {
  const { canteenId } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { editing, setEditing, save } = useCrudForm(cfg);
  const query = { q, page, pageSize: 25, ...(cfg.canteenScoped ? { canteenId } : {}), ...(cfg.extraQuery ?? {}) };
  const { data } = useQuery({ queryKey: [cfg.queryKey, query], queryFn: () => api.get(cfg.endpoint, query) });
  const canWrite = cfg.canWrite !== false;
  const remove = async (id: string) => {
    try {
      await api.del(`${cfg.endpoint}/${id}`);
      toast.success('Deleted');
      qc.invalidateQueries({ queryKey: [cfg.queryKey] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const columns: Column<any>[] = [
    ...cfg.columns,
    ...(canWrite || cfg.rowActions
      ? [
          {
            key: '_a',
            header: '',
            align: 'right' as const,
            render: (r: any) => (
              <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                {cfg.rowActions?.(r)}
                {canWrite && (
                  <>
                    <Button variant="ghost" size="sm" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(r)} />
                    <ConfirmButton variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4 text-red-500" />} message="Delete this record?" onConfirm={() => remove(r.id)} />
                  </>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  const actions = (
    <>
      {cfg.headerActions}
      {cfg.csv && (
        <Button variant="outline" icon={<Download className="h-4 w-4" />} onClick={() => api.download(cfg.endpoint, query, `${cfg.queryKey}.csv`)}>
          Export
        </Button>
      )}
      {canWrite && (
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing({ ...(cfg.defaults ?? {}) })}>
          {cfg.addLabel ?? 'Add'}
        </Button>
      )}
    </>
  );

  return (
    <>
      {!cfg.embedded && <PageHeader title={cfg.title} subtitle={cfg.subtitle} actions={actions} />}
      <Card padded={false} title={cfg.embedded ? cfg.title : undefined} actions={cfg.embedded ? actions : undefined}>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <SearchInput className="min-w-[220px] flex-1" value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder={cfg.searchPlaceholder} />
          {cfg.extraFilters}
        </div>
        <Table rows={data?.items ?? []} columns={columns} />
        {data && data.total > 25 && <Pagination page={page} pageSize={25} total={data.total} onChange={setPage} />}
      </Card>
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? `Edit` : cfg.addLabel ?? 'Add'}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button loading={save.isPending} onClick={() => save.mutate(editing)}>Save</Button>
          </>
        }
      >
        {editing && <CrudForm cfg={cfg} value={editing} onChange={setEditing} />}
      </Modal>
    </>
  );
}
