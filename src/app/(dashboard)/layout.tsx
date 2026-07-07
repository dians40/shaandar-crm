import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { decodeAuthSession, AUTH_COOKIE } from "@/lib/auth";
import DashboardProviders from "@/components/layout/dashboard-providers";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = decodeAuthSession(cookieStore.get(AUTH_COOKIE)?.value);

  if (!session) {
    redirect("/login");
  }

  return <DashboardProviders session={session}>{children}</DashboardProviders>;
}
