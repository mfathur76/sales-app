import express from 'express';
import { ExpenseService } from '../services/expenseService';

const expenseService = new ExpenseService();
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Middleware to require admin access
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.user || req.user.type !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  next();
};

// Get all expenses with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { outlet, categoryId, startDate, endDate, status } = req.query;
    
    // For outlet users, force their outlet
    let filteredOutlet = outlet as string;
    if (req.user?.type === 'outlet' && req.user?.outlet) {
      filteredOutlet = req.user.outlet;
    }
    
    const expenses = await expenseService.getAllExpenses(
      filteredOutlet,
      categoryId as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      status as string
    );
    
    res.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// Get expense by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await expenseService.getExpenseById(id);
    
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    // Check if user is outlet user and restrict to their outlet
    if (req.user?.type === 'outlet' && req.user?.outlet && req.user.outlet !== expense.outlet) {
      return res.status(403).json({
        error: 'Access denied: You can only view expenses for your own outlet'
      });
    }
    
    res.json(expense);
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({ error: 'Failed to fetch expense' });
  }
});

// Create new expense
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      outlet,
      itemId,
      date,
      quantity,
      actualPrice,
      notes
    } = req.body;

    // Validation
    if (!outlet || !itemId || !date || !quantity || !actualPrice) {
      return res.status(400).json({
        error: 'Missing required fields: outlet, itemId, date, quantity, actualPrice'
      });
    }

    if (quantity <= 0 || actualPrice <= 0) {
      return res.status(400).json({
        error: 'Quantity and actual price must be greater than 0'
      });
    }

    // Check if user is outlet user and restrict to their outlet
    if (req.user?.type === 'outlet' && req.user?.outlet && req.user.outlet !== outlet) {
      return res.status(403).json({
        error: 'Access denied: You can only create expenses for your own outlet'
      });
    }

    const expenseData = {
      outlet,
      itemId,
      date: new Date(date),
      quantity: parseFloat(quantity),
      actualPrice: parseFloat(actualPrice),
      totalPrice: parseFloat(quantity) * parseFloat(actualPrice),
      notes,
      createdBy: req.user?.type === 'admin' ? req.user.username : undefined,
      isCash: typeof req.body.isCash === 'boolean' ? req.body.isCash : true
    };

    const expense = await expenseService.createExpense(expenseData);
    res.status(201).json(expense);
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// Update expense
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      itemId,
      date,
      quantity,
      actualPrice,
      notes
    } = req.body;

    // Get existing expense to check permissions
    const existingExpense = await expenseService.getExpenseById(id);
    if (!existingExpense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Check if user is outlet user and restrict to their outlet
    if (req.user?.type === 'outlet' && req.user?.outlet && req.user.outlet !== existingExpense.outlet) {
      return res.status(403).json({
        error: 'Access denied: You can only update expenses for your own outlet'
      });
    }

    // Validation
    if (quantity !== undefined && quantity <= 0) {
      return res.status(400).json({
        error: 'Quantity must be greater than 0'
      });
    }

    if (actualPrice !== undefined && actualPrice <= 0) {
      return res.status(400).json({
        error: 'Actual price must be greater than 0'
      });
    }

    const updateData: any = {};
    if (itemId !== undefined) updateData.itemId = itemId;
    if (date !== undefined) updateData.date = new Date(date);
    if (quantity !== undefined) updateData.quantity = parseFloat(quantity);
    if (actualPrice !== undefined) updateData.actualPrice = parseFloat(actualPrice);
    if (notes !== undefined) updateData.notes = notes;
    if (req.body.isCash !== undefined) updateData.isCash = req.body.isCash;

    // Recalculate total price if quantity or actualPrice changed
    if (quantity !== undefined || actualPrice !== undefined) {
      const finalQuantity = quantity !== undefined ? parseFloat(quantity) : existingExpense.quantity;
      const finalPrice = actualPrice !== undefined ? parseFloat(actualPrice) : existingExpense.actualPrice;
      updateData.totalPrice = finalQuantity * finalPrice;
    }

    const expense = await expenseService.updateExpense(id, updateData);
    res.json(expense);
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// Delete expense
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get existing expense to check permissions
    const existingExpense = await expenseService.getExpenseById(id);
    if (!existingExpense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Check if user is outlet user and restrict to their outlet
    if (req.user?.type === 'outlet' && req.user?.outlet && req.user.outlet !== existingExpense.outlet) {
      return res.status(403).json({
        error: 'Access denied: You can only delete expenses for your own outlet'
      });
    }

    await expenseService.deleteExpense(id);
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// Approve expense (admin only)
router.put('/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user?.username) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const expense = await expenseService.approveExpense(id, req.user.username);
    res.json(expense);
  } catch (error) {
    console.error('Error approving expense:', error);
    res.status(500).json({ error: 'Failed to approve expense' });
  }
});

