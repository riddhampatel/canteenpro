import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import toast from "react-hot-toast";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Download,
  Printer,
  FileBarChart2,
  CalendarDays,
  Building2,
  UtensilsCrossed,
  Users,
  Wallet,
  Scale,
  Trash2,
  UserRoundPlus,
  ReceiptIndianRupee,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dayMonth, dOnly, inr, num, titleCase, today } from "@/lib/format";
import {
  Card,
  Empty,
  Input,
  Loading,
  PageHeader,
  Select,
  Stat,
  Table,
  Button,
} from "@/components/ui";

const REPORTS = [
  { key: "summary", label: "Sales summary", icon: FileBarChart2 },
  { key: "daily", label: "Day-wise sales", icon: CalendarDays },
  {
    key: "company-billing",
    label: "Client billing statement",
    icon: Building2,
  },
  { key: "payroll", label: "Payroll deductions", icon: Wallet },
  { key: "employees", label: "Employee consumption", icon: Users },
  { key: "departments", label: "Department consumption", icon: Users },
  { key: "items", label: "Item sales & margin", icon: UtensilsCrossed },
  { key: "pnl", label: "Profit & loss", icon: Scale },
  { key: "waste", label: "Food waste", icon: Trash2 },
  { key: "guests", label: "Guest meals", icon: UserRoundPlus },
] as const;
type Key = (typeof REPORTS)[number]["key"];

const Breakdown = ({ title, rows }: { title: string; rows: any[] }) => (
  <Card title={title} padded={false}>
    <Table
      dense
      rows={rows.map((r, i) => ({ ...r, id: String(i) }))}
      columns={[
        {
          key: "key",
          header: "",
          render: (r: any) => (
            <span className="font-semibold">{titleCase(r.key)}</span>
          ),
        },
        { key: "meals", header: "Bills", align: "right" },
        {
          key: "collected",
          header: "Collected",
          align: "right",
          render: (r: any) => inr(r.collected),
        },
        {
          key: "subsidy",
          header: "Company",
          align: "right",
          render: (r: any) => inr(r.subsidy),
        },
      ]}
    />
  </Card>
);

