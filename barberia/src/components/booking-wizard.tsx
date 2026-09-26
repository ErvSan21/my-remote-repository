"use client";

import { useRef, useState } from "react";
import { createBooking, getSlots, lookupClient } from "@/app/actions/booking";
import { bolivianos } from "@/lib/format";
import { buttonClass, inputClass } from "@/lib/ui";

type ServiceOption = {
  id: string;
  nombre: string;
  descripcion: string;
  duracionMin: number;
  precio: number;
};

type BarberOption = {
  id: string;
  nombre: string;
  serviceIds: string[];
};

const steps = ["Tus datos", "Servicios", "Barbero", "Día y hora", "Pago"] as const;

export function BookingWizard({
  services,
  barbers,
  qrSrc,
  initialDate,
  mode,
  lockedBarberId,
}: {
  services: ServiceOption[];
  barbers: BarberOption[];
  qrSrc: string | null;
  initialDate: string;
  mode: "public" | "manual";
  lockedBarberId?: string;
}) {
  const [step, setStep] = useState(0);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [notas, setNotas] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [barberId, setBarberId] = useState(lockedBarberId ?? "any");
  const [fecha, setFecha] = useState(initialDate);
  const [hora, setHora] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsMessage, setSlotsMessage] = useState("Elige un día para ver las horas libres.");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [metodo, setMetodo] = useState<"qr" | "en_local" | "corte_gratis">("en_local");
  const [freeCuts, setFreeCuts] = useState(0);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const slotRequest = useRef(0);

  const selected = services.filter((service) => serviceIds.includes(service.id));
  const duration = selected.reduce((sum, service) => sum + service.duracionMin, 0);
  const total = selected.reduce((sum, service) => sum + service.precio, 0);
  const eligible = barbers.filter((barber) => serviceIds.every((id) => barber.serviceIds.includes(id)));
  const locked = lockedBarberId ? barbers.find((barber) => barber.id === lockedBarberId) : undefined;
  const safeBarberId =
    lockedBarberId ?? (barberId !== "any" && eligible.some((barber) => barber.id === barberId) ? barberId : "any");

  async function loadSlots(nextFecha: string, nextBarber: string, nextServices: string[]) {
    const requestId = slotRequest.current + 1;
    slotRequest.current = requestId;
    setLoadingSlots(true);
    setHora("");
    const result = await getSlots({ fecha: nextFecha, serviceIds: nextServices, barberId: nextBarber });
    if (slotRequest.current !== requestId) return;
    setSlots(result.slots);
    setSlotsMessage(result.error ?? (result.slots.length === 0 ? "Ese día no hay lugar para estos servicios." : ""));
    setLoadingSlots(false);
  }

  function toggleService(id: string) {
    setServiceIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function validate(): string | null {
    if (step === 0) {
      if (nombre.trim().length < 2) return "Falta el nombre.";
      if (apellido.trim().length < 2) return "Falta el apellido.";
      if (telefono.replace(/\D/g, "").length < 6) return "El teléfono tiene que tener al menos 6 dígitos.";
    }
    if (step === 1 && selected.length === 0) return "Elige al menos un servicio.";
    if (step === 2 && eligible.length === 0) return "Ningún barbero hace esa combinación.";
    if (step === 3 && !hora) return "Elige una hora.";
    if (step === 4 && metodo === "qr") {
      const input = document.getElementById("comprobante") as HTMLInputElement | null;
      if (!input?.files?.[0]) return "Sube la foto del comprobante.";
    }
    if (step === 4 && metodo === "corte_gratis" && freeCuts < 1) return "Este teléfono no tiene un corte gratis.";
    return null;
  }

  async function next() {
    const problem = validate();
    setError(problem);
    if (problem) return;
    if (step === 0) {
      const info = await lookupClient(telefono);
      setFreeCuts(info.cortesGratis);
      if (info.nombre && nombre.trim().length < 2) setNombre(info.nombre);
    }
    if (step === 2) await loadSlots(fecha, safeBarberId, serviceIds);
    if (step < 4) setStep((current) => current + 1);
  }

  async function submit() {
    const problem = validate();
    setError(problem);
    if (problem) return;
    const data = new FormData();
    data.set("origen", mode);
    data.set("nombre", nombre.trim());
    data.set("apellido", apellido.trim());
    data.set("telefono", telefono);
    data.set("email", email.trim());
    data.set("notas", notas.trim());
    data.set("fecha", fecha);
    data.set("horaInicio", hora);
    data.set("barberId", safeBarberId);
    data.set("metodoPago", metodo);
    for (const id of serviceIds) data.append("serviceId", id);
    const input = document.getElementById("comprobante") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (file) data.set("comprobante", file);
    setPending(true);
    const result = await createBooking(data);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  const titles = mode === "manual" ? ["Datos del cliente", ...steps.slice(1)] : steps;

  return (
    <div className={mode === "manual" ? "" : "pb-28"}>
      <div className="h-1 bg-[#d5e0da]" role="progressbar" aria-valuemin={1} aria-valuemax={5} aria-valuenow={step + 1}>
        <div className="h-full bg-brass" style={{ width: `${((step + 1) / 5) * 100}%` }} />
      </div>
      <div key={step} className="step-in mx-auto grid max-w-lg gap-4 px-4 py-5">
        <h1 className="font-display text-4xl leading-none text-ink">{titles[step]}</h1>

        {step === 0 ? (
          <div className="grid gap-3">
            <label className="grid gap-1 text-sm text-ink">
              Nombre
              <input className={inputClass} value={nombre} onChange={(event) => setNombre(event.target.value)} autoComplete="given-name" />
            </label>
            <label className="grid gap-1 text-sm text-ink">
              Apellido
              <input className={inputClass} value={apellido} onChange={(event) => setApellido(event.target.value)} autoComplete="family-name" />
            </label>
            <label className="grid gap-1 text-sm text-ink">
              Teléfono
              <input className={inputClass} value={telefono} onChange={(event) => setTelefono(event.target.value)} inputMode="tel" autoComplete="tel" />
            </label>
            <label className="grid gap-1 text-sm text-ink">
              Email, si quieres el resumen
              <input className={inputClass} value={email} onChange={(event) => setEmail(event.target.value)} inputMode="email" autoComplete="email" />
            </label>
            {mode === "manual" ? (
              <label className="grid gap-1 text-sm text-ink">
                Nota interna
                <input className={inputClass} value={notas} onChange={(event) => setNotas(event.target.value)} />
              </label>
            ) : null}
          </div>
        ) : null}

        {step === 1 ? (
          <ul className="grid gap-2">
            {services.map((service) => {
              const on = serviceIds.includes(service.id);
              return (
                <li key={service.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleService(service.id)}
                    className={`grid w-full min-h-16 grid-cols-[1fr_auto] gap-x-3 border px-3 py-3 text-left ${on ? "border-ink bg-ink text-foam" : "border-[#c5d5cc] bg-white text-ink"}`}
                  >
                    <span>
                      <span className="block text-base">{service.nombre}</span>
                      <span className={`block text-sm ${on ? "text-mist" : "text-[#5d736a]"}`}>
                        {service.duracionMin} min. {service.descripcion}
                      </span>
                    </span>
                    <span className={on ? "text-brass" : "text-brass"}>{bolivianos(service.precio)}</span>
                  </button>
                </li>
              );
            })}
            <li className="text-sm text-[#3e564c]">
              {duration > 0 ? `${duration} min en total, ${bolivianos(total)}` : "Puedes elegir más de un servicio."}
            </li>
          </ul>
        ) : null}

        {step === 2 ? (
          <ul className="grid gap-2">
            {locked ? (
              <li className="border border-ink bg-ink px-3 py-4 text-foam">{locked.nombre}</li>
            ) : (
              <>
                <li>
                  <button
                    type="button"
                    aria-pressed={safeBarberId === "any"}
                    onClick={() => setBarberId("any")}
                    className={`min-h-14 w-full border px-3 text-left ${safeBarberId === "any" ? "border-ink bg-ink text-foam" : "border-[#c5d5cc] bg-white text-ink"}`}
                  >
                    Cualquiera disponible
                  </button>
                </li>
                {eligible.map((barber) => (
                  <li key={barber.id}>
                    <button
                      type="button"
                      aria-pressed={safeBarberId === barber.id}
                      onClick={() => setBarberId(barber.id)}
                      className={`flex min-h-14 w-full items-center gap-3 border px-3 text-left ${barberId === barber.id ? "border-ink bg-ink text-foam" : "border-[#c5d5cc] bg-white text-ink"}`}
                    >
                      <span className="flex h-10 w-10 items-center justify-center bg-brass font-display text-xl text-ink">
                        {barber.nombre.slice(0, 1)}
                      </span>
                      {barber.nombre}
                    </button>
                  </li>
                ))}
              </>
            )}
          </ul>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-3">
            <label className="grid gap-1 text-sm text-ink">
              Día
              <input
                className={inputClass}
                type="date"
                value={fecha}
                min={initialDate}
                onChange={(event) => {
                  const value = event.target.value;
                  setFecha(value);
                  void loadSlots(value, safeBarberId, serviceIds);
                }}
              />
            </label>
            <p className="text-sm text-[#3e564c]" aria-live="polite">
              {loadingSlots ? "Buscando horas libres." : slotsMessage}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  aria-pressed={hora === slot}
                  onClick={() => setHora(slot)}
                  className={`h-12 border text-base ${hora === slot ? "border-ink bg-ink text-foam" : "border-[#c5d5cc] bg-white text-ink"}`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="grid gap-3">
            <p className="text-sm text-[#3e564c]">
              {selected.map((service) => service.nombre).join(", ")}. {fecha} a las {hora}. {bolivianos(total)}.
            </p>
            <button type="button" aria-pressed={metodo === "en_local"} onClick={() => setMetodo("en_local")} className={choice(metodo === "en_local")}>
              Pagar en la barbería
            </button>
            <button type="button" aria-pressed={metodo === "qr"} onClick={() => setMetodo("qr")} className={choice(metodo === "qr")}>
              Pagar ahora con QR
            </button>
            {freeCuts > 0 ? (
              <button type="button" aria-pressed={metodo === "corte_gratis"} onClick={() => setMetodo("corte_gratis")} className={choice(metodo === "corte_gratis")}>
                Usar corte gratis ({freeCuts} disponible{freeCuts === 1 ? "" : "s"})
              </button>
            ) : null}
            {metodo === "qr" ? (
              <div className="grid gap-3 bg-white p-3">
                {qrSrc ? (
                  // El QR lo sube el negocio y puede cambiar de ruta en cualquier momento.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrSrc} alt="QR para pagar la cita" className="mx-auto h-56 w-56 bg-white object-contain" />
                ) : (
                  <p className="text-sm text-ink">La barbería todavía no cargó el QR. Puedes pagar en el local.</p>
                )}
                <label className="grid gap-1 text-sm text-ink">
                  Foto del comprobante
                  <input
                    id="comprobante"
                    className="text-base"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
                  />
                </label>
                {fileName ? <p className="text-sm text-[#3e564c]">{fileName}</p> : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-signal">
            {error}
          </p>
        ) : null}
      </div>

      <div
        className={
          mode === "manual"
            ? "sticky bottom-16 z-10 border-t border-[#d5e0da] bg-foam px-4 py-3"
            : "fixed inset-x-0 bottom-0 z-10 border-t border-[#d5e0da] bg-foam px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        }
      >
        <div className="mx-auto grid max-w-lg grid-cols-[auto_1fr] gap-2">
          <button
            type="button"
            className="h-14 px-3 text-base text-ink disabled:opacity-40"
            onClick={() => {
              setError(null);
              setStep((current) => Math.max(0, current - 1));
            }}
            disabled={step === 0 || pending}
          >
            Atrás
          </button>
          {step < 4 ? (
            <button type="button" className={buttonClass} onClick={next}>
              Continuar
            </button>
          ) : (
            <button type="button" className={buttonClass} onClick={submit} disabled={pending}>
              {pending ? "Guardando" : mode === "manual" ? "Agendar cita" : "Confirmar reserva"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function choice(on: boolean): string {
  return `min-h-14 w-full border px-3 text-left text-base ${on ? "border-ink bg-ink text-foam" : "border-[#c5d5cc] bg-white text-ink"}`;
}
