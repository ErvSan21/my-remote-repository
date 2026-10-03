import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { bolivianos, formatWhen, waLink } from "@/lib/format";
import { nextOpening } from "@/lib/slots";
import { getSettings } from "@/lib/shop";
import { zonedNow } from "@/lib/availability";

const productPhotos: Record<string, string> = {
  "Pomada mate": "/fotos/pomada.png",
  "Aceite de barba": "/fotos/aceite.png",
  "Peine de acetato": "/fotos/peine.png",
};

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
      <main>
        <section className="relative min-h-[100dvh] overflow-hidden">
          <Image
            src="/fotos/hero-chair.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="hero-photo object-cover md:hidden"
          />
          <Image
            src="/fotos/hero-wide.png"
            alt="Silla de la barbería"
            fill
            priority
            sizes="100vw"
            className="hero-photo hidden object-cover md:block"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-ink/15" />
          <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-6xl flex-col justify-end px-5 pb-32 md:px-10 md:pb-28">
            <h1 className="rise font-display text-[4.6rem] leading-[0.84] tracking-[-0.03em] md:text-[7.5rem]">
              {settings.shopName}
            </h1>
            <p className="rise rise-2 mt-4 max-w-[18rem] text-lg leading-snug text-foam md:max-w-md md:text-xl">
              {settings.tagline}
            </p>
            {opening ? (
              <p className="rise rise-3 mt-5 max-w-sm text-base leading-snug text-mist">
                <Link href="/reservar">
                  El próximo lugar libre es {formatWhen(opening.fecha, today.date).toLowerCase()} a las {opening.hora}, con{" "}
                  {opening.barber}.
                </Link>
              </p>
            ) : (
              <p className="rise rise-3 mt-5">No hay horas libres en los próximos 14 días.</p>
            )}
          </div>
        </section>

        <section id="servicios" className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-2 md:items-center md:px-10 md:py-24">
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image src="/fotos/tools.png" alt="Tijeras, navaja y peine" fill sizes="(min-width: 768px) 40vw, 100vw" className="object-cover" />
          </div>
          <div>
            <h2 className="font-display text-4xl md:text-5xl">Servicios</h2>
            <ul className="mt-6">
              {services.map((service) => (
                <li key={service.id} className="grid grid-cols-[1fr_auto] gap-4 border-t border-line py-4">
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
          </div>
        </section>

        <section className="relative mx-auto h-[70vh] max-w-6xl overflow-hidden md:h-[32rem]">
          <Image src="/fotos/corte.png" alt="Corte en la silla" fill sizes="100vw" className="object-cover object-[center_20%]" />
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 md:px-10 md:py-24">
          <h2 className="font-display text-4xl md:text-5xl">Productos</h2>
          <ul className="mt-6 flex snap-x gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible">
            {products.map((product) => {
              const photo = productPhotos[product.nombre] ?? product.foto;
              return (
                <li key={product.id} className="w-56 shrink-0 snap-start md:w-auto">
                  <div className="relative aspect-square overflow-hidden bg-foam">
                    {photo ? (
                      <Image src={photo} alt="" fill sizes="(min-width: 768px) 30vw, 224px" className="object-cover" />
                    ) : null}
                  </div>
                  <p className="mt-3 text-lg">{product.nombre}</p>
                  <p className="text-sm text-mist">{product.descripcion}</p>
                  <p className="text-brass">{bolivianos(product.precioVenta)}</p>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:inset-x-auto md:right-8 md:bottom-8 md:w-[26rem] md:border md:pb-3">
        <div className="mx-auto flex max-w-lg gap-2 md:max-w-none">
          <a href={whatsapp} className="press flex h-14 flex-1 items-center justify-center border border-mist text-foam">
            WhatsApp
          </a>
          <Link href="/reservar" className="reserve press flex h-14 flex-[1.6] items-center justify-center bg-signal text-base font-medium text-white">
            Reservar cita
          </Link>
        </div>
      </div>
    </>
  );
}
