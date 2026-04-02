export declare function loginAdmin(username: string, password: string): Promise<{
    success: boolean;
    message: string;
    data: {
        token: string;
        username: any;
        name: any;
        role: any;
    };
}>;
export declare function getAdminByUsername(username: string): Promise<{
    username: string;
    name: string;
    role: string;
    id: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
} | null>;
export declare function getAllAdmins(): Promise<{
    username: string;
    name: string;
    role: string;
    id: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}[]>;
export declare function createAdmin(data: {
    username: string;
    name: string;
    password: string;
    role?: string;
}): Promise<{
    username: string;
    name: string;
    role: string;
    id: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}>;
export declare function updateAdmin(username: string, updates: {
    name?: string;
    role?: string;
    isActive?: boolean;
}): Promise<{
    username: string;
    name: string;
    role: string;
    id: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}>;
export declare function deleteAdmin(username: string): Promise<{
    message: string;
}>;
export declare function changePassword(username: string, oldPassword: string, newPassword: string): Promise<{
    success: boolean;
    message: string;
}>;
//# sourceMappingURL=adminService.d.ts.map