export default function Reports() {
  const { canteenId, session } = useAuth();
  const [key, setKey] = useState<Key>("summary");
  const [month, setMonth] = useState(today().slice(0, 7));
  const [scope, setScope] = useState<"this" | "all">("this");
  const params = {
    month,
    canteenId:
      scope === "this" || key === "company-billing" ? canteenId : undefined,
  };
  const { data, isLoading } = useQuery({
    queryKey: ["report", key, params],
    queryFn: () => api.get(`/tenant/reports/${key}`, params),
  });
  const meta = REPORTS.find((r) => r.key === key)!;

  const body = () => {
    if (isLoading || !data) return <Loading />;
    switch (key) {
      case "summary": {
        const t = data.totals;
        return (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Bills / meals" value={num(t.meals)} />
              <Stat
                label="Gross sales"
                value={inr(t.gross)}
                tone="brand"
                hint={`Discounts ${inr(t.discount)}`}
              />
              <Stat label="Collected" value={inr(t.collected)} tone="green" />
              <Stat
                label="Billable to client"
                value={inr(t.subsidy)}
                tone="violet"
                hint={`GST incl. ${inr(t.tax)}`}
              />
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              <Breakdown title="By meal session" rows={data.bySession} />
              <Breakdown title="By payment mode" rows={data.byPayment} />
              <Breakdown title="By consumer type" rows={data.byConsumer} />
              <Breakdown title="By channel" rows={data.byChannel} />
            </div>
          </div>
        );
      }
      case "daily":
        return (
          <div className="space-y-6">
            <Card title="Gross sales per day">
              <div className="h-[260px]">
                <ResponsiveContainer>
                  <AreaChart
                    data={data.rows.map((r: any) => ({
                      ...r,
                      label: dayMonth(r.date),
                    }))}
                  >
                    <defs>
                      <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#2442c7"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor="#2442c7"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={50}
                    />
                    <Tooltip
                      formatter={(v: any) => inr(v)}
                      contentStyle={{ borderRadius: 12, fontSize: 12 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="gross"
                      stroke="#2442c7"
                      strokeWidth={2}
                      fill="url(#g)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card padded={false}>
              <Table
                rows={data.rows.map((r: any) => ({ ...r, id: r.date }))}
                columns={[
                  {
                    key: "date",
                    header: "Date",
                    render: (r: any) => dOnly(r.date),
                  },
                  { key: "meals", header: "Meals", align: "right" },
                  { key: "employees", header: "Employees", align: "right" },
                  { key: "guests", header: "Guests", align: "right" },
                  {
                    key: "gross",
                    header: "Gross",
                    align: "right",
                    render: (r: any) => inr(r.gross),
                  },
                  {
                    key: "collected",
                    header: "Collected",
                    align: "right",
                    render: (r: any) => inr(r.collected),
                  },
                  {
                    key: "subsidy",
                    header: "Company",
                    align: "right",
                    render: (r: any) => inr(r.subsidy),
                  },
                ]}
              />
            </Card>
          </div>
        );
      case "company-billing":
        return (
          <Card className="print-area">
            <div className="flex flex-wrap justify-between gap-6 border-b border-slate-100 pb-5">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Billing statement
                </div>
                <div className="text-2xl font-extrabold">
                  {data.vendor.name}
                </div>
                <div className="text-sm text-slate-500">
                  {data.vendor.address}
                </div>
                {data.vendor.gstin && (
                  <div className="text-sm text-slate-500">
                    GSTIN {data.vendor.gstin}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Bill to
                </div>
                <div className="text-lg font-bold">
                  {data.canteen.clientCompany ?? "—"}
                </div>
                <div className="text-sm text-slate-500">
                  {data.canteen.name}
                </div>
                {data.canteen.clientGstin && (
                  <div className="text-sm text-slate-500">
                    GSTIN {data.canteen.clientGstin}
                  </div>
                )}
                <div className="mt-1 text-sm">
                  Period: {dOnly(data.from)} – {dOnly(data.to)}
                </div>
              </div>
            </div>
            <div className="my-5 grid gap-3 sm:grid-cols-3">
              {data.bySession.map((s: any) => (
                <div key={s.session} className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs font-bold uppercase text-slate-500">
                    {s.session}
                  </div>
                  <div className="text-lg font-bold">
                    {s.meals} meals · {inr(s.amount)}
                  </div>
                </div>
              ))}
            </div>
            <Table
              dense
              rows={data.rows.map((r: any, i: number) => ({
                ...r,
                id: String(i),
              }))}
              columns={[
                {
                  key: "employeeCode",
                  header: "Code",
                  render: (r: any) => r.employeeCode ?? "—",
                },
                { key: "name", header: "Name" },
                {
                  key: "department",
                  header: "Department",
                  render: (r: any) => r.department ?? titleCase(r.type),
                },
                { key: "meals", header: "Meals", align: "right" },
                {
                  key: "amount",
                  header: "Amount",
                  align: "right",
                  render: (r: any) => inr(r.amount, 2),
                },
              ]}
            />
            <div className="ml-auto mt-5 w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Taxable value</span>
                <span>{inr(data.taxable, 2)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST @ {data.gstPct}%</span>
                <span>{inr(data.gst, 2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-extrabold">
                <span>Total payable</span>
                <span>{inr(data.total, 2)}</span>
              </div>
            </div>
          </Card>
        );
      case "payroll":
        return (
          <Card
            padded={false}
            title={`Total salary deduction: ${inr(data.total)}`}
          >
            <Table
              rows={data.rows.map((r: any, i: number) => ({
                ...r,
                id: String(i),
              }))}
              columns={[
                { key: "employeeCode", header: "Code" },
                { key: "name", header: "Name" },
                { key: "department", header: "Department" },
                { key: "meals", header: "Meals", align: "right" },
                {
                  key: "deduction",
                  header: "Deduct",
                  align: "right",
                  render: (r: any) => <b>{inr(r.deduction, 2)}</b>,
                },
              ]}
              empty={
                <Empty
                  title="No payroll-mode meals"
                  text="Employees with “Payroll” payment mode appear here."
                />
              }
            />
          </Card>
        );
      case "employees":
        return (
          <Card padded={false}>
            <Table
              rows={data.rows.map((r: any, i: number) => ({
                ...r,
                id: String(i),
              }))}
              columns={[
                { key: "employeeCode", header: "Code" },
                { key: "name", header: "Name" },
                { key: "department", header: "Department" },
                { key: "meals", header: "Meals", align: "right" },
                {
                  key: "wallet",
                  header: "Wallet",
                  align: "right",
                  render: (r: any) => inr(r.wallet),
                },
                {
                  key: "payroll",
                  header: "Payroll",
                  align: "right",
                  render: (r: any) => inr(r.payroll),
                },
                {
                  key: "cashUpiCard",
                  header: "Cash/UPI/Card",
                  align: "right",
                  render: (r: any) => inr(r.cashUpiCard),
                },
                {
                  key: "subsidy",
                  header: "Company",
                  align: "right",
                  render: (r: any) => inr(r.subsidy),
                },
              ]}
            />
          </Card>
        );
      case "departments":
        return (
          <Card padded={false}>
            <Table
              rows={data.rows.map((r: any, i: number) => ({
                ...r,
                id: String(i),
              }))}
              columns={[
                {
                  key: "department",
                  header: "Department",
                  render: (r: any) => <b>{r.department}</b>,
                },
                { key: "employees", header: "Employees", align: "right" },
                { key: "meals", header: "Meals", align: "right" },
                {
                  key: "collected",
                  header: "Collected",
                  align: "right",
                  render: (r: any) => inr(r.collected),
                },
                {
                  key: "subsidy",
                  header: "Company",
                  align: "right",
                  render: (r: any) => inr(r.subsidy),
                },
                {
                  key: "gross",
                  header: "Gross",
                  align: "right",
                  render: (r: any) => inr(r.gross),
                },
              ]}
            />
          </Card>
        );
      case "items":
        return (
          <Card padded={false}>
            <Table
              rows={data.rows.map((r: any, i: number) => ({
                ...r,
                id: String(i),
              }))}
              columns={[
                {
                  key: "item",
                  header: "Item",
                  render: (r: any) => <b>{r.item}</b>,
                },
                { key: "qty", header: "Qty", align: "right" },
                {
                  key: "revenue",
                  header: "Revenue",
                  align: "right",
                  render: (r: any) => inr(r.revenue),
                },
                {
                  key: "cost",
                  header: "Food cost",
                  align: "right",
                  render: (r: any) => (r.cost ? inr(r.cost) : "—"),
                },
                {
                  key: "margin",
                  header: "Margin",
                  align: "right",
                  render: (r: any) =>
                    r.margin != null ? (
                      <span
                        className={
                          r.margin >= 0 ? "text-emerald-700" : "text-red-600"
                        }
                      >
                        {inr(r.margin)}
                      </span>
                    ) : (
                      "—"
                    ),
                },
              ]}
            />
          </Card>
        );
      case "pnl":
        return (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat label="Income" value={inr(data.income)} tone="green" />
              <Stat label="Costs" value={inr(data.cost)} tone="rose" />
              <Stat
                label="Net profit"
                value={inr(data.profit)}
                tone={data.profit >= 0 ? "brand" : "rose"}
                hint={`${data.margin}% margin`}
              />
            </div>
            <Card padded={false}>
              {data.rows.map((r: any) => (
                <div
                  key={r.line}
                  className={clsx(
                    "flex justify-between border-b border-slate-100 px-5 py-3 text-sm last:border-0",
                    /Total|Net/.test(r.line) && "bg-slate-50 font-bold",
                  )}
                >
                  <span>{r.line}</span>
                  <span className={r.amount < 0 ? "text-red-600" : ""}>
                    {inr(r.amount)}
                  </span>
                </div>
              ))}
            </Card>
          </div>
        );
      case "waste":
        return (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat
                label="Wasted"
                value={`${data.totalWasted} kg`}
                tone="rose"
              />
              <Stat label="Prepared" value={`${data.totalPrepared} kg`} />
              <Stat
                label="Waste %"
                value={data.wastePct != null ? `${data.wastePct}%` : "—"}
                tone="amber"
              />
            </div>
            <Card padded={false}>
              <Table
                rows={data.rows.map((r: any, i: number) => ({
                  ...r,
                  id: String(i),
                }))}
                columns={[
                  {
                    key: "date",
                    header: "Date",
                    render: (r: any) => dOnly(r.date),
                  },
                  { key: "session", header: "Session" },
                  { key: "preparedKg", header: "Prepared", align: "right" },
                  { key: "wastedKg", header: "Wasted", align: "right" },
                  { key: "reason", header: "Reason" },
                ]}
              />
            </Card>
          </div>
        );
      case "guests":
        return (
          <Card padded={false}>
            <Table
              rows={data.rows.map((r: any, i: number) => ({
                ...r,
                id: String(i),
              }))}
              columns={[
                {
                  key: "date",
                  header: "Date",
                  render: (r: any) => dOnly(r.date),
                },
                {
                  key: "guest",
                  header: "Guest",
                  render: (r: any) => <b>{r.guest}</b>,
                },
                { key: "company", header: "Company" },
                { key: "purpose", header: "Purpose" },
                { key: "host", header: "Host" },
                {
                  key: "paymentMode",
                  header: "Payment",
                  render: (r: any) => titleCase(r.paymentMode),
                },
                {
                  key: "amount",
                  header: "Amount",
                  align: "right",
                  render: (r: any) => inr(r.amount),
                },
              ]}
            />
          </Card>
        );
    }
  };

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Month-end billing, payroll and performance — export any report to CSV/Excel."
        actions={
          <>
            <Input
              type="month"
              className="w-44"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
            {(session?.canteens.length ?? 0) > 1 &&
              key !== "company-billing" && (
                <Select
                  className="w-44"
                  value={scope}
                  onChange={(e) => setScope(e.target.value as any)}
                >
                  <option value="this">This canteen</option>
                  <option value="all">All canteens</option>
                </Select>
              )}
            {key === "company-billing" && (
              <Button
                variant="outline"
                icon={<Printer className="h-4 w-4" />}
                onClick={() => window.print()}
              >
                Print
              </Button>
            )}
            {!["summary"].includes(key) && (
              <Button
                icon={<Download className="h-4 w-4" />}
                onClick={() =>
                  api
                    .download(
                      `/tenant/reports/${key}`,
                      params,
                      `${key}-${month}.csv`,
                    )
                    .catch((e) => toast.error(e.message))
                }
              >
                Export CSV
              </Button>
            )}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav className="no-print h-fit space-y-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-card">
          {REPORTS.map((r) => (
            <button
              key={r.key}
              onClick={() => setKey(r.key)}
              className={clsx(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition",
                key === r.key
                  ? "bg-brand-50 text-brand-800"
                  : "text-slate-600 hover:bg-slate-50",
              )}
            >
              <r.icon className="h-4 w-4" /> {r.label}
            </button>
          ))}
        </nav>
        <div>
          <h2 className="no-print mb-4 flex items-center gap-2 text-lg font-bold">
            <ReceiptIndianRupee className="h-5 w-5 text-brand-600" />
            {meta.label}
          </h2>
          {body()}
        </div>
      </div>
    </>
  );
}
