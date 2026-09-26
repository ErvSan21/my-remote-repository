"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { optionalUser } from "@/lib/guards";
import { saveImage } from "@/lib/files";
import { getSettings } from "@/lib/shop";
import { openingFor } from "@/lib/slots";
import {
  availableSlots,
  busyFromBlocks,
  chooseBarber,
  endTime,
  isDate,
  isTime,
  toMinutes,
  weekdayOf,
  zonedNow,
} from "@/lib/availability";
import { digits } from "@/lib/format";
import type { ActionState } from "@/lib/action-state";

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function lookupClient(telefono: string): Promise<{ cortesGratis: number; nombre: string | null }> {
  const phone = digits(telefono);
  if (phone.length < 6) return { cortesGratis: 0, nombre: null };
  const client = await prisma.client.findUnique({ where: { telefono: phone } });
  if (!client) return { cortesGratis: 0, nombre: null };
  return { cortesGratis: client.cortesGratisDisponibles, nombre: client.nombre };
}

export async function getSlots(input: {
  fecha: string;
  serviceIds: string[];
  barberId: string;
}): Promise<{ slots: string[]; error?: string }> {
  const settings = await getSettings();
  if (!settings) return { slots: [], error: "La barbería todavía no está configurada." };
  if (!isDate(input.fecha)) return { slots: [], error: "Esa fecha no es válida." };
  const today = zonedNow(settings.timezone);
  if (input.fecha < today.date) return { slots: [], error: "Ese día ya pasó." };
  const services = await prisma.service.findMany({
    where: { id: { in: input.serviceIds }, activo: true },
  });
  if (services.length !== input.serviceIds.length || services.length === 0) {
    return { slots: [], error: "Elige al menos un servicio." };
  }
  const duration = services.reduce((sum, service) => sum + service.duracionMin, 0);
  const links = await prisma.barberService.findMany({ where: { serviceId: { in: input.serviceIds } } });
  const barbers = await prisma.user.findMany({ where: { rol: "barbero", activo: true } });
  const eligible = barbers.filter((barber) =>
    input.serviceIds.every((serviceId) =>
      links.some((link) => link.userId === barber.id && link.serviceId === serviceId),
    ),
  );
  const requested = input.barberId === "any" ? eligible : eligible.filter((barber) => barber.id === input.barberId);
  if (requested.length === 0) return { slots: [], error: "Ningún barbero disponible hace esa combinación." };
  const map = await openingFor({
    fecha: input.fecha,
    durationMin: duration,
    barberIds: requested.map((barber) => barber.id),
    hours: settings.hours,
    slotMinutes: settings.slotMinutes,
    timezone: settings.timezone,
    today,
  });
  const slots = [...new Set([...map.values()].flat())].sort();
  return { slots };
}

