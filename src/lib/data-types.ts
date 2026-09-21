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

export type Client = {
  id: string;
  name: string;
  zone: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Consignment = {
  id: string;
  client_id: string;
  quantity_birds: number;
  unit_price: number | null;
  total_amount: number | null;
  status: import("@/lib/types").ConsignmentStatus;
  left_at: string;
  notes: string | null;
  clients?: { name: string; zone: string | null } | null;
};

export type ClientPayment = {
  id: string;
  client_id: string;
  consignment_id: string | null;
  amount: number;
  method: import("@/lib/types").PaymentMethod;
  paid_at: string;
  notes: string | null;
  clients?: { name: string } | null;
  receipts?: { id: string; code: string } | { id: string; code: string }[] | null;
};

export type InventoryMovement = {
  id: string;
  lot_id: string | null;
  delta_birds: number;
  reason: string;
  notes: string | null;
  moved_at: string;
};
