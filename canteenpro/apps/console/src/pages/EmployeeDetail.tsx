import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  KeyRound,
  Pencil,
  Printer,
  RefreshCw,
  Wallet,
  Download,
  UserX,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { addDays, dt, inr, titleCase, today } from "@/lib/format";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmButton,
  Field,
  Input,
  Loading,
  Modal,
  Select,
  Stat,
  Table,
  Tabs,
  statusTone,
} from "@/components/ui";
import { EmployeeForm, empBody } from "./Employees";

export default function EmployeeDetail() {
  const { id } = useParams();
  const { canteenId, session, can } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"meals" | "wallet">("meals");
  const [edit, setEdit] = useState<any>(null);
  const [recharge, setRecharge] = useState<any>(null);
  const [card, setCard] = useState(false);
  const [pin, setPin] = useState<string | null>(null);

  const { data: e } = useQuery({
    queryKey: ["employee", id],
    queryFn: () => api.get(`/tenant/employees/${id}`),
  });
  const { data: wallet } = useQuery({
    queryKey: ["employee-wallet", id],
    queryFn: () => api.get(`/tenant/employees/${id}/wallet`, { pageSize: 50 }),
  });
  const { data: meals } = useQuery({
    queryKey: ["employee-meals", id],
    queryFn: () =>
      api.get("/tenant/orders", {
        employeeId: id,
        from: addDays(today(), -60),
        to: today(),
        pageSize: 50,
      }),
  });
  const { data: depts } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.get("/tenant/departments", { pageSize: 200 }),
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["employee", id] });
    qc.invalidateQueries({ queryKey: ["employee-wallet", id] });
    qc.invalidateQueries({ queryKey: ["employees"] });
  };

  const save = useMutation({
    mutationFn: (v: any) =>
      api.patch(`/tenant/employees/${id}`, empBody(v, canteenId)),
    onSuccess: () => {
      toast.success("Saved");
      setEdit(null);
      refresh();
    },
    onError: (err: any) => toast.error(err.message),
  });
  const move = useMutation({
    mutationFn: (v: any) =>
      api.post(`/tenant/employees/${id}/wallet`, {
        ...v,
        amount: Number(v.amount),
      }),
    onSuccess: (r: any) => {
      toast.success(`New balance ${inr(r.balance)}`);
      setRecharge(null);
      refresh();
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!e) return <Loading />;
  return (
    <>
      <Link
        to="/employees"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" /> Employees
      </Link>
      <Card>
        <div className="flex flex-wrap items-center gap-5">
          <Avatar name={e.name} src={e.photoUrl} size={72} />
          <div className="min-w-[200px] flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold">{e.name}</h1>
              <Badge tone={statusTone(e.status)}>{titleCase(e.status)}</Badge>
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {e.employeeCode} · {e.department?.name ?? "No department"} ·{" "}
              {e.designation ?? "—"} · {e.phone ?? "no phone"}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="brand">Pays by {titleCase(e.defaultPayMode)}</Badge>
              <Badge tone="green">{titleCase(e.dietaryPref)}</Badge>
              {e.biometricSynced ? (
                <Badge tone="green">Biometric synced</Badge>
              ) : (
                <Badge tone="red">Biometric pending</Badge>
              )}
              {!e.hasPin && <Badge tone="amber">No app PIN</Badge>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              icon={<Pencil className="h-4 w-4" />}
              onClick={() =>
                setEdit({ ...e, departmentId: e.departmentId ?? "" })
              }
            >
              Edit
            </Button>
            <Button
              variant="outline"
              icon={<Printer className="h-4 w-4" />}
              onClick={() => setCard(true)}
            >
              ID / QR card
            </Button>
            <ConfirmButton
              variant="outline"
              icon={<KeyRound className="h-4 w-4" />}
              message="Generate a new app PIN for this employee?"
              onConfirm={async () => {
                const r = await api.post(`/tenant/employees/${id}/reset-pin`);
                setPin(r.pin);
              }}
            >
              Reset PIN
            </ConfirmButton>
            <Button
              icon={<Wallet className="h-4 w-4" />}
              onClick={() =>
                setRecharge({
                  type: "CREDIT",
                  amount: "",
                  reason: "RECHARGE",
                  note: "",
                  reference: "",
                })
              }
            >
              Wallet
            </Button>
          </div>
        </div>
      </Card>

      <div className="my-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Wallet balance"
          value={inr(e.walletBalance)}
          tone={e.walletBalance < 100 ? "rose" : "green"}
          hint={
            e.monthlyAllowance
              ? `+${inr(e.monthlyAllowance)} allowance monthly`
              : "No monthly allowance"
          }
        />
        <Stat label="Meals this month" value={e.stats?.mealsThisMonth ?? 0} />
        <Stat
          label="Spent this month"
          value={inr(e.stats?.spentThisMonth)}
          tone="amber"
        />
        <Stat
          label="Lifetime meals"
          value={e.stats?.lifetimeMeals ?? 0}
          tone="violet"
          hint={
            e.stats?.lastMealAt ? `Last: ${dt(e.stats.lastMealAt)}` : undefined
          }
        />
      </div>

      <Card
        padded={false}
        title={
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: "meals", label: "Meal history" },
              { value: "wallet", label: "Wallet ledger" },
            ]}
          />
        }
        actions={
          tab === "meals" && (
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="h-4 w-4" />}
              onClick={() =>
                api.download(
                  "/tenant/reports/employees",
                  { employeeId: id, range: "thisMonth" },
                  `statement-${e.employeeCode}.csv`,
                )
              }
            >
              Monthly statement
            </Button>
          )
        }
      >
        {tab === "meals" ? (
          <Table
            rows={meals?.items ?? []}
            columns={[
              {
                key: "billNo",
                header: "Bill",
                render: (r: any) => (
                  <span className="font-mono text-xs">{r.billNo}</span>
                ),
              },
              {
                key: "d",
                header: "Date & time",
                render: (r: any) => dt(r.createdAt),
              },
              {
                key: "s",
                header: "Meal",
                render: (r: any) => <Badge>{r.session ?? "À la carte"}</Badge>,
              },
              {
                key: "c",
                header: "Via",
                render: (r: any) => titleCase(r.channel),
              },
              {
                key: "p",
                header: "Payment",
                render: (r: any) => titleCase(r.paymentMode),
              },
              {
                key: "sub",
                header: "Company",
                align: "right",
                render: (r: any) => inr(r.subsidyAmount),
              },
              {
                key: "t",
                header: "Paid",
                align: "right",
                render: (r: any) => <b>{inr(r.total)}</b>,
              },
              {
                key: "st",
                header: "",
                render: (r: any) =>
                  r.status !== "COMPLETED" && (
                    <Badge tone="red">{titleCase(r.status)}</Badge>
                  ),
              },
            ]}
          />
        ) : (
          <Table
            rows={wallet?.items ?? []}
            columns={[
              { key: "d", header: "Date", render: (r: any) => dt(r.createdAt) },
              {
                key: "reason",
                header: "Type",
                render: (r: any) => (
                  <Badge tone={r.type === "CREDIT" ? "green" : "slate"}>
                    {titleCase(r.reason)}
                  </Badge>
                ),
              },
              {
                key: "note",
                header: "Note",
                render: (r: any) => r.note ?? r.reference ?? "—",
              },
              {
                key: "amt",
                header: "Amount",
                align: "right",
                render: (r: any) => (
                  <span
                    className={
                      r.type === "CREDIT"
                        ? "font-bold text-emerald-600"
                        : "font-bold text-slate-700"
                    }
                  >
                    {r.type === "CREDIT" ? "+" : "−"}
                    {inr(r.amount)}
                  </span>
                ),
              },
              {
                key: "bal",
                header: "Balance",
                align: "right",
                render: (r: any) => inr(r.balanceAfter),
              },
            ]}
          />
        )}
      </Card>

      {can("OWNER", "MANAGER") && e.status === "ACTIVE" && (
        <div className="mt-6 flex justify-end">
          <ConfirmButton
            variant="ghost"
            icon={<UserX className="h-4 w-4" />}
            message="Deactivate this employee? They will not be able to eat or log in. History is kept."
            onConfirm={async () => {
              await api.del(`/tenant/employees/${id}`);
              refresh();
              toast.success("Employee deactivated");
            }}
          >
            Deactivate employee
          </ConfirmButton>
        </div>
      )}

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        size="lg"
        title="Edit employee"
        footer={
          <Button loading={save.isPending} onClick={() => save.mutate(edit)}>
            Save
          </Button>
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
        open={!!recharge}
        onClose={() => setRecharge(null)}
        size="sm"
        title="Wallet transaction"
        footer={
          <Button
            loading={move.isPending}
            disabled={!Number(recharge?.amount)}
            onClick={() => move.mutate(recharge)}
          >
            Save
          </Button>
        }
      >
        {recharge && (
          <div className="space-y-4">
            <Field label="Type">
              <Select
                value={recharge.type}
                onChange={(ev) =>
                  setRecharge({
                    ...recharge,
                    type: ev.target.value,
                    reason:
                      ev.target.value === "CREDIT" ? "RECHARGE" : "ADJUSTMENT",
                  })
                }
              >
                <option value="CREDIT">Add money (credit)</option>
                <option value="DEBIT">Deduct (debit)</option>
              </Select>
            </Field>
            <Field label="Amount (₹)">
              <Input
                type="number"
                autoFocus
                value={recharge.amount}
                onChange={(ev) =>
                  setRecharge({ ...recharge, amount: ev.target.value })
                }
              />
            </Field>
            <Field label="Reason">
              <Select
                value={recharge.reason}
                onChange={(ev) =>
                  setRecharge({ ...recharge, reason: ev.target.value })
                }
              >
                {["RECHARGE", "ALLOWANCE", "REFUND", "ADJUSTMENT"].map((r) => (
                  <option key={r} value={r}>
                    {titleCase(r)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Reference" hint="UPI ref / receipt no. (optional)">
              <Input
                value={recharge.reference}
                onChange={(ev) =>
                  setRecharge({ ...recharge, reference: ev.target.value })
                }
              />
            </Field>
          </div>
        )}
      </Modal>

      <Modal
        open={!!pin}
        onClose={() => setPin(null)}
        size="sm"
        title="New app PIN"
      >
        <div className="text-center">
          <div className="font-mono text-4xl font-extrabold tracking-[0.3em] text-brand-800">
            {pin}
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Share it with {e.name}. They'll be asked to change it on next login.
          </p>
        </div>
      </Modal>

      <Modal
        open={card}
        onClose={() => setCard(false)}
        size="sm"
        title="Employee meal card"
        footer={
          <>
            <ConfirmButton
              variant="outline"
              icon={<RefreshCw className="h-4 w-4" />}
              message="Generate a new QR? The old card/QR stops working immediately."
              onConfirm={async () => {
                await api.post(`/tenant/employees/${id}/rotate-qr`);
                refresh();
                toast.success("New QR generated");
              }}
            >
              New QR
            </ConfirmButton>
            <Button
              icon={<Printer className="h-4 w-4" />}
              onClick={() => window.print()}
            >
              Print
            </Button>
          </>
        }
      >
        <div className="print-area mx-auto w-[300px] overflow-hidden rounded-2xl border border-slate-200 shadow-card">
          <div className="bg-brand-800 px-5 py-3 text-white">
            <div className="text-xs opacity-80">{session?.tenant.name}</div>
            <div className="font-bold">Canteen Meal Card</div>
          </div>
          <div className="flex flex-col items-center p-5">
            <QRCodeSVG value={e.qr} size={170} />
            <div className="mt-3 text-lg font-extrabold">{e.name}</div>
            <div className="text-sm text-slate-500">
              {e.employeeCode} · {e.department?.name ?? ""}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
