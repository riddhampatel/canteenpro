import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import Papa from "papaparse";
import toast from "react-hot-toast";
import {
  Download,
  Fingerprint,
  Plus,
  Upload,
  Wallet,
  AlertTriangle,
  KeyRound,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { FOOD_TYPES, inr, PAY_MODES, titleCase } from "@/lib/format";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Table,
  statusTone,
} from "@/components/ui";

export const emptyEmp = {
  employeeCode: "",
  name: "",
  phone: "",
  email: "",
  departmentId: "",
  designation: "",
  dietaryPref: "VEG",
  defaultPayMode: "WALLET",
  monthlyAllowance: 0,
  biometricId: "",
  rfidCard: "",
  status: "ACTIVE",
  pin: "",
};

export function EmployeeForm({
  value,
  onChange,
  departments,
}: {
  value: any;
  onChange: (v: any) => void;
  departments: any[];
}) {
  const set = (k: string, v: any) => onChange({ ...value, [k]: v });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Employee code *">
        <Input
          value={value.employeeCode}
          onChange={(e) => set("employeeCode", e.target.value)}
          placeholder="EMP001"
        />
      </Field>
      <Field label="Full name *">
        <Input
          value={value.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </Field>
      <Field label="Mobile number" hint="Used to log in to the employee app">
        <Input
          value={value.phone ?? ""}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="98765 43210"
        />
      </Field>
      <Field label="Email">
        <Input
          type="email"
          value={value.email ?? ""}
          onChange={(e) => set("email", e.target.value)}
        />
      </Field>
      <Field label="Department">
        <Select
          value={value.departmentId ?? ""}
          onChange={(e) => set("departmentId", e.target.value)}
        >
          <option value="">—</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Designation">
        <Input
          value={value.designation ?? ""}
          onChange={(e) => set("designation", e.target.value)}
        />
      </Field>
      <Field label="Default payment" hint="How this employee's share is paid">
        <Select
          value={value.defaultPayMode}
          onChange={(e) => set("defaultPayMode", e.target.value)}
        >
          {PAY_MODES.map((m) => (
            <option key={m} value={m}>
              {titleCase(m)}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Monthly wallet allowance (₹)"
        hint="Auto-credited on the 1st of every month"
      >
        <Input
          type="number"
          value={value.monthlyAllowance ?? 0}
          onChange={(e) => set("monthlyAllowance", e.target.value)}
        />
      </Field>
      <Field label="Dietary preference">
        <Select
          value={value.dietaryPref}
          onChange={(e) => set("dietaryPref", e.target.value)}
        >
          {FOOD_TYPES.map((t) => (
            <option key={t} value={t}>
              {titleCase(t)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Status">
        <Select
          value={value.status}
          onChange={(e) => set("status", e.target.value)}
        >
          {["ACTIVE", "INACTIVE", "SUSPENDED"].map((t) => (
            <option key={t} value={t}>
              {titleCase(t)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Biometric ID" hint="ID enrolled on the fingerprint device">
        <Input
          value={value.biometricId ?? ""}
          onChange={(e) => set("biometricId", e.target.value)}
        />
      </Field>
      <Field label="RFID / ID card no.">
        <Input
          value={value.rfidCard ?? ""}
          onChange={(e) => set("rfidCard", e.target.value)}
        />
      </Field>
      {!value.id && (
        <Field label="App PIN (4 digits)" hint="Leave empty to auto-generate">
          <Input
            maxLength={4}
            value={value.pin ?? ""}
            onChange={(e) => set("pin", e.target.value.replace(/\D/g, ""))}
          />
        </Field>
      )}
    </div>
  );
}

export const empBody = (v: any, canteenId: string) => ({
  canteenId: v.canteenId ?? canteenId,
  employeeCode: v.employeeCode,
  name: v.name,
  phone: v.phone || null,
  email: v.email || "",
  departmentId: v.departmentId || null,
  designation: v.designation || null,
  dietaryPref: v.dietaryPref,
  defaultPayMode: v.defaultPayMode,
  monthlyAllowance: Number(v.monthlyAllowance || 0),
  biometricId: v.biometricId || null,
  biometricSynced: v.biometricId ? (v.biometricSynced ?? true) : false,
  rfidCard: v.rfidCard || null,
  status: v.status,
  ...(v.pin && !v.id ? { pin: v.pin } : {}),
});

export default function Employees() {
  const { canteenId } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [bio, setBio] = useState(sp.get("biometric") ?? "");
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<any>(null);
  const [created, setCreated] = useState<any>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkAmt, setBulkAmt] = useState("");

  const query = {
    canteenId,
    q,
    departmentId: dept,
    status,
    biometric: bio,
    page,
    pageSize: 25,
  };
  const { data } = useQuery({
    queryKey: ["employees", query],
    queryFn: () => api.get("/tenant/employees", query),
  });
  const { data: depts } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.get("/tenant/departments", { pageSize: 200 }),
  });

  const save = useMutation({
    mutationFn: (v: any) =>
      v.id
        ? api.patch(`/tenant/employees/${v.id}`, empBody(v, canteenId))
        : api.post("/tenant/employees", empBody(v, canteenId)),
    onSuccess: (r: any) => {
      setEdit(null);
      qc.invalidateQueries({ queryKey: ["employees"] });
      if (r.initialPin) setCreated(r);
      else toast.success("Employee saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const bulk = useMutation({
    mutationFn: () =>
      api.post("/tenant/employees/wallet/bulk-credit", {
        employeeIds: selected,
        amount: Number(bulkAmt),
        note: "Bulk recharge",
      }),
    onSuccess: (r: any) => {
      toast.success(`Credited ${r.credited} wallets`);
      setSelected([]);
      setBulkAmt("");
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const rows = data?.items ?? [];
  const allSel =
    rows.length > 0 && rows.every((r: any) => selected.includes(r.id));

  return (
    <>
      <PageHeader
        title="Employees"
        subtitle="People who eat at your canteen. They log in to the employee app with their mobile number and PIN."
        actions={
          <>
            <Button
              variant="outline"
              icon={<Download className="h-4 w-4" />}
              onClick={() =>
                api.download(
                  "/tenant/employees",
                  { canteenId, status },
                  "employees.csv",
                )
              }
            >
              Export
            </Button>
            <Button
              variant="outline"
              icon={<Upload className="h-4 w-4" />}
              onClick={() => setImportOpen(true)}
            >
              Import
            </Button>
            <Button
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setEdit({ ...emptyEmp })}
            >
              Add employee
            </Button>
          </>
        }
      />
      <Card padded={false}>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <SearchInput
            className="min-w-[240px] flex-1"
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Search by name, ID, phone or department…"
          />
          <Select
            className="w-44"
            value={dept}
            onChange={(e) => {
              setDept(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All departments</option>
            {depts?.items?.map((d: any) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <Select
            className="w-36"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Any status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </Select>
          <Select
            className="w-44"
            value={bio}
            onChange={(e) => {
              setBio(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Biometric: all</option>
            <option value="pending">Biometric pending</option>
          </Select>
        </div>
        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b border-brand-100 bg-brand-50 px-4 py-3 text-sm">
            <span className="font-semibold text-brand-800">
              {selected.length} selected
            </span>
            <Input
              className="h-9 w-36"
              type="number"
              placeholder="Amount ₹"
              value={bulkAmt}
              onChange={(e) => setBulkAmt(e.target.value)}
            />
            <Button
              size="sm"
              icon={<Wallet className="h-4 w-4" />}
              disabled={!Number(bulkAmt)}
              loading={bulk.isPending}
              onClick={() => bulk.mutate()}
            >
              Credit wallets
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
              Clear
            </Button>
          </div>
        )}
        <Table
          rows={rows}
          onRowClick={(r: any) => nav(`/employees/${r.id}`)}
          columns={[
            {
              key: "sel",
              header: (
                <input
                  type="checkbox"
                  className="accent-brand-700"
                  checked={allSel}
                  onChange={() =>
                    setSelected(allSel ? [] : rows.map((r: any) => r.id))
                  }
                />
              ),
              render: (r: any) => (
                <input
                  type="checkbox"
                  className="accent-brand-700"
                  checked={selected.includes(r.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() =>
                    setSelected((s) =>
                      s.includes(r.id)
                        ? s.filter((x) => x !== r.id)
                        : [...s, r.id],
                    )
                  }
                />
              ),
            },
            {
              key: "name",
              header: "Employee",
              render: (r: any) => (
                <div className="flex items-center gap-3">
                  <Avatar name={r.name} src={r.photoUrl} />
                  <div>
                    <div className="font-semibold text-ink">{r.name}</div>
                    <div className="text-xs text-slate-500">
                      {r.designation ?? ""}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: "employeeCode",
              header: "Employee ID",
              render: (r: any) => (
                <span className="font-mono text-xs">{r.employeeCode}</span>
              ),
            },
            {
              key: "dept",
              header: "Department & contact",
              render: (r: any) => (
                <div>
                  <div>{r.department ?? "—"}</div>
                  <div className="text-xs text-slate-500">
                    {r.phone ?? "No phone"}
                  </div>
                </div>
              ),
            },
            {
              key: "pay",
              header: "Pays by",
              render: (r: any) => (
                <span className="text-xs font-semibold text-slate-600">
                  {titleCase(r.defaultPayMode)}
                </span>
              ),
            },
            {
              key: "wallet",
              header: "Wallet",
              align: "right",
              render: (r: any) => (
                <span
                  className={
                    r.walletBalance < 100 && r.defaultPayMode === "WALLET"
                      ? "font-bold text-red-600"
                      : "font-semibold"
                  }
                >
                  {inr(r.walletBalance)}
                </span>
              ),
            },
            {
              key: "bio",
              header: "Biometric",
              render: (r: any) =>
                r.biometricSynced ? (
                  <Badge tone="green">
                    <Fingerprint className="h-3 w-3" />
                    Synced
                  </Badge>
                ) : (
                  <Badge tone="red">
                    <AlertTriangle className="h-3 w-3" />
                    Pending
                  </Badge>
                ),
            },
            {
              key: "app",
              header: "App",
              render: (r: any) =>
                r.hasPin && r.phone ? (
                  <Badge tone="brand">
                    <KeyRound className="h-3 w-3" />
                    Ready
                  </Badge>
                ) : (
                  <Badge>No login</Badge>
                ),
            },
            {
              key: "status",
              header: "Status",
              render: (r: any) => (
                <Badge tone={statusTone(r.status)}>{titleCase(r.status)}</Badge>
              ),
            },
          ]}
        />
        {data && (
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
        size="lg"
        title={edit?.id ? "Edit employee" : "Add employee"}
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
          <EmployeeForm
            value={edit}
            onChange={setEdit}
            departments={depts?.items ?? []}
          />
        )}
      </Modal>

      <Modal
        open={!!created}
        onClose={() => setCreated(null)}
        size="sm"
        title="Employee added 🎉"
      >
        {created && (
          <div className="text-center">
            <p className="text-sm text-slate-600">
              Share these app login details with {created.name}:
            </p>
            <div className="my-4 rounded-2xl bg-brand-50 p-5">
              <div className="text-xs text-slate-500">Mobile</div>
              <div className="text-lg font-bold">
                {created.phone ?? "— add a phone number to enable app login"}
              </div>
              <div className="mt-3 text-xs text-slate-500">PIN</div>
              <div className="font-mono text-3xl font-extrabold tracking-[0.3em] text-brand-800">
                {created.initialPin}
              </div>
            </div>
            <p className="text-xs text-slate-500">
              The app asks them to set their own PIN on first login.
            </p>
          </div>
        )}
      </Modal>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
}

function ImportModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { canteenId } = useAuth();
  const qc = useQueryClient();
  const [rows, setRows] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const imp = useMutation({
    mutationFn: () => api.post("/tenant/employees/import", { canteenId, rows }),
    onSuccess: (r: any) => {
      setResult(r);
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const template = () => {
    const csv =
      "employeeCode,name,phone,email,department,designation,monthlyAllowance,defaultPayMode,dietaryPref\nEMP101,Asha Verma,9876500001,asha@company.com,Finance,Analyst,1000,WALLET,VEG\n";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "employees-template.csv";
    a.click();
  };
  const downloadPins = () => {
    const csv = Papa.unparse(result.pins);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "employee-app-pins.csv";
    a.click();
  };
  const close = () => {
    setRows([]);
    setResult(null);
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="Import employees"
      footer={
        !result && (
          <Button
            disabled={!rows.length}
            loading={imp.isPending}
            onClick={() => imp.mutate()}
          >
            Import {rows.length || ""} employees
          </Button>
        )
      }
    >
      {result ? (
        <div className="text-center">
          <div className="text-2xl font-extrabold">Import complete</div>
          <p className="mt-2 text-slate-600">
            {result.created} created · {result.updated} updated
          </p>
          {result.pins.length > 0 && (
            <Button
              className="mt-5"
              icon={<Download className="h-4 w-4" />}
              onClick={downloadPins}
            >
              Download app PINs for new employees
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Upload a CSV exported from Excel / your HRMS. Existing employees
            (same code) are updated; new ones get an app PIN. Departments are
            created automatically.
          </p>
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="h-4 w-4" />}
            onClick={template}
          >
            Download template
          </Button>
          <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-brand-400">
            <Upload className="mx-auto mb-2 h-8 w-8 text-slate-400" />
            <div className="font-semibold">Choose CSV file</div>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                Papa.parse(f, {
                  header: true,
                  skipEmptyLines: true,
                  complete: (r) => {
                    const clean = (r.data as any[])
                      .filter((x) => x.employeeCode && x.name)
                      .map((x) => ({
                        ...x,
                        monthlyAllowance: x.monthlyAllowance
                          ? Number(x.monthlyAllowance)
                          : undefined,
                        defaultPayMode: x.defaultPayMode || undefined,
                        dietaryPref: x.dietaryPref || undefined,
                      }));
                    setRows(clean);
                    toast.success(`${clean.length} rows ready`);
                  },
                });
              }}
            />
          </label>
          {rows.length > 0 && (
            <div className="max-h-60 overflow-auto rounded-xl border border-slate-100">
              <Table
                dense
                rows={rows.slice(0, 50)}
                columns={[
                  { key: "employeeCode", header: "Code" },
                  { key: "name", header: "Name" },
                  { key: "phone", header: "Phone" },
                  { key: "department", header: "Department" },
                ]}
              />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
