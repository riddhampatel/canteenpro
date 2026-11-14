import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Download,
  Printer,
  ReceiptText,
  UtensilsCrossed,
  IndianRupee,
  Users,
  Building2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { addDays, dt, inr, PAY_MODES, titleCase, today } from "@/lib/format";
import {
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
  Stat,
  Table,
  statusTone,
  Textarea,
} from "@/components/ui";
import { Receipt } from "./Pos";

export default function Transactions() {
  const { canteenId, can } = useAuth();
  const qc = useQueryClient();
  const [f, setF] = useState({
    from: addDays(today(), -6),
    to: today(),
    q: "",
    mealSessionId: "",
    consumerType: "",
    paymentMode: "",
    status: "",
  });
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [print, setPrint] = useState<any>(null);
  const [reason, setReason] = useState("");
  const set = (k: string, v: string) => {
    setF({ ...f, [k]: v });
    setPage(1);
  };

  const { data: canteens } = useQuery({
    queryKey: ["canteens"],
    queryFn: () => api.get("/tenant/canteens"),
  });
  const sessions =
    canteens?.find((c: any) => c.id === canteenId)?.sessions ?? [];
  const query = { ...f, canteenId, page, pageSize: 25 };
  const { data } = useQuery({
    queryKey: ["orders", query],
    queryFn: () => api.get("/tenant/orders", query),
  });
  const { data: order } = useQuery({
    queryKey: ["order", openId],
    queryFn: () => api.get(`/tenant/orders/${openId}`),
    enabled: !!openId,
  });

  const cancel = useMutation({
    mutationFn: () => api.post(`/tenant/orders/${openId}/cancel`, { reason }),
    onSuccess: () => {
      toast.success(
        "Bill cancelled" +
          (order?.paymentMode === "WALLET" ? " and wallet refunded" : ""),
      );
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order", openId] });
      setReason("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const s = data?.summary;
  return (
    <>
      <PageHeader
        title="Billing & transactions"
        subtitle="Every meal served and bill raised — the single source of truth for billing."
        actions={
          <Button
            variant="outline"
            icon={<Download className="h-4 w-4" />}
            onClick={() =>
              api
                .download(
                  "/tenant/orders",
                  { ...f, canteenId },
                  `transactions-${f.from}-${f.to}.csv`,
                )
                .catch((e) => toast.error(e.message))
            }
          >
            Export CSV
          </Button>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Meals / bills"
          value={s?.meals ?? "—"}
          icon={<UtensilsCrossed className="h-5 w-5" />}
        />
        <Stat
          label="Collected"
          value={inr(s?.total)}
          icon={<IndianRupee className="h-5 w-5" />}
          tone="green"
        />
        <Stat
          label="Company subsidy"
          value={inr(s?.subsidy)}
          icon={<Building2 className="h-5 w-5" />}
          tone="violet"
        />
        <Stat
          label="Unique employees"
          value={s?.consumers ?? "—"}
          icon={<Users className="h-5 w-5" />}
          tone="amber"
        />
      </div>
      <Card padded={false}>
        <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-4 xl:grid-cols-8">
          <SearchInput
            className="md:col-span-2"
            value={f.q}
            onChange={(v) => set("q", v)}
            placeholder="Bill no, name, emp code…"
          />
          <Input
            type="date"
            value={f.from}
            onChange={(e) => set("from", e.target.value)}
          />
          <Input
            type="date"
            value={f.to}
            onChange={(e) => set("to", e.target.value)}
          />
          <Select
            value={f.mealSessionId}
            onChange={(e) => set("mealSessionId", e.target.value)}
          >
            <option value="">All meals</option>
            {sessions.map((x: any) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </Select>
          <Select
            value={f.consumerType}
            onChange={(e) => set("consumerType", e.target.value)}
          >
            <option value="">All consumers</option>
            <option value="EMPLOYEE">Employees</option>
            <option value="GUEST">Guests</option>
            <option value="WALK_IN">Walk-in</option>
          </Select>
          <Select
            value={f.paymentMode}
            onChange={(e) => set("paymentMode", e.target.value)}
          >
            <option value="">All payments</option>
            {PAY_MODES.map((m) => (
              <option key={m} value={m}>
                {titleCase(m)}
              </option>
            ))}
          </Select>
          <Select
            value={f.status}
            onChange={(e) => set("status", e.target.value)}
          >
            <option value="">Any status</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </div>
        <Table
          rows={data?.items ?? []}
          onRowClick={(r: any) => setOpenId(r.id)}
          columns={[
            {
              key: "billNo",
              header: "Bill",
              render: (r: any) => (
                <span className="font-mono text-xs">{r.billNo}</span>
              ),
            },
            {
              key: "n",
              header: "Consumer",
              render: (r: any) => (
                <div>
                  <div className="font-semibold text-ink">
                    {r.employeeName ?? r.guestName ?? r.walkInName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {r.employeeCode
                      ? `${r.employeeCode} · ${r.department ?? "—"}`
                      : titleCase(r.consumerType)}
                  </div>
                </div>
              ),
            },
            {
              key: "t",
              header: "Date & time",
              render: (r: any) => dt(r.createdAt),
            },
            {
              key: "s",
              header: "Meal",
              render: (r: any) => <Badge>{r.session ?? "À la carte"}</Badge>,
            },
            {
              key: "p",
              header: "Payment",
              render: (r: any) => (
                <span className="text-xs font-semibold text-slate-600">
                  {titleCase(r.paymentMode)}
                </span>
              ),
            },
            {
              key: "sub",
              header: "Company",
              align: "right",
              render: (r: any) =>
                r.subsidyAmount ? inr(r.subsidyAmount) : "—",
            },
            {
              key: "total",
              header: "Collected",
              align: "right",
              render: (r: any) => (
                <span className="font-bold">{inr(r.total)}</span>
              ),
            },
            {
              key: "st",
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
        open={!!openId}
        onClose={() => setOpenId(null)}
        title={
          <span className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5" /> {order?.billNo ?? "Bill"}
          </span>
        }
        footer={
          order && (
            <Button
              variant="outline"
              icon={<Printer className="h-4 w-4" />}
              onClick={() => {
                setPrint(order);
                setOpenId(null);
              }}
            >
              Print
            </Button>
          )
        }
      >
        {order && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-500">Consumer</div>
                <div className="font-semibold">
                  {order.employee?.name ??
                    order.guest?.name ??
                    order.walkInName}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Date</div>
                <div className="font-semibold">{dt(order.createdAt)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Meal</div>
                <div className="font-semibold">
                  {order.session?.name ?? "À la carte"}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">
                  Channel / served by
                </div>
                <div className="font-semibold">
                  {titleCase(order.channel)} · {order.servedBy?.name ?? "Self"}
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-100">
              {order.items.map((l: any) => (
                <div
                  key={l.id}
                  className="flex justify-between border-b border-slate-100 px-3 py-2 last:border-0"
                >
                  <span>
                    {l.quantity} × {l.name}
                  </span>
                  <span className="font-semibold">{inr(l.lineTotal)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span>{inr(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Discount</span>
                  <span>-{inr(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Company subsidy</span>
                <span>{inr(order.subsidyAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span>Collected ({titleCase(order.paymentMode)})</span>
                <span>{inr(order.total)}</span>
              </div>
            </div>
            {order.status === "CANCELLED" ? (
              <div className="rounded-xl bg-red-50 p-3 text-red-700">
                Cancelled: {order.cancelReason}
              </div>
            ) : (
              can("OWNER", "MANAGER") && (
                <div className="rounded-xl border border-red-100 bg-red-50/40 p-3">
                  <Field
                    label="Cancel this bill"
                    hint={
                      order.paymentMode === "WALLET"
                        ? "The amount will be refunded to the employee wallet."
                        : undefined
                    }
                  >
                    <Textarea
                      className="min-h-[60px]"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Reason (required)"
                    />
                  </Field>
                  <Button
                    className="mt-2"
                    variant="danger"
                    size="sm"
                    disabled={reason.length < 3}
                    loading={cancel.isPending}
                    onClick={() => cancel.mutate()}
                  >
                    Cancel bill
                  </Button>
                </div>
              )
            )}
          </div>
        )}
      </Modal>
      <Receipt order={print} onClose={() => setPrint(null)} />
    </>
  );
}
