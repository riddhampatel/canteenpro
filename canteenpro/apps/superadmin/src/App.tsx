import { useState, type FormEvent } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import toast from "react-hot-toast";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "./lib/auth";
import Layout from "./components/Layout";
import { Button, Field, Input, Loading } from "./components/ui";
import { Dashboard, Payments, TenantDetail, Tenants } from "./pages/Business";
import {
  BlogPage,
  CouponsPage,
  FaqsPage,
  LeadsPage,
  PagesPage,
  PlansPage,
  TestimonialsPage,
  UsersPage,
} from "./pages/Content";
import {
  AuditPage,
  BroadcastPage,
  EmailLogsPage,
  EmailTemplatesPage,
  SettingsPage,
} from "./pages/System";

function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex min-h-full items-center justify-center bg-slate-950 p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl"
      >
        <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-white">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-extrabold">Super Admin</h1>
        <p className="mb-6 text-sm text-slate-500">
          CanteenPro platform control panel
        </p>
        <div className="space-y-4">
          <Field label="Email">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Button className="w-full" size="lg" loading={busy}>
            Sign in
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function App() {
  const { user, loading, is } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Login />;
  const home = is("SUPER_ADMIN", "SUPPORT") ? (
    <Dashboard />
  ) : (
    <Navigate to="/blog" replace />
  );
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={home} />
        <Route path="tenants" element={<Tenants />} />
        <Route path="tenants/:id" element={<TenantDetail />} />
        <Route path="payments" element={<Payments />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="coupons" element={<CouponsPage />} />
        <Route path="blog" element={<BlogPage />} />
        <Route path="pages" element={<PagesPage />} />
        <Route path="testimonials" element={<TestimonialsPage />} />
        <Route path="faqs" element={<FaqsPage />} />
        <Route path="email-templates" element={<EmailTemplatesPage />} />
        <Route path="email-logs" element={<EmailLogsPage />} />
        <Route path="broadcast" element={<BroadcastPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
