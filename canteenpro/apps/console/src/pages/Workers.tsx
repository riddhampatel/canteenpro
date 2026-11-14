import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import clsx from "clsx";
import { Download } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { inr, today } from "@/lib/format";
import CrudPage from "@/components/CrudPage";
import {
  Button,
  Card,
  Empty,
  Input,
  PageHeader,
  Table,
  Tabs,
} from "@/components/ui";
import Papa from "papaparse";

const STATUSES = [
  { v: "PRESENT", l: "P", c: "bg-emerald-600" },
  { v: "HALF_DAY", l: "H", c: "bg-amber-500" },
  { v: "LEAVE", l: "L", c: "bg-sky-500" },
  { v: "ABSENT", l: "A", c: "bg-red-600" },
];

function Attendance() {
  const { canteenId } = useAuth();
  const qc = useQueryClient();
  const [date, setDate] = useState(today());
  const [marks, setMarks] = useState<Record<string, string>>({});
  const { data } = useQuery({
    queryKey: ["attendance", canteenId, date],
    queryFn: () => api.get("/tenant/workers/attendance", { canteenId, date }),
  });
  useEffect(() => {
    const m: Record<string, string> = {};
    data?.rows?.forEach((r: any) => (m[r.workerId] = r.status ?? ""));
    setMarks(m);
  }, [data]);
  const save = useMutation({
    mutationFn: () =>
      api.put("/tenant/workers/attendance", {
        date,
        entries: Object.entries(marks)
          .filter(([, s]) => s)
          .map(([workerId, status]) => ({ workerId, status })),
      }),
    onSuccess: (r: any) => {
      toast.success(`Attendance saved for ${r.saved} staff`);
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Card
      padded={false}
      title="Daily attendance"
      actions={
        <>
          <Input
            type="date"
            className="w-40"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Button
            variant="outline"
            onClick={() =>
              setMarks(
                Object.fromEntries(
                  (data?.rows ?? []).map((r: any) => [r.workerId, "PRESENT"]),
                ),
              )
            }
          >
            Mark all present
          </Button>
          <Button loading={save.isPending} onClick={() => save.mutate()}>
            Save
          </Button>
        </>
      }
    >
      {!data?.rows?.length ? (
        <Empty
          title="No kitchen staff yet"
          text="Add cooks, helpers and cleaners in the Staff tab to track attendance and wages."
        />
      ) : (
        <Table
          rows={data.rows.map((r: any) => ({ ...r, id: r.workerId }))}
          columns={[
            {
              key: "name",
              header: "Name",
              render: (r: any) => (
                <div>
                  <div className="font-semibold text-ink">{r.name}</div>
                  <div className="text-xs text-slate-500">{r.role}</div>
                </div>
              ),
            },
            {
              key: "in",
              header: "Check-in",
              render: (r: any) =>
                r.checkIn
                  ? new Date(r.checkIn).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—",
            },
            {
              key: "out",
              header: "Check-out",
              render: (r: any) =>
                r.checkOut
                  ? new Date(r.checkOut).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—",
            },
            {
              key: "s",
              header: "Status",
              render: (r: any) => (
                <div className="flex gap-1.5">
                  {STATUSES.map((s) => (
                    <button
                      key={s.v}
                      title={s.v}
                      onClick={() => setMarks({ ...marks, [r.workerId]: s.v })}
                      className={clsx(
                        "h-9 w-9 rounded-lg text-sm font-bold transition",
                        marks[r.workerId] === s.v
                          ? `${s.c} text-white`
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                      )}
                    >
                      {s.l}
                    </button>
                  ))}
                </div>
              ),
            },
          ]}
        />
      )}
    </Card>
  );
}

function Summary() {
  const { canteenId } = useAuth();
  const [month, setMonth] = useState(today().slice(0, 7));
  const { data } = useQuery({
    queryKey: ["att-summary", canteenId, month],
    queryFn: () =>
      api.get("/tenant/workers/attendance/summary", { canteenId, month }),
  });
  const total = data?.rows?.reduce((a: number, r: any) => a + r.wages, 0) ?? 0;
  return (
    <Card
      padded={false}
      title={`Wages for ${month} · ${inr(total)}`}
      actions={
        <>
          <Input
            type="month"
            className="w-40"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <Button
            variant="outline"
            icon={<Download className="h-4 w-4" />}
            onClick={() => {
              const a = document.createElement("a");
              a.href = URL.createObjectURL(
                new Blob([Papa.unparse(data?.rows ?? [])]),
              );
              a.download = `wages-${month}.csv`;
              a.click();
            }}
          >
            Export
          </Button>
        </>
      }
    >
      <Table
        rows={(data?.rows ?? []).map((r: any) => ({ ...r, id: r.workerId }))}
        columns={[
          {
            key: "name",
            header: "Name",
            render: (r: any) => (
              <div>
                <div className="font-semibold text-ink">{r.name}</div>
                <div className="text-xs text-slate-500">{r.role}</div>
              </div>
            ),
          },
          { key: "present", header: "Present", align: "center" },
          { key: "halfDay", header: "Half day", align: "center" },
          { key: "leave", header: "Leave", align: "center" },
          { key: "absent", header: "Absent", align: "center" },
          {
            key: "dailyWage",
            header: "Daily wage",
            align: "right",
            render: (r: any) => inr(r.dailyWage),
          },
          {
            key: "wages",
            header: "Payable",
            align: "right",
            render: (r: any) => <b>{inr(r.wages)}</b>,
          },
        ]}
      />
    </Card>
  );
}

export default function Workers() {
  const [tab, setTab] = useState<"att" | "staff" | "sum">("att");
  return (
    <>
      <PageHeader
        title="Kitchen staff"
        subtitle="Cooks, helpers and cleaners — attendance (manual or biometric punch) and monthly wages."
      />
      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        items={[
          { value: "att", label: "Attendance" },
          { value: "staff", label: "Staff" },
          { value: "sum", label: "Monthly wages" },
        ]}
      />
      {tab === "att" && <Attendance />}
      {tab === "sum" && <Summary />}
      {tab === "staff" && (
        <CrudPage
          cfg={{
            embedded: true,
            title: "Kitchen staff",
            endpoint: "/tenant/workers/staff",
            queryKey: "workers",
            canteenScoped: true,
            addLabel: "Add staff",
            defaults: { isActive: true, dailyWage: 500 },
            columns: [
              {
                key: "name",
                header: "Name",
                render: (r) => <span className="font-semibold">{r.name}</span>,
              },
              { key: "role", header: "Role" },
              { key: "phone", header: "Phone" },
              {
                key: "dailyWage",
                header: "Daily wage",
                align: "right",
                render: (r) => inr(r.dailyWage),
              },
              { key: "biometricId", header: "Biometric ID" },
            ],
            fields: [
              { name: "name", label: "Name", required: true },
              {
                name: "role",
                label: "Role",
                type: "select",
                required: true,
                options: [
                  "Head Cook",
                  "Cook",
                  "Helper",
                  "Cleaner",
                  "Cashier",
                  "Supervisor",
                  "Delivery",
                ].map((v) => ({ value: v, label: v })),
              },
              { name: "phone", label: "Phone" },
              { name: "dailyWage", label: "Daily wage (₹)", type: "number" },
              {
                name: "biometricId",
                label: "Biometric ID",
                hint: "For check-in/out punches on the device",
              },
              { name: "isActive", label: "Active", type: "toggle" },
            ],
          }}
        />
      )}
    </>
  );
}
