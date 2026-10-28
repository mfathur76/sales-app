import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

// Re-export for convenience
export type LambdaEvent = APIGatewayProxyEvent;
export type LambdaResult = APIGatewayProxyResult;

// JWT user payload
export interface JwtUser {
  outlet?: string;
  name: string;
  username?: string;
  role?: string;
  type: 'outlet' | 'admin';
}

export interface AuthenticatedEvent extends APIGatewayProxyEvent {
  user?: JwtUser;
}

// ---- Outlet / Auth types ----
export type OutletRole = 'outlet' | 'dapur';

export interface Outlet {
  code: string;
  name: string;
  password: string;
  role: OutletRole;   // 'dapur' = central kitchen account, only sends shipments
  createdAt: string;
  updatedAt: string;
}

// ---- Admin types ----
export interface Admin {
  id: string;
  username: string;
  name: string;
  password: string;
  role: string;       // 'admin' | 'super_admin'
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---- Sales types ----
export interface OutletSaleFilters {
  start_date?: string;
  end_date?: string;
  outlet?: string;
}

export interface CreateOutletSaleRequest {
  outlet: string;
  date: string;       // YYYY-MM-DD
  cash: number;
  qris: number;
  gojek: number;
  shopee: number;
  grab: number;
  transfer?: number;  // customer bank transfers taken by the cashier
}

export interface OutletSale {
  outlet: string;
  date: string;
  cash: number;
  qris: number;
  gojek: number;
  shopee: number;
  grab: number;
  transfer: number;   // cashier-recorded bank transfers; bcaBank + mandiriBank verify it
  totalSales: number;
  qrisBank: number;
  gojekBank: number;
  shopeeBank: number;
  grabBank: number;
  bcaBank: number;
  mandiriBank: number;
  totalBank: number;
  qrisPercent: number;
  gojekPercent: number;
  shopeePercent: number;
  grabPercent: number;
  bcaPercent: number;
  mandiriPercent: number;
  transferPercent: number;
  overallPercent: number;
  status: string;
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Expense types ----
export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ItemMaster {
  id: string;
  name: string;
  categoryId: string;
  standardPrice?: number;
  unit: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  outlet: string;
  itemId: string;
  date: string;
  quantity: number;
  actualPrice: number;
  totalPrice: number;
  notes?: string;
  isCash: boolean;
  status: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// ---- Customer / Order types ----
export interface Customer {
  id: string;
  name: string;
  phone: string;      // normalized to 62xxxxxxxxx
  address?: string;
  notes?: string;
  outlet: string;     // outlet that first registered this customer
  isReseller?: boolean; // takes stock from the kitchen on credit
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'cash' | 'transfer' | 'qris';

export interface OrderPayment {
  id: string;
  date: string;       // YYYY-MM-DD
  amount: number;
  method: PaymentMethod;
  note?: string;
  createdBy?: string;
  createdAt: string;
}

export type OrderStatus = 'baru' | 'diproses' | 'siap' | 'selesai' | 'batal';
export type PaymentStatus = 'belum_bayar' | 'dp' | 'lunas';
export type Fulfillment = 'ambil' | 'antar';

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  outlet: string;
  orderDate: string;  // YYYY-MM-DD
  pickupDate: string; // YYYY-MM-DD, when it is picked up / delivered
  pickupTime?: string; // HH:MM
  fulfillment: Fulfillment;
  deliveryAddress?: string;
  deliveryFee: number;
  items: string;
  total: number;      // goods only, excluding deliveryFee
  grandTotal: number; // total + deliveryFee
  payments: OrderPayment[];
  paid: number;
  remaining: number;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Stock (finished goods at outlets) ----
export type ProductKind = 'produksi' | 'beli_jadi';

export interface Product {
  id: string;
  name: string;
  price: number;      // selling price, the same at every outlet
  cost?: number;      // purchase/production cost per piece
  resellerPrice?: number; // price for resellers taking stock from the kitchen
  kind: ProductKind;
  category?: string;  // e.g. "RISOLES GORENG"; groups the product in forms and reports
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentLine {
  productId: string;
  name: string;
  qty: number;          // sent by the kitchen
  receivedQty?: number; // confirmed by the outlet
}

export interface Shipment {
  id: string;
  outlet: string;       // destination (a shop outlet, or the kitchen for returns)
  source?: string;      // sender; missing on shipments made before transfers existed = the kitchen
  date: string;         // YYYY-MM-DD
  lines: ShipmentLine[];
  status: 'dikirim' | 'diterima';
  notes?: string;
  createdBy?: string;
  receivedBy?: string;
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClosingLine {
  productId: string;
  name: string;
  price: number;        // price at the time of counting
  remaining: number;
  waste: number;
}

export interface StockClosing {
  outlet: string;
  date: string;
  lines: ClosingLine[];
  submittedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Kitchen stock ----
export interface KitchenEntryLine {
  productId: string;
  name: string;
  qty: number;
}

/** Goods coming into the kitchen: its own production, or bought-in goods delivered by a supplier. */
export interface KitchenEntry {
  id: string;
  kitchen: string;    // code of the kitchen account
  date: string;
  kind: 'produksi' | 'masuk';
  lines: KitchenEntryLine[];
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Reseller sales (stock taken from the kitchen, paid later) ----
export interface ResellerSaleLine {
  productId: string;
  name: string;
  qty: number;
  price: number;      // reseller price at the time of taking
}

export interface ResellerSale {
  id: string;
  kitchen: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  date: string;       // taken from the kitchen
  dueDate: string;
  lines: ResellerSaleLine[];
  total: number;
  payments: OrderPayment[];
  paid: number;
  remaining: number;
  paymentStatus: PaymentStatus;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}
