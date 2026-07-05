import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUTH_COOKIE } from "@/lib/auth";
import DashboardProviders from "@/components/layout/dashboard-providers";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get(AUTH_COOKIE)?.value === "true";

  if (!isAuthenticated) {
    redirect("/login");
  }

  return <DashboardProviders>{children}</DashboardProviders>;
}
