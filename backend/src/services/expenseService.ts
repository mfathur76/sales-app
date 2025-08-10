import { PrismaClient, Expense, ExpenseCategory, ItemMaster } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateExpenseData {
  outlet: string;
  itemId: string;
  date: Date;
  quantity: number;
  actualPrice: number;
  totalPrice: number;
  notes?: string;
  createdBy?: string;
  isCash?: boolean;
}

export interface UpdateExpenseData {
  itemId?: string;
  date?: Date;
  quantity?: number;
  actualPrice?: number;
  totalPrice?: number;
  notes?: string;
  isCash?: boolean;
}

export interface ExpenseWithRelations extends Expense {
  itemRef: (ItemMaster & { categoryRef: ExpenseCategory | null }) | null;
  outletRef: { code: string; name: string } | null;
  createdByRef: { username: string; name: string } | null;
  approvedByRef: { username: string; name: string } | null;
}

export interface WeeklyReport {
  weekStart: Date;
  weekEnd: Date;
  totalExpense: number;
  expensesByCategory: Array<{
    categoryName: string;
    totalAmount: number;
    itemCount: number;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      date: Date;
      outlet: string;
    }>;
  }>;
  // New fields for table format
  tableData: Array<{
    itemName: string;
    category: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    date: Date;
    outlet: string;
  }>;
  categoryTotals: Array<{
    categoryName: string;
    totalAmount: number;
  }>;
  outletTotals: Array<{
    outlet: string;
    totalAmount: number;
  }>;
}

export interface MonthlyReport {
  month: number;
  year: number;
  totalExpense: number;
  expensesByCategory: Array<{
    categoryName: string;
    totalAmount: number;
    itemCount: number;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      date: Date;
      outlet: string;
    }>;
  }>;
  // New fields for table format
  tableData: Array<{
    itemName: string;
    category: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    date: Date;
    outlet: string;
  }>;
  categoryTotals: Array<{
    categoryName: string;
    totalAmount: number;
  }>;
  outletTotals: Array<{
    outlet: string;
    totalAmount: number;
  }>;
}

export class ExpenseService {
  // Create new expense
  async createExpense(data: CreateExpenseData): Promise<Expense> {
    return await prisma.expense.create({
      data: {
        outlet: data.outlet,
        itemId: data.itemId,
        date: data.date,
        quantity: data.quantity,
        actualPrice: data.actualPrice,
        totalPrice: data.totalPrice,
        notes: data.notes,
        createdBy: data.createdBy,
        isCash: data.isCash ?? true
      }
    });
  }

  // Get all expenses with relations
  async getAllExpenses(
    outlet?: string,
    categoryId?: string,
    startDate?: Date,
    endDate?: Date,
    status?: string
  ): Promise<ExpenseWithRelations[]> {
    const where: any = {};
    
    if (outlet) where.outlet = outlet;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    // If categoryId is provided, filter by item's category
    if (categoryId) {
      where.itemRef = {
        categoryId: categoryId
      };
    }

    return await prisma.expense.findMany({
      where,
      include: {
        itemRef: {
          include: {
            categoryRef: true
          }
        },
        outletRef: {
          select: {
            code: true,
            name: true
          }
        },
        createdByRef: {
          select: {
            username: true,
            name: true
          }
        },
        approvedByRef: {
          select: {
            username: true,
            name: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });
  }

  // Get expense by ID
  async getExpenseById(id: string): Promise<ExpenseWithRelations | null> {
    return await prisma.expense.findUnique({
      where: { id },
      include: {
        itemRef: {
          include: {
            categoryRef: true
          }
        },
        outletRef: {
          select: {
            code: true,
            name: true
          }
        },
        createdByRef: {
          select: {
            username: true,
            name: true
          }
        },
        approvedByRef: {
          select: {
            username: true,
            name: true
          }
        }
      }
    });
  }

  // Update expense
  async updateExpense(id: string, data: UpdateExpenseData): Promise<Expense> {
    const updateData: any = { ...data };
    
    // Recalculate total price if quantity or actual price changed
    if (data.quantity !== undefined || data.actualPrice !== undefined) {
      const currentExpense = await prisma.expense.findUnique({
        where: { id },
        select: { quantity: true, actualPrice: true }
      });
      
      if (currentExpense) {
        const newQuantity = data.quantity ?? currentExpense.quantity;
        const newActualPrice = data.actualPrice ?? currentExpense.actualPrice;
        updateData.totalPrice = newQuantity * newActualPrice;
      }
    }

    return await prisma.expense.update({
      where: { id },
      data: updateData
    });
  }

  // Delete expense
  async deleteExpense(id: string): Promise<Expense> {
    return await prisma.expense.delete({
      where: { id }
    });
  }

  // Approve expense
  async approveExpense(id: string, approvedBy: string): Promise<Expense> {
    return await prisma.expense.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy,
        approvedAt: new Date()
      }
    });
  }

