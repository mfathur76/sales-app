import { OutletSale, CreateOutletSaleRequest, OutletSaleFilters } from '../types';
export declare function createOutletSale(data: CreateOutletSaleRequest): Promise<OutletSale>;
export declare function getOutletSaleByOutletAndDate(outlet: string, date: string): Promise<OutletSale | null>;
export declare function getAllOutletSales(filters?: OutletSaleFilters): Promise<OutletSale[]>;
export declare function updateOutletSale(outlet: string, date: string, updates: Partial<CreateOutletSaleRequest>): Promise<OutletSale | null>;
export declare function updateBankTransfer(outlet: string, date: string, bankData: {
    qrisBank?: number;
    gojekBank?: number;
    shopeeBank?: number;
    grabBank?: number;
    bcaBank?: number;
    mandiriBank?: number;
    notes?: string;
    verifiedBy?: string;
}): Promise<OutletSale | null>;
export declare function deleteOutletSale(outlet: string, date: string): Promise<void>;
export declare function getOutletSalesStats(filters?: OutletSaleFilters): Promise<{
    total_sales: number;
    total_revenue: number;
    average_daily_sales: number;
    total_cash: number;
    total_qris: number;
    total_gojek: number;
    total_shopee: number;
    total_grab: number;
    outlet_breakdown: {
        total_sales: number;
        total_revenue: number;
        outlet: string;
    }[];
}>;
export declare function getOutletOptions(): Promise<string[]>;
//# sourceMappingURL=salesService.d.ts.map