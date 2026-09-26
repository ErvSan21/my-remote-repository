import { saveSettings } from "@/app/actions/admin";
import { AdminForm } from "@/components/admin-form";
import { WEEKDAYS, WEEKDAY_LABEL } from "@/lib/availability";
import { mediaSrc, one } from "@/lib/format";
import { requireAdmin } from "@/lib/guards";
import { getSettings } from "@/lib/shop";
import { inputClass } from "@/lib/ui";

export const metadata = { title: "Configuración" };

export default async function ConfiguracionPage(props: { searchParams: Promise<{ aviso?: string }> }) {
  const [settings, params] = await Promise.all([getSettings(), props.searchParams]);
  await requireAdmin();
  if (!settings) return <p>Falta preparar la base de datos.</p>;
  const qr = mediaSrc(settings.qrImageUrl);

  return (
    <div className="grid gap-4">
      <h1 className="font-display text-4xl leading-none">Configuración</h1>
      {one(params.aviso) === "guardado" ? <p>Cambios guardados.</p> : null}
      {qr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qr} alt="QR actual de pago" className="h-40 w-40 bg-white object-contain" />
      ) : null}
      <AdminForm action={saveSettings} submitLabel="Guardar configuración">
        <label className="grid gap-1 text-sm">
          Nombre
          <input className={inputClass} name="shopName" defaultValue={settings.shopName} required />
        </label>
        <label className="grid gap-1 text-sm">
          Frase del inicio
          <input className={inputClass} name="tagline" defaultValue={settings.tagline} />
        </label>
        <label className="grid gap-1 text-sm">
          WhatsApp con código de país
          <input className={inputClass} name="whatsappNumber" defaultValue={settings.whatsappNumber} inputMode="tel" />
        </label>
        <label className="grid gap-1 text-sm">
          Mensaje de WhatsApp
          <input className={inputClass} name="whatsappMessage" defaultValue={settings.whatsappMessage} />
        </label>
        <label className="grid gap-1 text-sm">
          Cortes para un gratis
          <input className={inputClass} name="loyaltyEveryN" inputMode="numeric" defaultValue={settings.loyaltyEveryN} />
        </label>
        <label className="grid gap-1 text-sm">
          Intervalo de la agenda, en minutos
          <input className={inputClass} name="slotMinutes" inputMode="numeric" defaultValue={settings.slotMinutes} />
        </label>
        <label className="grid gap-1 text-sm">
          Imagen del QR
          <input name="qr" type="file" accept="image/jpeg,image/png,image/webp" />
        </label>
        <div className="grid gap-3">
          {WEEKDAYS.map((day) => {
            const hours = settings.hours[day];
            return (
              <fieldset key={day} className="grid gap-2 border border-[#d5e0da] p-3">
                <legend>{WEEKDAY_LABEL[day]}</legend>
                <label className="flex min-h-12 items-center gap-2">
                  <input name={`${day}-closed`} type="checkbox" defaultChecked={!hours} />
                  Cerrado
                </label>
                <label className="grid gap-1 text-sm">
                  Abre
                  <input className={inputClass} type="time" name={`${day}-open`} defaultValue={hours?.[0] ?? "09:00"} />
                </label>
                <label className="grid gap-1 text-sm">
                  Cierra
                  <input className={inputClass} type="time" name={`${day}-close`} defaultValue={hours?.[1] ?? "19:00"} />
                </label>
              </fieldset>
            );
          })}
        </div>
      </AdminForm>
    </div>
  );
}
