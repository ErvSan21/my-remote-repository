import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { DEFAULT_HOURS, addDays, weekdayOf, zonedNow } from "../src/lib/availability";

const prisma = new PrismaClient();

function openDay(from: string, offset: number): string {
  for (let day = offset; day < offset + 8; day += 1) {
    const date = addDays(from, day);
    if (DEFAULT_HOURS[weekdayOf(date)]) return date;
  }
  return addDays(from, offset);
}

async function main() {
  await prisma.appointmentService.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.block.deleteMany();
  await prisma.barberService.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.service.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.settings.deleteMany();

  const passwordHash = await bcrypt.hash("navarro123", 10);
  const today = zonedNow("America/La_Paz").date;
  const soon = openDay(today, 1);
  const later = openDay(today, 3);

  await prisma.settings.create({
    data: {
      id: 1,
      shopName: "Casa Navarro",
      tagline: "Elige servicio, barbero y hora. Sin llamar.",
      whatsappNumber: "59170011223",
      whatsappMessage: "Hola, quiero consultar por una cita en Casa Navarro.",
      qrImageUrl: "/marca/qr.svg",
      loyaltyEveryN: 5,
      slotMinutes: 30,
      timezone: "America/La_Paz",
      hoursJson: JSON.stringify(DEFAULT_HOURS),
    },
  });

  const [corte, combo, barba, nino] = await Promise.all([
    prisma.service.create({
      data: { nombre: "Corte", descripcion: "Tijera o máquina, como lo pidas.", duracionMin: 35, precio: 50 },
    }),
    prisma.service.create({
      data: { nombre: "Corte y barba", descripcion: "Corte más perfilado de barba.", duracionMin: 55, precio: 70 },
    }),
    prisma.service.create({
      data: { nombre: "Barba", descripcion: "Perfilado y toalla caliente.", duracionMin: 25, precio: 35, cuentaFidelidad: false },
    }),
    prisma.service.create({
      data: { nombre: "Corte niño", descripcion: "Para menores de 12 años.", duracionMin: 30, precio: 40 },
    }),
  ]);

  const admin = prisma.user.create({
    data: { nombre: "Elena Navarro", email: "elena@casanavarro.test", passwordHash, rol: "admin" },
  });
  const mateo = prisma.user.create({
    data: {
      nombre: "Mateo",
      email: "mateo@casanavarro.test",
      passwordHash,
      rol: "barbero",
      services: { create: [corte, combo, barba, nino].map((service) => ({ serviceId: service.id })) },
    },
  });
  const luis = prisma.user.create({
    data: {
      nombre: "Luis",
      email: "luis@casanavarro.test",
      passwordHash,
      rol: "barbero",
      services: { create: [corte, barba].map((service) => ({ serviceId: service.id })) },
    },
  });
  const [, mateoUser, luisUser] = await Promise.all([admin, mateo, luis]);

  await Promise.all([
    prisma.product.create({
      data: {
        nombre: "Pomada mate",
        descripcion: "Fijación media, sin brillo.",
        precioVenta: 45,
        costo: 18,
        stock: 8,
        foto: "/marca/pomada.svg",
        priceHistory: { create: { precioVenta: 45, costo: 18 } },
      },
    }),
    prisma.product.create({
      data: {
        nombre: "Aceite de barba",
        descripcion: "Argán y cedro.",
        precioVenta: 55,
        costo: 22,
        stock: 2,
        stockBajo: 3,
        foto: "/marca/aceite.svg",
        priceHistory: { create: { precioVenta: 55, costo: 22 } },
      },
    }),
    prisma.product.create({
      data: {
        nombre: "Peine de acetato",
        descripcion: "Dientes anchos.",
        precioVenta: 30,
        costo: 10,
        stock: 6,
        foto: "/marca/peine.svg",
        priceHistory: { create: { precioVenta: 30, costo: 10 } },
      },
    }),
  ]);

  const andres = await prisma.client.create({
    data: { nombre: "Andrés", apellido: "Quispe", telefono: "70123456", visitasTotales: 4 },
  });
  const valeria = await prisma.client.create({
    data: { nombre: "Valeria", apellido: "Rojas", telefono: "71234567", visitasTotales: 5, cortesGratisDisponibles: 1 },
  });
  const hugo = await prisma.client.create({
    data: { nombre: "Hugo", apellido: "Mamani", telefono: "72345678" },
  });

  await prisma.appointment.create({
    data: {
      publicToken: crypto.randomUUID(),
      clientId: andres.id,
      barberId: mateoUser.id,
      fecha: addDays(today, -6),
      horaInicio: "11:00",
      horaFin: "11:35",
      estado: "completada",
      metodoPago: "en_local",
      estadoPago: "verificado",
      loyaltyApplied: true,
      origen: "web",
      services: {
        create: { serviceId: corte.id, nombre: corte.nombre, precio: corte.precio, duracionMin: corte.duracionMin, cuentaFidelidad: true },
      },
    },
  });
  await prisma.appointment.create({
    data: {
      publicToken: crypto.randomUUID(),
      clientId: hugo.id,
      barberId: mateoUser.id,
      fecha: soon,
      horaInicio: "10:00",
      horaFin: "10:35",
      estado: "pendiente",
      metodoPago: "en_local",
      estadoPago: "pendiente",
      origen: "web",
      services: {
        create: { serviceId: corte.id, nombre: corte.nombre, precio: corte.precio, duracionMin: corte.duracionMin, cuentaFidelidad: true },
      },
    },
  });
  await prisma.appointment.create({
    data: {
      publicToken: crypto.randomUUID(),
      clientId: valeria.id,
      barberId: luisUser.id,
      fecha: soon,
      horaInicio: "11:00",
      horaFin: "11:25",
      estado: "pendiente",
      metodoPago: "qr",
      estadoPago: "comprobante_enviado",
      comprobanteUrl: "/marca/comprobante.svg",
      origen: "web",
      services: {
        create: { serviceId: barba.id, nombre: barba.nombre, precio: barba.precio, duracionMin: barba.duracionMin, cuentaFidelidad: false },
      },
    },
  });
  await prisma.block.create({
    data: {
      barberId: luisUser.id,
      fechaInicio: later,
      fechaFin: later,
      horaInicio: "14:00",
      horaFin: "16:00",
      motivo: "Trámite",
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
