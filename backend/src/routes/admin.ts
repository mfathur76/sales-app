import express, { Request, Response } from 'express';
import { AdminService } from '../services/adminService';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// POST /api/admin/login - Admin login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    const result = await AdminService.loginAdmin(username, password);
    res.json(result);
  } catch (error) {
    console.error('Error in admin login:', error);
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Login failed'
    });
  }
});

// GET /api/admin/profile - Get admin profile (authenticated)
router.get('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const username = req.user?.username;
    
    if (!username || req.user?.type !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const admin = await AdminService.getAdminByUsername(username);
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    res.json({
      success: true,
      data: admin,
      message: 'Admin profile retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting admin profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve admin profile'
    });
  }
});

// GET /api/admin/list - Get all admins (super admin only)
router.get('/list', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.user?.type !== 'admin' || req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Super admin access required'
      });
    }

    const admins = await AdminService.getAllAdmins();
    res.json({
      success: true,
      data: admins,
      message: 'Admin list retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting admin list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve admin list'
    });
  }
});

// POST /api/admin/create - Create new admin (super admin only)
router.post('/create', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.user?.type !== 'admin' || req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Super admin access required'
      });
    }

    const { username, name, password, role } = req.body;

    if (!username || !name || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username, name, and password are required'
      });
    }

    const admin = await AdminService.createAdmin({
      username,
      name,
      password,
      role
    });

    res.status(201).json({
      success: true,
      data: admin,
      message: 'Admin created successfully'
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create admin'
    });
  }
});

export default router; 