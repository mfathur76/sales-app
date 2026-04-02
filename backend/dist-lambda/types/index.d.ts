import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
export type LambdaEvent = APIGatewayProxyEvent;
export type LambdaResult = APIGatewayProxyResult;
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
export interface Outlet {
    code: string;
    name: string;
    password: string;
    createdAt: string;
    updatedAt: string;
}
export interface Admin {
    id: string;
    username: string;
    name: string;
    password: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface OutletSaleFilters {
    start_date?: string;
    end_date?: string;
    outlet?: string;
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
export interface OutletSale {
    outlet: string;
    date: string;
    cash: number;
    qris: number;
    gojek: number;
    shopee: number;
    grab: number;
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
    overallPercent: number;
    status: string;
    verifiedBy?: string;
    verifiedAt?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}
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
//# sourceMappingURL=index.d.ts.map