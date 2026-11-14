import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import clsx from "clsx";
import {
  Building,
  Store,
  ShieldCheck,
  Network,
  Cpu,
  History,
  UserCog,
  Plus,
  Copy,
  Smartphone,
  UtensilsCrossed,
  Upload,
  Trash2,
  ReceiptText,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dt, titleCase } from "@/lib/format";
import CrudPage from "@/components/CrudPage";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmButton,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Table,
  Toggle,
  statusTone,
} from "@/components/ui";

function CanteenSettings() {
  const { canteenId, can, refresh } = useAuth();
  const qc = useQueryClient();
  const { data: canteens } = useQuery({
    queryKey: ["canteens"],
    queryFn: () => api.get("/tenant/canteens"),
  });
  const c = canteens?.find((x: any) => x.id === canteenId);
  const [f, setF] = useState<any>(null);
  const [adding, setAdding] = useState<any>(null);
  useEffect(() => c && setF({ ...c }), [c]);
  const save = useMutation({
    mutationFn: (v: any) =>
      api.patch(`/tenant/canteens/${canteenId}`, {
        name: v.name,
        code: v.code,
        clientCompany: v.clientCompany || null,
        clientGstin: v.clientGstin || null,
        address: v.address || null,
        phone: v.phone || null,
        allowGuests: v.allowGuests,
        optInRequired: v.optInRequired,
        autoPublishMenus: v.autoPublishMenus,
        maintenanceMode: v.maintenanceMode,
        allowNegativeWallet: v.allowNegativeWallet,
        walletCreditLimit: Number(v.walletCreditLimit || 0),
        gstPercent: Number(v.gstPercent || 0),
        billPrefix: v.billPrefix,
      }),
    onSuccess: () => {
      toast.success("Canteen settings saved");
      qc.invalidateQueries({ queryKey: ["canteens"] });
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const add = useMutation({
    mutationFn: (v: any) => api.post("/tenant/canteens", v),
    onSuccess: () => {
      toast.success("Canteen added with default meal sessions");
      setAdding(null);
      qc.invalidateQueries({ queryKey: ["canteens"] });
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });
  if (!f) return null;
  const set = (k: string, v: any) => setF({ ...f, [k]: v });
  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <Card
        className="xl:col-span-3"
        title="Canteen details"
        actions={
          can("OWNER") && (
            <Button
              size="sm"
              variant="outline"
              icon={<Plus className="h-4 w-4" />}
              onClick={() =>
                setAdding({
                  name: "",
                  code: `C0${(canteens?.length ?? 0) + 1}`,
                  clientCompany: "",
                })
              }
            >
              Add canteen
            </Button>
          )
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Canteen name">
            <Input
              value={f.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>
          <Field label="Short code" hint="Printed on bill numbers">
            <Input
              value={f.code}
              onChange={(e) => set("code", e.target.value)}
            />
          </Field>
          <Field label="Client company" hint="Company whose employees eat here">
            <Input
              value={f.clientCompany ?? ""}
              onChange={(e) => set("clientCompany", e.target.value)}
            />
          </Field>
          <Field label="Client GSTIN">
            <Input
              value={f.clientGstin ?? ""}
              onChange={(e) => set("clientGstin", e.target.value)}
            />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Input
              value={f.address ?? ""}
              onChange={(e) => set("address", e.target.value)}
            />
          </Field>
          <Field label="Counter phone">
            <Input
              value={f.phone ?? ""}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>
          <Field label="GST % (included in prices)">
            <Input
              type="number"
              value={f.gstPercent}
              onChange={(e) => set("gstPercent", e.target.value)}
            />
          </Field>
          <Field label="Bill number prefix">
            <Input
              value={f.billPrefix}
              onChange={(e) => set("billPrefix", e.target.value.toUpperCase())}
            />
          </Field>
          <Field
            label="Wallet credit limit (₹)"
            hint="How far below zero a wallet may go"
          >
            <Input
              type="number"
              value={f.walletCreditLimit}
              disabled={!f.allowNegativeWallet}
              onChange={(e) => set("walletCreditLimit", e.target.value)}
            />
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <Button loading={save.isPending} onClick={() => save.mutate(f)}>
            Save changes
          </Button>
        </div>
      </Card>
      <Card className="xl:col-span-2 h-fit" title="General preferences">
        <div className="space-y-5">
          <Toggle
            checked={f.autoPublishMenus}
            onChange={(v) => {
              set("autoPublishMenus", v);
              save.mutate({ ...f, autoPublishMenus: v });
            }}
            label="Auto-publish menus"
            description="Menus are visible to employees as soon as they're saved."
          />
          <Toggle
            checked={f.allowGuests}
            onChange={(v) => {
              set("allowGuests", v);
              save.mutate({ ...f, allowGuests: v });
            }}
            label="Allow guest meals"
            description="Serve and bill visitors at this canteen."
          />
          <Toggle
            checked={f.optInRequired}
            onChange={(v) => {
              set("optInRequired", v);
              save.mutate({ ...f, optInRequired: v });
            }}
            label="Require meal opt-in"
            description="Only employees who opted in before cut-off can be served."
          />
          <Toggle
            checked={f.allowNegativeWallet}
            onChange={(v) => {
              set("allowNegativeWallet", v);
              save.mutate({ ...f, allowNegativeWallet: v });
            }}
            label="Allow negative wallet"
            description="Serve even if the wallet is short (up to the credit limit)."
          />
          <Toggle
            checked={f.maintenanceMode}
            onChange={(v) => {
              set("maintenanceMode", v);
              save.mutate({ ...f, maintenanceMode: v });
            }}
            label="Maintenance mode"
            description="Pause app & device scanning (counter POS still works)."
          />
        </div>
      </Card>
      <Modal
        open={!!adding}
        onClose={() => setAdding(null)}
        title="Add canteen"
        footer={
          <Button loading={add.isPending} onClick={() => add.mutate(adding)}>
            Create
          </Button>
        }
      >
        {adding && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" className="sm:col-span-2">
              <Input
                value={adding.name}
                onChange={(e) => setAdding({ ...adding, name: e.target.value })}
                placeholder="Nova Tech Park - Tower B"
              />
            </Field>
            <Field label="Code">
              <Input
                value={adding.code}
                onChange={(e) => setAdding({ ...adding, code: e.target.value })}
              />
            </Field>
            <Field label="Client company">
              <Input
                value={adding.clientCompany}
                onChange={(e) =>
                  setAdding({ ...adding, clientCompany: e.target.value })
                }
              />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Team() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [edit, setEdit] = useState<any>(null);
  const [created, setCreated] = useState<any>(null);
  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => api.get("/tenant/staff"),
  });
  const isOwner = session?.user.role === "OWNER";
  const save = useMutation({
    mutationFn: (v: any) => {
      const body = {
        name: v.name,
        email: v.email,
        phone: v.phone || null,
        role: v.role,
        canteenIds: v.canteenIds,
        isActive: v.isActive,
        ...(v.password ? { password: v.password } : {}),
      };
      return v.id
        ? api.patch(`/tenant/staff/${v.id}`, body)
        : api.post("/tenant/staff", body);
    },
    onSuccess: (r: any) => {
      setEdit(null);
      qc.invalidateQueries({ queryKey: ["staff"] });
      if (r.tempPassword) setCreated(r);
      else toast.success("Saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const perms: Record<string, string> = {
    OWNER: "Everything incl. billing",
    MANAGER: "Operations, menus, employees, reports",
    CASHIER: "Counter, POS, transactions, guests",
    KITCHEN: "Menu, inventory, waste, forecast",
  };
  return (
    <>
      <Card
        padded={false}
        title={
          <div className="flex items-center gap-2 font-bold">
            <ShieldCheck className="h-5 w-5 text-brand-600" />
            Role management
          </div>
        }
        actions={
          isOwner && (
            <Button
              icon={<Plus className="h-4 w-4" />}
              onClick={() =>
                setEdit({
                  name: "",
                  email: "",
                  phone: "",
                  role: "MANAGER",
                  canteenIds: [],
                  isActive: true,
                  password: "",
                })
              }
            >
              Add user
            </Button>
          )
        }
      >
        <Table
          rows={staff}
          onRowClick={
            isOwner
              ? (r: any) =>
                  r.role !== "OWNER" && setEdit({ ...r, password: "" })
              : undefined
          }
          columns={[
            {
              key: "name",
              header: "User",
              render: (r: any) => (
                <div className="flex items-center gap-3">
                  <Avatar name={r.name} />
                  <div>
                    <div className="font-semibold text-ink">{r.name}</div>
                    <div className="text-xs text-slate-500">{r.email}</div>
                  </div>
                </div>
              ),
            },
            {
              key: "role",
              header: "Role",
              render: (r: any) => (
                <Badge tone="brand">{titleCase(r.role)}</Badge>
              ),
            },
            {
              key: "perm",
              header: "Permissions",
              render: (r: any) => (
                <span className="text-sm text-slate-600">{perms[r.role]}</span>
              ),
            },
            {
              key: "can",
              header: "Canteens",
              render: (r: any) =>
                r.role === "OWNER" || !r.canteenIds.length
                  ? "All"
                  : session?.canteens
                      .filter((c) => r.canteenIds.includes(c.id))
                      .map((c) => c.code)
                      .join(", "),
            },
            {
              key: "last",
              header: "Last login",
              render: (r: any) => dt(r.lastLoginAt),
            },
            {
              key: "st",
              header: "Status",
              render: (r: any) => (
                <Badge tone={r.isActive ? "green" : "slate"}>
                  {r.isActive ? "Active" : "Disabled"}
                </Badge>
              ),
            },
          ]}
        />
      </Card>
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? "Edit user" : "Add user"}
        footer={
          <Button loading={save.isPending} onClick={() => save.mutate(edit)}>
            Save
          </Button>
        }
      >
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={edit.email}
                onChange={(e) => setEdit({ ...edit, email: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={edit.phone ?? ""}
                onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
              />
            </Field>
            <Field label="Role">
              <Select
                value={edit.role}
                onChange={(e) => setEdit({ ...edit, role: e.target.value })}
              >
                {["MANAGER", "CASHIER", "KITCHEN"].map((r) => (
                  <option key={r} value={r}>
                    {titleCase(r)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label={edit.id ? "New password (optional)" : "Password"}
              hint={
                edit.id
                  ? undefined
                  : "Leave empty to auto-generate and email it"
              }
              className="sm:col-span-2"
            >
              <Input
                type="text"
                value={edit.password}
                onChange={(e) => setEdit({ ...edit, password: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <div className="mb-2 text-xs font-semibold text-slate-600">
                Canteen access (none selected = all)
              </div>
              <div className="flex flex-wrap gap-2">
                {session?.canteens.map((c) => {
                  const on = edit.canteenIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        setEdit({
                          ...edit,
                          canteenIds: on
                            ? edit.canteenIds.filter((x: string) => x !== c.id)
                            : [...edit.canteenIds, c.id],
                        })
                      }
                      className={clsx(
                        "rounded-full border px-3 py-1.5 text-sm font-semibold",
                        on
                          ? "border-brand-600 bg-brand-50 text-brand-800"
                          : "border-slate-200 text-slate-600",
                      )}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
            {edit.id && (
              <div className="sm:col-span-2">
                <Toggle
                  checked={edit.isActive}
                  onChange={(v) => setEdit({ ...edit, isActive: v })}
                  label="Active"
                  description="Disabled users cannot sign in"
                />
              </div>
            )}
          </div>
        )}
      </Modal>
      <Modal
        open={!!created}
        onClose={() => setCreated(null)}
        size="sm"
        title="User created"
      >
        {created && (
          <div className="text-center text-sm">
            <p>Login details were emailed to {created.email}.</p>
            <p className="mt-3 text-slate-500">Temporary password</p>
            <div className="mt-1 font-mono text-2xl font-bold">
              {created.tempPassword}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function Devices() {
  const { canteenId } = useAuth();
  const qc = useQueryClient();
  const [add, setAdd] = useState<any>(null);
  const [key, setKey] = useState<string | null>(null);
  const { data = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: () => api.get("/tenant/devices"),
  });
  const create = useMutation({
    mutationFn: (v: any) => api.post("/tenant/devices", { ...v, canteenId }),
    onSuccess: (r: any) => {
      setAdd(null);
      setKey(r.apiKey);
      qc.invalidateQueries({ queryKey: ["devices"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const rawApi =
    (import.meta.env.VITE_API_URL as string) || "http://localhost:4000/api";
  const apiBase = /^https?:\/\//i.test(rawApi) ? rawApi : `http://${rawApi}`;
  return (
    <>
      <Card
        padded={false}
        title="Biometric & kiosk devices"
        actions={
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setAdd({ name: "", type: "BIOMETRIC" })}
          >
            Add device
          </Button>
        }
      >
        <Table
          rows={data}
          columns={[
            {
              key: "name",
              header: "Device",
              render: (r: any) => (
                <div>
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-xs text-slate-500">{r.canteen}</div>
                </div>
              ),
            },
            {
              key: "type",
              header: "Type",
              render: (r: any) => <Badge>{titleCase(r.type)}</Badge>,
            },
            {
              key: "key",
              header: "Key",
              render: (r: any) => (
                <span className="font-mono text-xs">{r.keyPrefix}…</span>
              ),
            },
            {
              key: "seen",
              header: "Last seen",
              render: (r: any) => dt(r.lastSeenAt),
            },
            {
              key: "a",
              header: "",
              align: "right",
              render: (r: any) => (
                <ConfirmButton
                  size="sm"
                  variant="ghost"
                  message="Revoke this device key?"
                  onConfirm={async () => {
                    await api.del(`/tenant/devices/${r.id}`);
                    qc.invalidateQueries({ queryKey: ["devices"] });
                  }}
                >
                  Revoke
                </ConfirmButton>
              ),
            },
          ]}
        />
      </Card>
      <Card className="mt-6" title="Integration guide">
        <div className="space-y-2 text-sm text-slate-600">
          <p>
            Your device middleware calls these endpoints with header{" "}
            <code className="rounded bg-slate-100 px-1">X-Device-Key</code>:
          </p>
          <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">{`GET  ${apiBase}/device/employees      # list employees to enrol
POST ${apiBase}/device/enrolled       # {"items":[{"employeeCode":"EMP001","biometricId":"1001"}]}
POST ${apiBase}/device/punch          # {"identifier":"1001"} → serves current meal (or staff check-in)`}</pre>
        </div>
      </Card>
      <Modal
        open={!!add}
        onClose={() => setAdd(null)}
        size="sm"
        title="Add device"
        footer={
          <Button loading={create.isPending} onClick={() => create.mutate(add)}>
            Create key
          </Button>
        }
      >
        {add && (
          <div className="space-y-4">
            <Field label="Name">
              <Input
                value={add.name}
                onChange={(e) => setAdd({ ...add, name: e.target.value })}
                placeholder="Counter 1 fingerprint"
              />
            </Field>
            <Field label="Type">
              <Select
                value={add.type}
                onChange={(e) => setAdd({ ...add, type: e.target.value })}
              >
                {["BIOMETRIC", "KIOSK", "POS_TERMINAL", "QR_SCANNER"].map(
                  (t) => (
                    <option key={t} value={t}>
                      {titleCase(t)}
                    </option>
                  ),
                )}
              </Select>
            </Field>
          </div>
        )}
      </Modal>
      <Modal
        open={!!key}
        onClose={() => setKey(null)}
        size="sm"
        title="Device API key"
      >
        <p className="text-sm text-slate-600">
          Copy this key now — it won't be shown again.
        </p>
        <div className="mt-3 flex gap-2">
          <Input readOnly value={key ?? ""} className="font-mono text-xs" />
          <Button
            variant="outline"
            icon={<Copy className="h-4 w-4" />}
            onClick={() => {
              navigator.clipboard.writeText(key!);
              toast.success("Copied");
            }}
          />
        </div>
      </Modal>
    </>
  );
}

function Workspace() {
  const { refresh, can } = useAuth();
  const { data } = useQuery({
    queryKey: ["workspace"],
    queryFn: () => api.get("/tenant/workspace"),
  });
  const [f, setF] = useState<any>(null);
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  useEffect(() => data && setF(data), [data]);
  const save = useMutation({
    mutationFn: () =>
      api.patch("/tenant/workspace", {
        name: f.name,
        email: f.email,
        phone: f.phone,
        gstin: f.gstin,
        address: f.address,
        city: f.city,
        state: f.state,
        logoUrl: f.logoUrl ?? "",
      }),
    onSuccess: () => {
      toast.success("Business profile saved");
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const change = useMutation({
    mutationFn: () => api.post("/auth/change-password", pw),
    onSuccess: () => {
      toast.success("Password changed");
      setPw({ currentPassword: "", newPassword: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });
  if (!f) return null;
  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <Card
        className="xl:col-span-3"
        title="Business profile"
        actions={
          <span className="text-xs text-slate-500">
            Shown on bills & client statements
          </span>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["name", "Business name"],
            ["email", "Email"],
            ["phone", "Phone"],
            ["gstin", "GSTIN"],
            ["city", "City"],
            ["state", "State"],
            // ["logoUrl", "Logo URL"],
          ].map(([k, l]) => (
            <Field
              key={k}
              label={l}
              className={k === "logoUrl" ? "sm:col-span-2" : ""}
            >
              <Input
                disabled={!can("OWNER")}
                value={f[k] ?? ""}
                onChange={(e) => setF({ ...f, [k]: e.target.value })}
              />
            </Field>
          ))}
          <Field label="Address" className="sm:col-span-2">
            <Input
              disabled={!can("OWNER")}
              value={f.address ?? ""}
              onChange={(e) => setF({ ...f, address: e.target.value })}
            />
          </Field>
        </div>
        {can("OWNER") && (
          <div className="mt-5 flex justify-end">
            <Button loading={save.isPending} onClick={() => save.mutate()}>
              Save
            </Button>
          </div>
        )}
      </Card>
      <Card className="xl:col-span-2 h-fit" title="My password">
        <div className="space-y-4">
          <Field label="Current password">
            <Input
              type="password"
              value={pw.currentPassword}
              onChange={(e) =>
                setPw({ ...pw, currentPassword: e.target.value })
              }
            />
          </Field>
          <Field label="New password" hint="At least 8 characters">
            <Input
              type="password"
              value={pw.newPassword}
              onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
            />
          </Field>
          <Button
            className="w-full"
            variant="secondary"
            loading={change.isPending}
            disabled={pw.newPassword.length < 8}
            onClick={() => change.mutate()}
          >
            Change password
          </Button>
        </div>
      </Card>
    </div>
  );
}

function AuditLog() {
  const { data = [] } = useQuery({
    queryKey: ["audit"],
    queryFn: () => api.get("/tenant/workspace/audit-logs", { pageSize: 100 }),
  });
  return (
    <Card padded={false} title="Activity log">
      <Table
        dense
        rows={data}
        columns={[
          {
            key: "createdAt",
            header: "When",
            render: (r: any) => dt(r.createdAt),
          },
          {
            key: "actor",
            header: "Who",
            render: (r: any) => r.actor ?? titleCase(r.actorType),
          },
          {
            key: "action",
            header: "Action",
            render: (r: any) => (
              <Badge
                tone={statusTone(
                  r.action.includes("cancel") ? "CANCELLED" : "ACTIVE",
                )}
              >
                {r.action}
              </Badge>
            ),
          },
          {
            key: "meta",
            header: "Details",
            render: (r: any) => (
              <span className="line-clamp-1 max-w-md font-mono text-xs text-slate-500">
                {r.meta ? JSON.stringify(r.meta) : "—"}
              </span>
            ),
          },
        ]}
      />
    </Card>
  );
}

function MobileApp() {
  return (
    <Card title="Mobile apps">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-brand-50 p-5">
          <div className="mb-2 flex items-center gap-2 font-bold">
            <Smartphone className="h-5 w-5 text-brand-700" /> Employee app
          </div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Employees sign in with their mobile number + 4-digit PIN.</li>
            <li>
              See today's menu, opt in/out, scan the counter QR, view history &
              wallet.
            </li>
            <li>
              Get push notifications for menus, reminders and wallet credits.
            </li>
          </ul>
        </div>
        <div className="rounded-2xl bg-amber-50 p-5">
          <div className="mb-2 flex items-center gap-2 font-bold">
            <UserCog className="h-5 w-5 text-amber-700" /> Manager mode
          </div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>
              Owners, managers & cashiers sign in with email + password (same as
              this console).
            </li>
            <li>
              Scan employee QR with the phone camera to serve meals, see live
              dashboard.
            </li>
            <li>
              Toggle sold-out items, view forecast, register guests on the go.
            </li>
          </ul>
        </div>
      </div>
    </Card>
  );
}

/* ---------------- Canteen Logo Settings Tab ---------------- */

function LogoSettings() {
  const { session, refresh, can } = useAuth();
  const [logoUrl, setLogoUrl] = useState(session?.tenant?.logoUrl ?? "");

  // Simple mutation for saving
  const save = useMutation({
    mutationFn: () => api.patch("/tenant/workspace", { logoUrl }),
    onSuccess: () => {
      toast.success("Canteen logo updated successfully");
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Simplified file reader
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string" && setLogoUrl(reader.result);
    reader.readAsDataURL(file);
  };

  const isOwner = can("OWNER");

  return (
    <div className="grid gap-6">
      <Card className="xl:col-span-3" title="Canteen Logo">
        <div className="space-y-5">
          <p className="text-xl text-slate-600">Upload your company logo.</p>

          <Field label="Upload Image">
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                <Upload className="h-4 w-4" /> Choose image
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {logoUrl && (
                <Button
                  variant="ghost"
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={() => setLogoUrl("")}
                >
                  Remove logo
                </Button>
              )}
            </div>
          </Field>

          <Field label="Or Paste Direct Image URL">
            <Input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
            />
          </Field>

          {isOwner && (
            <div className="mt-5 flex justify-end">
              <Button loading={save.isPending} onClick={() => save.mutate()}>
                Save Logo
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

const TABS = [
  { key: "canteen", label: "Canteen", icon: Store },
  { key: "team", label: "Team & roles", icon: ShieldCheck },
  { key: "departments", label: "Departments", icon: Network },
  { key: "devices", label: "Devices", icon: Cpu },
  { key: "workspace", label: "Business & account", icon: Building },
  { key: "app", label: "Mobile apps", icon: Smartphone },
  { key: "audit", label: "Activity log", icon: History },
  { key: "logo", label: "Logo", icon: UtensilsCrossed },
] as const;

export default function SettingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("canteen");
  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Canteen preferences, staff roles, departments and integrations."
      />
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-card">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              "flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold",
              tab === t.key
                ? "bg-brand-700 text-white"
                : "text-slate-600 hover:bg-slate-50",
            )}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>
      {tab === "canteen" && <CanteenSettings />}
      {tab === "team" && <Team />}
      {tab === "departments" && (
        <CrudPage
          cfg={{
            embedded: true,
            title: "Departments",
            endpoint: "/tenant/departments",
            queryKey: "departments",
            addLabel: "Add department",
            columns: [
              {
                key: "name",
                header: "Department",
                render: (r) => <b>{r.name}</b>,
              },
              { key: "costCenter", header: "Cost center" },
            ],
            fields: [
              { name: "name", label: "Name", required: true },
              { name: "costCenter", label: "Cost center code" },
            ],
          }}
        />
      )}
      {tab === "devices" && <Devices />}
      {tab === "workspace" && <Workspace />}
      {tab === "app" && <MobileApp />}
      {tab === "audit" && <AuditLog />}
      {tab === "logo" && <LogoSettings />}
    </>
  );
}
