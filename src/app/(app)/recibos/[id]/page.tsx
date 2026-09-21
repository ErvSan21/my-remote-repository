import Link from "next/link";
import { notFound } from "next/navigation";
import { getReceiptAction } from "@/app/actions/client-payments";
import { requireAuth } from "@/lib/auth/guards";
import { PAYMENT_METHOD_LABEL, formatBs, formatDateLaPaz } from "@/lib/format";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ReciboPage({ params }: Props) {
  await requireAuth();
  const { id } = await params;
  const { receipt, error } = await getReceiptAction(id);
  if (error || !receipt) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payment = (receipt as any).client_payments;
  const client = payment?.clients;

  return (
    <div className="receipt-page">
      <div className="receipt-actions no-print">
        <Link href="/pagos" className="btn-secondary">
          Volver a cobros
        </Link>
        <PrintButton />
      </div>

      <article className="receipt-sheet">
        <header>
          <p className="receipt-brand">Sistema Pollo</p>
          <h1>Recibo de cobro</h1>
          <p className="receipt-code">{receipt.code}</p>
        </header>
        <dl className="receipt-dl">
          <div>
            <dt>Cliente</dt>
            <dd>{client?.name ?? "—"}</dd>
          </div>
          <div>
            <dt>Zona</dt>
            <dd>{client?.zone ?? "—"}</dd>
          </div>
          <div>
            <dt>Monto</dt>
            <dd>{formatBs(payment?.amount)}</dd>
          </div>
          <div>
            <dt>Método</dt>
            <dd>
              {PAYMENT_METHOD_LABEL[payment?.method] ?? payment?.method ?? "—"}
            </dd>
          </div>
          <div>
            <dt>Fecha</dt>
            <dd>{formatDateLaPaz(payment?.paid_at || receipt.issued_at)}</dd>
          </div>
          {payment?.notes ? (
            <div>
              <dt>Notas</dt>
              <dd>{payment.notes}</dd>
            </div>
          ) : null}
        </dl>
        <p className="receipt-foot">
          Código único: <strong>{receipt.code}</strong>
        </p>
      </article>
    </div>
  );
}
