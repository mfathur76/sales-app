import express, { Request, Response } from 'express';
import { AdminService } from '../services/adminService';
import { OutletSalesService } from '../services/salesService';
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

// PUT /api/admin/:username - Update admin (super admin only)
router.put('/:username', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.user?.type !== 'admin' || req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Super admin access required'
      });
    }

    const { username } = req.params;
    const { name, role, isActive } = req.body;

    const admin = await AdminService.updateAdmin(username, {
      name,
      role,
      isActive
    });

    res.json({
      success: true,
      data: admin,
      message: 'Admin updated successfully'
    });
  } catch (error) {
    console.error('Error updating admin:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update admin'
    });
  }
});

// DELETE /api/admin/:username - Delete admin (super admin only)
router.delete('/:username', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.user?.type !== 'admin' || req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Super admin access required'
      });
    }

    const { username } = req.params;
    const result = await AdminService.deleteAdmin(username);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete admin'
    });
  }
});

// POST /api/admin/change-password - Change admin password
router.post('/change-password', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.user?.type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Old password and new password are required'
      });
    }

    if (!req.user?.username) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const result = await AdminService.changePassword(
      req.user.username,
      oldPassword,
      newPassword
    );

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to change password'
    });
  }
});

// Admin sales routes
// GET /api/admin/test - Test route
router.get('/test', authenticateToken, async (req: Request, res: Response) => {
  try {
    console.log('🔍 Admin Test Route - req.user:', req.user);
    console.log('🔍 Admin Test Route - req.user.type:', req.user?.type);
    
    res.json({ 
      success: true, 
      message: 'Admin test route working',
      user: req.user 
    });
  } catch (error) {
    console.error('Error in admin test route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/sales - Get all sales for admin
router.get('/sales', authenticateToken, async (req: Request, res: Response) => {
  try {
    console.log('🔍 Admin Sales Route - req.user:', req.user);
    console.log('🔍 Admin Sales Route - req.user.type:', req.user?.type);
    
    // Check if user is admin
    if (!req.user || req.user.type !== 'admin') {
      console.log('🔍 Admin Sales Route - Access denied. User:', req.user);
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    console.log('🔍 Admin Sales Route - Admin access granted');
    const { start_date, end_date, outlet } = req.query;
    const filters = {
      start_date: start_date as string,
      end_date: end_date as string,
      outlet: outlet as string
    };

    const sales = await OutletSalesService.getAllOutletSalesForAdmin(filters);
    res.json(sales);
  } catch (error) {
    console.error('Error fetching admin sales:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/sales/:outlet/:date/bank-transfer - Update bank transfer amounts
router.put('/sales/:outlet/:date/bank-transfer', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const { outlet, date } = req.params;
    const { qrisBank, gojekBank, shopeeBank, grabBank, bcaBank, mandiriBank, notes } = req.body;

    // Validate required fields (only digital payments need bank transfer)
    if (qrisBank === undefined || gojekBank === undefined || 
        shopeeBank === undefined || grabBank === undefined ||
        bcaBank === undefined || mandiriBank === undefined) {
      return res.status(400).json({ error: 'All digital payment bank transfer amounts are required' });
    }

    const bankData = {
      qrisBank: Number(qrisBank),
      gojekBank: Number(gojekBank),
      shopeeBank: Number(shopeeBank),
      grabBank: Number(grabBank),
      bcaBank: Number(bcaBank),
      mandiriBank: Number(mandiriBank),
      notes
    };

    const updatedSale = await OutletSalesService.updateBankTransferAmounts(
      outlet,
      date,
      bankData,
      req.user.username || ''
    );

    res.json(updatedSale);
  } catch (error) {
    console.error('Error updating bank transfer amounts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/sales/:outlet/:date/status - Update sale status
router.put('/sales/:outlet/:date/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const { outlet, date } = req.params;
    const { status, notes } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be either "approved" or "rejected"' });
    }

    const updatedSale = await OutletSalesService.updateSaleStatus(
      outlet,
      date,
      status,
      notes
    );

    res.json(updatedSale);
  } catch (error) {
    console.error('Error updating sale status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/stats - Get admin statistics
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const { start_date, end_date, outlet } = req.query;
    const filters = {
      start_date: start_date as string,
      end_date: end_date as string,
      outlet: outlet as string
    };

    const stats = await OutletSalesService.getAdminSalesStats(filters);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 