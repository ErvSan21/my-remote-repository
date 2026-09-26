import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/shop";
import { one } from "@/lib/format";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar" };

export default async function LoginPage(props: { searchParams: Promise<{ aviso?: string }> }) {
  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user?.activo) redirect("/admin/agenda");
  }
  const params = await props.searchParams;
  const settings = await getSettings();
  const aviso = one(params.aviso);

  return (
    <main className="min-h-dvh bg-foam px-4 py-10 text-ink">
      <div className="mx-auto grid max-w-lg gap-6">
        <h1 className="font-display text-5xl leading-[0.9]">{settings?.shopName ?? "Casa Navarro"}</h1>
        <p>Entra para ver la agenda.</p>
        {aviso === "sin-acceso" ? <p className="text-sm text-signal">Esta cuenta no tiene acceso.</p> : null}
        <LoginForm />
        {process.env.NODE_ENV !== "production" ? (
          <p className="text-sm text-[#3e564c]">
            Demo: elena@casanavarro.test (dueña), mateo@casanavarro.test y luis@casanavarro.test. Contraseña navarro123.
          </p>
        ) : null}
      </div>
    </main>
  );
}
