import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import clsx from "clsx";
import { Check, CreditCard, Printer, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dOnly, inr, titleCase } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  Input,
  Loading,
  Modal,
  PageHeader,
  Table,
  Tabs,
  statusTone,
} from "@/components/ui";

declare global {
  interface Window {
    Razorpay?: any;
  }
}
const loadRazorpay = () =>
  new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

/** Opens Razorpay checkout for a plan and verifies the payment. Shared with signup flows. */
export async function payForPlan(
  planCode: string,
  billingCycle: "MONTHLY" | "YEARLY",
  coupon: string | undefined,
  onDone: () => void,
) {
  const co = await api.post("/tenant/billing/checkout", {
    planCode,
    billingCycle,
    coupon: coupon || undefined,
  });
  if (co.testMode) {
    // Dev/test mode — no Razorpay keys configured: simulate a successful payment
    await api.post("/tenant/billing/verify", {
      razorpay_order_id: co.orderId,
      razorpay_payment_id: `pay_test_${Date.now()}`,
      razorpay_signature: "",
    });
    toast.success("Test payment recorded (Razorpay not configured)");
    return onDone();
  }
  if (!(await loadRazorpay()))
    throw new Error("Could not load Razorpay. Check your internet connection.");
  await new Promise<void>((resolve, reject) => {
    const rz = new window.Razorpay({
      key: co.keyId,
      amount: co.amount,
      currency: co.currency,
      order_id: co.orderId,
      name: "CanteenPro",
      description: `${co.quote.plan.name} plan · ${billingCycle.toLowerCase()}`,
      prefill: co.prefill,
      theme: { color: "#1d35a1" },
      handler: async (resp: any) => {
        try {
          await api.post("/tenant/billing/verify", resp);
          toast.success("Payment successful — plan activated");
          onDone();
          resolve();
        } catch (e) {
          reject(e);
        }
      },
      modal: { ondismiss: () => resolve() },
    });
    rz.on("payment.failed", (r: any) =>
      reject(new Error(r.error?.description ?? "Payment failed")),
    );
    rz.open();
  });
}

