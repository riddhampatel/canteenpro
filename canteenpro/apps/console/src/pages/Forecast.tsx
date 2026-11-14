import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChefHat,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  CheckCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  addDays,
  dayMonth,
  sessionColor,
  titleCase,
  today,
  weekday,
} from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  Input,
  Loading,
  PageHeader,
  SearchInput,
  Table,
  statusTone,
} from "@/components/ui";

export default function Forecast() {
  const { canteenId } = useAuth();
  const [date, setDate] = useState(today());
  const [sel, setSel] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["forecast", canteenId, date],
    queryFn: () => api.get("/tenant/opt-ins/forecast", { canteenId, date }),
  });
  const sessionId = sel ?? data?.sessions?.[0]?.session.id;
  const { data: list = [] } = useQuery({
    queryKey: ["optins", canteenId, date, sessionId],
    queryFn: () =>
      api.get("/tenant/opt-ins", { canteenId, date, mealSessionId: sessionId }),
    enabled: !!sessionId,
  });
  const shown = list.filter(
    (r: any) =>
      !q ||
      r.name.toLowerCase().includes(q.toLowerCase()) ||
      r.employeeCode.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <>
      <PageHeader
        title="Opt-ins & headcount forecast"
        subtitle="Cook for the people who will actually eat. Prediction = confirmed opt-ins + typical turn-up of those who didn't respond (last 14 days)."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDate(today())}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDate(addDays(today(), 1))}
            >
              Tomorrow
            </Button>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-40"
            />
          </div>
        }
      />
      {isLoading || !data ? (
        <Loading />
      ) : (
        <>
          <div className="mb-2 text-sm text-slate-500">
            {weekday(date)}, {dayMonth(date)} · {data.employees} active
            employees in this canteen
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {data.sessions.map((s: any, i: number) => (
              <button
                key={s.session.id}
                onClick={() => setSel(s.session.id)}
                className={`rounded-2xl border-2 bg-white p-5 text-left shadow-card transition ${sessionId === s.session.id ? "border-brand-500" : "border-transparent"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: sessionColor(s.session.name, i) }}
                    />
                    {s.session.name}
                  </div>
                  <span className="text-xs text-slate-500">
                    {s.session.startTime}-{s.session.endTime}
                  </span>
                </div>
                <div className="mt-4 flex items-end gap-2">
                  <ChefHat className="mb-1 h-6 w-6 text-brand-600" />
                  <div className="text-4xl font-extrabold">{s.predicted}</div>
                  <div className="mb-1 text-sm text-slate-500">
                    plates to prepare
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                    <ThumbsUp className="mx-auto mb-1 h-3.5 w-3.5" />
                    <b>{s.optedIn}</b>
                    <div>In</div>
                  </div>
                  <div className="rounded-lg bg-red-50 p-2 text-red-700">
                    <ThumbsDown className="mx-auto mb-1 h-3.5 w-3.5" />
                    <b>{s.optedOut}</b>
                    <div>Out</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2 text-slate-600">
                    <HelpCircle className="mx-auto mb-1 h-3.5 w-3.5" />
                    <b>{s.noResponse}</b>
                    <div>No reply</div>
                  </div>
                  <div className="rounded-lg bg-brand-50 p-2 text-brand-700">
                    <CheckCheck className="mx-auto mb-1 h-3.5 w-3.5" />
                    <b>{s.served}</b>
                    <div>Served</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  Avg last 14 days: {s.avgLast14Days} · cut-off{" "}
                  {s.session.optInCutoff ?? "none"}
                </div>
              </button>
            ))}
          </div>
          <Card className="mt-6" padded={false} title="Employee responses">
            <div className="border-b border-slate-100 p-4">
              <SearchInput
                value={q}
                onChange={setQ}
                placeholder="Search employee…"
              />
            </div>
            <Table
              rows={shown}
              columns={[
                {
                  key: "name",
                  header: "Employee",
                  render: (r: any) => (
                    <div>
                      <div className="font-semibold text-ink">{r.name}</div>
                      <div className="text-xs text-slate-500">
                        {r.employeeCode}
                      </div>
                    </div>
                  ),
                },
                { key: "department", header: "Department" },
                {
                  key: "status",
                  header: "Response",
                  render: (r: any) => (
                    <Badge tone={statusTone(r.status)}>
                      {r.status ? titleCase(r.status) : "No response"}
                    </Badge>
                  ),
                },
              ]}
            />
          </Card>
        </>
      )}
    </>
  );
}
