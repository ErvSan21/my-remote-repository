import Image from "next/image";
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
    <main className="min-h-dvh bg-foam text-ink md:grid md:grid-cols-2">
      <div className="relative h-48 md:h-auto md:min-h-dvh">
        <Image src="/fotos/hero-wide.png" alt="" fill priority sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
        <div className="absolute inset-0 bg-ink/35" />
      </div>
      <div className="mx-auto grid w-full max-w-md gap-6 px-5 py-10">
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
