"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { saveImage } from "@/lib/files";

export async function replaceReceipt(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const file = formData.get("comprobante");
  const appointment = await prisma.appointment.findUnique({ where: { publicToken: token } });
  if (!appointment || appointment.estado === "cancelada" || appointment.estadoPago !== "rechazado") {
    redirect("/");
  }
  if (!(file instanceof File) || file.size <= 0) {
    redirect(`/reserva/${token}`);
  }
  const comprobanteUrl = await saveImage(file, "comprobantes");
  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { comprobanteUrl, estadoPago: "comprobante_enviado", metodoPago: "qr" },
  });
  revalidatePath(`/reserva/${token}`);
  revalidatePath("/admin/pagos");
  redirect(`/reserva/${token}`);
}
