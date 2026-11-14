import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import {
  CheckCircle2,
  XCircle,
  ScanLine,
  QrCode,
  Printer,
  Volume2,
  VolumeX,
} from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { inr, sessionColor, tOnly, titleCase } from "@/lib/format";
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
  Table,
  Toggle,
} from "@/components/ui";

function beep(ok: boolean) {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = ok ? 880 : 220;
    o.type = ok ? "sine" : "square";
    g.gain.value = 0.08;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + (ok ? 0.12 : 0.35));
  } catch {}
}

export function DailyQrModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { canteenId } = useAuth();
  const { data } = useQuery({
    queryKey: ["daily-qr", canteenId],
    queryFn: () => api.get(`/tenant/canteens/${canteenId}/daily-qr`),
    enabled: open,
  });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Today's counter QR"
      size="sm"
      footer={
        <Button
          icon={<Printer className="h-4 w-4" />}
          onClick={() => window.print()}
        >
          Print
        </Button>
      }
    >
      {data ? (
        <div className="print-area text-center">
          <div className="text-lg font-extrabold">{data.canteen.name}</div>
          <div className="mb-4 text-sm text-slate-500">
            Scan with the employee app to record your meal · {data.date}
          </div>
          <div className="inline-block rounded-2xl border-8 border-brand-700 bg-white p-4">
            <QRCodeSVG value={data.code} size={240} level="M" />
          </div>
          <p className="mt-4 text-xs text-slate-400">
            This QR changes automatically every day. Old printouts stop working
            at midnight.
          </p>
        </div>
      ) : (
        <div className="py-10 text-center text-slate-500">Generating…</div>
      )}
    </Modal>
  );
}

