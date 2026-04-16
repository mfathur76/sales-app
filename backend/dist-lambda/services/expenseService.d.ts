import { Expense, ExpenseCategory, ItemMaster } from '../types';
export declare function getAllCategories(): Promise<ExpenseCategory[]>;
export declare function createCategory(data: {
    name: string;
    description?: string;
}): Promise<{
    PK: string;
    SK: string;
    id: string;
    name: string;
    description: string | undefined;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}>;
export declare function getAllItems(categoryId?: string): Promise<ItemMaster[]>;
export declare function getItemById(id: string): Promise<ItemMaster | null>;
export declare function createItem(data: {
    name: string;
    categoryId: string;
    standardPrice?: number;
    unit?: string;
}): Promise<{
    PK: string;
    SK: string;
    id: string;
    name: string;
    categoryId: string;
    standardPrice: number | undefined;
    unit: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}>;
export declare function getAllExpenses(outlet?: string, categoryId?: string, startDate?: Date, endDate?: Date, status?: string): Promise<Expense[]>;
export declare function getExpenseById(id: string): Promise<Expense | null>;
export declare function createExpense(data: {
    outlet: string;
    itemId: string;
    date: Date;
    quantity: number;
    actualPrice: number;
    totalPrice: number;
    notes?: string;
    isCash?: boolean;
    createdBy?: string;
}): Promise<Expense>;
export declare function updateExpense(id: string, updates: {
    outlet?: string;
    itemId?: string;
    date?: Date;
    quantity?: number;
    actualPrice?: number;
    notes?: string;
    isCash?: boolean;
    updatedBy?: string;
}): Promise<Expense | null>;
export declare function deleteExpense(id: string): Promise<void>;
//# sourceMappingURL=expenseService.d.ts.map