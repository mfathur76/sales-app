import { PrismaClient } from '@prisma/client';
import { OutletSale, CreateOutletSaleRequest, UpdateOutletSaleRequest, OutletSaleFilters, OutletSaleStats } from '../types/sales';

const prisma = new PrismaClient();

export class OutletSalesService {
  // Create new outlet sale record
  static async createOutletSale(saleData: CreateOutletSaleRequest): Promise<OutletSale> {
    const totalSales = saleData.cash + saleData.qris + saleData.gojek + saleData.shopee + saleData.grab;

    const newSale = await prisma.outletSale.create({
      data: {
        outlet: saleData.outlet,
        date: new Date(saleData.date),
        cash: saleData.cash,
        qris: saleData.qris,
        gojek: saleData.gojek,
        shopee: saleData.shopee,
        grab: saleData.grab,
        totalSales: totalSales
      }
    });

    return {
      outlet: newSale.outlet,
      date: newSale.date.toISOString().split('T')[0],
      cash: newSale.cash,
      qris: newSale.qris,
      gojek: newSale.gojek,
      shopee: newSale.shopee,
      grab: newSale.grab,
      total_sales: newSale.totalSales,
      created_at: newSale.createdAt.toISOString(),
      updated_at: newSale.updatedAt.toISOString()
    };
  }

