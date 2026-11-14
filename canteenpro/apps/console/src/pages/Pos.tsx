import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import clsx from "clsx";
import {
  Minus,
  Plus,
  Trash2,
  Printer,
  UserRound,
  UserRoundPlus,
  Footprints,
  Search,
  UtensilsCrossed 
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { inr, PAY_MODES, titleCase, today, dt } from "@/lib/format";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Tabs,
  Empty,
} from "@/components/ui";

type Line = { id: string; name: string; price: number; qty: number };
const foodDot = (t: string) =>
  t === "NON_VEG"
    ? "border-red-600 after:bg-red-600"
    : t === "EGG"
      ? "border-amber-500 after:bg-amber-500"
      : "border-emerald-600 after:bg-emerald-600";

export function Receipt({
  order,
  onClose,
}: {
  order: any;
  onClose: () => void;
}) {
  const { session } = useAuth();
  return (
    <Modal
      open={!!order}
      onClose={onClose}
      title="Bill"
      size="sm"
      footer={
        <Button
          icon={<Printer className="h-4 w-4" />}
          onClick={() => window.print()}
        >
          Print receipt
        </Button>
      }
    >
      {order && (
        <div className="print-area mx-auto max-w-75 font-mono text-[13px]">
          <div className="text-center">
             <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-700 text-white ml-auto mr-auto mb-3">
            <UtensilsCrossed className="h-5 w-5" />
            </div>
            <div className="text-base font-bold">{session?.tenant.name}</div>
            <div className="text-xs">{order.canteen?.name ?? ""}</div>
            <div className="mt-2 text-xs">Bill {order.billNo}</div>
            <div className="text-xs">{dt(order.createdAt)}</div>
          </div>
          <div className="my-2 border-t border-dashed" />
          <div>
            {order.employee?.name ?? order.guest?.name ?? order.walkInName}
            {order.employee && ` (${order.employee.employeeCode})`}
          </div>
          <div className="my-2 border-t border-dashed" />
          {order.items.map((l: any, i: number) => (
            <div key={i} className="flex justify-between">
              <span>
                {l.quantity} × {l.name}
              </span>
              <span>{inr(l.lineTotal, 2)}</span>
            </div>
          ))}
          <div className="my-2 border-t border-dashed" />
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{inr(order.subtotal, 2)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between">
              <span>Discount</span>
              <span>-{inr(order.discount, 2)}</span>
            </div>
          )}
          {order.subsidyAmount > 0 && (
            <div className="flex justify-between">
              <span>Company pays</span>
              <span>-{inr(order.subsidyAmount, 2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold">
            <span>PAID ({titleCase(order.paymentMode)})</span>
            <span>{inr(order.total, 2)}</span>
          </div>
          <div className="text-xs">GST incl.: {inr(order.taxAmount, 2)}</div>
          {order.paymentMode === "WALLET" && (
            <div className="text-xs">
              Wallet balance: {inr(order.walletBalance, 2)}
            </div>
          )}
          <div className="mt-3 text-center text-xs">
            Thank you! Enjoy your meal.
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function Pos() {
  const { canteenId, can, session } = useAuth();
  const qc = useQueryClient();
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [onlyToday, setOnlyToday] = useState(true);
  const [cart, setCart] = useState<Line[]>([]);
  const [ctype, setCtype] = useState<"EMPLOYEE" | "GUEST" | "WALK_IN">(
    "EMPLOYEE",
  );
  const [empQ, setEmpQ] = useState("");
  const [emp, setEmp] = useState<any>(null);
  const [guestId, setGuestId] = useState("");
  const [walkIn, setWalkIn] = useState("");
  const [mode, setMode] = useState<string>("");
  const [discount, setDiscount] = useState(0);
  const [receipt, setReceipt] = useState<any>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["menu-items", "active"],
    queryFn: () => api.get("/tenant/menu/items", { active: true }),
  });
  const { data: daily } = useQuery({
    queryKey: ["daily", canteenId, today()],
    queryFn: () => api.get("/tenant/menu/daily", { canteenId }),
  });
  const { data: guests } = useQuery({
    queryKey: ["guests-pos", canteenId],
    queryFn: () => api.get("/tenant/guests", { canteenId, pageSize: 100 }),
    enabled: ctype === "GUEST",
  });
  const { data: found = [] } = useQuery({
    queryKey: ["lookup", empQ],
    queryFn: () => api.get("/tenant/orders/lookup", { q: empQ }),
    enabled: empQ.length >= 2 && !emp,
  });

  const todayMap = useMemo(() => {
    const m = new Map<string, { price: number; ok: boolean }>();
    daily?.days?.[0]?.sessions?.forEach((s: any) =>
      s.items.forEach((i: any) =>
        m.set(i.menuItemId, { price: i.price, ok: i.isAvailable }),
      ),
    );
    return m;
  }, [daily]);
  const cats = [
    "All",
    ...new Set(items.map((i: any) => i.category?.name).filter(Boolean)),
  ] as string[];
  const shown = items.filter(
    (i: any) =>
      (cat === "All" || i.category?.name === cat) &&
      (!q || i.name.toLowerCase().includes(q.toLowerCase())) &&
      (!onlyToday || todayMap.has(i.id) || !todayMap.size),
  );
  const priceOf = (i: any) =>
    ctype === "EMPLOYEE"
      ? (todayMap.get(i.id)?.price ?? i.price)
      : (i.guestPrice ?? i.price);

  const add = (i: any) => {
    if (todayMap.get(i.id)?.ok === false)
      return toast.error(`${i.name} is sold out`);
    setCart((c) => {
      const ex = c.find((l) => l.id === i.id);
      return ex
        ? c.map((l) => (l.id === i.id ? { ...l, qty: l.qty + 1 } : l))
        : [...c, { id: i.id, name: i.name, price: priceOf(i), qty: 1 }];
    });
  };
  const subtotal = cart.reduce((a, l) => a + l.price * l.qty, 0);
  const effMode =
    mode || (ctype === "EMPLOYEE" ? (emp?.defaultPayMode ?? "WALLET") : "CASH");
  const payModes = PAY_MODES.filter(
    (m) => ctype === "EMPLOYEE" || !["WALLET", "PAYROLL"].includes(m),
  );

  const charge = useMutation({
    mutationFn: () =>
      api.post("/tenant/orders", {
        canteenId,
        consumerType: ctype,
        employeeId: emp?.id,
        guestId: guestId || undefined,
        walkInName: walkIn || undefined,
        items: cart.map((l) => ({ menuItemId: l.id, quantity: l.qty })),
        paymentMode: effMode,
        discount,
      }),
    onSuccess: (o: any) => {
      setReceipt({
        ...o,
        canteen: {
          name: session?.canteens.find((c) => c.id === canteenId)?.name ?? "",
        },
      });
      setCart([]);
      setEmp(null);
      setEmpQ("");
      setDiscount(0);
      setMode("");
      qc.invalidateQueries({ queryKey: ["live"] });
      toast.success(`Bill ${o.billNo} saved`);
    },
    onError: (e: any) => toast.error(e.message),
  });
  const canCharge =
    cart.length > 0 &&
    ((ctype === "EMPLOYEE" && emp) ||
      (ctype === "GUEST" && guestId) ||
      ctype === "WALK_IN");

  return (
    <>
      <PageHeader
        title="POS billing"
        subtitle="À-la-carte billing for employees, guests and walk-ins."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <Card padded={false}>
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
            <div className="relative min-w-50 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search items…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                checked={onlyToday}
                onChange={(e) => setOnlyToday(e.target.checked)}
                className="accent-brand-700"
              />{" "}
              Today's menu only
            </label>
          </div>
          <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-4 py-3">
            {cats.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={clsx(
                  "whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold",
                  cat === c
                    ? "bg-brand-700 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 2xl:grid-cols-4">
            {shown.map((i: any) => {
              const soldOut = todayMap.get(i.id)?.ok === false;
              return (
                <button
                  key={i.id}
                  onClick={() => add(i)}
                  disabled={soldOut}
                  className={clsx(
                    "group relative overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md disabled:opacity-50",
                  )}
                >
                  <div className="aspect-4/3 bg-linear-to-br from-brand-50 to-amber-50">
                    {i.imageUrl ? (
                      <img
                        src={i.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-3xl">
                        🍽️
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-start gap-2">
                      <span
                        className={clsx(
                          "relative mt-1 h-3 w-3 shrink-0 rounded-[3px] border-2 after:absolute after:inset-0.5 after:rounded-full",
                          foodDot(i.foodType),
                        )}
                      />
                      <span className="line-clamp-2 text-sm font-semibold text-ink">
                        {i.name}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="font-bold text-brand-800">
                        {inr(priceOf(i))}
                      </span>
                      {soldOut && <Badge tone="red">Sold out</Badge>}
                    </div>
                  </div>
                </button>
              );
            })}
            {!shown.length && (
              <div className="col-span-full">
                <Empty
                  title="No items"
                  text="Add items in Menu Management, or untick “Today's menu only”."
                />
              </div>
            )}
          </div>
        </Card>

        <Card className="h-fit xl:sticky xl:top-24" title="Current bill">
          <Tabs
            className="mb-4 w-full [&>button]:flex-1"
            value={ctype}
            onChange={(v) => {
              setCtype(v);
              setCart((c) =>
                c.map((l) => ({
                  ...l,
                  price: priceOf(items.find((x: any) => x.id === l.id)),
                })),
              );
              setMode("");
            }}
            items={[
              {
                value: "EMPLOYEE",
                label: (
                  <span className="flex items-center justify-center gap-1.5">
                    <UserRound className="h-4 w-4" />
                    Employee
                  </span>
                ),
              },
              {
                value: "GUEST",
                label: (
                  <span className="flex items-center justify-center gap-1.5">
                    <UserRoundPlus className="h-4 w-4" />
                    Guest
                  </span>
                ),
              },
              {
                value: "WALK_IN",
                label: (
                  <span className="flex items-center justify-center gap-1.5">
                    <Footprints className="h-4 w-4" />
                    Walk-in
                  </span>
                ),
              },
            ]}
          />
          {ctype === "EMPLOYEE" &&
            (emp ? (
              <div className="mb-4 flex items-center gap-3 rounded-xl bg-brand-50 p-3">
                <Avatar name={emp.name} />
                <div className="flex-1">
                  <div className="font-semibold">{emp.name}</div>
                  <div className="text-xs text-slate-500">
                    {emp.employeeCode} · Wallet {inr(emp.walletBalance)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEmp(null);
                    setEmpQ("");
                  }}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="relative mb-4">
                <Input
                  autoFocus
                  placeholder="Scan QR or search name / code / phone"
                  value={empQ}
                  onChange={(e) => setEmpQ(e.target.value)}
                />
                {found.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    {found.map((f: any) => (
                      <button
                        key={f.id}
                        onClick={() => setEmp(f)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50"
                      >
                        <Avatar name={f.name} size={30} />
                        <div className="flex-1">
                          <div className="text-sm font-semibold">{f.name}</div>
                          <div className="text-xs text-slate-500">
                            {f.employeeCode} · {f.department ?? "—"}
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-slate-600">
                          {inr(f.walletBalance)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          {ctype === "GUEST" && (
            <Field
              className="mb-4"
              label="Guest"
              hint="Register new guests on the Guests page"
            >
              <Select
                value={guestId}
                onChange={(e) => setGuestId(e.target.value)}
              >
                <option value="">Select guest…</option>
                {guests?.items?.map((g: any) => (
                  <option key={g.id} value={g.id}>
                    {g.name} {g.company ? `· ${g.company}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {ctype === "WALK_IN" && (
            <Field className="mb-4" label="Name (optional)">
              <Input
                value={walkIn}
                onChange={(e) => setWalkIn(e.target.value)}
                placeholder="Walk-in customer"
              />
            </Field>
          )}

          <div className="max-h-75 space-y-2 overflow-y-auto">
            {cart.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
                Tap items to add them to the bill
              </div>
            )}
            {cart.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-2 rounded-xl border border-slate-100 p-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{l.name}</div>
                  <div className="text-xs text-slate-500">
                    {inr(l.price)} each
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="rounded-lg bg-slate-100 p-1.5 hover:bg-slate-200"
                    onClick={() =>
                      setCart((c) =>
                        c.map((x) =>
                          x.id === l.id
                            ? { ...x, qty: Math.max(1, x.qty - 1) }
                            : x,
                        ),
                      )
                    }
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-7 text-center text-sm font-bold">
                    {l.qty}
                  </span>
                  <button
                    className="rounded-lg bg-slate-100 p-1.5 hover:bg-slate-200"
                    onClick={() =>
                      setCart((c) =>
                        c.map((x) =>
                          x.id === l.id ? { ...x, qty: x.qty + 1 } : x,
                        ),
                      )
                    }
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="w-16 text-right text-sm font-bold">
                  {inr(l.price * l.qty)}
                </div>
                <button
                  onClick={() => setCart((c) => c.filter((x) => x.id !== l.id))}
                  className="p-1 text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Payment">
              <Select value={effMode} onChange={(e) => setMode(e.target.value)}>
                {payModes.map((m) => (
                  <option key={m} value={m}>
                    {titleCase(m)}
                  </option>
                ))}
              </Select>
            </Field>
            {can("OWNER", "MANAGER") && (
              <Field label="Discount (₹)">
                <Input
                  type="number"
                  min={0}
                  value={discount || ""}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </Field>
            )}
          </div>
          <div className="mt-4 space-y-1 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>{inr(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Discount</span>
                <span>-{inr(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-extrabold">
              <span>Total</span>
              <span>
                {inr(
                  effMode === "COMPLIMENTARY" || effMode === "COMPANY"
                    ? 0
                    : Math.max(0, subtotal - discount),
                )}
              </span>
            </div>
          </div>
          <Button
            size="lg"
            className="mt-4 w-full"
            disabled={!canCharge}
            loading={charge.isPending}
            onClick={() => charge.mutate()}
          >
            Charge{" "}
            {inr(
              effMode === "COMPLIMENTARY" || effMode === "COMPANY"
                ? 0
                : Math.max(0, subtotal - discount),
            )}
          </Button>
        </Card>
      </div>
      <Receipt order={receipt} onClose={() => setReceipt(null)} />
    </>
  );
}
