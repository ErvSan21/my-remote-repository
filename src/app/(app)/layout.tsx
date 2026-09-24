import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getAuthContext } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const auth = await getAuthContext();

  if (!auth) {
    redirect("/login");
  }

  return (
    <AppShell role={auth.profile.role} email={auth.user.email}>
      {children}
    </AppShell>
  );
}
