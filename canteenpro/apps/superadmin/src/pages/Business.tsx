import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import {
  ArrowLeft,
  Building2,
  IndianRupee,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Inbox,
  LogIn,
  CalendarPlus,
  Plus,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dOnly, dt, inr, num, titleCase } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  ConfirmButton,
  Field,
  Input,
  Loading,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Stat,
  Table,
  Textarea,
  statusTone,
} from "@/components/ui";

/* ------------------------------------------------------------------ Dashboard */
export function Dashboard() {
  const { data } = useQuery({
    queryKey: ["p-dash"],
    queryFn: () => api.get("/platform/dashboard"),
  });
  if (!data) return <Loading />;
  const t = data.tenants;
  return (
    <>
      <PageHeader
        title="SaaS overview"
        subtitle="Revenue, customers and product usage across all canteens."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="MRR"
          value={inr(data.mrr)}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="green"
          hint={`ARR ${inr(data.arr)} · ${data.payingCustomers} paying`}
        />
        <Stat
          label="Customers"
          value={t.total}
          icon={<Building2 className="h-5 w-5" />}
          hint={`${t.active} active · ${t.trial} trial · ${t.pastDue} past due`}
        />
        <Stat
          label="Lifetime revenue"
          value={inr(data.totalRevenue)}
          icon={<IndianRupee className="h-5 w-5" />}
          tone="violet"
          hint={`${t.newThisMonth} new customers this month`}
        />
        <Stat
          label="Meals (30 days)"
          value={num(data.usage.mealsMonth)}
          icon={<UtensilsCrossed className="h-5 w-5" />}
          tone="amber"
          hint={`${num(data.usage.mealsToday)} in last 24h · ${num(data.employees)} employees`}
        />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Revenue & signups — last 12 months"
        >
          <div className="h-[300px]">
            <ResponsiveContainer>
              <ComposedChart data={data.chart}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="l"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <YAxis
                  yAxisId="r"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  yAxisId="l"
                  dataKey="revenue"
                  name="Revenue (₹)"
                  fill="#2442c7"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                />
                <Line
                  yAxisId="r"
                  dataKey="signups"
                  name="Signups"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Renewals due (7 days)" padded={false}>
          <Table
            dense
            rows={data.expiring}
            empty={
              <div className="p-6 text-sm text-slate-500">
                Nothing due this week.
              </div>
            }
            columns={[
              {
                key: "t",
                header: "Customer",
                render: (r: any) => (
                  <Link
                    to={`/tenants/${r.tenant.id}`}
                    className="font-semibold text-brand-700 hover:underline"
                  >
                    {r.tenant.name}
                  </Link>
                ),
              },
              {
                key: "p",
                header: "Plan",
                render: (r: any) => (
                  <span className="text-xs">
                    {r.plan.name} · {titleCase(r.status)}
                  </span>
                ),
              },
              {
                key: "e",
                header: "Ends",
                render: (r: any) => dOnly(r.currentPeriodEnd),
              },
            ]}
          />
          <div className="border-t border-slate-100 p-4 text-sm">
            <Link
              to="/leads"
              className="flex items-center gap-2 font-semibold text-brand-700"
            >
              <Inbox className="h-4 w-4" />
              {data.newLeads} new lead(s) waiting
            </Link>
          </div>
        </Card>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Latest signups" padded={false}>
          <Table
            dense
            rows={data.recentTenants}
            columns={[
              {
                key: "n",
                header: "Customer",
                render: (r: any) => (
                  <Link
                    to={`/tenants/${r.id}`}
                    className="font-semibold text-brand-700 hover:underline"
                  >
                    {r.name}
                  </Link>
                ),
              },
              {
                key: "p",
                header: "Plan",
                render: (r: any) => r.subscription?.plan?.name ?? "—",
              },
              {
                key: "s",
                header: "Status",
                render: (r: any) => (
                  <Badge tone={statusTone(r.status)}>
                    {titleCase(r.status)}
                  </Badge>
                ),
              },
              {
                key: "c",
                header: "Joined",
                render: (r: any) => dOnly(r.createdAt),
              },
            ]}
          />
        </Card>
        <Card title="Latest payments" padded={false}>
          <Table
            dense
            rows={data.recentPayments}
            columns={[
              {
                key: "t",
                header: "Customer",
                render: (r: any) => r.tenant?.name,
              },
              {
                key: "p",
                header: "Plan",
                render: (r: any) =>
                  `${r.plan?.name ?? ""} · ${titleCase(r.billingCycle)}`,
              },
              {
                key: "a",
                header: "Amount",
                align: "right",
                render: (r: any) => <b>{inr(r.amount)}</b>,
              },
              { key: "d", header: "Paid", render: (r: any) => dOnly(r.paidAt) },
            ]}
          />
        </Card>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ Tenants */
export function Tenants() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { is } = useAuth();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [add, setAdd] = useState<any>(null);
  const { data } = useQuery({
    queryKey: ["p-tenants", q, status, page],
    queryFn: () =>
      api.get("/platform/tenants", { q, status, page, pageSize: 25 }),
  });
  const { data: plans } = useQuery({
    queryKey: ["p-plans"],
    queryFn: () => api.get("/platform/plans", { pageSize: 50 }),
  });
  const create = useMutation({
    mutationFn: () => api.post("/platform/tenants", add),
    onSuccess: (t: any) => {
      toast.success("Customer created");
      setAdd(null);
      qc.invalidateQueries({ queryKey: ["p-tenants"] });
      nav(`/tenants/${t.id}`);
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Every canteen business subscribed to CanteenPro."
        actions={
          is("SUPER_ADMIN") && (
            <Button
              icon={<Plus className="h-4 w-4" />}
              onClick={() =>
                setAdd({
                  businessName: "",
                  ownerName: "",
                  email: "",
                  phone: "",
                  password: "",
                  planCode: "growth",
                  billingCycle: "MONTHLY",
                })
              }
            >
              Add customer
            </Button>
          )
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
            placeholder="Search name, email, phone…"
          />
          <Select
            className="w-44"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {["TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELLED"].map(
              (s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ),
            )}
          </Select>
        </div>
        <Table
          rows={data?.items ?? []}
          onRowClick={(r: any) => nav(`/tenants/${r.id}`)}
          columns={[
            {
              key: "n",
              header: "Business",
              render: (r: any) => (
                <div>
                  <div className="font-semibold text-ink">{r.name}</div>
                  <div className="text-xs text-slate-500">
                    {r.email} · {r.city ?? ""}
                  </div>
                </div>
              ),
            },
            {
              key: "p",
              header: "Plan",
              render: (r: any) => (
                <div>
                  <div className="font-semibold">{r.plan ?? "—"}</div>
                  <div className="text-xs text-slate-500">
                    {titleCase(r.cycle)}
                  </div>
                </div>
              ),
            },
            {
              key: "e",
              header: "Period ends",
              render: (r: any) => dOnly(r.periodEnd),
            },
            {
              key: "u",
              header: "Usage",
              render: (r: any) => (
                <span className="text-xs text-slate-600">
                  {r.canteens} canteens · {r.employees} emp · {num(r.meals30d)}{" "}
                  meals/30d
                </span>
              ),
            },
            {
              key: "s",
              header: "Status",
              render: (r: any) => (
                <Badge tone={statusTone(r.status)}>{titleCase(r.status)}</Badge>
              ),
            },
            {
              key: "c",
              header: "Joined",
              render: (r: any) => dOnly(r.createdAt),
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
        open={!!add}
        onClose={() => setAdd(null)}
        title="Add customer manually"
        footer={
          <Button loading={create.isPending} onClick={() => create.mutate()}>
            Create
          </Button>
        }
      >
        {add && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["businessName", "Business name"],
              ["ownerName", "Owner name"],
              ["email", "Owner email"],
              ["phone", "Phone"],
              ["password", "Initial password"],
              ["city", "City"],
            ].map(([k, l]) => (
              <Field key={k} label={l}>
                <Input
                  value={add[k] ?? ""}
                  onChange={(e) => setAdd({ ...add, [k]: e.target.value })}
                />
              </Field>
            ))}
            <Field label="Plan">
              <Select
                value={add.planCode}
                onChange={(e) => setAdd({ ...add, planCode: e.target.value })}
              >
                {plans?.items?.map((p: any) => (
                  <option key={p.id} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Cycle">
              <Select
                value={add.billingCycle}
                onChange={(e) =>
                  setAdd({ ...add, billingCycle: e.target.value })
                }
              >
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </Select>
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}

export function TenantDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { is } = useAuth();
  const { data: t } = useQuery({
    queryKey: ["p-tenant", id],
    queryFn: () => api.get(`/platform/tenants/${id}`),
  });
  const { data: plans } = useQuery({
    queryKey: ["p-plans"],
    queryFn: () => api.get("/platform/plans", { pageSize: 50 }),
  });
  const [sub, setSub] = useState<any>(null);
  const [pay, setPay] = useState<any>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["p-tenant", id] });
  const updateSub = useMutation({
    mutationFn: (b: any) => api.post(`/platform/tenants/${id}/subscription`, b),
    onSuccess: () => {
      toast.success("Subscription updated");
      setSub(null);
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const manual = useMutation({
    mutationFn: () =>
      api.post(`/platform/tenants/${id}/manual-payment`, {
        ...pay,
        amount: Number(pay.amount),
      }),
    onSuccess: () => {
      toast.success("Payment recorded & plan activated");
      setPay(null);
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const setStatus = async (status: string) => {
    await api.patch(`/platform/tenants/${id}`, { status });
    toast.success(`Status set to ${titleCase(status)}`);
    refresh();
  };
  if (!t) return <Loading />;
  const s = t.subscription;
  return (
    <>
      <Link
        to="/tenants"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" /> Customers
      </Link>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {t.name}{" "}
            <Badge tone={statusTone(t.status)}>{titleCase(t.status)}</Badge>
          </span>
        }
        subtitle={`${t.email} · ${t.phone ?? ""} · ${t.city ?? ""} · joined ${dOnly(t.createdAt)} via ${t.source ?? "—"}`}
        actions={
          is("SUPER_ADMIN") && (
            <>
              <Button
                variant="outline"
                icon={<LogIn className="h-4 w-4" />}
                onClick={async () => {
                  const r = await api.post(
                    `/platform/tenants/${id}/impersonate`,
                  );
                  window.open(r.url, "_blank");
                }}
              >
                Login as owner
              </Button>
              {t.status !== "SUSPENDED" ? (
                <ConfirmButton
                  variant="danger"
                  message="Suspend this customer? Their staff and employees lose access immediately."
                  onConfirm={() => setStatus("SUSPENDED")}
                >
                  Suspend
                </ConfirmButton>
              ) : (
                <Button
                  variant="success"
                  onClick={() =>
                    setStatus(s?.status === "TRIALING" ? "TRIAL" : "ACTIVE")
                  }
                >
                  Reactivate
                </Button>
              )}
            </>
          )
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Plan"
          value={s?.plan?.name ?? "—"}
          hint={
            s
              ? `${titleCase(s.status)} · ${titleCase(s.billingCycle)} · ends ${dOnly(s.currentPeriodEnd)}`
              : ""
          }
        />
        <Stat
          label="Employees"
          value={`${t.usage.activeEmployees}`}
          icon={<Users className="h-5 w-5" />}
          hint={`${t.usage.employees} total · limit ${s?.plan?.maxEmployees < 0 ? "∞" : s?.plan?.maxEmployees}`}
        />
        <Stat
          label="Meals (30 days)"
          value={num(t.usage.meals30d)}
          icon={<UtensilsCrossed className="h-5 w-5" />}
          tone="amber"
          hint={`${num(t.usage.mealsTotal)} lifetime · last ${dt(t.usage.lastOrderAt)}`}
        />
        <Stat
          label="Canteens"
          value={t.canteens.length}
          tone="violet"
          hint={t.canteens.map((c: any) => c.name).join(", ")}
        />
      </div>
      {is("SUPER_ADMIN") && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            icon={<CalendarPlus className="h-4 w-4" />}
            variant="secondary"
            onClick={() =>
              setSub({
                planId: s?.planId,
                billingCycle: s?.billingCycle,
                status: s?.status,
                extendDays: "",
              })
            }
          >
            Change plan / extend
          </Button>
          <Button
            icon={<IndianRupee className="h-4 w-4" />}
            variant="secondary"
            onClick={() =>
              setPay({
                planId: s?.planId,
                billingCycle: s?.billingCycle ?? "MONTHLY",
                amount: "",
                reference: "",
              })
            }
          >
            Record offline payment
          </Button>
        </div>
      )}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Team" padded={false}>
          <Table
            dense
            rows={t.staff}
            columns={[
              {
                key: "n",
                header: "Name",
                render: (r: any) => (
                  <div>
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-xs text-slate-500">{r.email}</div>
                  </div>
                ),
              },
              {
                key: "r",
                header: "Role",
                render: (r: any) => (
                  <Badge tone="brand">{titleCase(r.role)}</Badge>
                ),
              },
              {
                key: "l",
                header: "Last login",
                render: (r: any) => dt(r.lastLoginAt),
              },
            ]}
          />
        </Card>
        <Card title="Payments" padded={false}>
          <Table
            dense
            rows={t.payments}
            columns={[
              {
                key: "i",
                header: "Invoice",
                render: (r: any) => r.invoiceNo ?? "—",
              },
              { key: "p", header: "Plan", render: (r: any) => r.plan?.name },
              {
                key: "a",
                header: "Amount",
                align: "right",
                render: (r: any) => inr(r.amount),
              },
              {
                key: "s",
                header: "Status",
                render: (r: any) => (
                  <Badge tone={statusTone(r.status)}>
                    {titleCase(r.status)}
                  </Badge>
                ),
              },
              {
                key: "d",
                header: "Date",
                render: (r: any) => dOnly(r.paidAt ?? r.createdAt),
              },
            ]}
          />
        </Card>
      </div>
      <Card className="mt-6" title="Internal notes">
        <Textarea
          value={notes ?? t.notes ?? ""}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Sales / support notes (only visible to admins)"
        />
        <div className="mt-3 flex justify-end">
          <Button
            variant="secondary"
            disabled={notes === null}
            onClick={async () => {
              await api.patch(`/platform/tenants/${id}`, { notes });
              toast.success("Saved");
              setNotes(null);
              refresh();
            }}
          >
            Save notes
          </Button>
        </div>
      </Card>
      <Modal
        open={!!sub}
        onClose={() => setSub(null)}
        title="Change subscription"
        footer={
          <Button
            loading={updateSub.isPending}
            onClick={() =>
              updateSub.mutate({
                ...sub,
                extendDays: sub.extendDays ? Number(sub.extendDays) : undefined,
              })
            }
          >
            Apply
          </Button>
        }
      >
        {sub && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Plan">
              <Select
                value={sub.planId}
                onChange={(e) => setSub({ ...sub, planId: e.target.value })}
              >
                {plans?.items?.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Cycle">
              <Select
                value={sub.billingCycle}
                onChange={(e) =>
                  setSub({ ...sub, billingCycle: e.target.value })
                }
              >
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select
                value={sub.status}
                onChange={(e) => setSub({ ...sub, status: e.target.value })}
              >
                {["TRIALING", "ACTIVE", "PAST_DUE", "EXPIRED", "CANCELLED"].map(
                  (x) => (
                    <option key={x} value={x}>
                      {titleCase(x)}
                    </option>
                  ),
                )}
              </Select>
            </Field>
            <Field label="Extend by (days)" hint="Negative to shorten">
              <Input
                type="number"
                value={sub.extendDays}
                onChange={(e) => setSub({ ...sub, extendDays: e.target.value })}
              />
            </Field>
          </div>
        )}
      </Modal>
      <Modal
        open={!!pay}
        onClose={() => setPay(null)}
        title="Record offline payment"
        footer={
          <Button
            loading={manual.isPending}
            disabled={!Number(pay?.amount) || !pay?.reference}
            onClick={() => manual.mutate()}
          >
            Record & activate
          </Button>
        }
      >
        {pay && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Plan">
              <Select
                value={pay.planId}
                onChange={(e) => setPay({ ...pay, planId: e.target.value })}
              >
                {plans?.items?.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Cycle">
              <Select
                value={pay.billingCycle}
                onChange={(e) =>
                  setPay({ ...pay, billingCycle: e.target.value })
                }
              >
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </Select>
            </Field>
            <Field label="Amount received (₹, incl. GST)">
              <Input
                type="number"
                value={pay.amount}
                onChange={(e) => setPay({ ...pay, amount: e.target.value })}
              />
            </Field>
            <Field label="Bank / cheque reference">
              <Input
                value={pay.reference}
                onChange={(e) => setPay({ ...pay, reference: e.target.value })}
              />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ Payments */
export function Payments() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { data } = useQuery({
    queryKey: ["p-payments", status, page],
    queryFn: () =>
      api.get("/platform/payments", { status, page, pageSize: 25 }),
  });
  return (
    <>
      <PageHeader
        title="Payments"
        subtitle={`Razorpay & offline subscription payments · ${inr(data?.paidTotal)} collected`}
      />
      <Card padded={false}>
        <div className="border-b border-slate-100 p-4">
          <Select
            className="w-48"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {["PAID", "CREATED", "FAILED", "REFUNDED"].map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </Select>
        </div>
        <Table
          rows={data?.items ?? []}
          columns={[
            {
              key: "d",
              header: "Date",
              render: (r: any) => dt(r.paidAt ?? r.createdAt),
            },
            {
              key: "t",
              header: "Customer",
              render: (r: any) => (
                <Link
                  className="font-semibold text-brand-700 hover:underline"
                  to={`/tenants/${r.tenantId}`}
                >
                  {r.tenant?.name}
                </Link>
              ),
            },
            {
              key: "p",
              header: "Plan",
              render: (r: any) =>
                `${r.plan?.name ?? ""} · ${titleCase(r.billingCycle)}`,
            },
            {
              key: "i",
              header: "Invoice",
              render: (r: any) => (
                <span className="font-mono text-xs">{r.invoiceNo ?? "—"}</span>
              ),
            },
            {
              key: "r",
              header: "Razorpay",
              render: (r: any) => (
                <span className="font-mono text-xs text-slate-500">
                  {r.razorpayPaymentId ?? r.razorpayOrderId}
                </span>
              ),
            },
            { key: "m", header: "Method", render: (r: any) => r.method ?? "—" },
            {
              key: "a",
              header: "Amount",
              align: "right",
              render: (r: any) => <b>{inr(r.amount, 2)}</b>,
            },
            {
              key: "s",
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
    </>
  );
}
