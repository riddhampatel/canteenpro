import { NavLink, Outlet, useLocation } from "react-router-dom";
import clsx from "clsx";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Building2,
  Layers,
  TicketPercent,
  CreditCard,
  Newspaper,
  FileText,
  Quote,
  HelpCircle,
  Inbox,
  Settings,
  Mail,
  MailCheck,
  Send,
  Users,
  History,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Avatar } from "./ui";

type R = "SUPER_ADMIN" | "SUPPORT" | "CONTENT_EDITOR";
const A: R[] = ["SUPER_ADMIN", "SUPPORT", "CONTENT_EDITOR"];
const S: R[] = ["SUPER_ADMIN"];
const NAV: {
  group: string;
  items: { to: string; label: string; icon: any; roles: R[] }[];
}[] = [
  {
    group: "Business",
    items: [
      {
        to: "/",
        label: "Dashboard",
        icon: LayoutDashboard,
        roles: ["SUPER_ADMIN", "SUPPORT"],
      },
      {
        to: "/tenants",
        label: "Customers",
        icon: Building2,
        roles: ["SUPER_ADMIN", "SUPPORT"],
      },
      {
        to: "/payments",
        label: "Payments",
        icon: CreditCard,
        roles: ["SUPER_ADMIN", "SUPPORT"],
      },
      { to: "/leads", label: "Leads", icon: Inbox, roles: A },
    ],
  },
  {
    group: "Pricing",
    items: [
      { to: "/plans", label: "Plans", icon: Layers, roles: S },
      { to: "/coupons", label: "Coupons", icon: TicketPercent, roles: S },
    ],
  },
  {
    group: "Website",
    items: [
      {
        to: "/blog",
        label: "Blog posts",
        icon: Newspaper,
        roles: ["SUPER_ADMIN", "CONTENT_EDITOR"],
      },
      {
        to: "/pages",
        label: "Pages",
        icon: FileText,
        roles: ["SUPER_ADMIN", "CONTENT_EDITOR"],
      },
      {
        to: "/testimonials",
        label: "Testimonials",
        icon: Quote,
        roles: ["SUPER_ADMIN", "CONTENT_EDITOR"],
      },
      {
        to: "/faqs",
        label: "FAQs",
        icon: HelpCircle,
        roles: ["SUPER_ADMIN", "CONTENT_EDITOR"],
      },
    ],
  },
  {
    group: "Messaging",
    items: [
      {
        to: "/email-templates",
        label: "Email templates",
        icon: Mail,
        roles: S,
      },
      { to: "/email-logs", label: "Email logs", icon: MailCheck, roles: A },
      { to: "/broadcast", label: "Broadcast", icon: Send, roles: S },
    ],
  },
  {
    group: "System",
    items: [
      { to: "/settings", label: "Settings & keys", icon: Settings, roles: S },
      { to: "/users", label: "Admin users", icon: Users, roles: S },
      { to: "/audit", label: "Audit log", icon: History, roles: S },
    ],
  },
];

export default function Layout() {
  const { user, logout, is } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  const side = (
    <aside className="flex h-full w-[250px] flex-col bg-slate-950 text-slate-300">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <div className="font-extrabold text-white">CanteenPro</div>
          <div className="text-xs text-slate-400">Super Admin</div>
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV.map((g) => {
          const items = g.items.filter((i) => is(...i.roles));
          if (!items.length) return null;
          return (
            <div key={g.group}>
              <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                {g.group}
              </div>
              {items.map((i) => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  end={i.to === "/"}
                  className={({ isActive }) =>
                    clsx(
                      "mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition",
                      isActive
                        ? "bg-white/10 text-white"
                        : "hover:bg-white/5 hover:text-white",
                    )
                  }
                >
                  <i.icon className="h-[18px] w-[18px]" />
                  {i.label}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>
      <a
        href={import.meta.env.VITE_WEBSITE_URL || "http://localhost:3000"}
        target="_blank"
        rel="noreferrer"
        className="mx-3 mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/5"
      >
        <ExternalLink className="h-4 w-4" />
        View website
      </a>
      <div className="flex items-center gap-3 border-t border-white/10 p-4">
        <Avatar name={user?.name} size={34} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-white">
            {user?.name}
          </div>
          <div className="truncate text-xs text-slate-400">
            {user?.role.replace("_", " ").toLowerCase()}
          </div>
        </div>
        <button
          onClick={logout}
          className="rounded-lg p-2 hover:bg-white/10 hover:text-red-400"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
  return (
    <div className="flex h-full">
      <div className="hidden lg:block">{side}</div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0">{side}</div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center border-b border-slate-200 bg-white px-4 lg:hidden">
          <button className="rounded-lg p-2" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="ml-2 font-bold">CanteenPro Admin</span>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
