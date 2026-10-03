import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !user.activo) redirect("/admin/login?aviso=sin-acceso");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.rol !== "admin") redirect("/admin/agenda");
  return user;
}

export async function optionalUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
}
