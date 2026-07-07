import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { decodeAuthSession, AUTH_COOKIE } from "@/lib/auth";
import { getPostLoginRedirect } from "@/lib/auth-navigation";

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = decodeAuthSession(cookieStore.get(AUTH_COOKIE)?.value);

  if (session) {
    redirect(getPostLoginRedirect(session));
  }

  redirect("/login");
}
