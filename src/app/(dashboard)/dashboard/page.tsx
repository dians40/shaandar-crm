import { LayoutDashboard, TrendingUp, Users, Briefcase } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";

const stats = [
  {
    label: "Total Leads",
    value: "1,248",
    change: "+12.5%",
    icon: Users,
  },
  {
    label: "Active Deals",
    value: "86",
    change: "+4.2%",
    icon: Briefcase,
  },
  {
    label: "Revenue (MTD)",
    value: "₹24.6L",
    change: "+8.1%",
    icon: TrendingUp,
  },
  {
    label: "Conversion Rate",
    value: "32.4%",
    change: "+2.3%",
    icon: LayoutDashboard,
  },
];

export default function DashboardPage() {
  return (
    <DashboardShell
      title="Dashboard"
      description="Welcome back — here's your business overview."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article
              key={stat.label}
              className="rounded-xl border border-corporate-border bg-corporate-surface p-5 shadow-card"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-corporate-muted">{stat.label}</p>
                  <p className="mt-2 text-2xl font-bold text-corporate-text">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs font-medium text-emerald-600">
                    {stat.change} from last month
                  </p>
                </div>
                <div className="rounded-lg bg-corporate-brand-light p-2.5 text-corporate-brand">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <section className="mt-6 rounded-xl border border-corporate-border bg-corporate-surface p-6 shadow-card">
        <h2 className="text-base font-semibold text-corporate-text">
          Getting Started
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-corporate-muted">
          Your Shaandar CRM workspace is ready. Use the left navigation to access
          Master Panel, User Management, Transactions, Reports, and Analytics
          modules. Each section will be built out in upcoming phases.
        </p>
      </section>
    </DashboardShell>
  );
}
