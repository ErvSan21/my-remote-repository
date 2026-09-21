export type ActionResult = {
  ok: boolean;
  message: string;
};

export type Supplier = {
  id: string;
  name: string;
  location: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Purchase = {
  id: string;
  supplier_id: string;
  purchase_date: string;
  quantity_birds: number;
  unit_price: number | null;
  total_amount: number | null;
  status: import("@/lib/types").PurchaseStatus;
  notes: string | null;
  created_at: string;
  suppliers?: { name: string } | null;
};

export type SupplierPayment = {
  id: string;
  supplier_id: string;
  purchase_id: string | null;
  amount: number;
  method: import("@/lib/types").PaymentMethod;
  paid_at: string;
  notes: string | null;
  created_at: string;
  suppliers?: { name: string } | null;
};
