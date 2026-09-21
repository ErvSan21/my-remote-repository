import Link from "next/link";
import { notFound } from "next/navigation";
import { getClosureSupplierData } from "@/app/actions/closures";
import { PrintButton } from "@/components/print-button";
import { PURCHASE_STATUS_LABEL, PAYMENT_METHOD_LABEL, formatBs, formatDateLaPaz } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CierreProveedorPage({ params }: Props) {
  const { id } = await params;
  const data = await getClosureSupplierData(id);
  if (!data.supplier) notFound();

  return (
    <div className="receipt-page">
      <div className="receipt-actions no-print">
        <Link href="/cierres" className="btn-secondary">
          Volver
        </Link>
        <PrintButton />
      </div>
      <article className="receipt-sheet">
        <header>
          <p className="receipt-brand">Sistema Pollo</p>
          <h1>Cierre de cuenta — proveedor</h1>
          <p className="receipt-code">{data.supplier.name}</p>
        </header>
        <p className="module-desc">
          Zona: {data.supplier.location || "—"} · Tel:{" "}
          {data.supplier.phone || "—"}
        </p>
        <h3>Compras</h3>
        <ul className="print-list">
          {data.purchases.map((p) => (
            <li key={p.id}>
              {formatDateLaPaz(p.purchase_date)} · {p.quantity_birds} aves ·{" "}
              {formatBs(p.total_amount == null ? null : Number(p.total_amount))} ·{" "}
              {PURCHASE_STATUS_LABEL[p.status as string] ?? p.status}
            </li>
          ))}
          {data.purchases.length === 0 ? <li>Sin compras</li> : null}
        </ul>
        <h3>Pagos</h3>
        <ul className="print-list">
          {data.payments.map((p) => (
            <li key={p.id}>
              {formatDateLaPaz(p.paid_at)} · {formatBs(Number(p.amount))} ·{" "}
              {PAYMENT_METHOD_LABEL[p.method as string] ?? p.method}
            </li>
          ))}
          {data.payments.length === 0 ? <li>Sin pagos</li> : null}
        </ul>
        <p className="receipt-foot">
          Saldo adeudado: <strong>{formatBs(data.owed)}</strong>
        </p>
      </article>
    </div>
  );
}
