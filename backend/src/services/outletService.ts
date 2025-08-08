import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export interface CreateOutletData {
  code: string;
  name: string;
  password: string;
}

export interface UpdateOutletData {
  name?: string;
  password?: string;
}

export interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
}

export class OutletService {
  // Get all outlets
  static async getAllOutlets() {
    try {
      const outlets = await prisma.outlet.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: {
          code: 'asc'
        }
      });

      return outlets;
    } catch (error) {
      throw error;
    }
  }

  // Get outlet by code
  static async getOutletByCode(code: string) {
    try {
      const outlet = await prisma.outlet.findUnique({
        where: { code },
        select: {
          id: true,
          code: true,
          name: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return outlet;
    } catch (error) {
      throw error;
    }
  }

  // Create new outlet
  static async createOutlet(data: CreateOutletData) {
    try {
      // Check if outlet code already exists
      const existingOutlet = await prisma.outlet.findUnique({
        where: { code: data.code }
      });

      if (existingOutlet) {
        throw new Error('Outlet code already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create outlet
      const outlet = await prisma.outlet.create({
        data: {
          code: data.code,
          name: data.name,
          password: hashedPassword
        },
        select: {
          id: true,
          code: true,
          name: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return outlet;
    } catch (error) {
      throw error;
    }
  }

  // Update outlet
  static async updateOutlet(code: string, data: UpdateOutletData) {
    try {
      const updateData: any = {};

      if (data.name) {
        updateData.name = data.name;
      }

      if (data.password) {
        updateData.password = await bcrypt.hash(data.password, 10);
      }

      const outlet = await prisma.outlet.update({
        where: { code },
        data: updateData,
        select: {
          id: true,
          code: true,
          name: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return outlet;
    } catch (error) {
      throw error;
    }
  }

  // Delete outlet
  static async deleteOutlet(code: string) {
    try {
      // Check if outlet has any sales or expenses
      const salesCount = await prisma.outletSale.count({
        where: { outlet: code }
      });

      const expensesCount = await prisma.expense.count({
        where: { outlet: code }
      });

      if (salesCount > 0 || expensesCount > 0) {
        throw new Error('Cannot delete outlet with existing sales or expenses');
      }

      await prisma.outlet.delete({
        where: { code }
      });

      return { success: true, message: 'Outlet deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Change outlet password
  static async changePassword(code: string, data: ChangePasswordData) {
    try {
      // Get outlet with password
      const outlet = await prisma.outlet.findUnique({
        where: { code }
      });

      if (!outlet) {
        throw new Error('Outlet not found');
      }

      // Verify old password
      const isOldPasswordValid = await bcrypt.compare(data.oldPassword, outlet.password);
      if (!isOldPasswordValid) {
        throw new Error('Old password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(data.newPassword, 10);

      // Update password
      await prisma.outlet.update({
        where: { code },
        data: { password: hashedNewPassword }
      });

      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      throw error;
    }
  }
}
