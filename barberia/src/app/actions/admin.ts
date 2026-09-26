"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/guards";
import { saveImage } from "@/lib/files";
import { DEFAULT_HOURS, WEEKDAYS, isDate, isTime, type HoursMap } from "@/lib/availability";
import { digits } from "@/lib/format";
import type { ActionState } from "@/lib/action-state";

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/reservar");
  revalidatePath("/admin/agenda");
  revalidatePath("/admin/pagos");
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/productos");
  revalidatePath("/admin/servicios");
  revalidatePath("/admin/barberos");
  revalidatePath("/admin/bloqueos");
  revalidatePath("/admin/configuracion");
}

async function ownAppointment(id: string) {
  const user = await requireUser();
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { services: true, client: true },
  });
  if (!appointment) redirect("/admin/agenda");
  if (user.rol === "barbero" && appointment.barberId !== user.id) redirect("/admin/agenda");
  return { user, appointment };
}

export async function setEstado(formData: FormData) {
  const id = text(formData.get("id"));
  const estado = text(formData.get("estado"));
  const { appointment } = await ownAppointment(id);
  if (estado !== "completada" && estado !== "cancelada") redirect(`/admin/agenda/${id}`);
  if (appointment.estado === "cancelada" || appointment.estado === estado) {
    redirect(`/admin/agenda/${id}`);
  }
  if (estado === "cancelada" && appointment.estado === "completada") {
    redirect(`/admin/agenda/${id}?error=${encodeURIComponent("Una cita completada se queda en el historial.")}`);
  }

  await prisma.$transaction(async (tx) => {
    if (estado === "completada") {
      const counts = appointment.services.some((service) => service.cuentaFidelidad);
      await tx.appointment.update({
        where: { id },
        data: {
          estado: "completada",
          loyaltyApplied: true,
          estadoPago:
            appointment.metodoPago === "en_local" && appointment.estadoPago === "pendiente"
              ? "verificado"
              : appointment.estadoPago,
        },
      });
      if (!appointment.loyaltyApplied && counts) {
        const settings = await tx.settings.findUnique({ where: { id: 1 } });
        const visitas = appointment.client.visitasTotales + 1;
        const grant = Boolean(settings && settings.loyaltyEveryN > 0 && visitas % settings.loyaltyEveryN === 0);
        await tx.client.update({
          where: { id: appointment.clientId },
          data: {
            visitasTotales: { increment: 1 },
            cortesGratisDisponibles: { increment: grant ? 1 : 0 },
          },
        });
      }
      return;
    }
    await tx.appointment.update({ where: { id }, data: { estado: "cancelada" } });
    if (appointment.freeCutConsumed) {
      await tx.client.update({
        where: { id: appointment.clientId },
        data: { cortesGratisDisponibles: { increment: 1 } },
      });
    }
  });
  refresh();
  redirect(`/admin/agenda/${id}`);
}

export async function setPago(formData: FormData) {
  const id = text(formData.get("id"));
  const estadoPago = text(formData.get("estadoPago"));
  const { appointment } = await ownAppointment(id);
  if (appointment.estado === "cancelada" || appointment.estado === "completada") redirect(`/admin/agenda/${id}`);
  if (!["verificado", "rechazado", "en_local"].includes(estadoPago)) redirect(`/admin/agenda/${id}`);
  if (estadoPago === "en_local") {
    await prisma.appointment.update({
      where: { id },
      data: { metodoPago: "en_local", estadoPago: "pendiente", estado: appointment.estado === "cancelada" ? "cancelada" : "pendiente" },
    });
  } else {
    await prisma.appointment.update({
      where: { id },
      data: {
        estadoPago,
        estado: estadoPago === "verificado" && appointment.estado === "pendiente" ? "confirmada" : appointment.estado,
      },
    });
  }
  refresh();
  redirect(`/admin/agenda/${id}`);
}

