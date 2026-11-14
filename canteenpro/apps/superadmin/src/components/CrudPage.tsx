import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import {
  Button,
  Card,
  ConfirmButton,
  Field,
  Input,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Table,
  Textarea,
  Toggle,
  type Column,
} from "./ui";

export interface FieldDef {
  name: string;
  label: string;
  type?:
    | "text"
    | "number"
    | "date"
    | "select"
    | "textarea"
    | "toggle"
    | "email"
    | "tags"
    | "lines"
    | "features"
    | "markdown"
    | "password";
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
  span?: 2;
  placeholder?: string;
}
export interface CrudConfig {
  title: string;
  subtitle?: string;
  endpoint: string;
  queryKey: string;
  columns: Column<any>[];
  fields: FieldDef[];
  defaults?: Record<string, any>;
  filters?: ReactNode;
  query?: Record<string, any>;
  addLabel?: string;
  modalSize?: "md" | "lg" | "xl";
  rowActions?: (r: any) => ReactNode;
  noDelete?: boolean;
  listKey?: string; // when the API returns an array instead of {items}
}

export const FEATURE_FLAGS = [
  ["inventory", "Inventory, suppliers & expenses"],
  ["workforce", "Kitchen staff attendance & wages"],
  ["biometric", "Biometric / device integration"],
  ["payroll", "Payroll deduction"],
  ["multiCanteen", "Multiple canteens"],
  ["api", "Integration API"],
] as const;

export function FormFields({
  fields,
  value,
  onChange,
}: {
  fields: FieldDef[];
  value: any;
  onChange: (v: any) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        const set = (x: any) => onChange({ ...value, [f.name]: x });
        const span =
          f.span === 2 ||
          ["textarea", "markdown", "lines", "features"].includes(f.type ?? "")
            ? "sm:col-span-2"
            : "";
        let v = value[f.name] ?? "";
        if (f.type === "tags" && Array.isArray(v)) v = v.join(", ");
        if (f.type === "lines" && Array.isArray(v)) v = v.join("\n");
        if (f.type === "date" && v) v = String(v).slice(0, 10);
        if (f.type === "toggle")
          return (
            <div
              key={f.name}
              className={`rounded-xl border border-slate-200 px-4 py-3 ${span}`}
            >
              <Toggle
                checked={!!value[f.name]}
                onChange={set}
                label={f.label}
                description={f.hint}
              />
            </div>
          );
        if (f.type === "features")
          return (
            <div key={f.name} className={span}>
              <div className="mb-2 text-xs font-semibold text-slate-600">
                {f.label}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {FEATURE_FLAGS.map(([k, l]) => (
                  <label
                    key={k}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="accent-brand-700"
                      checked={value[f.name]?.[k] !== false}
                      onChange={(e) =>
                        set({ ...(value[f.name] ?? {}), [k]: e.target.checked })
                      }
                    />{" "}
                    {l}
                  </label>
                ))}
              </div>
            </div>
          );
        return (
          <Field
            key={f.name}
            label={f.label + (f.required ? " *" : "")}
            hint={f.hint}
            className={span}
          >
            {f.type === "select" ? (
              <Select value={v} onChange={(e) => set(e.target.value)}>
                <option value="">—</option>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            ) : f.type === "textarea" || f.type === "lines" ? (
              <Textarea
                value={v}
                onChange={(e) => set(e.target.value)}
                placeholder={f.placeholder}
              />
            ) : f.type === "markdown" ? (
              <Textarea
                className="min-h-[320px] font-mono text-xs"
                value={v}
                onChange={(e) => set(e.target.value)}
                placeholder={f.placeholder}
              />
            ) : (
              <Input
                type={f.type === "tags" ? "text" : (f.type ?? "text")}
                value={v}
                onChange={(e) => set(e.target.value)}
                placeholder={f.placeholder}
                step="any"
              />
            )}
          </Field>
        );
      })}
    </div>
  );
}

export function toBody(fields: FieldDef[], vals: any) {
  const body: any = {};
  for (const f of fields) {
    let v = vals[f.name];
    if (f.type === "number") v = v === "" || v == null ? null : Number(v);
    else if (f.type === "tags")
      v = Array.isArray(v)
        ? v
        : String(v ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    else if (f.type === "lines")
      v = Array.isArray(v)
        ? v
        : String(v ?? "")
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
    else if (f.type === "toggle") v = !!v;
    else if (f.type === "features") v = v ?? {};
    else if (v === "") v = null;
    if (v === undefined) continue;
    body[f.name] = v;
  }
  return body;
}

export default function CrudPage({ cfg }: { cfg: CrudConfig }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<any>(null);
  const query = { q, page, pageSize: 25, ...(cfg.query ?? {}) };
  const { data } = useQuery({
    queryKey: [cfg.queryKey, query],
    queryFn: () => api.get(cfg.endpoint, query),
  });
  const rows = Array.isArray(data) ? data : (data?.items ?? []);
  const save = useMutation({
    mutationFn: (v: any) =>
      v.id
        ? api.patch(`${cfg.endpoint}/${v.id}`, toBody(cfg.fields, v))
        : api.post(cfg.endpoint, toBody(cfg.fields, v)),
    onSuccess: () => {
      toast.success("Saved");
      setEdit(null);
      qc.invalidateQueries({ queryKey: [cfg.queryKey] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const columns: Column<any>[] = [
    ...cfg.columns,
    {
      key: "_a",
      header: "",
      align: "right",
      render: (r: any) => (
        <div
          className="flex justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {cfg.rowActions?.(r)}
          <Button
            variant="ghost"
            size="sm"
            icon={<Pencil className="h-4 w-4" />}
            onClick={() => setEdit(r)}
          />
          {!cfg.noDelete && (
            <ConfirmButton
              variant="ghost"
              size="sm"
              icon={<Trash2 className="h-4 w-4 text-red-500" />}
              message="Delete permanently?"
              onConfirm={async () => {
                await api
                  .del(`${cfg.endpoint}/${r.id}`)
                  .catch((e) => toast.error(e.message));
                qc.invalidateQueries({ queryKey: [cfg.queryKey] });
              }}
            />
          )}
        </div>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title={cfg.title}
        subtitle={cfg.subtitle}
        actions={
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setEdit({ ...(cfg.defaults ?? {}) })}
          >
            {cfg.addLabel ?? "Add"}
          </Button>
        }
      />
      <Card padded={false}>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <SearchInput
            className="min-w-[220px] flex-1"
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
          />
          {cfg.filters}
        </div>
        <Table rows={rows} columns={columns} onRowClick={(r) => setEdit(r)} />
        {data?.total > 25 && (
          <Pagination
            page={page}
            pageSize={25}
            total={data.total}
            onChange={setPage}
          />
        )}
      </Card>
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        size={cfg.modalSize ?? "lg"}
        title={edit?.id ? "Edit" : (cfg.addLabel ?? "Add")}
        footer={
          <>
            <Button variant="outline" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button loading={save.isPending} onClick={() => save.mutate(edit)}>
              Save
            </Button>
          </>
        }
      >
        {edit && (
          <FormFields fields={cfg.fields} value={edit} onChange={setEdit} />
        )}
      </Modal>
    </>
  );
}