export default function Billing() {
  const { refresh } = useAuth();
  const qc = useQueryClient();
  const [sp] = useSearchParams();
  const [cycle, setCycle] = useState<"MONTHLY" | "YEARLY">("YEARLY");
  const [coupon, setCoupon] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const { data } = useQuery({
    queryKey: ["billing"],
    queryFn: () => api.get("/tenant/billing"),
  });
  if (!data) return <Loading />;
  const sub = data.subscription;
  const plan = data.plan;

  const buy = async (code: string) => {
    setBusy(code);
    try {
      await payForPlan(code, cycle, coupon, () => {
        qc.invalidateQueries({ queryKey: ["billing"] });
        refresh();
      });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };
  const meter = (label: string, used: number, max: number) => (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="text-slate-500">
          {used} / {max < 0 ? "∞" : max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={clsx(
            "h-full rounded-full",
            max > 0 && used / max > 0.9 ? "bg-red-500" : "bg-brand-600",
          )}
          style={{
            width:
              max < 0
                ? "8%"
                : `${Math.min(100, (used / Math.max(1, max)) * 100)}%`,
          }}
        />
      </div>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Plan & billing"
        subtitle="Manage your subscription, invoices and limits."
      />
      {sp.get("expired") && !sub?.active && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          Your subscription has expired. Renew below to resume service — all
          your data is safe.
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Current plan
              </div>
              <div className="mt-1 flex items-center gap-3">
                <span className="text-3xl font-extrabold">
                  {plan?.name ?? "—"}
                </span>
                <Badge tone={statusTone(sub?.status)}>
                  {titleCase(sub?.status)}
                </Badge>
              </div>
              <div className="mt-2 text-sm text-slate-600">
                {sub?.status === "TRIALING"
                  ? "Free trial"
                  : `Billed ${titleCase(sub?.billingCycle)}`}{" "}
                ·{" "}
                {sub?.active
                  ? sub.cancelAtPeriodEnd
                    ? "ends"
                    : "renews"
                  : "expired"}{" "}
                on <b>{dOnly(sub?.currentPeriodEnd)}</b> (
                {Math.max(0, sub?.daysLeft ?? 0)} days left)
              </div>
            </div>
            {sub?.status === "ACTIVE" && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await api.post("/tenant/billing/cancel", {
                    cancel: !sub.cancelAtPeriodEnd,
                  });
                  qc.invalidateQueries({ queryKey: ["billing"] });
                  toast.success(
                    sub.cancelAtPeriodEnd
                      ? "Auto-renewal resumed"
                      : "Plan will end at period end",
                  );
                }}
              >
                {sub.cancelAtPeriodEnd
                  ? "Resume renewal reminders"
                  : "Cancel at period end"}
              </Button>
            )}
          </div>
        </Card>
        <Card title="Usage">
          <div className="space-y-4">
            {meter("Employees", data.usage.employees, plan?.maxEmployees ?? 0)}
            {meter("Canteens", data.usage.canteens, plan?.maxCanteens ?? 0)}
            {meter("Staff users", data.usage.staff, plan?.maxStaffUsers ?? 0)}
          </div>
        </Card>
      </div>

      <div className="mb-4 mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold">
          {sub?.status === "TRIALING" || !sub?.active
            ? "Choose a plan"
            : "Renew or change plan"}
        </h2>
        <div className="flex items-center gap-3">
          <Input
            className="h-10 w-40"
            placeholder="Coupon code"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
          />
          <Tabs
            value={cycle}
            onChange={setCycle}
            items={[
              { value: "MONTHLY", label: "Monthly" },
              { value: "YEARLY", label: "Yearly (2 months free)" },
            ]}
          />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {data.plans.map((p: any) => {
          const current = p.code === plan?.code;
          const price = cycle === "YEARLY" ? p.priceYearly : p.priceMonthly;
          return (
            <div
              key={p.id}
              className={clsx(
                "relative flex flex-col rounded-2xl border bg-white p-6 shadow-card",
                p.isPopular
                  ? "border-brand-500 ring-4 ring-brand-100"
                  : "border-slate-200",
              )}
            >
              {p.isPopular && (
                <div className="absolute -top-3 left-6 flex items-center gap-1 rounded-full bg-brand-700 px-3 py-1 text-xs font-bold text-white">
                  <Sparkles className="h-3 w-3" />
                  Most popular
                </div>
              )}
              <div className="text-lg font-extrabold">{p.name}</div>
              <div className="text-sm text-slate-500">{p.tagline}</div>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-4xl font-extrabold">{inr(price)}</span>
                <span className="mb-1 text-sm text-slate-500">
                  /{cycle === "YEARLY" ? "year" : "month"} + GST
                </span>
              </div>
              <ul className="mt-5 flex-1 space-y-2">
                {p.highlights.map((h: string) => (
                  <li key={h} className="flex gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    {h}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6 w-full"
                variant={p.isPopular ? "primary" : "outline"}
                icon={<CreditCard className="h-4 w-4" />}
                loading={busy === p.code}
                onClick={() => buy(p.code)}
              >
                {current && sub?.status === "ACTIVE"
                  ? "Renew"
                  : current
                    ? "Activate"
                    : "Switch to " + p.name}
              </Button>
            </div>
          );
        })}
      </div>

      <Card className="mt-10" title="Invoices" padded={false}>
        <Table
          rows={data.payments}
          columns={[
            {
              key: "inv",
              header: "Invoice",
              render: (r: any) => (
                <span className="font-mono text-xs">{r.invoiceNo ?? "—"}</span>
              ),
            },
            {
              key: "d",
              header: "Date",
              render: (r: any) => dOnly(r.paidAt ?? r.createdAt),
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
              render: (r: any) => <b>{inr(r.amount, 2)}</b>,
            },
            {
              key: "s",
              header: "Status",
              render: (r: any) => (
                <Badge tone={statusTone(r.status)}>{titleCase(r.status)}</Badge>
              ),
            },
            {
              key: "x",
              header: "",
              align: "right",
              render: (r: any) =>
                r.status === "PAID" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Printer className="h-4 w-4" />}
                    onClick={async () =>
                      setInvoice(
                        await api.get(`/tenant/billing/invoices/${r.id}`),
                      )
                    }
                  >
                    View
                  </Button>
                ),
            },
          ]}
        />
      </Card>

      <Modal
        open={!!invoice}
        onClose={() => setInvoice(null)}
        size="lg"
        title="Invoice"
        footer={
          <Button
            icon={<Printer className="h-4 w-4" />}
            onClick={() => window.print()}
          >
            Print / Save PDF
          </Button>
        }
      >
        {invoice && (
          <div className="print-area text-sm">
            <div className="flex justify-between border-b pb-4">
              <div>
                <div className="text-2xl font-extrabold text-brand-800">
                  {invoice.seller["brand.legalName"] ||
                    invoice.seller["brand.name"]}
                </div>
                <div className="text-slate-500">
                  {invoice.seller["brand.address"]}
                </div>
                {invoice.seller["brand.gstin"] && (
                  <div className="text-slate-500">
                    GSTIN {invoice.seller["brand.gstin"]}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">TAX INVOICE</div>
                <div>{invoice.payment.invoiceNo}</div>
                <div className="text-slate-500">
                  {dOnly(invoice.payment.paidAt)}
                </div>
              </div>
            </div>
            <div className="py-4">
              <div className="text-xs font-bold uppercase text-slate-500">
                Billed to
              </div>
              <div className="font-semibold">{invoice.payment.tenant.name}</div>
              <div className="text-slate-500">
                {invoice.payment.tenant.address}{" "}
                {invoice.payment.tenant.gstin &&
                  `· GSTIN ${invoice.payment.tenant.gstin}`}
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-y bg-slate-50 text-left">
                  <th className="p-2">Description</th>
                  <th className="p-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2">
                    {invoice.payment.plan?.name} plan subscription (
                    {titleCase(invoice.payment.billingCycle)})
                  </td>
                  <td className="p-2 text-right">
                    {inr(invoice.payment.amount - invoice.payment.taxAmount, 2)}
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">
                    GST @ {invoice.seller["tax.gstPercent"]}%
                  </td>
                  <td className="p-2 text-right">
                    {inr(invoice.payment.taxAmount, 2)}
                  </td>
                </tr>
                <tr className="font-bold">
                  <td className="p-2">Total paid</td>
                  <td className="p-2 text-right">
                    {inr(invoice.payment.amount, 2)}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="mt-4 text-xs text-slate-500">
              Payment ref: {invoice.payment.razorpayPaymentId} ·{" "}
              {titleCase(invoice.payment.method ?? "")}
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