export async function createBlock(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const barberId = user.rol === "barbero" ? user.id : text(formData.get("barberId"));
  const fechaInicio = text(formData.get("fechaInicio"));
  const fechaFin = text(formData.get("fechaFin"));
  const todoElDia = formData.get("todoElDia") === "on";
  const horaInicio = text(formData.get("horaInicio"));
  const horaFin = text(formData.get("horaFin"));
  const motivo = text(formData.get("motivo"));
  if (!barberId) return { error: "Elige un barbero." };
  if (!isDate(fechaInicio) || !isDate(fechaFin) || fechaFin < fechaInicio) {
    return { error: "Revisa el rango de fechas." };
  }
  if (!todoElDia && (!isTime(horaInicio) || !isTime(horaFin) || horaFin <= horaInicio)) {
    return { error: "La hora de fin tiene que ser posterior a la de inicio." };
  }
  const barber = await prisma.user.findFirst({ where: { id: barberId, rol: "barbero" } });
  if (!barber) return { error: "Ese barbero no existe." };
  await prisma.block.create({
    data: {
      barberId,
      fechaInicio,
      fechaFin,
      horaInicio: todoElDia ? null : horaInicio,
      horaFin: todoElDia ? null : horaFin,
      motivo,
    },
  });
  refresh();
  redirect("/admin/bloqueos");
}

export async function deleteBlock(formData: FormData) {
  const user = await requireUser();
  const id = text(formData.get("id"));
  const block = await prisma.block.findUnique({ where: { id } });
  if (!block) redirect("/admin/bloqueos");
  if (user.rol === "barbero" && block.barberId !== user.id) redirect("/admin/bloqueos");
  await prisma.block.delete({ where: { id } });
  refresh();
  redirect("/admin/bloqueos");
}

function wholeNumber(value: FormDataEntryValue | null, label: string): number | ActionState {
  const parsed = Number(String(value ?? "").replace(",", "."));
  if (!Number.isInteger(parsed) || parsed < 0) return { error: `${label} tiene que ser un número entero.` };
  return parsed;
}

export async function saveProduct(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = text(formData.get("id"));
  const nombre = text(formData.get("nombre"));
  const descripcion = text(formData.get("descripcion"));
  const precio = wholeNumber(formData.get("precioVenta"), "El precio");
  const costo = wholeNumber(formData.get("costo"), "El costo");
  const stock = wholeNumber(formData.get("stock"), "El stock");
  const stockBajo = wholeNumber(formData.get("stockBajo"), "La alerta de stock");
  if (!nombre) return { error: "Falta el nombre del producto." };
  if (typeof precio !== "number") return precio;
  if (typeof costo !== "number") return costo;
  if (typeof stock !== "number") return stock;
  if (typeof stockBajo !== "number") return stockBajo;
  const file = formData.get("foto");
  let foto: string | undefined;
  if (file instanceof File && file.size > 0) {
    try {
      foto = await saveImage(file, "productos");
    } catch (error) {
      return { error: error instanceof Error ? error.message : "No se pudo guardar la foto." };
    }
  }
  const data = {
    nombre,
    descripcion,
    precioVenta: precio,
    costo,
    stock,
    stockBajo,
    activo: formData.get("activo") === "on",
    ...(foto ? { foto: `/api/archivo/${foto}` } : {}),
  };
  if (id) {
    const current = await prisma.product.findUnique({ where: { id } });
    if (!current) return { error: "No encontramos el producto." };
    await prisma.product.update({ where: { id }, data });
    if (current.precioVenta !== data.precioVenta || current.costo !== data.costo) {
      await prisma.priceHistory.create({
        data: { productId: id, precioVenta: data.precioVenta, costo: data.costo },
      });
    }
  } else {
    const created = await prisma.product.create({ data });
    await prisma.priceHistory.create({
      data: { productId: created.id, precioVenta: data.precioVenta, costo: data.costo },
    });
  }
  refresh();
  redirect("/admin/productos");
}

export async function saveService(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = text(formData.get("id"));
  const nombre = text(formData.get("nombre"));
  const descripcion = text(formData.get("descripcion"));
  const duracion = wholeNumber(formData.get("duracionMin"), "La duración");
  const precio = wholeNumber(formData.get("precio"), "El precio");
  if (!nombre) return { error: "Falta el nombre del servicio." };
  if (typeof duracion !== "number") return duracion;
  if (duracion <= 0) return { error: "La duración tiene que ser mayor a 0." };
  if (typeof precio !== "number") return precio;
  const data = {
    nombre,
    descripcion,
    duracionMin: duracion,
    precio,
    cuentaFidelidad: formData.get("cuentaFidelidad") === "on",
    activo: formData.get("activo") === "on",
  };
  if (id) await prisma.service.update({ where: { id }, data });
  else await prisma.service.create({ data });
  refresh();
  redirect("/admin/servicios");
}

