import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ScanLine,
  ShoppingCart,
  ReceiptText,
  UserRoundPlus,
  CalendarCheck2,
  UtensilsCrossed,
  Users,
  ChefHat,
  Boxes,
  Wallet,
  Trash2,
  MessageSquareHeart,
  Megaphone,
  BarChart3,
  Settings,
  CreditCard,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Bell,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Avatar } from "./ui";

type Role = "OWNER" | "MANAGER" | "CASHIER" | "KITCHEN";
const ALL: Role[] = ["OWNER", "MANAGER", "CASHIER", "KITCHEN"];
const MGR: Role[] = ["OWNER", "MANAGER"];

const NAV: {
  group: string;
  items: {
    to: string;
    label: string;
    icon: any;
    roles: Role[];
    feature?: string;
  }[];
}[] = [
  {
    group: "Overview",
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ALL }],
  },
  {
    group: "Counter",
    items: [
      {
        to: "/counter",
        label: "Serve Meals",
        icon: ScanLine,
        roles: ["OWNER", "MANAGER", "CASHIER"],
      },
      {
        to: "/pos",
        label: "POS Billing",
        icon: ShoppingCart,
        roles: ["OWNER", "MANAGER", "CASHIER"],
      },
      {
        to: "/transactions",
        label: "Transactions",
        icon: ReceiptText,
        roles: ["OWNER", "MANAGER", "CASHIER"],
      },
      {
        to: "/guests",
        label: "Guests",
        icon: UserRoundPlus,
        roles: ["OWNER", "MANAGER", "CASHIER"],
      },
    ],
  },
  {
    group: "Kitchen",
    items: [
      {
        to: "/menu",
        label: "Menu Management",
        icon: UtensilsCrossed,
        roles: ["OWNER", "MANAGER", "KITCHEN"],
      },
      {
        to: "/forecast",
        label: "Opt-ins & Forecast",
        icon: CalendarCheck2,
        roles: ["OWNER", "MANAGER", "KITCHEN"],
      },
      {
        to: "/inventory",
        label: "Inventory",
        icon: Boxes,
        roles: ["OWNER", "MANAGER", "KITCHEN"],
        feature: "inventory",
      },
      {
        to: "/waste",
        label: "Food Waste",
        icon: Trash2,
        roles: ["OWNER", "MANAGER", "KITCHEN"],
      },
    ],
  },
  {
    group: "People",
    items: [
      { to: "/employees", label: "Employees", icon: Users, roles: MGR },
      {
        to: "/workers",
        label: "Kitchen Staff",
        icon: ChefHat,
        roles: MGR,
        feature: "workforce",
      },
      {
        to: "/feedback",
        label: "Feedback",
        icon: MessageSquareHeart,
        roles: MGR,
      },
      {
        to: "/announcements",
        label: "Announcements",
        icon: Megaphone,
        roles: MGR,
      },
    ],
  },
  {
    group: "Business",
    items: [
      { to: "/reports", label: "Reports", icon: BarChart3, roles: MGR },
      {
        to: "/expenses",
        label: "Expenses",
        icon: Wallet,
        roles: MGR,
        feature: "inventory",
      },
      { to: "/settings", label: "Settings", icon: Settings, roles: MGR },
      {
        to: "/billing",
        label: "Plan & Billing",
        icon: CreditCard,
        roles: ["OWNER"],
      },
    ],
  },
];

export default function Layout() {
  const { session, logout, canteenId, setCanteenId, can, feature } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  useEffect(() => setOpen(false), [loc.pathname]);
  if (!session) return null;
  const sub = session.subscription;

  const sidebar = (
    <aside className="flex h-full w-65 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-3 px-5 py-5">
        {session.tenant.logoUrl ? (
          <img
            src={session.tenant.logoUrl}
            className="h-10 w-10 rounded-xl object-cover"
            alt=""
          />
        ) : (
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-700 text-white">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate font-extrabold text-ink">
            {session.tenant.name}
          </div>
          <div className="text-xs text-slate-500">
            {sub?.plan?.name ?? "Canteen"} plan
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV.map((g) => {
          const items = g.items.filter(
            (i) => can(...i.roles) && (!i.feature || feature(i.feature)),
          );
          if (!items.length) return null;
          return (
            <div key={g.group}>
              <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                {g.group}
              </div>
              {items.map((i) => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  end={i.to === "/"}
                  className={({ isActive }) =>
                    clsx(
                      "mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                      isActive
                        ? "bg-brand-50 text-brand-800"
                        : "text-slate-600 hover:bg-slate-50 hover:text-ink",
                    )
                  }
                >
                  <i.icon className="h-4.5 w-4.5" />
                  {i.label}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar name={session.user.name} size={34} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">
              {session.user.name}
            </div>
            <div className="truncate text-xs text-slate-500">
              {session.user.role.toLowerCase()}
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              nav("/login");
            }}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-full">
      <div className="no-print hidden lg:block">{sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0">{sidebar}</div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        {sub && (!sub.active || sub.daysLeft <= 5) && (
          <div
            className={clsx(
              "no-print px-4 py-2 text-center text-sm font-semibold",
              !sub.active
                ? "bg-red-600 text-white"
                : "bg-amber-100 text-amber-900",
            )}
          >
            {!sub.active
              ? "Your subscription has expired — counters are paused."
              : sub.status === "TRIALING"
                ? `Free trial ends in ${sub.daysLeft} day(s).`
                : `Your plan renews/expires in ${sub.daysLeft} day(s).`}{" "}
            {can("OWNER") && (
              <NavLink to="/billing" className="underline">
                {sub.active ? "Choose a plan" : "Renew now"}
              </NavLink>
            )}
          </div>
        )}
        <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-8">
          <button
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="relative">
            <select
              value={canteenId}
              onChange={(e) => setCanteenId(e.target.value)}
              className="h-10 appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-3 pr-9 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              {session.canteens.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
          <div className="flex-1" />
          <NavLink
            to="/announcements"
            className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100"
            title="Announcements"
          >
            <Bell className="h-5 w-5" />
          </NavLink>
          <a
            href={(import.meta.env.VITE_WEBSITE_URL || "") + "/contact"}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100"
            title="Help & support"
          >
            <HelpCircle className="h-5 w-5" />
          </a>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-350">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
