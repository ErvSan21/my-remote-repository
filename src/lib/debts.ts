import type { PurchaseStatus } from "@/lib/types";

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
