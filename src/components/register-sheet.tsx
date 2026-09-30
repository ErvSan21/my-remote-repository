"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClientDetailedAction, listClientsAction } from "@/app/actions/clients";
import { createClientPaymentAction } from "@/app/actions/client-payments";
import { createConsignmentAction, listVentasAction } from "@/app/actions/consignments";
import { createPurchaseAction, listPurchasesAction } from "@/app/actions/purchases";
import { createSupplierDetailedAction, listSuppliersAction } from "@/app/actions/suppliers";
import { createSupplierPaymentAction } from "@/app/actions/supplier-payments";
import type { Client, Purchase, Supplier, VentaRow } from "@/lib/data-types";
import { BOLIVIA_DEPARTAMENTOS } from "@/lib/bolivia";
import { purchaseBalance } from "@/lib/debts";
import { formatVentaTitle } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

type View = "menu" | "venta" | "cobro" | "compra" | "pago" | "cliente" | "proveedor";

type Data = {
  clients: Client[];
  suppliers: Supplier[];
  ventas: VentaRow[];
  purchases: Purchase[];
};

type Props = {
  isAdmin: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
};

const ICONS: Record<Exclude<View, "menu">, string> = {
  venta: "M3 7h11l4 4v6H3zM14 7v4h4M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  cobro: "M3 7h15a3 3 0 0 1 3 3v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7l12-4v4M16 13.5h2",
  compra: "M2 6h12v10H2zM14 10h4l3 3v3h-7M5 19a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0M16 19a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0",
  pago: "M4 6h16v12H4zM4 10h16M8 15h3",
  cliente: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M19 8v6M16 11h6",
  proveedor: "M3 21V9l9-6 9 6v12M9 21v-6h6v6",
};

const OPTIONS: { view: Exclude<View, "menu">; title: string; sub: string; tone: string; admin: boolean }[] = [
  { view: "venta", title: "Nueva venta", sub: "Entregar pollo a un cliente", tone: "is-amber", admin: true },
  { view: "cobro", title: "Cobro a cliente", sub: "Pago total o en partes", tone: "is-green", admin: false },
  { view: "compra", title: "Compra de pollo", sub: "Con o sin precio", tone: "is-rust", admin: true },
  { view: "pago", title: "Pago a proveedor", sub: "Abonar a una cuenta por pagar", tone: "is-purple", admin: true },
  { view: "cliente", title: "Registrar un cliente", sub: "Persona o empresa, ciudad y celular", tone: "is-blue", admin: true },
  { view: "proveedor", title: "Registrar un proveedor", sub: "Persona o empresa, departamento y celular", tone: "is-sand", admin: true },
];

