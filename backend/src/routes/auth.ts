import { Router } from 'express';
import { AuthService } from '../services/authService';

const router = Router();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { outlet, password } = req.body;

    if (!outlet || !password) {
      return res.status(400).json({
        success: false,
        message: 'Outlet dan password harus diisi'
      });
    }

    const result = await AuthService.loginOutlet({ outlet, password });
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    console.error('Login route error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
});

// Get all outlets (for admin purposes)
router.get('/outlets', async (req, res) => {
  try {
    const result = await AuthService.getAllOutlets();
    res.status(200).json(result);
  } catch (error) {
    console.error('Get outlets route error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
});

export default router; 