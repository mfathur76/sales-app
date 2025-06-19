import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface LoginRequest {
  outlet: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    outlet: string;
    name: string;
  };
}

export class AuthService {
  // Initialize outlet data if not exists
  static async initializeOutlets() {
    const outlets = [
      { code: 'RM001', name: 'Risol Mejik Kelinci Raya', password: 'rm0012024' },
      { code: 'RM002', name: 'Risol Mejik Ketileng', password: 'rm0022024' },
      { code: 'RM003', name: 'Risol Mejik Tlogosari', password: 'rm0032024' },
      { code: 'RM004', name: 'Risol Mejik Karyadi', password: 'rm0042024' }
    ];

    for (const outlet of outlets) {
      const existingOutlet = await prisma.outlet.findUnique({
        where: { code: outlet.code }
      });

      if (!existingOutlet) {
        // Hash password
        const hashedPassword = await bcrypt.hash(outlet.password, 10);
        
        await prisma.outlet.create({
          data: {
            code: outlet.code,
            name: outlet.name,
            password: hashedPassword
          }
        });
        console.log(`Outlet ${outlet.code} created`);
      }
    }
  }

  // Login outlet
  static async loginOutlet(loginData: LoginRequest): Promise<LoginResponse> {
    try {
      const { outlet, password } = loginData;

      // Find outlet
      const outletData = await prisma.outlet.findUnique({
        where: { code: outlet }
      });

      if (!outletData) {
        return {
          success: false,
          message: 'Outlet tidak ditemukan'
        };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, outletData.password);
      
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Password salah'
        };
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          outlet: outletData.code, 
          name: outletData.name 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return {
        success: true,
        message: 'Login berhasil',
        data: {
          token,
          outlet: outletData.code,
          name: outletData.name
        }
      };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Terjadi kesalahan saat login'
      };
    }
  }

  // Get all outlets (for admin purposes)
  static async getAllOutlets() {
    try {
      const outlets = await prisma.outlet.findMany({
        select: {
          code: true,
          name: true,
          createdAt: true
        },
        orderBy: {
          code: 'asc'
        }
      });

      return {
        success: true,
        message: 'Data outlet berhasil diambil',
        data: outlets
      };
    } catch (error) {
      console.error('Get outlets error:', error);
      return {
        success: false,
        message: 'Terjadi kesalahan saat mengambil data outlet'
      };
    }
  }

  // Verify token
  static verifyToken(token: string) {
    try {
      return jwt.verify(token, JWT_SECRET) as { outlet: string; name: string };
    } catch (error) {
      return null;
    }
  }
} 