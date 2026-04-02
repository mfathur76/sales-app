import { Outlet } from '../types';
export declare function loginOutlet(code: string, password: string): Promise<{
    success: boolean;
    message: string;
    data?: undefined;
} | {
    success: boolean;
    message: string;
    data: {
        token: string;
        outlet: any;
        name: any;
    };
}>;
export declare function getAllOutlets(): Promise<Outlet[]>;
export declare function getOutletByCode(code: string): Promise<Outlet | null>;
export declare function createOutlet(data: {
    code: string;
    name: string;
    password: string;
}): Promise<Outlet>;
export declare function updateOutlet(code: string, updates: {
    name?: string;
    password?: string;
}): Promise<Outlet | null>;
export declare function deleteOutlet(code: string): Promise<void>;
//# sourceMappingURL=outletService.d.ts.map