  // Get all outlet sales records with optional filters
  static async getAllOutletSales(filters?: OutletSaleFilters): Promise<OutletSale[]> {
    const where: any = {};

    if (filters?.start_date) {
      where.date = {
        ...where.date,
        gte: new Date(filters.start_date)
      };
    }

    if (filters?.end_date) {
      where.date = {
        ...where.date,
        lte: new Date(filters.end_date)
      };
    }

    if (filters?.outlet) {
      where.outlet = filters.outlet;
    }

    const sales = await prisma.outletSale.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { outlet: 'asc' }
      ]
    });

    return sales.map(sale => ({
      outlet: sale.outlet,
      date: sale.date.toISOString().split('T')[0],
      cash: sale.cash,
      qris: sale.qris,
      gojek: sale.gojek,
      shopee: sale.shopee,
      grab: sale.grab,
      total_sales: sale.totalSales,
      created_at: sale.createdAt.toISOString(),
      updated_at: sale.updatedAt.toISOString()
    }));
  }

  // Get outlet sale by outlet and date
  static async getOutletSaleByOutletAndDate(outlet: string, date: string): Promise<OutletSale | null> {
    const sale = await prisma.outletSale.findUnique({
      where: {
        outlet_date: {
          outlet: outlet,
          date: new Date(date)
        }
      }
    });

    if (!sale) return null;

    return {
      outlet: sale.outlet,
      date: sale.date.toISOString().split('T')[0],
      cash: sale.cash,
      qris: sale.qris,
      gojek: sale.gojek,
      shopee: sale.shopee,
      grab: sale.grab,
      total_sales: sale.totalSales,
      created_at: sale.createdAt.toISOString(),
      updated_at: sale.updatedAt.toISOString()
    };
  }

  // Update outlet sale record
  static async updateOutletSale(outlet: string, date: string, updateData: Partial<CreateOutletSaleRequest>): Promise<OutletSale | null> {
    // First check if record exists
    const existingSale = await prisma.outletSale.findUnique({
      where: {
        outlet_date: {
          outlet: outlet,
          date: new Date(date)
        }
      }
    });

    if (!existingSale) return null;

    // Calculate new total
    const newCash = updateData.cash ?? existingSale.cash;
    const newQris = updateData.qris ?? existingSale.qris;
    const newGojek = updateData.gojek ?? existingSale.gojek;
    const newShopee = updateData.shopee ?? existingSale.shopee;
    const newGrab = updateData.grab ?? existingSale.grab;
    const newTotalSales = newCash + newQris + newGojek + newShopee + newGrab;

    const updatedSale = await prisma.outletSale.update({
      where: {
        outlet_date: {
          outlet: outlet,
          date: new Date(date)
        }
      },
      data: {
        cash: newCash,
        qris: newQris,
        gojek: newGojek,
        shopee: newShopee,
        grab: newGrab,
        totalSales: newTotalSales
      }
    });

    return {
      outlet: updatedSale.outlet,
      date: updatedSale.date.toISOString().split('T')[0],
      cash: updatedSale.cash,
      qris: updatedSale.qris,
      gojek: updatedSale.gojek,
      shopee: updatedSale.shopee,
      grab: updatedSale.grab,
      total_sales: updatedSale.totalSales,
      created_at: updatedSale.createdAt.toISOString(),
      updated_at: updatedSale.updatedAt.toISOString()
    };
  }

  // Delete outlet sale record
  static async deleteOutletSale(outlet: string, date: string): Promise<boolean> {
    try {
      await prisma.outletSale.delete({
        where: {
          outlet_date: {
            outlet: outlet,
            date: new Date(date)
          }
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get outlet sales statistics
  static async getOutletSalesStats(filters?: OutletSaleFilters): Promise<OutletSaleStats> {
    const where: any = {};

    if (filters?.start_date) {
      where.date = {
        ...where.date,
        gte: new Date(filters.start_date)
      };
    }

    if (filters?.end_date) {
      where.date = {
        ...where.date,
        lte: new Date(filters.end_date)
      };
    }

    if (filters?.outlet) {
      where.outlet = filters.outlet;
    }

    // Get overall statistics
    const stats = await prisma.outletSale.aggregate({
      where,
      _count: {
        outlet: true
      },
      _sum: {
        totalSales: true,
        cash: true,
        qris: true,
        gojek: true,
        shopee: true,
        grab: true
      },
      _avg: {
        totalSales: true
      }
    });

    // Get outlet breakdown
    const breakdown = await prisma.outletSale.groupBy({
      by: ['outlet'],
      where,
      _count: {
        outlet: true
      },
      _sum: {
        totalSales: true
      },
      orderBy: {
        _sum: {
          totalSales: 'desc'
        }
      }
    });

    return {
      total_sales: stats._count.outlet || 0,
      total_revenue: stats._sum.totalSales || 0,
      average_daily_sales: stats._avg.totalSales || 0,
      total_cash: stats._sum.cash || 0,
      total_qris: stats._sum.qris || 0,
      total_gojek: stats._sum.gojek || 0,
      total_shopee: stats._sum.shopee || 0,
      total_grab: stats._sum.grab || 0,
      outlet_breakdown: breakdown.map(item => ({
        outlet: item.outlet,
        total_sales: item._count.outlet,
        total_revenue: item._sum.totalSales || 0
      }))
    };
  }

  // Get outlet options
  static async getOutletOptions(): Promise<string[]> {
    const outlets = await prisma.outletSale.findMany({
      select: {
        outlet: true
      },
      distinct: ['outlet'],
      orderBy: {
        outlet: 'asc'
      }
    });

    return outlets.map(item => item.outlet);
  }

  // Get all outlet sales records (for admin - all outlets)
  static async getAllOutletSalesForAdmin(filters: OutletSaleFilters = {}) {
    try {
      const whereClause: any = {};
      
      if (filters.start_date) {
        whereClause.date = {
          gte: new Date(filters.start_date)
        };
      }
      
      if (filters.end_date) {
        whereClause.date = {
          ...whereClause.date,
          lte: new Date(filters.end_date)
        };
      }
      
      if (filters.outlet) {
        whereClause.outlet = filters.outlet;
      }

      const sales = await prisma.outletSale.findMany({
        where: whereClause,
        include: {
          outletRef: {
            select: {
              code: true,
              name: true
            }
          },
          verifiedByRef: {
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

      return sales;
    } catch (error) {
      throw error;
    }
  }

  // Update bank transfer amounts and calculate percentages
  static async updateBankTransferAmounts(
    outlet: string, 
    date: string, 
    bankData: {
      qrisBank: number;
      gojekBank: number;
      shopeeBank: number;
      grabBank: number;
      bcaBank: number;
      mandiriBank: number;
      notes?: string;
    },
    verifiedBy: string
  ) {
    try {
      // Get current sale data
      const sale = await prisma.outletSale.findUnique({
        where: {
          outlet_date: {
            outlet,
            date: new Date(date)
          }
        }
      });

      if (!sale) {
        throw new Error('Sale record not found');
      }

      // Calculate percentages for digital payments only
      const qrisPercent = sale.qris > 0 ? (bankData.qrisBank / sale.qris) * 100 : 0;
      const gojekPercent = sale.gojek > 0 ? (bankData.gojekBank / sale.gojek) * 100 : 0;
              const shopeePercent = sale.shopee > 0 ? (bankData.shopeeBank / sale.shopee) * 100 : 0;
        const grabPercent = sale.grab > 0 ? (bankData.grabBank / sale.grab) * 100 : 0;
        const bcaPercent = sale.qris > 0 ? (bankData.bcaBank / sale.qris) * 100 : 0;
        const mandiriPercent = sale.qris > 0 ? (bankData.mandiriBank / sale.qris) * 100 : 0;

        // Calculate total digital sales and total bank transfer
        const totalDigitalSales = sale.qris + sale.gojek + sale.shopee + sale.grab;
        const totalBank = bankData.qrisBank + bankData.gojekBank + bankData.shopeeBank + bankData.grabBank + bankData.bcaBank + bankData.mandiriBank;
      
      // Calculate overall percentage based on digital sales only
      const overallPercent = totalDigitalSales > 0 ? (totalBank / totalDigitalSales) * 100 : 0;

      // Update sale with bank data
      const updatedSale = await prisma.outletSale.update({
        where: {
          outlet_date: {
            outlet,
            date: new Date(date)
          }
        },
        data: {
          qrisBank: bankData.qrisBank,
          gojekBank: bankData.gojekBank,
          shopeeBank: bankData.shopeeBank,
          grabBank: bankData.grabBank,
          bcaBank: bankData.bcaBank,
          mandiriBank: bankData.mandiriBank,
          totalBank,
          qrisPercent,
          gojekPercent,
                      shopeePercent,
            grabPercent,
            bcaPercent,
            mandiriPercent,
            overallPercent,
          status: 'verified',
          verifiedBy,
          verifiedAt: new Date(),
          notes: bankData.notes
        },
        include: {
          outletRef: {
            select: {
              code: true,
              name: true
            }
          },
          verifiedByRef: {
            select: {
              username: true,
              name: true
            }
          }
        }
      });

      return updatedSale;
    } catch (error) {
      throw error;
    }
  }

  // Approve or reject sale
  static async updateSaleStatus(
    outlet: string,
    date: string,
    status: 'approved' | 'rejected',
    notes?: string
  ) {
    try {
      const updatedSale = await prisma.outletSale.update({
        where: {
          outlet_date: {
            outlet,
            date: new Date(date)
          }
        },
        data: {
          status,
          notes: notes || undefined
        },
        include: {
          outletRef: {
            select: {
              code: true,
              name: true
            }
          },
          verifiedByRef: {
            select: {
              username: true,
              name: true
            }
          }
        }
      });

      return updatedSale;
    } catch (error) {
      throw error;
    }
  }

  // Get sales statistics for admin
  static async getAdminSalesStats(filters: OutletSaleFilters = {}) {
    try {
      const whereClause: any = {};
      
      if (filters.start_date) {
        whereClause.date = {
          gte: new Date(filters.start_date)
        };
      }
      
      if (filters.end_date) {
        whereClause.date = {
          ...whereClause.date,
          lte: new Date(filters.end_date)
        };
      }
      
      if (filters.outlet) {
        whereClause.outlet = filters.outlet;
      }

      const sales = await prisma.outletSale.findMany({
        where: whereClause,
        include: {
          outletRef: {
            select: {
              code: true,
              name: true
            }
          }
        }
      });

      // Calculate statistics
      const totalSales = sales.length;
      const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalSales, 0);
      const totalBankTransfer = sales.reduce((sum, sale) => sum + sale.totalBank, 0);
      const averageRealization = totalRevenue > 0 ? (totalBankTransfer / totalRevenue) * 100 : 0;

      const pendingCount = sales.filter(sale => sale.status === 'pending').length;
      const verifiedCount = sales.filter(sale => sale.status === 'verified').length;
      const approvedCount = sales.filter(sale => sale.status === 'approved').length;
      const rejectedCount = sales.filter(sale => sale.status === 'rejected').length;

      return {
        totalSales,
        totalRevenue,
        totalBankTransfer,
        averageRealization,
        pendingCount,
        verifiedCount,
        approvedCount,
        rejectedCount,
        sales
      };
    } catch (error) {
      throw error;
    }
  }
} 