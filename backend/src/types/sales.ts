export interface OutletSale {
  outlet: string;
  date: string;
  cash: number;
  qris: number;
  gojek: number;
  shopee: number;
  grab: number;
  total_sales?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateOutletSaleRequest {
  outlet: string;
  date: string;
  cash: number;
  qris: number;
  gojek: number;
  shopee: number;
  grab: number;
}

export interface UpdateOutletSaleRequest extends Partial<CreateOutletSaleRequest> {
  outlet: string;
  date: string;
}

export interface OutletSaleResponse {
  success: boolean;
  data?: OutletSale | OutletSale[];
  message?: string;
  error?: string;
}

export interface OutletSaleFilters {
  start_date?: string;
  end_date?: string;
  outlet?: string;
}

export interface OutletSaleStats {
  total_sales: number;
  total_revenue: number;
  average_daily_sales: number;
  total_cash: number;
  total_qris: number;
  total_gojek: number;
  total_shopee: number;
  total_grab: number;
  outlet_breakdown: {
    outlet: string;
    total_sales: number;
    total_revenue: number;
  }[];
} 