  // Reject expense
  async rejectExpense(id: string, approvedBy: string, rejectionReason: string): Promise<Expense> {
    return await prisma.expense.update({
      where: { id },
      data: {
        status: 'rejected',
        approvedBy,
        approvedAt: new Date(),
        rejectionReason
      }
    });
  }

  // Get all expense categories
  async getAllCategories(): Promise<(ExpenseCategory & { expenseCount: number })[]> {
    const categories = await prisma.expenseCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    // Get expense count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const expenseCount = await prisma.expense.count({
          where: {
            itemRef: {
              categoryId: category.id
            }
          }
        });
        return {
          ...category,
          expenseCount
        };
      })
    );

    return categoriesWithCount;
  }

  // Get all item masters
  async getAllItems(): Promise<(ItemMaster & { categoryRef: ExpenseCategory | null; expenseCount: number })[]> {
    const items = await prisma.itemMaster.findMany({
      where: { isActive: true },
      include: {
        categoryRef: true
      },
      orderBy: { name: 'asc' }
    });

    // Get expense count for each item
    const itemsWithCount = await Promise.all(
      items.map(async (item) => {
        const expenseCount = await prisma.expense.count({
          where: { itemId: item.id }
        });
        return {
          ...item,
          expenseCount
        };
      })
    );

    return itemsWithCount;
  }

  // Create item master
  async createItem(data: {
    name: string;
    categoryId: string;
    standardPrice?: number;
    unit?: string;
  }): Promise<ItemMaster> {
    return await prisma.itemMaster.create({
      data: {
        name: data.name,
        categoryId: data.categoryId,
        standardPrice: data.standardPrice,
        unit: data.unit || 'kg'
      }
    });
  }

  // Update item master
  async updateItem(id: string, data: {
    name?: string;
    categoryId?: string;
    standardPrice?: number;
    unit?: string;
  }): Promise<ItemMaster> {
    return await prisma.itemMaster.update({
      where: { id },
      data
    });
  }

  // Delete item master
  async deleteItem(id: string): Promise<ItemMaster> {
    // Check if item is being used by any expenses
    const expenseCount = await prisma.expense.count({
      where: { itemId: id }
    });

    if (expenseCount > 0) {
      throw new Error(`Cannot delete item. It is being used by ${expenseCount} expense(s).`);
    }

    return await prisma.itemMaster.delete({
      where: { id }
    });
  }

  // Create expense category
  async createCategory(name: string, description?: string): Promise<ExpenseCategory> {
    return await prisma.expenseCategory.create({
      data: {
        name,
        description
      }
    });
  }

  // Update expense category
  async updateCategory(id: string, name: string, description?: string): Promise<ExpenseCategory> {
    return await prisma.expenseCategory.update({
      where: { id },
      data: {
        name,
        description
      }
    });
  }

  // Delete expense category
  async deleteCategory(id: string): Promise<ExpenseCategory> {
    try {
      // Check if category is being used by any expenses
      const expenseCount = await prisma.expense.count({
        where: { 
          itemRef: {
            categoryId: id
          }
        }
      });

      if (expenseCount > 0) {
        throw new Error(`Cannot delete category. It is being used by ${expenseCount} expense(s).`);
      }

      // Check if category is being used by any items
      const itemCount = await prisma.itemMaster.count({
        where: { categoryId: id }
      });

      if (itemCount > 0) {
        throw new Error(`Cannot delete category. It is being used by ${itemCount} item(s).`);
      }

      return await prisma.expenseCategory.delete({
        where: { id }
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to delete category');
    }
  }

  // Get weekly expense report
  async getWeeklyReport(outlets: string[], weekStart: Date, status?: string): Promise<WeeklyReport> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const whereCondition: any = {
      outlet: {
        in: outlets
      },
      date: {
        gte: weekStart,
        lte: weekEnd
      }
    };

    // Add status filter if provided, otherwise show all
    if (status) {
      whereCondition.status = status;
    }

    const expenses = await prisma.expense.findMany({
      where: whereCondition,
      include: {
        itemRef: {
          include: {
            categoryRef: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    const totalExpense = expenses.reduce((sum, expense) => sum + expense.totalPrice, 0);
    
    // Group by category
    const categoryMap = new Map<string, any>();
    const tableData: any[] = [];
    const categoryTotalsMap = new Map<string, number>();
    const outletTotalsMap = new Map<string, number>();
    
    expenses.forEach(expense => {
      const categoryName = expense.itemRef?.categoryRef?.name || 'Unknown';
      const itemName = expense.itemRef?.name || 'Unknown Item';
      
      // Add to table data
      tableData.push({
        itemName,
        category: categoryName,
        quantity: expense.quantity,
        unitPrice: expense.actualPrice,
        totalPrice: expense.totalPrice,
        date: expense.date,
        outlet: expense.outlet
      });
      
      // Update category totals
      categoryTotalsMap.set(categoryName, (categoryTotalsMap.get(categoryName) || 0) + expense.totalPrice);
      
      // Update outlet totals
      outletTotalsMap.set(expense.outlet, (outletTotalsMap.get(expense.outlet) || 0) + expense.totalPrice);
      
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          categoryName,
          totalAmount: 0,
          itemCount: 0,
          items: []
        });
      }
      
      const category = categoryMap.get(categoryName);
      category.totalAmount += expense.totalPrice;
      category.itemCount += 1;
      category.items.push({
        description: itemName,
        quantity: expense.quantity,
        unitPrice: expense.actualPrice,
        totalPrice: expense.totalPrice,
        date: expense.date,
        outlet: expense.outlet
      });
    });

    return {
      weekStart,
      weekEnd,
      totalExpense,
      expensesByCategory: Array.from(categoryMap.values()),
      tableData,
      categoryTotals: Array.from(categoryTotalsMap.entries()).map(([name, total]) => ({ categoryName: name, totalAmount: total })),
      outletTotals: Array.from(outletTotalsMap.entries()).map(([outlet, total]) => ({ outlet, totalAmount: total }))
    };
  }

  // Get monthly expense report
  async getMonthlyReport(outlets: string[], month: number, year: number, status?: string): Promise<MonthlyReport> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of the month

    const whereCondition: any = {
      outlet: {
        in: outlets
      },
      date: {
        gte: startDate,
        lte: endDate
      }
    };

    // Add status filter if provided, otherwise show all
    if (status) {
      whereCondition.status = status;
    }

    const expenses = await prisma.expense.findMany({
      where: whereCondition,
      include: {
        itemRef: {
          include: {
            categoryRef: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    const totalExpense = expenses.reduce((sum, expense) => sum + expense.totalPrice, 0);
    
    // Group by category
    const categoryMap = new Map<string, any>();
    const tableData: any[] = [];
    const categoryTotalsMap = new Map<string, number>();
    const outletTotalsMap = new Map<string, number>();
    
    expenses.forEach(expense => {
      const categoryName = expense.itemRef?.categoryRef?.name || 'Unknown';
      const itemName = expense.itemRef?.name || 'Unknown Item';
      
      // Add to table data
      tableData.push({
        itemName,
        category: categoryName,
        quantity: expense.quantity,
        unitPrice: expense.actualPrice,
        totalPrice: expense.totalPrice,
        date: expense.date,
        outlet: expense.outlet
      });
      
      // Update category totals
      categoryTotalsMap.set(categoryName, (categoryTotalsMap.get(categoryName) || 0) + expense.totalPrice);
      
      // Update outlet totals
      outletTotalsMap.set(expense.outlet, (outletTotalsMap.get(expense.outlet) || 0) + expense.totalPrice);
      
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          categoryName,
          totalAmount: 0,
          itemCount: 0,
          items: []
        });
      }
      
      const category = categoryMap.get(categoryName);
      category.totalAmount += expense.totalPrice;
      category.itemCount += 1;
      category.items.push({
        description: itemName,
        quantity: expense.quantity,
        unitPrice: expense.actualPrice,
        totalPrice: expense.totalPrice,
        date: expense.date,
        outlet: expense.outlet
      });
    });

    return {
      month,
      year,
      totalExpense,
      expensesByCategory: Array.from(categoryMap.values()),
      tableData,
      categoryTotals: Array.from(categoryTotalsMap.entries()).map(([name, total]) => ({ categoryName: name, totalAmount: total })),
      outletTotals: Array.from(outletTotalsMap.entries()).map(([outlet, total]) => ({ outlet, totalAmount: total }))
    };
  }

  // Get expense summary by date range
  async getExpenseSummary(outlet: string, startDate: Date, endDate: Date) {
    const expenses = await prisma.expense.findMany({
      where: {
        outlet,
        date: {
          gte: startDate,
          lte: endDate
        },
        status: 'approved'
      },
      include: {
        itemRef: {
          include: {
            categoryRef: true
          }
        }
      }
    });

    const totalExpense = expenses.reduce((sum, expense) => sum + expense.totalPrice, 0);
    
    const categorySummary = expenses.reduce((acc, expense) => {
      const categoryName = expense.itemRef?.categoryRef?.name || 'Unknown';
      if (!acc[categoryName]) {
        acc[categoryName] = {
          totalAmount: 0,
          itemCount: 0
        };
      }
      acc[categoryName].totalAmount += expense.totalPrice;
      acc[categoryName].itemCount += 1;
      return acc;
    }, {} as Record<string, { totalAmount: number; itemCount: number }>);

    return {
      totalExpense,
      categorySummary,
      itemCount: expenses.length
    };
  }
}
