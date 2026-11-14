import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import toast from "react-hot-toast";
import { UtensilsCrossed, ScanLine, BarChart3, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button, Field, Input } from "@/components/ui";

const WEBSITE = import.meta.env.VITE_WEBSITE_URL || "http://localhost:3000";

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-brand-900 p-12 text-white lg:flex lg:flex-col">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative flex items-center gap-3 text-xl font-extrabold">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-brand-800">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          CanteenPro
        </div>
        <div className="relative mt-auto max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight">
            Run every canteen counter from one screen.
          </h2>
          <p className="mt-4 text-brand-100">
            Menus, QR meal logging, POS, wallets, guests and client billing — in
            real time.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-3 text-sm">
            {[
              [ScanLine, "QR & biometric"],
              [Wallet, "Wallet & payroll"],
              [BarChart3, "Live reports"],
            ].map(([I, t]: any) => (
              <div key={t} className="rounded-2xl bg-white/10 p-4">
                <I className="mb-2 h-5 w-5 text-amber-300" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { session, login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as any;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  if (session) return <Navigate to={loc.state?.from ?? "/"} replace />;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      nav(loc.state?.from ?? "/", { replace: true });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Shell>
      <h1 className="text-2xl font-extrabold">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-500">
        Sign in to manage your canteen.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Email">
          <Input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-sm font-semibold text-brand-700 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Button className="w-full" size="lg" loading={busy}>
          Sign in
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-slate-500">
        New to CanteenPro?{" "}
        <a
          href={`${WEBSITE}/signup`}
          className="font-semibold text-brand-700 hover:underline"
        >
          Start a free trial
        </a>
      </p>
    </Shell>
  );
}

export function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Shell>
      <h1 className="text-2xl font-extrabold">Reset password</h1>
      {sent ? (
        <p className="mt-4 text-sm text-slate-600">
          If an account exists for {email}, a reset link is on its way. Check
          your inbox.
        </p>
      ) : (
        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            await api.post("/auth/forgot-password", { email }).catch(() => {});
            setBusy(false);
            setSent(true);
          }}
        >
          <Field label="Email">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Button className="w-full" loading={busy}>
            Send reset link
          </Button>
        </form>
      )}
      <Link
        to="/login"
        className="mt-6 block text-sm font-semibold text-brand-700"
      >
        ← Back to sign in
      </Link>
    </Shell>
  );
}

export function ResetPage() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Shell>
      <h1 className="text-2xl font-extrabold">Choose a new password</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api.post("/auth/reset-password", {
              token: sp.get("token"),
              password: pw,
            });
            toast.success("Password updated. Please sign in.");
            nav("/login");
          } catch (err: any) {
            toast.error(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="New password" hint="At least 8 characters">
          <Input
            type="password"
            minLength={8}
            required
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
        </Field>
        <Button className="w-full" loading={busy}>
          Update password
        </Button>
      </form>
    </Shell>
  );
}

/** Super Admin "login as owner" lands here with #token=… */
export function ImpersonatePage() {
  const { loginWithToken } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    const t = new URLSearchParams(location.hash.slice(1)).get("token");
    if (t) loginWithToken(t).then(() => nav("/", { replace: true }));
    else nav("/login");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div className="p-10 text-center text-slate-500">Signing you in…</div>;
}
