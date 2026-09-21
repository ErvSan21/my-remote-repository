import Link from "next/link";
import { getWeeklyClosureData } from "@/app/actions/closures";
import { PrintButton } from "@/components/print-button";
import { formatBs, formatDateLaPaz } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ from?: string; to?: string }>;
};

export default async function CierreSemanalPage({ searchParams }: Props) {
  const params = await searchParams;
  const from = params.from || new Date().toLocaleDateString("en-CA");
  const to = params.to || from;
  const data = await getWeeklyClosureData(from, to);

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
          <p className="receipt-brand">MAC</p>
          <h1>Cierre semanal general</h1>
          <p className="receipt-code">
            {from} → {to}
          </p>
        </header>
        {data.errors.length ? (
          <p className="module-note">{data.errors.join(" · ")}</p>
        ) : null}
        <dl className="receipt-dl">
          <div>
            <dt>Compras (con precio)</dt>
            <dd>{formatBs(data.totals.purchasesAmount)}</dd>
          </div>
          <div>
            <dt>Pagado a proveedores</dt>
            <dd>{formatBs(data.totals.paidSuppliers)}</dd>
          </div>
          <div>
            <dt>Cobrado a clientes</dt>
            <dd>{formatBs(data.totals.collectedClients)}</dd>
          </div>
          <div>
            <dt>Aves en consignación (periodo)</dt>
            <dd>{data.totals.birdsConsigned}</dd>
          </div>
        </dl>
        <h3>Detalle cobros</h3>
        <ul className="print-list">
          {data.clientPayments.map((p) => (
            <li key={p.id}>
              {formatDateLaPaz(p.paid_at)} ·{" "}
              {(p as { clients?: { name: string } }).clients?.name ?? "Cliente"} ·{" "}
              {formatBs(Number(p.amount))}
            </li>
          ))}
          {data.clientPayments.length === 0 ? <li>Sin cobros</li> : null}
        </ul>
        <h3>Detalle pagos proveedores</h3>
        <ul className="print-list">
          {data.supplierPayments.map((p) => (
            <li key={p.id}>
              {formatDateLaPaz(p.paid_at)} ·{" "}
              {(p as { suppliers?: { name: string } }).suppliers?.name ??
                "Proveedor"}{" "}
              · {formatBs(Number(p.amount))}
            </li>
          ))}
          {data.supplierPayments.length === 0 ? <li>Sin pagos</li> : null}
        </ul>
      </article>
    </div>
  );
}
