import { Check, Fingerprint, QrCode } from "lucide-react";
import type { CSSProperties } from "react";

function Ticket({
  r,
  delay,
  className = "",
  children,
}: {
  r: string;
  delay: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`ticket perforated absolute rounded-2xl bg-white p-5 text-navy-800 shadow-2xl shadow-navy-900/40 ${className}`}
      style={{ "--r": r, animationDelay: `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
const Row = ({ l, v, strong }: { l: string; v: string; strong?: boolean }) => (
  <div
    className={`flex justify-between text-[14px] ${strong ? "font-bold" : "text-navy-600"}`}
  >
    <span>{l}</span>
    <span className="tabular-nums">{v}</span>
  </div>
);

/** Hero visual: counter tickets printing one after another. */
export function TicketStack() {
  return (
    <div
      className="relative mx-auto h-[470px] w-full max-w-[520px]"
      aria-label="Example meal tickets printed at the canteen counter"
    >
      <Ticket
        r="-7deg"
        delay={150}
        className="left-0 top-0 w-[260px] sm:w-[300px]"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-navy-400">
          <Fingerprint className="h-4 w-4" />
          Breakfast, 08:12 am
        </div>
        <div className="mt-2 font-display text-xl font-bold">
          Rakesh Solanki
        </div>
        <div className="text-sm text-navy-400">Production, shift A</div>
        <div className="my-3 border-t border-dashed border-steel-300" />
        <Row l="Payroll deduction" v="₹20" />
        <Row l="Company pays" v="₹20" />
      </Ticket>
      <Ticket
        r="6deg"
        delay={650}
        className="right-0 top-[70px] w-[220px] sm:w-[260px]"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-navy-400">
          <QrCode className="h-4 w-4" />
          Guest pass
        </div>
        <div className="mt-2 font-display text-xl font-bold">Martin Wolf</div>
        <div className="text-sm text-navy-400">Visiting from SolarTec GmbH</div>
        <div className="my-3 border-t border-dashed border-steel-300" />
        <Row l="Lunch, billed to company" v="₹120" />
      </Ticket>
      <Ticket
        r="-1.5deg"
        delay={1150}
        className="left-[4px] top-[175px] z-10 w-[310px] p-6 sm:left-[70px] sm:w-[320px]"
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf-50 px-3 py-1 text-sm font-bold text-leaf">
            <Check className="h-4 w-4" />
            Lunch served
          </span>
          <span className="text-sm tabular-nums text-navy-400">12:41 pm</span>
        </div>
        <div className="mt-4 font-display text-2xl font-extrabold">
          Ananya Iyer
        </div>
        <div className="text-[15px] text-navy-400">EMP0142, Finance</div>
        <div className="my-4 border-t border-dashed border-steel-300" />
        <div className="space-y-1.5">
          <Row l="Executive veg thali" v="₹90" />
          <Row l="Company pays" v="−₹50" />
          <Row l="Paid from wallet" v="₹40" strong />
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-steel-50 px-3 py-2 text-sm">
          <span className="text-navy-600">Wallet balance</span>
          <span className="font-bold tabular-nums">₹1,260</span>
        </div>
      </Ticket>
    </div>
  );
}
