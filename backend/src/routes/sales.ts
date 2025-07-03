import express, { Request, Response } from 'express';
import { OutletSalesService } from '../services/salesService';
import { CreateOutletSaleRequest, UpdateOutletSaleRequest, OutletSaleFilters } from '../types/sales';
import { authenticateToken, authorizeOutlet } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Create a separate admin router for admin-specific routes
const adminRouter = express.Router();

// GET /api/sales - Get all outlet sales records
router.get('/', async (req: Request, res: Response) => {
  try {
    const userOutlet = req.user?.outlet;
    if (!userOutlet) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const filters: OutletSaleFilters = {
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
      outlet: userOutlet
    };

    const sales = await OutletSalesService.getAllOutletSales(filters);
    res.json({
      success: true,
      data: sales,
      message: 'Outlet sales records retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting outlet sales:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve outlet sales records'
    });
  }
});

// GET /api/sales/stats - Get outlet sales statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userOutlet = req.user?.outlet;
    if (!userOutlet) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const filters: OutletSaleFilters = {
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
      outlet: userOutlet
    };

    const stats = await OutletSalesService.getOutletSalesStats(filters);
    res.json({
      success: true,
      data: stats,
      message: 'Outlet sales statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting outlet sales stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve outlet sales statistics'
    });
  }
});

// GET /api/sales/stats/overview - Get outlet sales statistics (alias)
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const userOutlet = req.user?.outlet;
    if (!userOutlet) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const filters: OutletSaleFilters = {
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
      outlet: userOutlet
    };

    const stats = await OutletSalesService.getOutletSalesStats(filters);
    res.json({
      success: true,
      data: stats,
      message: 'Outlet sales statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting outlet sales stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve outlet sales statistics'
    });
  }
});

// GET /api/sales/outlets - Get all outlet options
router.get('/outlets', async (req: Request, res: Response) => {
  try {
    const userOutlet = req.user?.outlet;
    if (!userOutlet) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const outlets = await OutletSalesService.getOutletOptions();
    res.json({
      success: true,
      data: outlets,
      message: 'Outlet options retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting outlet options:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve outlet options'
    });
  }
});

// GET /api/sales/:outlet/:date - Get outlet sale record by outlet and date
router.get('/:outlet/:date', authorizeOutlet, async (req: Request, res: Response) => {
  try {
    const { outlet, date } = req.params;

    if (!outlet || !date) {
      return res.status(400).json({
        success: false,
        error: 'Outlet and date are required'
      });
    }

    const sale = await OutletSalesService.getOutletSaleByOutletAndDate(outlet, date);
    if (!sale) {
      return res.status(404).json({
        success: false,
        error: 'Outlet sale record not found'
      });
    }

    res.json({
      success: true,
      data: sale,
      message: 'Outlet sale record retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting outlet sale by outlet and date:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve outlet sale record'
    });
  }
});

// POST /api/sales - Create new outlet sale record
router.post('/', async (req: Request, res: Response) => {
  try {
    const userOutlet = req.user?.outlet;
    if (!userOutlet) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const saleData: CreateOutletSaleRequest = req.body;

    // Ensure user can only create sales for their own outlet
    if (saleData.outlet !== userOutlet) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only create sales for your own outlet'
      });
    }

    // Validate required fields
    if (!saleData.outlet || !saleData.date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: outlet, date'
      });
    }

    // Validate data types
    if (typeof saleData.cash !== 'number' || saleData.cash < 0) {
      return res.status(400).json({
        success: false,
        error: 'Cash must be a non-negative number'
      });
    }

    if (typeof saleData.qris !== 'number' || saleData.qris < 0) {
      return res.status(400).json({
        success: false,
        error: 'QRIS must be a non-negative number'
      });
    }

    if (typeof saleData.gojek !== 'number' || saleData.gojek < 0) {
      return res.status(400).json({
        success: false,
        error: 'Gojek must be a non-negative number'
      });
    }

    if (typeof saleData.shopee !== 'number' || saleData.shopee < 0) {
      return res.status(400).json({
        success: false,
        error: 'Shopee must be a non-negative number'
      });
    }

    if (typeof saleData.grab !== 'number' || saleData.grab < 0) {
      return res.status(400).json({
        success: false,
        error: 'Grab must be a non-negative number'
      });
    }

    // Check if record already exists for this outlet and date
    const existingSale = await OutletSalesService.getOutletSaleByOutletAndDate(saleData.outlet, saleData.date);
    if (existingSale) {
      return res.status(409).json({
        success: false,
        error: 'Sale record already exists for this outlet and date'
      });
    }

    const newSale = await OutletSalesService.createOutletSale(saleData);
    res.status(201).json({
      success: true,
      data: newSale,
      message: 'Outlet sale record created successfully'
    });
  } catch (error) {
    console.error('Error creating outlet sale:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create outlet sale record'
    });
  }
});

