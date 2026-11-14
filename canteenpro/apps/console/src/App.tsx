import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./lib/auth";
import Layout from "./components/Layout";
import { Loading } from "./components/ui";
import {
  LoginPage,
  ForgotPage,
  ResetPage,
  ImpersonatePage,
} from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Counter from "./pages/Counter";
import Pos from "./pages/Pos2";
import Transactions from "./pages/Transactions";
import Guests from "./pages/Guests";
import MenuPage from "./pages/Menu";
import Forecast from "./pages/Forecast";
import Employees from "./pages/Employees";
import EmployeeDetail from "./pages/EmployeeDetail";
import Inventory from "./pages/Inventory";
import { ExpensesPage, WastePage } from "./pages/BackOffice";
import Workers from "./pages/Workers";
import Feedback from "./pages/Feedback";
import Announcements from "./pages/Announcements";
import Reports from "./pages/Reports";
import SettingsPage from "./pages/Settings2";
import Billing from "./pages/Billing";

function Protected() {
  const { session, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Loading label="Loading your canteen…" />;
  if (!session)
    return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return <Layout />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPage />} />
      <Route path="/reset-password" element={<ResetPage />} />
      <Route path="/impersonate" element={<ImpersonatePage />} />
      <Route element={<Protected />}>
        <Route index element={<Dashboard />} />
        <Route path="counter" element={<Counter />} />
        <Route path="pos" element={<Pos />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="guests" element={<Guests />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="forecast" element={<Forecast />} />
        <Route path="employees" element={<Employees />} />
        <Route path="employees/:id" element={<EmployeeDetail />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="waste" element={<WastePage />} />
        <Route path="workers" element={<Workers />} />
        <Route path="feedback" element={<Feedback />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="billing" element={<Billing />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