export async function createBooking(formData: FormData): Promise<ActionState> {
  const settings = await getSettings();
  if (!settings) return { error: "La barbería todavía no está configurada." };

  const origen = text(formData.get("origen")) === "manual" ? "manual" : "web";
  const actor = origen === "manual" ? await optionalUser() : null;
  if (origen === "manual" && (!actor || !actor.activo)) {
    return { error: "Entra para agendar manualmente." };
  }

  const nombre = text(formData.get("nombre"));
  const apellido = text(formData.get("apellido"));
  const telefono = digits(text(formData.get("telefono")));
  const email = text(formData.get("email")).toLowerCase();
  const fecha = text(formData.get("fecha"));
  const horaInicio = text(formData.get("horaInicio"));
  const metodoPago = text(formData.get("metodoPago"));
  const notas = text(formData.get("notas"));
  const serviceIds = formData.getAll("serviceId").map(String);
  let barberId = text(formData.get("barberId"));

  if (nombre.length < 2) return { error: "Falta el nombre." };
  if (apellido.length < 2) return { error: "Falta el apellido." };
  if (telefono.length < 6) return { error: "El teléfono tiene que tener al menos 6 dígitos." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "El email no es válido." };
  if (!isDate(fecha) || !isTime(horaInicio)) return { error: "Elige día y hora." };
  if (!["qr", "en_local", "corte_gratis"].includes(metodoPago)) return { error: "Elige cómo se paga." };
  if (serviceIds.length === 0) return { error: "Elige al menos un servicio." };

  const today = zonedNow(settings.timezone);
  if (fecha < today.date) return { error: "Ese día ya pasó." };

  if (actor?.rol === "barbero") barberId = actor.id;

  const comprobante = formData.get("comprobante");
  const file = comprobante instanceof File && comprobante.size > 0 ? comprobante : null;
  if (metodoPago === "qr" && !file) return { error: "Sube la foto del comprobante." };

  let comprobanteUrl: string | null = null;
  if (file) {
    try {
      comprobanteUrl = await saveImage(file, "comprobantes");
    } catch (error) {
      return { error: error instanceof Error ? error.message : "No se pudo guardar el comprobante." };
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const services = await tx.service.findMany({ where: { id: { in: serviceIds }, activo: true } });
    if (services.length !== new Set(serviceIds).size) {
      return { error: "Uno de los servicios ya no está disponible." };
    }
    const duration = services.reduce((sum, service) => sum + service.duracionMin, 0);
    const links = await tx.barberService.findMany({ where: { serviceId: { in: serviceIds } } });
    const barbers = await tx.user.findMany({ where: { rol: "barbero", activo: true } });
    const eligible = barbers.filter((barber) =>
      serviceIds.every((serviceId) => links.some((link) => link.userId === barber.id && link.serviceId === serviceId)),
    );
    const requested = barberId === "any" ? eligible : eligible.filter((barber) => barber.id === barberId);
    if (requested.length === 0) return { error: "Ese barbero no hace los servicios elegidos." };

    const requestedIds = requested.map((barber) => barber.id);
    const appointments = await tx.appointment.findMany({
      where: { fecha, barberId: { in: requestedIds }, estado: { not: "cancelada" } },
    });
    const blocks = await tx.block.findMany({
      where: { barberId: { in: requestedIds }, fechaInicio: { lte: fecha }, fechaFin: { gte: fecha } },
    });
    const open = settings.hours[weekdayOf(fecha)];
    const options = requested.map((barber) => {
      const busy = appointments
        .filter((item) => item.barberId === barber.id)
        .map((item) => ({ start: toMinutes(item.horaInicio), end: toMinutes(item.horaFin) }));
      const blocked = busyFromBlocks(
        blocks.filter((item) => item.barberId === barber.id),
        fecha,
      );
      return {
        id: barber.id,
        load: appointments.filter((item) => item.barberId === barber.id).length,
        slots: availableSlots({
          open,
          durationMin: duration,
          slotMinutes: settings.slotMinutes,
          busy: [...busy, ...blocked.ranges],
          closed: blocked.closed,
          nowMinutes: fecha === today.date ? today.minutes : null,
        }),
      };
    });
    const chosen = chooseBarber(options, horaInicio);
    if (!chosen) return { error: "Ese horario ya se ocupó. Elige otro." };

    const existing = await tx.client.findUnique({ where: { telefono } });
    if (metodoPago === "corte_gratis" && (existing?.cortesGratisDisponibles ?? 0) < 1) {
      return { error: "Este teléfono no tiene un corte gratis disponible." };
    }
    const client = existing
      ? await tx.client.update({
          where: { id: existing.id },
          data: {
            nombre,
            apellido,
            email: email || existing.email,
            ...(metodoPago === "corte_gratis" ? { cortesGratisDisponibles: { decrement: 1 } } : {}),
          },
        })
      : await tx.client.create({
          data: { nombre, apellido, telefono, email: email || null },
        });

    const appointment = await tx.appointment.create({
      data: {
        publicToken: crypto.randomUUID(),
        clientId: client.id,
        barberId: chosen,
        fecha,
        horaInicio,
        horaFin: endTime(horaInicio, duration),
        estado: metodoPago === "corte_gratis" ? "confirmada" : "pendiente",
        metodoPago,
        estadoPago:
          metodoPago === "corte_gratis" ? "verificado" : metodoPago === "qr" ? "comprobante_enviado" : "pendiente",
        comprobanteUrl,
        origen,
        notas,
        freeCutConsumed: metodoPago === "corte_gratis",
        services: {
          create: services.map((service) => ({
            serviceId: service.id,
            nombre: service.nombre,
            precio: service.precio,
            duracionMin: service.duracionMin,
            cuentaFidelidad: service.cuentaFidelidad,
          })),
        },
      },
    });
    return { id: appointment.id, token: appointment.publicToken };
  });

  if ("error" in result && result.error) return { error: result.error };

  revalidatePath("/");
  revalidatePath("/admin/agenda");
  revalidatePath("/admin/pagos");
  revalidatePath("/admin/clientes");
  if (origen === "manual") redirect(`/admin/agenda/${result.id}`);
  redirect(`/reserva/${result.token}`);
}
