import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export class AdminService {
  // Login admin
  static async loginAdmin(username: string, password: string) {
    try {
      // Find admin by username
      const admin = await prisma.admin.findUnique({
        where: { username }
      });

      if (!admin) {
        throw new Error('Invalid username or password');
      }

      if (!admin.isActive) {
        throw new Error('Admin account is deactivated');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, admin.password);
      if (!isValidPassword) {
        throw new Error('Invalid username or password');
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          username: admin.username, 
          name: admin.name, 
          role: admin.role,
          type: 'admin' // Distinguish from outlet user
        }, 
        JWT_SECRET, 
        { expiresIn: '24h' }
      );

      return {
        success: true,
        data: {
          username: admin.username,
          name: admin.name,
          role: admin.role,
          token
        },
        message: 'Admin login successful'
      };
    } catch (error) {
      throw error;
    }
  }

  // Get admin by username
  static async getAdminByUsername(username: string) {
    try {
      const admin = await prisma.admin.findUnique({
        where: { username },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      });

      return admin;
    } catch (error) {
      throw error;
    }
  }

  // Get all admins (for super admin)
  static async getAllAdmins() {
    try {
      const admins = await prisma.admin.findMany({
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return admins;
    } catch (error) {
      throw error;
    }
  }

  // Create new admin (for super admin)
  static async createAdmin(adminData: {
    username: string;
    name: string;
    password: string;
    role?: string;
  }) {
    try {
      // Check if username already exists
      const existingAdmin = await prisma.admin.findUnique({
        where: { username: adminData.username }
      });

      if (existingAdmin) {
        throw new Error('Username already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(adminData.password, 10);

      // Create admin
      const admin = await prisma.admin.create({
        data: {
          username: adminData.username,
          name: adminData.name,
          password: hashedPassword,
          role: adminData.role || 'admin',
          isActive: true
        },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      });

      return admin;
    } catch (error) {
      throw error;
    }
  }
} 