// Reject expense (admin only)
router.put('/:id/reject', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    if (!req.user?.username) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const expense = await expenseService.rejectExpense(id, req.user.username, rejectionReason);
    res.json(expense);
  } catch (error) {
    console.error('Error rejecting expense:', error);
    res.status(500).json({ error: 'Failed to reject expense' });
  }
});

// Get expense categories (admin only)
router.get('/categories/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const categories = await expenseService.getAllCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Delete expense category (admin only)
router.delete('/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await expenseService.deleteCategory(id);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Get expense items with filters
router.get('/items/all', authenticateToken, async (req, res) => {
  try {
    const { categoryId } = req.query;
    
    // For outlet users, restrict to their outlet
    let outletList: string[] = [];
    if (req.user?.type === 'outlet' && req.user?.outlet) {
      outletList = [req.user.outlet];
    }
    
    const items = await expenseService.getAllItems();
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Get expense summary
router.get('/summary/:outlet', authenticateToken, async (req, res) => {
  try {
    const { outlet } = req.params;
    const { startDate, endDate } = req.query;
    
    // For outlet users, restrict to their outlet
    let outletList: string[] = [];
    if (req.user?.type === 'outlet' && req.user?.outlet) {
      outletList = [req.user.outlet];
    }
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const summary = await expenseService.getExpenseSummary(
      outlet,
      new Date(startDate as string),
      new Date(endDate as string)
    );
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching expense summary:', error);
    res.status(500).json({ error: 'Failed to fetch expense summary' });
  }
});

// Get weekly report
router.get('/reports/weekly', authenticateToken, async (req, res) => {
  try {
    const { weekStart, outlets } = req.query;
    
    if (!weekStart) {
      return res.status(400).json({ error: 'Week start date is required' });
    }

    // For outlet users, restrict to their outlet
    let outletList: string[] = [];
    if (req.user?.type === 'outlet' && req.user?.outlet) {
      outletList = [req.user.outlet];
    } else if (outlets) {
      outletList = Array.isArray(outlets) ? outlets.map(o => o as string) : [outlets as string];
    }

    const report = await expenseService.getWeeklyReport(outletList, new Date(weekStart as string));
    res.json(report);
  } catch (error) {
    console.error('Error fetching weekly report:', error);
    res.status(500).json({ error: 'Failed to fetch weekly report' });
  }
});

// Get monthly report
router.get('/reports/monthly', authenticateToken, async (req, res) => {
  try {
    const { month, year, outlets } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    // For outlet users, restrict to their outlet
    let outletList: string[] = [];
    if (req.user?.type === 'outlet' && req.user?.outlet) {
      outletList = [req.user.outlet];
    } else if (outlets) {
      outletList = Array.isArray(outlets) ? outlets.map(o => o as string) : [outlets as string];
    }

    const report = await expenseService.getMonthlyReport(
      outletList,
      parseInt(month as string),
      parseInt(year as string)
    );
    res.json(report);
  } catch (error) {
    console.error('Error fetching monthly report:', error);
    res.status(500).json({ error: 'Failed to fetch monthly report' });
  }
});

export default router;