export default function Counter() {
  const { canteenId, can } = useAuth();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [override, setOverride] = useState(false);
  const [sound, setSound] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    title: string;
    text: string;
    sub?: string;
    name?: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: canteens } = useQuery({
    queryKey: ["canteens"],
    queryFn: () => api.get("/tenant/canteens"),
  });
  const sessions =
    canteens
      ?.find((c: any) => c.id === canteenId)
      ?.sessions?.filter((s: any) => s.isActive) ?? [];
  const { data: live } = useQuery({
    queryKey: ["live", canteenId],
    queryFn: () => api.get("/tenant/orders/live", { canteenId, limit: 25 }),
    refetchInterval: 10_000,
  });

  const serve = useMutation({
    mutationFn: (c: string) =>
      api.post("/tenant/orders/serve", {
        canteenId,
        code: c,
        mealSessionId: sessionId || null,
        override,
      }),
    onSuccess: (o: any) => {
      sound && beep(true);
      setResult({
        ok: true,
        name: o.employee?.name,
        title: o.employee?.name ?? "Served",
        text: `${o.session?.name ?? "Meal"} served · ${o.employee?.employeeCode ?? ""}${o.department ? " · " + o.department : ""}`,
        sub: `${titleCase(o.paymentMode)} ${inr(o.total)}${o.subsidyAmount ? ` (+${inr(o.subsidyAmount)} company)` : ""}${o.paymentMode === "WALLET" ? ` · Balance ${inr(o.walletBalance)}` : ""}`,
      });
      qc.invalidateQueries({ queryKey: ["live"] });
    },
    onError: (e: any) => {
      sound && beep(false);
      setResult({
        ok: false,
        title:
          e.code === "ALREADY_SERVED"
            ? "Already served"
            : e.code === "NOT_OPTED_IN"
              ? "Not opted in"
              : "Cannot serve",
        text: e.message,
      });
    },
    onSettled: () => {
      setCode("");
      inputRef.current?.focus();
    },
  });

  useEffect(() => {
    const t = setTimeout(() => setResult(null), 6000);
    return () => clearTimeout(t);
  }, [result]);

  return (
    <>
      <PageHeader
        title="Serve meals"
        subtitle="Scan the employee's QR / ID card, or type their employee code and press Enter."
        actions={
          <>
            <Button
              variant="outline"
              icon={
                sound ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )
              }
              onClick={() => setSound(!sound)}
            >
              {sound ? "Sound on" : "Muted"}
            </Button>
            <Button
              icon={<QrCode className="h-4 w-4" />}
              onClick={() => setQrOpen(true)}
            >
              Daily counter QR
            </Button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-3">
          <Card>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (code.trim()) serve.mutate(code.trim());
              }}
              className="space-y-4"
            >
              <div className="relative">
                <ScanLine className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-brand-600" />
                <Input
                  ref={inputRef}
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Scan QR / ID card or type EMP code…"
                  className="h-16 rounded-2xl pl-14 text-xl font-semibold tracking-wide"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Meal session">
                  <Select
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                  >
                    <option value="">Auto (current time)</option>
                    {sessions.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.startTime}–{s.endTime})
                      </option>
                    ))}
                  </Select>
                </Field>
                <div className="sm:col-span-2 flex items-end">
                  {can("OWNER", "MANAGER") && (
                    <div className="w-full rounded-xl border border-slate-200 px-4 py-2.5">
                      <Toggle
                        checked={override}
                        onChange={setOverride}
                        label="Manager override"
                        description="Allow second meal / skip opt-in check"
                      />
                    </div>
                  )}
                </div>
              </div>
              <Button size="lg" className="w-full" loading={serve.isPending}>
                Serve meal
              </Button>
            </form>
          </Card>

          {result && (
            <div
              className={clsx(
                "flex items-center gap-5 rounded-2xl border-2 p-6 shadow-card transition",
                result.ok
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-red-300 bg-red-50",
              )}
            >
              {result.ok ? (
                <CheckCircle2 className="h-14 w-14 shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="h-14 w-14 shrink-0 text-red-600" />
              )}
              {result.ok && result.name && (
                <Avatar name={result.name} size={56} />
              )}
              <div>
                <div
                  className={clsx(
                    "text-2xl font-extrabold",
                    result.ok ? "text-emerald-800" : "text-red-800",
                  )}
                >
                  {result.title}
                </div>
                <div className="text-sm font-medium text-slate-700">
                  {result.text}
                </div>
                {result.sub && (
                  <div className="mt-1 text-sm text-slate-500">
                    {result.sub}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6 xl:col-span-2">
          <div className="grid grid-cols-2 gap-3">
            {sessions.map((s: any, i: number) => {
              const c = live?.bySession?.find((b: any) => b.sessionId === s.id);
              return (
                <div
                  key={s.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
                >
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: sessionColor(s.name, i) }}
                    />
                    {s.name}
                  </div>
                  <div className="mt-1 text-3xl font-extrabold">
                    {c?.count ?? 0}
                  </div>
                  <div className="text-xs text-slate-500">
                    {s.startTime}-{s.endTime}
                  </div>
                </div>
              );
            })}
          </div>
          <Card title="Recently served" padded={false}>
            <Table
              dense
              rows={live?.recent ?? []}
              columns={[
                {
                  key: "n",
                  header: "Name",
                  render: (r: any) => (
                    <div>
                      <div className="font-semibold text-ink">
                        {r.employeeName ?? r.guestName ?? r.walkInName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {r.employeeCode ?? titleCase(r.consumerType)}
                      </div>
                    </div>
                  ),
                },
                {
                  key: "s",
                  header: "Meal",
                  render: (r: any) => (
                    <Badge>{r.session ?? "À la carte"}</Badge>
                  ),
                },
                {
                  key: "t",
                  header: "Time",
                  render: (r: any) => tOnly(r.createdAt),
                },
              ]}
            />
          </Card>
        </div>
      </div>
      <DailyQrModal open={qrOpen} onClose={() => setQrOpen(false)} />
    </>
  );
}
