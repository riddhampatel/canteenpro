import clsxBase, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
const clsx = (...a: ClassValue[]) => twMerge(clsxBase(...a));
import {
  Loader2,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";
import {
  forwardRef,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { initials } from "@/lib/format";

/* ------------------------------------------------------------------ Button */
type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "success"
  | "outline";
const variants: Record<Variant, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-800 shadow-sm",
  secondary: "bg-brand-50 text-brand-800 hover:bg-brand-100",
  outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  ghost: "text-slate-600 hover:bg-slate-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
};
export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: "sm" | "md" | "lg";
    loading?: boolean;
    icon?: ReactNode;
  }
>(
  (
    {
      variant = "primary",
      size = "md",
      loading,
      icon,
      className,
      children,
      disabled,
      ...p
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-base",
        variants[variant],
        className,
      )}
      {...p}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  ),
);

/* ------------------------------------------------------------------ Form controls */
const control =
  "w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-ink placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...p }, ref) => (
  <input ref={ref} className={clsx(control, "h-10", className)} {...p} />
));
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...p }, ref) => (
  <textarea
    ref={ref}
    className={clsx(control, "py-2 min-h-[90px]", className)}
    {...p}
  />
));
export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...p }, ref) => (
  <select ref={ref} className={clsx(control, "h-10 pr-8", className)} {...p}>
    {children}
  </select>
));

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={clsx("block", className)}>
      {label && (
        <span className="mb-1.5 block text-xs font-semibold text-slate-600">
          {label}
        </span>
      )}
      {children}
      {hint && !error && (
        <span className="mt-1 block text-xs text-slate-400">{hint}</span>
      )}
      {error && (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      )}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      {(label || description) && (
        <div>
          {label && (
            <div className="text-sm font-semibold text-ink">{label}</div>
          )}
          {description && (
            <div className="text-xs text-slate-500">{description}</div>
          )}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50",
          checked ? "bg-brand-700" : "bg-slate-300",
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
            checked ? "left-[22px]" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  useEffect(() => {
    const t = setTimeout(() => v !== value && onChange(v), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);
  return (
    <div className={clsx("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ Layout bits */
export function Card({
  className,
  children,
  title,
  actions,
  padded = true,
}: {
  className?: string;
  children: ReactNode;
  title?: ReactNode;
  actions?: ReactNode;
  padded?: boolean;
}) {
  return (
    <section
      className={clsx(
        "rounded-2xl border border-slate-200/80 bg-white shadow-card",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          {typeof title === "string" ? (
            <h3 className="text-base font-bold text-ink">{title}</h3>
          ) : (
            title
          )}
          {actions && (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          )}
        </header>
      )}
      <div className={clsx(padded && "p-5")}>{children}</div>
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink md:text-[28px]">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export function Stat({
  label,
  value,
  icon,
  hint,
  tone = "brand",
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  tone?: "brand" | "green" | "amber" | "violet" | "rose";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
    rose: "bg-rose-50 text-rose-700",
  };
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </div>
        {icon && (
          <div
            className={clsx(
              "grid h-10 w-10 place-items-center rounded-xl",
              tones[tone],
            )}
          >
            {icon}
          </div>
        )}
      </div>
      <div className="mt-2 text-[28px] font-extrabold leading-none tracking-tight text-ink">
        {value}
      </div>
      {hint && <div className="mt-2 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

const badgeTones = {
  slate: "bg-slate-100 text-slate-700",
  brand: "bg-brand-50 text-brand-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-700",
  violet: "bg-violet-50 text-violet-700",
  sky: "bg-sky-50 text-sky-700",
};
export type Tone = keyof typeof badgeTones;
export function Badge({
  children,
  tone = "slate",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const statusTone = (s?: string | null): Tone =>
  (
    ({
      ACTIVE: "green",
      COMPLETED: "green",
      PAID: "green",
      PRESENT: "green",
      OPTED_IN: "green",
      PUBLISHED: "green",
      SENT: "green",
      TRIAL: "sky",
      TRIALING: "sky",
      NEW: "sky",
      PAST_DUE: "amber",
      HALF_DAY: "amber",
      LEAVE: "amber",
      CREATED: "amber",
      DRAFT: "amber",
      SKIPPED: "amber",
      CANCELLED: "red",
      EXPIRED: "red",
      SUSPENDED: "red",
      FAILED: "red",
      ABSENT: "red",
      OPTED_OUT: "red",
      INACTIVE: "slate",
      REFUNDED: "violet",
    }) as Record<string, Tone>
  )[s ?? ""] ?? "slate";

export function Avatar({
  name,
  src,
  size = 36,
  className,
}: {
  name?: string | null;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  return src ? (
    <img
      src={src}
      alt=""
      style={{ width: size, height: size }}
      className={clsx("rounded-full object-cover", className)}
    />
  ) : (
    <div
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={clsx(
        "grid shrink-0 place-items-center rounded-full bg-brand-100 font-bold text-brand-800",
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      className={clsx("h-5 w-5 animate-spin text-brand-600", className)}
    />
  );
}
export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
      <Spinner /> {label}
    </div>
  );
}
export function Empty({
  title = "Nothing here yet",
  text,
  action,
  icon,
}: {
  title?: string;
  text?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <div className="font-bold text-ink">{title}</div>
      {text && (
        <div className="mt-1 max-w-sm text-sm text-slate-500">{text}</div>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ Tabs */
export function Tabs<T extends string>({
  value,
  onChange,
  items,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: ReactNode }[];
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1",
        className,
      )}
    >
      {items.map((i) => (
        <button
          key={i.value}
          onClick={() => onChange(i.value)}
          className={clsx(
            "rounded-lg px-3.5 py-1.5 text-sm font-semibold transition",
            value === i.value
              ? "bg-brand-700 text-white shadow"
              : "text-slate-600 hover:text-ink",
          )}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ Modal */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={clsx(
          "flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl",
          size === "sm" && "sm:max-w-md",
          size === "md" && "sm:max-w-xl",
          size === "lg" && "sm:max-w-3xl",
          size === "xl" && "sm:max-w-5xl",
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="text-lg font-bold text-ink">{title}</div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ Table */
export interface Column<T> {
  key: string;
  header: ReactNode;
  render?: (row: T, i: number) => ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}
export function Table<T extends { id?: string }>({
  columns,
  rows,
  onRowClick,
  empty,
  dense,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (r: T) => void;
  empty?: ReactNode;
  dense?: boolean;
}) {
  if (!rows.length) return <>{empty ?? <Empty />}</>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/70">
            {columns.map((c) => (
              <th
                key={c.key}
                className={clsx(
                  "whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500",
                  c.align === "right" && "text-right",
                  c.align === "center" && "text-center",
                  c.className,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.id ?? i}
              onClick={() => onRowClick?.(r)}
              className={clsx(
                "border-b border-slate-100 last:border-0",
                onRowClick && "cursor-pointer hover:bg-brand-50/40",
              )}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={clsx(
                    "px-4 align-middle text-slate-700",
                    dense ? "py-2" : "py-3",
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                    c.className,
                  )}
                >
                  {c.render ? c.render(r, i) : ((r as any)[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
      <span>
        Showing {total ? (page - 1) * pageSize + 1 : 0}–
        {Math.min(page * pageSize, total)} of {total.toLocaleString("en-IN")}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          icon={<ChevronLeft className="h-4 w-4" />}
        />
        <span className="px-2 font-semibold text-slate-700">
          {page} / {pages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          icon={<ChevronRight className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}

/** Confirm-before-action button */
export function ConfirmButton({
  onConfirm,
  children,
  message = "Are you sure?",
  ...p
}: Parameters<typeof Button>[0] & {
  onConfirm: () => void | Promise<void>;
  message?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button {...p} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title="Please confirm"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                  setOpen(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirm
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">{message}</p>
      </Modal>
    </>
  );
}