function bs2(n: number) {
  return `Bs ${n.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function money(value: string) {
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function cleanMoney(value: string) {
  return value.replace(/[^\d.,]/g, "");
}

function cleanInt(value: string) {
  return value.replace(/\D/g, "");
}

/** Hoja inferior del botón "+": registrar ventas, cobros, compras, pagos, clientes y proveedores. */
export function RegisterSheet({ isAdmin, onClose, onDone }: Props) {
  const [view, setView] = useState<View>("menu");
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  // Los datos para los formularios se piden al abrir la hoja.
  useEffect(() => {
    let alive = true;
    (async () => {
      const [clientsRes, ventasRes, suppliersRes, purchasesRes] = await Promise.all([
        listClientsAction(false),
        listVentasAction(),
        isAdmin ? listSuppliersAction(false) : Promise.resolve({ suppliers: [] as Supplier[], error: null }),
        isAdmin ? listPurchasesAction() : Promise.resolve({ purchases: [] as Purchase[], error: null }),
      ]);
      if (!alive) return;
      setLoadError(clientsRes.error || ventasRes.error || suppliersRes.error || purchasesRes.error);
      setData({
        clients: clientsRes.clients,
        ventas: ventasRes.ventas,
        suppliers: suppliersRes.suppliers,
        purchases: purchasesRes.purchases,
      });
    })();
    return () => {
      alive = false;
    };
  }, [isAdmin]);

  const options = OPTIONS.filter((o) => isAdmin || !o.admin);
  const current = OPTIONS.find((o) => o.view === view);

  return (
    <div className="rs-root">
      <button type="button" className="rs-backdrop" aria-label="Cerrar" onClick={onClose} />
      <section className="rs-sheet" role="dialog" aria-modal="true" aria-labelledby="rs-title">
        <span className="rs-grip" aria-hidden />
        <div className="rs-head">
          {view !== "menu" ? (
            <button type="button" className="rs-icon-btn" aria-label="Volver" onClick={() => setView("menu")}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
          ) : null}
          <h2 id="rs-title" className="gp-num rs-title">
            {view === "menu" ? "Registrar" : current?.title}
          </h2>
          <button type="button" className="rs-icon-btn" aria-label="Cerrar" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {loadError ? <p className="rs-error">{loadError}</p> : null}

        {view === "menu" ? (
          <div className="rs-menu">
            {options.map((o) => (
              <button key={o.view} type="button" className="rs-option" onClick={() => setView(o.view)}>
                <span className={`rs-option-icon ${o.tone}`} aria-hidden>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={ICONS[o.view]} />
                  </svg>
                </span>
                <span className="rs-option-text">
                  <span className="rs-option-title">{o.title}</span>
                  <span className="rs-option-sub">{o.sub}</span>
                </span>
              </button>
            ))}
          </div>
        ) : view === "cliente" ? (
          <ClienteForm onDone={onDone} />
        ) : view === "proveedor" ? (
          <ProveedorForm onDone={onDone} />
        ) : !data ? (
          <div className="rs-loading" aria-busy="true" aria-label="Cargando">
            <span className="skeleton rs-skel" />
            <span className="skeleton rs-skel" />
            <span className="skeleton rs-skel short" />
          </div>
        ) : view === "venta" ? (
          <VentaForm data={data} onDone={onDone} />
        ) : view === "cobro" ? (
          <CobroForm data={data} onDone={onDone} />
        ) : view === "compra" ? (
          <CompraForm data={data} onDone={onDone} />
        ) : (
          <PagoForm data={data} onDone={onDone} />
        )}
      </section>
    </div>
  );
}

/* ---------- piezas comunes ---------- */

function Field({ id, label, children }: { id?: string; label: string; children: ReactNode }) {
  return (
    <div className="rs-field">
      {id ? (
        <label className="rs-label" htmlFor={id}>
          {label}
        </label>
      ) : (
        <span className="rs-label">{label}</span>
      )}
      {children}
    </div>
  );
}

function Choice<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="rs-choice" role="group" aria-label={label}>
      {options.map(([key, text]) => (
        <button
          key={key}
          type="button"
          className={`rs-choice-btn${value === key ? " is-active" : ""}`}
          aria-pressed={value === key}
          onClick={() => onChange(key)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onChange, title, sub }: { on: boolean; onChange: (v: boolean) => void; title: string; sub: string }) {
  return (
    <button type="button" className="rs-toggle" aria-pressed={on} onClick={() => onChange(!on)}>
      <span className="rs-toggle-text">
        <span className="rs-toggle-title">{title}</span>
        <span className="rs-toggle-sub">{sub}</span>
      </span>
      <span className={`rs-switch${on ? " is-on" : ""}`} aria-hidden>
        <span />
      </span>
    </button>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rs-summary">
      <span>{label}</span>
      <strong className="gp-num">{value}</strong>
    </div>
  );
}

function Submit({ pending, disabled, children }: { pending: boolean; disabled: boolean; children: ReactNode }) {
  return (
    <button type="submit" className="rs-submit" disabled={disabled || pending}>
      {pending ? "Guardando…" : children}
    </button>
  );
}

function ErrorLine({ message }: { message: string | null }) {
  return message ? (
    <p className="rs-error" role="alert">
      {message}
    </p>
  ) : null;
}

/* ---------- formularios ---------- */

function useSave(onDone: (message: string) => void) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function save(run: () => Promise<{ ok: boolean; message: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await run();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
      onDone(result.message);
    });
  }
  return { pending, error, setError, save };
}

function VentaForm({ data, onDone }: { data: Data; onDone: (m: string) => void }) {
  const clients = data.clients.filter((c) => c.active);
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [cash, setCash] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const { pending, error, save } = useSave(onDone);

  const qtyN = Number(qty);
  const priceN = money(price);
  const total = qtyN > 0 && priceN > 0 ? qtyN * priceN : 0;
  const valid = Boolean(clientId) && qtyN > 0 && priceN > 0;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    save(() =>
      createConsignmentAction({
        client_id: clientId,
        quantity_birds: qtyN,
        unit_price: priceN,
        notes: "",
        pay_in_full: cash,
        pay_method: method,
      }),
    );
  }

  return (
    <form className="rs-form" onSubmit={onSubmit}>
      <Field id="rs-v-client" label="Cliente">
        <select id="rs-v-client" className="rs-input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
          {clients.length === 0 ? <option value="">Registra un cliente primero</option> : null}
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.zone ? ` · ${c.zone}` : ""}
            </option>
          ))}
        </select>
      </Field>
      <div className="rs-grid">
        <Field id="rs-v-qty" label="Pollos">
          <input id="rs-v-qty" className="rs-input" inputMode="numeric" placeholder="0" value={qty} onChange={(e) => setQty(cleanInt(e.target.value))} />
        </Field>
        <Field id="rs-v-price" label="Precio c/u (Bs)">
          <input id="rs-v-price" className="rs-input" inputMode="decimal" placeholder="0,00" value={price} onChange={(e) => setPrice(cleanMoney(e.target.value))} />
        </Field>
      </div>
      <Toggle on={cash} onChange={setCash} title="Al contado" sub="El cliente paga todo ahora" />
      {cash ? (
        <Choice label="Método" value={method} onChange={setMethod} options={[["cash", "Efectivo"], ["qr", "QR / Transferencia"]]} />
      ) : null}
      <Summary label={cash ? "Total cobrado" : "Queda debiendo"} value={bs2(total)} />
      <ErrorLine message={error} />
      <Submit pending={pending} disabled={!valid}>
        Registrar venta
      </Submit>
    </form>
  );
}

function CobroForm({ data, onDone }: { data: Data; onDone: (m: string) => void }) {
  const owing = useMemo(() => {
    const map = new Map<string, { id: string; name: string; due: number; sales: VentaRow[] }>();
    for (const v of data.ventas) {
      const due = v.is_paid ? 0 : Number(v.pending_amount ?? 0);
      if (due <= 0) continue;
      const entry = map.get(v.client_id) ?? { id: v.client_id, name: v.clients?.name ?? "Cliente", due: 0, sales: [] };
      entry.due += due;
      entry.sales.push(v);
      map.set(v.client_id, entry);
    }
    for (const e of map.values()) e.sales.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    return [...map.values()].sort((a, b) => b.due - a.due);
  }, [data.ventas]);

  const [clientId, setClientId] = useState(owing[0]?.id ?? "");
  const client = owing.find((c) => c.id === clientId) ?? null;
  const [saleId, setSaleId] = useState(client?.sales[0]?.id ?? "");
  const sale = client?.sales.find((v) => v.id === saleId) ?? client?.sales[0] ?? null;
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const { pending, error, save } = useSave(onDone);

  const max = sale ? Number(sale.pending_amount ?? 0) : 0;
  const amountN = money(amount);
  const valid = Boolean(sale) && amountN > 0 && amountN <= max + 0.001;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!sale || !valid) return;
    save(() =>
      createClientPaymentAction({ client_id: sale.client_id, consignment_id: sale.id, amount: amountN, method, notes: "" }),
    );
  }

  if (owing.length === 0) return <p className="rs-empty">Ningún cliente tiene saldo pendiente.</p>;

  return (
    <form className="rs-form" onSubmit={onSubmit}>
      <Field id="rs-c-client" label="Cliente">
        <select
          id="rs-c-client"
          className="rs-input"
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value);
            setSaleId(owing.find((c) => c.id === e.target.value)?.sales[0]?.id ?? "");
            setAmount("");
          }}
        >
          {owing.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · debe {bs2(c.due)}
            </option>
          ))}
        </select>
      </Field>
      <Field id="rs-c-sale" label="Venta">
        <select id="rs-c-sale" className="rs-input" value={sale?.id ?? ""} onChange={(e) => setSaleId(e.target.value)}>
          {client?.sales.map((v) => (
            <option key={v.id} value={v.id}>
              {formatVentaTitle(v.sale_number)} · debe {bs2(Number(v.pending_amount ?? 0))}
            </option>
          ))}
        </select>
      </Field>
      <Field id="rs-c-amount" label="Monto recibido (Bs)">
        <input id="rs-c-amount" className="rs-input rs-input-big" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(cleanMoney(e.target.value))} />
      </Field>
      <Choice label="Método" value={method} onChange={setMethod} options={[["cash", "Efectivo"], ["qr", "QR / Transferencia"]]} />
      <Summary label="Saldo de la venta después" value={bs2(Math.max(0, max - (amountN > 0 ? amountN : 0)))} />
      <ErrorLine message={amountN > max + 0.001 ? "El monto no puede superar el saldo de la venta." : error} />
      <Submit pending={pending} disabled={!valid}>
        Confirmar cobro
      </Submit>
    </form>
  );
}

function CompraForm({ data, onDone }: { data: Data; onDone: (m: string) => void }) {
  const suppliers = data.suppliers.filter((s) => s.active);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [qty, setQty] = useState("");
  const [noPrice, setNoPrice] = useState(false);
  const [price, setPrice] = useState("");
  const { pending, error, save } = useSave(onDone);

  const qtyN = Number(qty);
  const priceN = money(price);
  const valid = Boolean(supplierId) && qtyN > 0 && (noPrice || priceN > 0);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    save(() =>
      createPurchaseAction({ supplier_id: supplierId, quantity_birds: qtyN, unit_price: noPrice ? null : priceN, notes: "" }),
    );
  }

  return (
    <form className="rs-form" onSubmit={onSubmit}>
      <Field id="rs-p-supplier" label="Proveedor">
        <select id="rs-p-supplier" className="rs-input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
          {suppliers.length === 0 ? <option value="">Registra un proveedor primero</option> : null}
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.location ? ` · ${s.location}` : ""}
            </option>
          ))}
        </select>
      </Field>
      <Field id="rs-p-qty" label="Cantidad (pollos)">
        <input id="rs-p-qty" className="rs-input" inputMode="numeric" placeholder="0" value={qty} onChange={(e) => setQty(cleanInt(e.target.value))} />
      </Field>
      <Toggle on={noPrice} onChange={setNoPrice} title="Precio por definir" sub="Compro por cantidad y fijamos el precio después" />
      {!noPrice ? (
        <>
          <Field id="rs-p-price" label="Precio c/u (Bs)">
            <input id="rs-p-price" className="rs-input" inputMode="decimal" placeholder="0,00" value={price} onChange={(e) => setPrice(cleanMoney(e.target.value))} />
          </Field>
          <Summary label="Total de la compra" value={bs2(qtyN > 0 && priceN > 0 ? qtyN * priceN : 0)} />
        </>
      ) : null}
      <ErrorLine message={error} />
      <Submit pending={pending} disabled={!valid}>
        Guardar compra
      </Submit>
    </form>
  );
}

function PagoForm({ data, onDone }: { data: Data; onDone: (m: string) => void }) {
  const owing = useMemo(() => {
    const map = new Map<string, { id: string; name: string; due: number; purchases: Purchase[] }>();
    for (const p of data.purchases) {
      const due = purchaseBalance(p.total_amount, Number(p.paid_amount ?? 0)).pending_amount ?? 0;
      if (due <= 0) continue;
      const name = data.suppliers.find((s) => s.id === p.supplier_id)?.name ?? p.suppliers?.name ?? "Proveedor";
      const entry = map.get(p.supplier_id) ?? { id: p.supplier_id, name, due: 0, purchases: [] };
      entry.due += due;
      entry.purchases.push(p);
      map.set(p.supplier_id, entry);
    }
    for (const e of map.values()) e.purchases.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    return [...map.values()].sort((a, b) => b.due - a.due);
  }, [data.purchases, data.suppliers]);

  const [supplierId, setSupplierId] = useState(owing[0]?.id ?? "");
  const supplier = owing.find((s) => s.id === supplierId) ?? null;
  const [purchaseId, setPurchaseId] = useState(supplier?.purchases[0]?.id ?? "");
  const purchase = supplier?.purchases.find((p) => p.id === purchaseId) ?? supplier?.purchases[0] ?? null;
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const { pending, error, save } = useSave(onDone);

  const max = purchase ? purchaseBalance(purchase.total_amount, Number(purchase.paid_amount ?? 0)).pending_amount ?? 0 : 0;
  const amountN = money(amount);
  const valid = Boolean(purchase) && amountN > 0 && amountN <= max + 0.001;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!purchase || !valid) return;
    save(() =>
      createSupplierPaymentAction({
        supplier_id: purchase.supplier_id,
        purchase_id: purchase.id,
        amount: amountN,
        method,
        notes: "",
      }),
    );
  }

  if (owing.length === 0) return <p className="rs-empty">No le debes a ningún proveedor.</p>;

  return (
    <form className="rs-form" onSubmit={onSubmit}>
      <Field id="rs-s-supplier" label="Proveedor">
        <select
          id="rs-s-supplier"
          className="rs-input"
          value={supplierId}
          onChange={(e) => {
            setSupplierId(e.target.value);
            setPurchaseId(owing.find((s) => s.id === e.target.value)?.purchases[0]?.id ?? "");
            setAmount("");
          }}
        >
          {owing.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · le debes {bs2(s.due)}
            </option>
          ))}
        </select>
      </Field>
      <Field id="rs-s-purchase" label="Compra">
        <select id="rs-s-purchase" className="rs-input" value={purchase?.id ?? ""} onChange={(e) => setPurchaseId(e.target.value)}>
          {supplier?.purchases.map((p) => (
            <option key={p.id} value={p.id}>
              {p.purchase_date} · {Number(p.quantity_birds).toLocaleString("es-BO")} pollos · debe{" "}
              {bs2(purchaseBalance(p.total_amount, Number(p.paid_amount ?? 0)).pending_amount ?? 0)}
            </option>
          ))}
        </select>
      </Field>
      <Field id="rs-s-amount" label="Monto (Bs)">
        <input id="rs-s-amount" className="rs-input rs-input-big" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(cleanMoney(e.target.value))} />
      </Field>
      <Choice label="Método" value={method} onChange={setMethod} options={[["cash", "Efectivo"], ["qr", "QR / Transferencia"]]} />
      <ErrorLine message={amountN > max + 0.001 ? "El monto no puede superar el saldo de la compra." : error} />
      <Submit pending={pending} disabled={!valid}>
        Registrar pago
      </Submit>
    </form>
  );
}

function useNameFields() {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [company, setCompany] = useState("");
  const [city, setCity] = useState<string>("La Paz");
  const [phone, setPhone] = useState("");
  return { first, setFirst, last, setLast, company, setCompany, city, setCity, phone, setPhone };
}

function PersonFields({ prefix, f }: { prefix: string; f: ReturnType<typeof useNameFields> }) {
  return (
    <>
      <div className="rs-grid">
        <Field id={`${prefix}-first`} label="Nombre">
          <input id={`${prefix}-first`} className="rs-input" autoComplete="off" value={f.first} onChange={(e) => f.setFirst(e.target.value)} />
        </Field>
        <Field id={`${prefix}-last`} label="Apellido">
          <input id={`${prefix}-last`} className="rs-input" autoComplete="off" value={f.last} onChange={(e) => f.setLast(e.target.value)} />
        </Field>
      </div>
      <Field id={`${prefix}-company`} label="Nombre de empresa (opcional)">
        <input id={`${prefix}-company`} className="rs-input" autoComplete="off" value={f.company} onChange={(e) => f.setCompany(e.target.value)} />
      </Field>
    </>
  );
}

function PlaceAndPhone({ prefix, label, f }: { prefix: string; label: string; f: ReturnType<typeof useNameFields> }) {
  return (
    <div className="rs-grid">
      <Field id={`${prefix}-city`} label={label}>
        <select id={`${prefix}-city`} className="rs-input" value={f.city} onChange={(e) => f.setCity(e.target.value)}>
          {BOLIVIA_DEPARTAMENTOS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </Field>
      <Field id={`${prefix}-phone`} label="Celular">
        <input
          id={`${prefix}-phone`}
          className="rs-input"
          inputMode="tel"
          maxLength={8}
          placeholder="8 números"
          value={f.phone}
          onChange={(e) => f.setPhone(cleanInt(e.target.value))}
        />
      </Field>
    </div>
  );
}

function phoneHint(phone: string) {
  return phone.length > 0 && phone.length !== 8 ? "El celular debe tener 8 números." : null;
}

function ClienteForm({ onDone }: { onDone: (m: string) => void }) {
  const f = useNameFields();
  const [showCompany, setShowCompany] = useState(false);
  const [notes, setNotes] = useState("");
  const { pending, error, save } = useSave(onDone);
  const valid = f.first.trim().length > 0 && f.phone.length === 8 && (!showCompany || f.company.trim().length > 0);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    save(() =>
      createClientDetailedAction({
        firstName: f.first,
        lastName: f.last,
        companyName: f.company,
        showCompany,
        city: f.city,
        phone: f.phone,
        notes,
      }),
    );
  }

  return (
    <form className="rs-form" onSubmit={onSubmit}>
      <PersonFields prefix="rs-cl" f={f} />
      <label className="rs-check">
        <input type="checkbox" checked={showCompany} onChange={(e) => setShowCompany(e.target.checked)} />
        <span>Mostrar el nombre de empresa en la app</span>
      </label>
      <PlaceAndPhone prefix="rs-cl" label="Ciudad" f={f} />
      <Field id="rs-cl-notes" label="Notas (opcional)">
        <textarea id="rs-cl-notes" className="rs-input rs-textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <ErrorLine message={error ?? phoneHint(f.phone)} />
      <Submit pending={pending} disabled={!valid}>
        Registrar cliente
      </Submit>
    </form>
  );
}

function ProveedorForm({ onDone }: { onDone: (m: string) => void }) {
  const f = useNameFields();
  const { pending, error, save } = useSave(onDone);
  const valid = f.first.trim().length > 0 && f.phone.length === 8;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    save(() =>
      createSupplierDetailedAction({
        firstName: f.first,
        lastName: f.last,
        companyName: f.company,
        city: f.city,
        phone: f.phone,
      }),
    );
  }

  return (
    <form className="rs-form" onSubmit={onSubmit}>
      <PersonFields prefix="rs-pv" f={f} />
      <PlaceAndPhone prefix="rs-pv" label="Departamento" f={f} />
      <ErrorLine message={error ?? phoneHint(f.phone)} />
      <Submit pending={pending} disabled={!valid}>
        Registrar proveedor
      </Submit>
    </form>
  );
}
