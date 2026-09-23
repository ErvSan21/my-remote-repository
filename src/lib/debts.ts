import type { ConsignmentStatus, PurchaseStatus } from "@/lib/types";

export type PurchaseDebtRow = {
  id: string;
  supplier_id: string;
  total_amount: number | null;
  status: PurchaseStatus;
};

export type PaymentDebtRow = {
  supplier_id: string;
  purchase_id: string | null;
  amount: number;
};

/** Deuda = Σ totales con precio − Σ pagos (a cuenta o por compra). Precio pendiente no cuenta. */
export function debtForSupplier(
  supplierId: string,
  purchases: PurchaseDebtRow[],
  payments: PaymentDebtRow[],
): number {
  const priced = purchases
    .filter((p) => p.supplier_id === supplierId && p.total_amount != null)
    .reduce((sum, p) => sum + Number(p.total_amount), 0);

  const paid = payments
    .filter((p) => p.supplier_id === supplierId)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return Math.max(0, priced - paid);
}

export function totalDebtAll(
  purchases: PurchaseDebtRow[],
  payments: PaymentDebtRow[],
): number {
  const supplierIds = new Set<string>();
  purchases.forEach((p) => supplierIds.add(p.supplier_id));
  payments.forEach((p) => supplierIds.add(p.supplier_id));
  let total = 0;
  for (const id of supplierIds) {
    total += debtForSupplier(id, purchases, payments);
  }
  return total;
}

export function paidTowardPurchase(
  purchaseId: string,
  payments: PaymentDebtRow[],
): number {
  return payments
    .filter((p) => p.purchase_id === purchaseId)
    .reduce((sum, p) => sum + Number(p.amount), 0);
}

export function statusAfterPayment(
  totalAmount: number | null,
  paidAmount: number,
): PurchaseStatus {
  if (totalAmount == null) return "pending_price";
  if (paidAmount <= 0) return "priced";
  if (paidAmount + 0.001 >= totalAmount) return "paid";
  return "partially_paid";
}

/** Saldo de una venta a partir de total y cobros. El status guardado no pisa el cálculo. */
export function ventaBalance(total: number | null, paid: number) {
  const paidAmount = Number.isFinite(paid) ? paid : 0;
  if (total == null || !Number.isFinite(Number(total))) {
    return { paid_amount: paidAmount, pending_amount: 0, is_paid: false };
  }
  const totalN = Number(total);
  const pendingRaw = Math.max(
    0,
    Math.round((totalN - paidAmount) * 100) / 100,
  );
  const is_paid = totalN > 0 && pendingRaw <= 0.001;
  return {
    paid_amount: paidAmount,
    pending_amount: is_paid ? 0 : pendingRaw,
    is_paid,
  };
}

export function consignmentStatusForBalance(
  total: number | null,
  paid: number,
): ConsignmentStatus {
  if (total == null || !Number.isFinite(Number(total))) {
    return paid > 0 ? "partial" : "open";
  }
  const { is_paid } = ventaBalance(total, paid);
  if (is_paid) return "closed";
  if (paid > 0) return "partial";
  return "open";
}

/** true si `amount` deja el saldo por debajo de cero (total desconocido = sin tope). */
export function paymentExceedsBalance(
  total: number | null,
  alreadyPaid: number,
  amount: number,
): boolean {
  if (total == null || !Number.isFinite(Number(total))) return false;
  const room =
    Math.round((Number(total) - Number(alreadyPaid)) * 100) / 100;
  return Number(amount) > room + 0.001;
}
