import Link from "next/link";
import { prisma } from "@/lib/db";
import { bolivianos, formatWhen, waLink } from "@/lib/format";
import { nextOpening } from "@/lib/slots";
import { getSettings } from "@/lib/shop";
import { zonedNow } from "@/lib/availability";

export default async function HomePage() {
  const settings = await getSettings();
  if (!settings) {
    return (
      <main className="mx-auto max-w-lg px-5 py-16">
        <h1 className="font-display text-5xl leading-none">Casa Navarro</h1>
        <p className="mt-4 text-lg">Falta preparar la base de datos. En la carpeta barberia corre npm run db:setup.</p>
      </main>
    );
  }

  const [services, products, opening] = await Promise.all([
    prisma.service.findMany({ where: { activo: true }, orderBy: { precio: "asc" } }),
    prisma.product.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    nextOpening(),
  ]);
  const today = zonedNow(settings.timezone);
  const whatsapp = waLink(settings.whatsappNumber, settings.whatsappMessage);

  return (
    <>
      <main className="mx-auto max-w-lg pb-28">
        <section className="px-5 pt-8">
          <h1 className="font-display text-[4.4rem] leading-[0.85] tracking-[-0.03em]">{settings.shopName}</h1>
          <p className="mt-5 max-w-[16rem] text-lg leading-snug text-mist">{settings.tagline}</p>
          {opening ? (
            <p className="mt-6 max-w-[18rem] text-base leading-snug">
              <Link href="/reservar">
                El próximo lugar libre es {formatWhen(opening.fecha, today.date).toLowerCase()} a las {opening.hora}, con {opening.barber}.
              </Link>
            </p>
          ) : (
            <p className="mt-6 text-base">No hay horas libres en los próximos 14 días.</p>
          )}
        </section>

        <section id="servicios" className="mt-10">
          <h2 className="px-5 font-display text-3xl">Servicios</h2>
          <ul className="mt-3">
            {services.map((service) => (
              <li key={service.id} className="grid grid-cols-[1fr_auto] gap-3 border-t border-line px-5 py-4">
                <div>
                  <p className="text-lg">{service.nombre}</p>
                  <p className="text-sm text-mist">
                    {service.duracionMin} min. {service.descripcion}
                  </p>
                </div>
                <p className="text-brass">{bolivianos(service.precio)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="px-5 font-display text-3xl">Productos</h2>
          <ul className="mt-4 flex snap-x gap-3 overflow-x-auto px-5 pb-2">
            {products.map((product) => (
              <li key={product.id} className="w-40 shrink-0 snap-start">
                {product.foto ? (
                  // Ilustraciones locales del catálogo.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.foto} alt="" className="h-40 w-40 bg-foam object-contain" />
                ) : (
                  <div className="flex h-40 w-40 items-end bg-foam p-3 font-display text-3xl text-ink">{product.nombre}</div>
                )}
                <p className="mt-2">{product.nombre}</p>
                <p className="text-sm text-mist">{product.descripcion}</p>
                <p className="text-brass">{bolivianos(product.precioVenta)}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-lg gap-2">
          <a href={whatsapp} className="flex h-14 flex-1 items-center justify-center border border-mist text-foam">
            WhatsApp
          </a>
          <Link href="/reservar" className="flex h-14 flex-[1.6] items-center justify-center bg-signal text-base font-medium text-white">
            Reservar cita
          </Link>
        </div>
      </div>
    </>
  );
}