// PUT /api/sales/:outlet/:date - Update outlet sale record
router.put('/:outlet/:date', authorizeOutlet, async (req: Request, res: Response) => {
  try {
    const { outlet, date } = req.params;

    if (!outlet || !date) {
      return res.status(400).json({
        success: false,
        error: 'Outlet and date are required'
      });
    }

    const userOutlet = req.user?.outlet;
    if (!userOutlet) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Ensure user can only update sales for their own outlet
    if (outlet !== userOutlet) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only update sales for your own outlet'
      });
    }

    const updateData: Partial<CreateOutletSaleRequest> = req.body;

    // Validate data types if provided
    if (updateData.cash !== undefined && (typeof updateData.cash !== 'number' || updateData.cash < 0)) {
      return res.status(400).json({
        success: false,
        error: 'Cash must be a non-negative number'
      });
    }

    if (updateData.qris !== undefined && (typeof updateData.qris !== 'number' || updateData.qris < 0)) {
      return res.status(400).json({
        success: false,
        error: 'QRIS must be a non-negative number'
      });
    }

    if (updateData.gojek !== undefined && (typeof updateData.gojek !== 'number' || updateData.gojek < 0)) {
      return res.status(400).json({
        success: false,
        error: 'Gojek must be a non-negative number'
      });
    }

    if (updateData.shopee !== undefined && (typeof updateData.shopee !== 'number' || updateData.shopee < 0)) {
      return res.status(400).json({
        success: false,
        error: 'Shopee must be a non-negative number'
      });
    }

    if (updateData.grab !== undefined && (typeof updateData.grab !== 'number' || updateData.grab < 0)) {
      return res.status(400).json({
        success: false,
        error: 'Grab must be a non-negative number'
      });
    }

    const updatedSale = await OutletSalesService.updateOutletSale(outlet, date, updateData);
    if (!updatedSale) {
      return res.status(404).json({
        success: false,
        error: 'Outlet sale record not found'
      });
    }

    res.json({
      success: true,
      data: updatedSale,
      message: 'Outlet sale record updated successfully'
    });
  } catch (error) {
    console.error('Error updating outlet sale:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update outlet sale record'
    });
  }
});

// DELETE /api/sales/:outlet/:date - Delete outlet sale record
router.delete('/:outlet/:date', authorizeOutlet, async (req: Request, res: Response) => {
  try {
    const { outlet, date } = req.params;

    if (!outlet || !date) {
      return res.status(400).json({
        success: false,
        error: 'Outlet and date are required'
      });
    }

    const userOutlet = req.user?.outlet;
    if (!userOutlet) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Ensure user can only delete sales for their own outlet
    if (outlet !== userOutlet) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only delete sales for your own outlet'
      });
    }

    const deleted = await OutletSalesService.deleteOutletSale(outlet, date);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Outlet sale record not found'
      });
    }

    res.json({
      success: true,
      message: 'Outlet sale record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting outlet sale:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete outlet sale record'
    });
  }
});

// Admin routes for bank transfer verification (without global auth middleware)
adminRouter.get('/sales', authenticateToken, async (req, res) => {
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

adminRouter.put('/sales/:outlet/:date/bank-transfer', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const { outlet, date } = req.params;
    const { qrisBank, gojekBank, shopeeBank, grabBank, bcaBank, mandiriBank, notes } = req.body;

    // Validate required fields
    if (qrisBank === undefined || gojekBank === undefined || 
        shopeeBank === undefined || grabBank === undefined ||
        bcaBank === undefined || mandiriBank === undefined) {
      return res.status(400).json({ error: 'All bank transfer amounts are required' });
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

adminRouter.put('/sales/:outlet/:date/status', authenticateToken, async (req, res) => {
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

adminRouter.get('/stats', authenticateToken, async (req, res) => {
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

// Mount admin router
router.use('/admin', adminRouter);

export { router as salesRouter }; 