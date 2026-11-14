import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import clsx from "clsx";
import {
  CreditCard,
  BellRing,
  Mail,
  Palette,
  Receipt,
  Send,
  RotateCcw,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { api } from "@/lib/api";
import { dt, titleCase } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  ConfirmButton,
  Field,
  Input,
  Loading,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Table,
  Textarea,
  Toggle,
  statusTone,
} from "@/components/ui";

const API_BASE =
  (import.meta.env.VITE_API_URL as string) || "http://localhost:4000/api";

const GROUPS = [
  {
    id: "payments",
    title: "Razorpay payments",
    icon: CreditCard,
    desc: "Used for plan purchases & renewals on the website and canteen Billing page.",
    keys: [
      ["razorpay.keyId", "Key ID", "rzp_live_…"],
      ["razorpay.keySecret", "Key secret"],
      ["razorpay.webhookSecret", "Webhook secret"],
    ],
  },
  {
    id: "push",
    title: "OneSignal push notifications",
    icon: BellRing,
    desc: "Push for menus, reminders and wallet alerts in the mobile app.",
    keys: [
      ["onesignal.appId", "App ID"],
      ["onesignal.restApiKey", "REST API key"],
    ],
  },
  {
    id: "smtp",
    title: "SMTP email",
    icon: Mail,
    desc: "Welcome, renewal, subscription alerts, daily reports, password resets.",
    keys: [
      ["smtp.host", "Host", "smtp.gmail.com"],
      ["smtp.port", "Port", "587"],
      ["smtp.secure", "Secure (true for 465)", "false"],
      ["smtp.user", "Username"],
      ["smtp.pass", "Password"],
      ["smtp.from", "From", "CanteenPro <no-reply@yourdomain.com>"],
    ],
  },
  {
    id: "brand",
    title: "Brand & support",
    icon: Palette,
    desc: "Shown on the website, emails and apps.",
    keys: [
      ["brand.name", "Product name"],
      ["brand.supportEmail", "Support email (receives leads)"],
      ["brand.supportPhone", "Support phone"],
      ["brand.whatsapp", "WhatsApp number (with country code)"],
    ],
  },
  {
    id: "invoice",
    title: "Invoice & tax",
    icon: Receipt,
    desc: "Seller details printed on subscription invoices.",
    keys: [
      ["brand.legalName", "Legal business name"],
      ["brand.address", "Registered address"],
      ["brand.gstin", "GSTIN"],
      ["tax.gstPercent", "GST % on subscriptions", "18"],
    ],
  },
] as const;

