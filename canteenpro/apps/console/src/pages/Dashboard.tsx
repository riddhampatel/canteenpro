import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  UtensilsCrossed,
  IndianRupee,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  Info,
  ScanLine,
  ShoppingCart,
  Download,
  Star,
} from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  dayMonth,
  inr,
  num,
  sessionColor,
  tOnly,
  titleCase,
  weekday,
} from "@/lib/format";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Loading,
  PageHeader,
  Stat,
  Table,
  Tabs,
} from "@/components/ui";

export default function Dashboard() {
  const { canteenId, session, can } = useAuth();
  const [range, setRange] = useState<"today" | "week" | "month">("today");
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", canteenId, range],
    queryFn: () => api.get("/tenant/dashboard", { canteenId, range }),
    refetchInterval: 30_000,
  });
  if (isLoading || !data) return <Loading />;
  const k = data.kpis;
  const rows = data.chart.rows.map((r: any) => ({
    ...r,
    label:
      range === "today"
        ? "Today"
        : range === "week"
          ? weekday(r.date)
          : dayMonth(r.date),
  }));

  return (
    <>
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${session!.user.name.split(" ")[0]}`}
        subtitle="Here is how your canteen is running."
        actions={
          <>
            {can("OWNER", "MANAGER", "CASHIER") && (
              <>
                <Link to="/counter">
                  <Button icon={<ScanLine className="h-4 w-4" />}>
                    Serve meals
                  </Button>
                </Link>
                <Link to="/pos">
                  <Button
                    variant="outline"
                    icon={<ShoppingCart className="h-4 w-4" />}
                  >
                    New bill
                  </Button>
                </Link>
              </>
            )}
          </>
        }
      />

      <div className="mb-4 flex justify-end">
        <Tabs
          value={range}
          onChange={setRange}
          items={[
            { value: "today", label: "Today" },
            { value: "week", label: "This Week" },
            { value: "month", label: "This Month" },
          ]}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Meals served"
          value={num(k.meals)}
          icon={<UtensilsCrossed className="h-5 w-5" />}
          hint={`${k.uniqueEaters} employees · ${k.guests} guests/walk-ins`}
        />
        <Stat
          label="Collected"
          value={inr(k.revenue)}
          icon={<IndianRupee className="h-5 w-5" />}
          tone="green"
          hint="Wallet, payroll, cash & UPI"
        />
        <Stat
          label="Billable to client"
          value={inr(k.subsidy)}
          icon={<Building2 className="h-5 w-5" />}
          tone="violet"
          hint="Company subsidy on meals"
        />
        <Stat
          label="Today's menu"
          value={
            <span
              className={
                data.menuStatus.published
                  ? "text-emerald-700"
                  : "text-amber-600"
              }
            >
              {data.menuStatus.published ? "Live" : "Not set"}
            </span>
          }
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone={data.menuStatus.published ? "green" : "amber"}
          hint={`${data.menuStatus.items} items · ${data.menuStatus.soldOut} sold out · ${k.activeEmployees} active employees`}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {/*  Meal volume chart card */}
        <Card
          className="xl:col-span-2"
          title={
            <div>
              <h3 className="text-base font-bold">Meal volume</h3>
              <p className="text-xs text-slate-500">Meals served by session</p>
            </div>
          }
        >
          {k.meals === 0 ? (
            <Empty
              title="No meals yet"
              text="Meals served at the counter, by QR scan or biometric appear here in real time."
            />
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer>
                <BarChart
                  data={rows}
                  barCategoryGap={range === "month" ? 2 : 18}
                  maxBarSize={72}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    interval={range === "month" ? 2 : 0}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    width={32}
                  />
                  <Tooltip
                    cursor={{ fill: "#f1f5f9" }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      fontSize: 12,
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  {data.chart.sessions.map((s: string, i: number) => (
                    <Bar
                      key={s}
                      dataKey={s}
                      stackId="a"
                      fill={sessionColor(s, i)}
                      radius={
                        i === data.chart.sessions.length - 1 ? [6, 6, 0, 0] : 0
                      }
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Alerts card */}
        <Card title="System alerts">
          {data.alerts.length === 0 ? (
            <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-5 w-5" />
              <div>
                <div className="font-semibold">All good</div>
                <div className="text-sm">No issues need your attention.</div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {data.alerts.map((a: any, i: number) => {
                const Icon = a.level === "info" ? Info : AlertTriangle;
                return (
                  <Link
                    to={a.link ?? "#"}
                    key={i}
                    className={clsx(
                      "flex items-start gap-3 rounded-xl border p-3.5 transition hover:shadow-sm",
                      a.level === "danger" &&
                        "border-red-200 bg-red-50 text-red-800",
                      a.level === "warning" &&
                        "border-amber-200 bg-amber-50 text-amber-900",
                      a.level === "info" &&
                        "border-slate-200 bg-slate-50 text-slate-700",
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <div className="text-sm font-semibold">{a.title}</div>
                      <div className="text-xs opacity-80">{a.text}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          {data.forecast.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Opt-ins vs served today
              </div>
              {data.forecast.map((f: any) => (
                <div key={f.sessionId} className="mb-3">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold">{f.session}</span>
                    <span className="text-slate-500">
                      {f.served} / {f.optedIn}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-600"
                      style={{
                        width: `${Math.min(100, (f.served / Math.max(1, f.optedIn)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">

        {/* Meal records table card */}
        <Card
          className="xl:col-span-2"
          padded={false}
          title="Who ate today"
          actions={
            <>
              <Link to="/transactions">
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Download className="h-4 w-4" />}
                >
                  All records
                </Button>
              </Link>
            </>
          }
        >
          <Table
            rows={data.recent}
            empty={<Empty title="No meals served today yet" />}
            columns={[
              {
                key: "name",
                header: "Consumer",
                render: (r: any) => (
                  <div className="flex items-center gap-3">
                    <Avatar name={r.name} size={34} />
                    <div>
                      <div className="font-semibold text-ink">{r.name}</div>
                      <div className="text-xs text-slate-500">
                        {r.consumerType === "EMPLOYEE"
                          ? `${r.employeeCode} · ${r.department ?? "—"}`
                          : titleCase(r.consumerType)}
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                key: "time",
                header: "Time",
                render: (r: any) => tOnly(r.createdAt),
              },
              {
                key: "session",
                header: "Meal",
                render: (r: any) => <Badge>{r.session ?? "À la carte"}</Badge>,
              },
              {
                key: "channel",
                header: "Via",
                render: (r: any) => (
                  <span className="text-xs text-slate-500">
                    {titleCase(r.channel)}
                  </span>
                ),
              },
              {
                key: "total",
                header: "Paid",
                align: "right",
                render: (r: any) => (
                  <span className="font-semibold">{inr(r.total)}</span>
                ),
              },
            ]}
          />
        </Card>

        <div className="space-y-6">

          {/* Payment mix card */}
          <Card title="Payment mix">
            {data.payMix.length ? (
              <div className="space-y-3">
                {data.payMix
                  .sort((a: any, b: any) => b.amount - a.amount)
                  .map((p: any) => (
                    <div
                      key={p.mode}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-semibold">{titleCase(p.mode)}</span>
                      <span className="text-slate-500">
                        {p.count} ·{" "}
                        <span className="font-semibold text-ink">
                          {inr(p.amount)}
                        </span>
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No sales in this period.</p>
            )}
          </Card>
           {/* top items card */}
          <Card
            title="Top items"
            actions={
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{" "}
                {k.avgRating || "–"} avg rating
              </span>
            }
          >
            {data.topItems.length ? (
              <ol className="space-y-2.5">
                {data.topItems.map((t: any, i: number) => (
                  <li key={t.name} className="flex items-center gap-3 text-sm">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate font-medium">
                      {t.name}
                    </span>
                    <span className="text-slate-500">{t.qty}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-500">
                No items sold in this period.
              </p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
