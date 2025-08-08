import express, { Request, Response } from 'express';
import { OutletService } from '../services/outletService';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// GET /api/outlets - Get all outlets (admin only)
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.user?.type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const outlets = await OutletService.getAllOutlets();
    res.json({
      success: true,
      data: outlets,
      message: 'Outlets retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting outlets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve outlets'
    });
  }
});

// GET /api/outlets/:code - Get outlet by code (admin only)
router.get('/:code', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.user?.type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { code } = req.params;
    const outlet = await OutletService.getOutletByCode(code);

    if (!outlet) {
      return res.status(404).json({
        success: false,
        error: 'Outlet not found'
      });
    }

    res.json({
      success: true,
      data: outlet,
      message: 'Outlet retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting outlet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve outlet'
    });
  }
});

// POST /api/outlets - Create new outlet (admin only)
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.user?.type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { code, name, password } = req.body;

    if (!code || !name || !password) {
      return res.status(400).json({
        success: false,
        error: 'Code, name, and password are required'
      });
    }

    const outlet = await OutletService.createOutlet({
      code,
      name,
      password
    });

    res.status(201).json({
      success: true,
      data: outlet,
      message: 'Outlet created successfully'
    });
  } catch (error) {
    console.error('Error creating outlet:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create outlet'
    });
  }
});

// PUT /api/outlets/:code - Update outlet (admin only)
router.put('/:code', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.user?.type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { code } = req.params;
    const { name, password } = req.body;

    const outlet = await OutletService.updateOutlet(code, {
      name,
      password
    });

    res.json({
      success: true,
      data: outlet,
      message: 'Outlet updated successfully'
    });
  } catch (error) {
    console.error('Error updating outlet:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update outlet'
    });
  }
});

// DELETE /api/outlets/:code - Delete outlet (admin only)
router.delete('/:code', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.user?.type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { code } = req.params;
    const result = await OutletService.deleteOutlet(code);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error deleting outlet:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete outlet'
    });
  }
});

// POST /api/outlets/:code/change-password - Change outlet password
router.post('/:code/change-password', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { oldPassword, newPassword } = req.body;

    // Check if user is admin or the outlet itself
    if (req.user?.type === 'admin' || req.user?.outlet === code) {
      if (!oldPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Old password and new password are required'
        });
      }

      const result = await OutletService.changePassword(code, {
        oldPassword,
        newPassword
      });

      res.json({
        success: true,
        message: result.message
      });
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to change password'
    });
  }
});

export default router;