export function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["p-settings"],
    queryFn: () => api.get("/platform/settings"),
  });
  const [vals, setVals] = useState<Record<string, string>>({});
  const [testTo, setTestTo] = useState("");
  const [pushId, setPushId] = useState("");
  useEffect(() => {
    if (data)
      setVals(
        Object.fromEntries(
          Object.entries(data).map(([k, v]: any) => [k, v.value]),
        ),
      );
  }, [data]);
  const save = useMutation({
    mutationFn: (keys: readonly (readonly string[])[]) =>
      api.put(
        "/platform/settings",
        Object.fromEntries(keys.map(([k]) => [k, vals[k] ?? ""])),
      ),
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["p-settings"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  if (!data) return <Loading />;
  return (
    <>
      <PageHeader
        title="Settings & keys"
        subtitle="Integration keys are encrypted at rest. Leave a masked value unchanged to keep the stored secret."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        {GROUPS.map((g) => (
          <Card
            key={g.id}
            title={
              <div className="flex items-center gap-2">
                <g.icon className="h-5 w-5 text-brand-600" />
                <div>
                  <div className="font-bold">{g.title}</div>
                  <div className="text-xs font-normal text-slate-500">
                    {g.desc}
                  </div>
                </div>
              </div>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {g.keys.map(([k, l, ph]: any) => (
                <Field
                  key={k}
                  label={
                    <span className="flex items-center gap-2">
                      {l}
                      {data[k]?.source === "env" && (
                        <Badge tone="amber">from .env</Badge>
                      )}
                      {data[k]?.source === "db" && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      )}
                    </span>
                  }
                >
                  <Input
                    type={data[k]?.isSecret ? "password" : "text"}
                    value={vals[k] ?? ""}
                    placeholder={ph}
                    onChange={(e) => setVals({ ...vals, [k]: e.target.value })}
                  />
                </Field>
              ))}
            </div>
            {g.id === "payments" && (
              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                Webhook URL (Razorpay Dashboard → Webhooks; events:
                payment.captured, payment.failed, order.paid):
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-white px-2 py-1">
                    {API_BASE}/webhooks/razorpay
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${API_BASE}/webhooks/razorpay`,
                      );
                      toast.success("Copied");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            {g.id === "smtp" && (
              <div className="mt-4 flex gap-2">
                <Input
                  placeholder="Send test email to…"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                />
                <Button
                  variant="outline"
                  disabled={!testTo}
                  onClick={async () => {
                    const r = await api.post("/platform/settings/test-email", {
                      to: testTo,
                    });
                    r.status === "SENT"
                      ? toast.success("Test email sent")
                      : toast.error(
                          `${r.status}: ${r.error ?? "save SMTP settings first"}`,
                        );
                  }}
                >
                  Test
                </Button>
              </div>
            )}
            {g.id === "push" && (
              <div className="mt-4 flex gap-2">
                <Input
                  placeholder="External ID e.g. emp_<employeeId>"
                  value={pushId}
                  onChange={(e) => setPushId(e.target.value)}
                />
                <Button
                  variant="outline"
                  disabled={!pushId}
                  onClick={async () => {
                    const r = await api.post("/platform/settings/test-push", {
                      externalId: pushId,
                    });
                    r.status === "SENT"
                      ? toast.success("Push sent")
                      : toast.error(`Push ${r.status}`);
                  }}
                >
                  Test
                </Button>
              </div>
            )}
            <div className="mt-5 flex justify-end">
              <Button
                loading={save.isPending}
                onClick={() => save.mutate(g.keys)}
              >
                Save
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ Email templates */
export function EmailTemplatesPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["p-templates"],
    queryFn: () => api.get("/platform/email-templates"),
  });
  const [key, setKey] = useState("welcome");
  const [f, setF] = useState<any>(null);
  const [preview, setPreview] = useState("");
  const [to, setTo] = useState("");
  useEffect(() => {
    const t = data.find((x: any) => x.key === key);
    if (t)
      setF({
        subject: t.subject,
        html: t.html,
        isActive: t.isActive,
        isCustom: t.isCustom,
        name: t.name,
      });
  }, [data, key]);
  useEffect(() => {
    if (!f) return;
    const h = setTimeout(
      () =>
        api
          .post("/platform/email-templates/preview", {
            html: f.html,
            vars: {
              days: 3,
              plan: "Growth",
              endDate: "30 Nov 2026",
              amount: "₹4,718",
              invoiceNo: "CP-2026-00012",
              meals: 412,
              revenue: "₹9,840",
              subsidy: "₹12,300",
              guests: 4,
              optedIn: 380,
              waste: 6.5,
              sessions: "Breakfast: 120 · Lunch: 260",
              date: "22 Oct 2026",
              consoleUrl: "#",
              billingUrl: "#",
              resetUrl: "#",
              itemsHtml: "<ul><li>Toor Dal: 4 kg</li></ul>",
              count: 1,
            },
          })
          .then((r) => setPreview(r.html)),
      400,
    );
    return () => clearTimeout(h);
  }, [f?.html]);
  const save = useMutation({
    mutationFn: () =>
      api.put(`/platform/email-templates/${key}`, {
        subject: f.subject,
        html: f.html,
        isActive: f.isActive,
      }),
    onSuccess: () => {
      toast.success("Template saved");
      qc.invalidateQueries({ queryKey: ["p-templates"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <>
      <PageHeader
        title="Email templates"
        subtitle="Customise automated emails. Use {{variables}} such as {{name}}, {{tenant}}, {{plan}}, {{endDate}}."
      />
      <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
        <nav className="h-fit space-y-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-card">
          {data.map((t: any) => (
            <button
              key={t.key}
              onClick={() => setKey(t.key)}
              className={clsx(
                "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold",
                key === t.key
                  ? "bg-brand-50 text-brand-800"
                  : "text-slate-600 hover:bg-slate-50",
              )}
            >
              {t.name}
              {t.isCustom && <Badge tone="violet">custom</Badge>}
            </button>
          ))}
        </nav>
        {f && (
          <div className="grid gap-6 2xl:grid-cols-2">
            <Card
              title={f.name}
              actions={
                <>
                  {f.isCustom && (
                    <ConfirmButton
                      size="sm"
                      variant="ghost"
                      icon={<RotateCcw className="h-4 w-4" />}
                      message="Reset to the default template?"
                      onConfirm={async () => {
                        await api.del(`/platform/email-templates/${key}`);
                        qc.invalidateQueries({ queryKey: ["p-templates"] });
                      }}
                    >
                      Reset
                    </ConfirmButton>
                  )}
                  <Button
                    size="sm"
                    loading={save.isPending}
                    onClick={() => save.mutate()}
                  >
                    Save
                  </Button>
                </>
              }
            >
              <div className="space-y-4">
                <Field label="Subject">
                  <Input
                    value={f.subject}
                    onChange={(e) => setF({ ...f, subject: e.target.value })}
                  />
                </Field>
                <Field label="Body (HTML)">
                  <Textarea
                    className="min-h-[360px] font-mono text-xs"
                    value={f.html}
                    onChange={(e) => setF({ ...f, html: e.target.value })}
                  />
                </Field>
                <Toggle
                  checked={f.isActive}
                  onChange={(v) => setF({ ...f, isActive: v })}
                  label="Enabled"
                  description="Disabled templates are not sent"
                />
                <div className="flex gap-2 border-t border-slate-100 pt-4">
                  <Input
                    placeholder="Send test to…"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    icon={<Send className="h-4 w-4" />}
                    disabled={!to}
                    onClick={async () => {
                      const r = await api.post(
                        `/platform/email-templates/${key}/test`,
                        { to },
                      );
                      r.status === "SENT"
                        ? toast.success("Sent")
                        : toast.error(r.status);
                    }}
                  >
                    Test
                  </Button>
                </div>
              </div>
            </Card>
            <Card title="Preview" padded={false}>
              <iframe
                title="preview"
                className="h-[620px] w-full rounded-b-2xl"
                srcDoc={`<div style="font-family:Segoe UI,Arial;padding:24px;font-size:15px;line-height:1.6;color:#1e293b">${preview}</div>`}
              />
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

export function EmailLogsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { data = [] } = useQuery({
    queryKey: ["p-elogs", q, status, page],
    queryFn: () =>
      api.get("/platform/email-logs", { q, status, page, pageSize: 50 }),
  });
  return (
    <>
      <PageHeader
        title="Email logs"
        subtitle="Every email the platform tried to send."
      />
      <Card padded={false}>
        <div className="flex gap-3 border-b border-slate-100 p-4">
          <SearchInput
            className="flex-1"
            value={q}
            onChange={setQ}
            placeholder="Search recipient…"
          />
          <Select
            className="w-40"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All</option>
            <option>SENT</option>
            <option>FAILED</option>
            <option>SKIPPED</option>
          </Select>
        </div>
        <Table
          dense
          rows={data}
          columns={[
            { key: "d", header: "When", render: (r: any) => dt(r.createdAt) },
            { key: "to", header: "To" },
            {
              key: "subject",
              header: "Subject",
              render: (r: any) => (
                <span className="line-clamp-1 max-w-sm">{r.subject}</span>
              ),
            },
            {
              key: "template",
              header: "Template",
              render: (r: any) => <Badge>{r.template ?? "—"}</Badge>,
            },
            {
              key: "s",
              header: "Status",
              render: (r: any) => (
                <Badge tone={statusTone(r.status)}>{r.status}</Badge>
              ),
            },
            {
              key: "e",
              header: "Error",
              render: (r: any) => (
                <span className="line-clamp-1 max-w-xs text-xs text-red-600">
                  {r.error}
                </span>
              ),
            },
          ]}
        />
        <Pagination
          page={page}
          pageSize={50}
          total={
            data.length < 50 ? (page - 1) * 50 + data.length : page * 50 + 1
          }
          onChange={setPage}
        />
      </Card>
    </>
  );
}

export function BroadcastPage() {
  const [f, setF] = useState({
    subject: "",
    html: "<p>Hi {{name}},</p>\n<p></p>\n<p>— Team CanteenPro</p>",
    tenantStatus: ["TRIAL", "ACTIVE"] as string[],
  });
  const send = useMutation({
    mutationFn: () => api.post("/platform/broadcast", f),
    onSuccess: (r: any) => toast.success(`Queued for ${r.queued} owners`),
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <>
      <PageHeader
        title="Broadcast email"
        subtitle="Product updates, maintenance windows or offers to all canteen owners. Variables: {{name}}, {{tenant}}."
      />
      <Card className="max-w-3xl">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {["TRIAL", "ACTIVE", "PAST_DUE"].map((s) => {
              const on = f.tenantStatus.includes(s);
              return (
                <button
                  key={s}
                  onClick={() =>
                    setF({
                      ...f,
                      tenantStatus: on
                        ? f.tenantStatus.filter((x) => x !== s)
                        : [...f.tenantStatus, s],
                    })
                  }
                  className={clsx(
                    "rounded-full border px-3 py-1.5 text-sm font-semibold",
                    on
                      ? "border-brand-600 bg-brand-50 text-brand-800"
                      : "border-slate-200 text-slate-500",
                  )}
                >
                  {titleCase(s)} customers
                </button>
              );
            })}
          </div>
          <Field label="Subject">
            <Input
              value={f.subject}
              onChange={(e) => setF({ ...f, subject: e.target.value })}
            />
          </Field>
          <Field label="Body (HTML)">
            <Textarea
              className="min-h-[260px] font-mono text-xs"
              value={f.html}
              onChange={(e) => setF({ ...f, html: e.target.value })}
            />
          </Field>
          <div className="flex justify-end">
            <ConfirmButton
              icon={<Send className="h-4 w-4" />}
              disabled={f.subject.length < 3}
              message="Send this email to all selected customers now?"
              onConfirm={() => send.mutateAsync()}
            >
              Send broadcast
            </ConfirmButton>
          </div>
        </div>
      </Card>
    </>
  );
}

export function AuditPage() {
  const [action, setAction] = useState("");
  const { data = [] } = useQuery({
    queryKey: ["p-audit", action],
    queryFn: () => api.get("/platform/audit-logs", { action, pageSize: 200 }),
  });
  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle="Sensitive actions across the platform (impersonation, cancellations, plan changes, settings)."
      />
      <Card padded={false}>
        <div className="border-b border-slate-100 p-4">
          <SearchInput
            value={action}
            onChange={setAction}
            placeholder="Filter by action e.g. impersonate, order.cancel…"
          />
        </div>
        <Table
          dense
          rows={data}
          columns={[
            { key: "d", header: "When", render: (r: any) => dt(r.createdAt) },
            {
              key: "a",
              header: "Action",
              render: (r: any) => <Badge tone="brand">{r.action}</Badge>,
            },
            {
              key: "t",
              header: "Customer",
              render: (r: any) => r.tenant ?? "—",
            },
            {
              key: "actor",
              header: "Actor",
              render: (r: any) => (
                <span className="text-xs">
                  {titleCase(r.actorType)} {r.actorId?.slice(0, 8)}
                </span>
              ),
            },
            {
              key: "m",
              header: "Details",
              render: (r: any) => (
                <span className="line-clamp-1 max-w-md font-mono text-xs text-slate-500">
                  {r.meta ? JSON.stringify(r.meta) : ""}
                </span>
              ),
            },
            {
              key: "ip",
              header: "IP",
              render: (r: any) => <span className="text-xs">{r.ip}</span>,
            },
          ]}
        />
      </Card>
    </>
  );
}
