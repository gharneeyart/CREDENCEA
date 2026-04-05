import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardNavItem = {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

type DashboardShellProps = {
  badge: string;
  title: string;
  description: string;
  navItems: DashboardNavItem[];
  sidebarTone: string;
  sidebarAccent: string;
  summary?: ReactNode;
};

export function DashboardShell({
  badge,
  title,
  description,
  navItems,
  sidebarTone,
  sidebarAccent,
  // summary,
}: DashboardShellProps) {
  return (
    <div className="w-11/12  mx-auto  py-10">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]", sidebarTone)}>
            {badge}
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        {/* {summary ? <div className="lg:max-w-sm">{summary}</div> : null} */}
      </div>

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className={cn("rounded-[28px] border p-4 shadow-sm", sidebarAccent)}>
          {/* <div className="mb-4 px-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Workspace</p>
            <p className="mt-1 text-sm text-slate-500">Use the sidebar to switch between forms, tables, and operational tools.</p>
          </div> */}
          <nav className="space-y-2">
            {navItems.map(({ to, label, description: itemDescription, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to.endsWith("/forms") || to.endsWith("/institutions") || to.endsWith("/applications")}
                className={({ isActive }) => cn(
                  "block rounded-2xl border px-4 py-3 transition-all",
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10"
                    : "border-transparent bg-white/80 text-slate-700 hover:border-slate-200 hover:bg-white"
                )}
              >
                {({ isActive }) => (
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl",
                      isActive ? "bg-white/10 text-white" : sidebarTone
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{label}</p>
                      <p className={cn("mt-1 text-xs leading-5", isActive ? "text-slate-300" : "text-slate-500")}>
                        {itemDescription}
                      </p>
                    </div>
                  </div>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>

        <section className="min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