export async function saveBarber(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = text(formData.get("id"));
  const nombre = text(formData.get("nombre"));
  const email = text(formData.get("email")).toLowerCase();
  const password = text(formData.get("password"));
  const serviceIds = formData.getAll("serviceId").map(String);
  if (nombre.length < 2) return { error: "Falta el nombre." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "El email no es válido." };
  if (!id && password.length < 8) return { error: "La contraseña necesita al menos 8 caracteres." };
  if (id && password && password.length < 8) return { error: "La contraseña necesita al menos 8 caracteres." };
  const taken = await prisma.user.findUnique({ where: { email } });
  if (taken && taken.id !== id) return { error: "Ese email ya tiene una cuenta." };
  const file = formData.get("foto");
  let foto: string | undefined;
  if (file instanceof File && file.size > 0) {
    try {
      foto = `/api/archivo/${await saveImage(file, "barberos")}`;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "No se pudo guardar la foto." };
    }
  }
  const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
  if (id) {
    await prisma.user.update({
      where: { id },
      data: { nombre, email, ...(passwordHash ? { passwordHash } : {}), ...(foto ? { foto } : {}) },
    });
    await prisma.barberService.deleteMany({ where: { userId: id } });
    if (serviceIds.length) {
      await prisma.barberService.createMany({ data: serviceIds.map((serviceId) => ({ userId: id, serviceId })) });
    }
  } else {
    await prisma.user.create({
      data: {
        nombre,
        email,
        passwordHash: passwordHash ?? "",
        rol: "barbero",
        foto,
        services: { create: serviceIds.map((serviceId) => ({ serviceId })) },
      },
    });
  }
  refresh();
  redirect("/admin/barberos");
}

export async function toggleBarber(formData: FormData) {
  await requireAdmin();
  const id = text(formData.get("id"));
  const activo = text(formData.get("activo")) === "1";
  await prisma.user.update({ where: { id }, data: { activo } });
  refresh();
  redirect("/admin/barberos");
}

export async function giftCut(formData: FormData) {
  await requireAdmin();
  const id = text(formData.get("id"));
  await prisma.client.update({ where: { id }, data: { cortesGratisDisponibles: { increment: 1 } } });
  refresh();
  redirect(`/admin/clientes/${id}`);
}

export async function saveSettings(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const shopName = text(formData.get("shopName"));
  const tagline = text(formData.get("tagline"));
  const whatsappNumber = digits(text(formData.get("whatsappNumber")));
  const whatsappMessage = text(formData.get("whatsappMessage"));
  const loyalty = wholeNumber(formData.get("loyaltyEveryN"), "La regla de fidelidad");
  const slot = wholeNumber(formData.get("slotMinutes"), "El intervalo");
  if (!shopName) return { error: "Falta el nombre de la barbería." };
  if (whatsappNumber.length < 8) return { error: "El WhatsApp necesita el número con código de país." };
  if (typeof loyalty !== "number") return loyalty;
  if (loyalty < 1) return { error: "La fidelidad tiene que ser al menos cada 1 corte." };
  if (typeof slot !== "number") return slot;
  if (slot < 10 || slot > 120) return { error: "El intervalo tiene que estar entre 10 y 120 minutos." };
  const hours: HoursMap = { ...DEFAULT_HOURS };
  for (const day of WEEKDAYS) {
    if (formData.get(`${day}-closed`) === "on") {
      hours[day] = null;
      continue;
    }
    const open = text(formData.get(`${day}-open`));
    const close = text(formData.get(`${day}-close`));
    if (!isTime(open) || !isTime(close) || close <= open) return { error: "Revisa el horario de cada día abierto." };
    hours[day] = [open, close];
  }
  const file = formData.get("qr");
  let qrImageUrl: string | undefined;
  if (file instanceof File && file.size > 0) {
    try {
      qrImageUrl = await saveImage(file, "qr");
    } catch (error) {
      return { error: error instanceof Error ? error.message : "No se pudo guardar el QR." };
    }
  }
  await prisma.settings.update({
    where: { id: 1 },
    data: {
      shopName,
      tagline,
      whatsappNumber,
      whatsappMessage,
      loyaltyEveryN: loyalty,
      slotMinutes: slot,
      hoursJson: JSON.stringify(hours),
      ...(qrImageUrl ? { qrImageUrl } : {}),
    },
  });
  refresh();
  redirect("/admin/configuracion?aviso=guardado");
}
