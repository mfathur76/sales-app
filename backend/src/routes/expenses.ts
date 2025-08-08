import express from 'express';
import { ExpenseService } from '../services/expenseService';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const expenseService = new ExpenseService();

// Middleware to check if user is admin
const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Access denied. Admin role required.' });
  }
  next();
};

// Get all expense categories
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await expenseService.getAllCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get all item masters
router.get('/items', authenticateToken, async (req, res) => {
  try {
    const items = await expenseService.getAllItems();
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Create new item master
router.post('/items', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, categoryId, standardPrice, unit } = req.body;
    
    if (!name || !categoryId) {
      return res.status(400).json({ error: 'Item name and category are required' });
    }

    const item = await expenseService.createItem({
      name,
      categoryId,
      standardPrice,
      unit
    });
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Update item master
router.put('/items/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, categoryId, standardPrice, unit } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const item = await expenseService.updateItem(id, {
      name,
      categoryId,
      standardPrice,
      unit
    });
    res.json(item);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete item master
router.delete('/items/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const item = await expenseService.deleteItem(id);
    res.json({ message: 'Item deleted successfully', item });
  } catch (error) {
    console.error('Error deleting item:', error);
    if (error instanceof Error && error.message.includes('Cannot delete item')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete item' });
    }
  }
});

// Create new expense category
router.post('/categories', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const category = await expenseService.createCategory(name, description);
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update expense category
router.put('/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const category = await expenseService.updateCategory(id, name, description);
    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete expense category
router.delete('/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const category = await expenseService.deleteCategory(id);
    res.json({ message: 'Category deleted successfully', category });
  } catch (error) {
    console.error('Error deleting category:', error);
    if (error instanceof Error && error.message.includes('Cannot delete category')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete category' });
    }
  }
});

// Get all expenses with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { outlet, categoryId, startDate, endDate, status } = req.query;
    
    // For outlet users, force their outlet
    let filteredOutlet = outlet as string;
    if (req.user.type === 'outlet') {
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
    if (req.user.type === 'outlet' && req.user.outlet !== expense.outlet) {
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
    if (req.user.type === 'outlet' && req.user.outlet !== outlet) {
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
      createdBy: req.user.type === 'admin' ? req.user.username : null,
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
    const updateData = req.body;

    // Get the expense to check ownership
    const existingExpense = await expenseService.getExpenseById(id);
    if (!existingExpense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Check if user is outlet user and restrict to their outlet
    if (req.user.type === 'outlet' && req.user.outlet !== existingExpense.outlet) {
      return res.status(403).json({
        error: 'Access denied: You can only update expenses for your own outlet'
      });
    }

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.createdBy;
    delete updateData.status;
    delete updateData.approvedBy;
    delete updateData.approvedAt;
    delete updateData.rejectionReason;

    // Convert date if provided
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }

    // Convert numeric fields
    if (updateData.quantity !== undefined) {
      updateData.quantity = parseFloat(updateData.quantity);
    }
    if (updateData.actualPrice !== undefined) {
      updateData.actualPrice = parseFloat(updateData.actualPrice);
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
    
    // Get the expense to check ownership
    const existingExpense = await expenseService.getExpenseById(id);
    if (!existingExpense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Check if user is outlet user and restrict to their outlet
    if (req.user.type === 'outlet' && req.user.outlet !== existingExpense.outlet) {
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

// Approve expense
router.post('/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await expenseService.approveExpense(id, req.user.username);
    res.json(expense);
  } catch (error) {
    console.error('Error approving expense:', error);
    res.status(500).json({ error: 'Failed to approve expense' });
  }
});

// Reject expense
router.post('/:id/reject', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const expense = await expenseService.rejectExpense(id, req.user.username, rejectionReason);
    res.json(expense);
  } catch (error) {
    console.error('Error rejecting expense:', error);
    res.status(500).json({ error: 'Failed to reject expense' });
  }
});

// Get weekly expense report
router.get('/reports/weekly', authenticateToken, async (req, res) => {
  try {
    const { outlets, weekStart } = req.query;

    if (!outlets || !weekStart) {
      return res.status(400).json({
        error: 'Outlets and weekStart are required'
      });
    }

    // Parse outlets - can be single outlet or comma-separated list
    let outletList: string[];
    if (typeof outlets === 'string') {
      outletList = outlets.split(',').map(o => o.trim());
    } else if (Array.isArray(outlets)) {
      outletList = outlets as string[];
    } else {
      return res.status(400).json({
        error: 'Invalid outlets format'
      });
    }

    // For outlet users, restrict to their outlet only
    if (req.user.type === 'outlet') {
      outletList = [req.user.outlet];
    }

    const report = await expenseService.getWeeklyReport(
      outletList,
      new Date(weekStart as string)
    );

    res.json(report);
  } catch (error) {
    console.error('Error generating weekly report:', error);
    res.status(500).json({ error: 'Failed to generate weekly report' });
  }
});

// Get monthly expense report
router.get('/reports/monthly', authenticateToken, async (req, res) => {
  try {
    const { outlets, month, year } = req.query;

    if (!outlets || !month || !year) {
      return res.status(400).json({
        error: 'Outlets, month, and year are required'
      });
    }

    // Parse outlets - can be single outlet or comma-separated list
    let outletList: string[];
    if (typeof outlets === 'string') {
      outletList = outlets.split(',').map(o => o.trim());
    } else if (Array.isArray(outlets)) {
      outletList = outlets as string[];
    } else {
      return res.status(400).json({
        error: 'Invalid outlets format'
      });
    }

    // For outlet users, restrict to their outlet only
    if (req.user.type === 'outlet') {
      outletList = [req.user.outlet];
    }

    const report = await expenseService.getMonthlyReport(
      outletList,
      parseInt(month as string),
      parseInt(year as string)
    );

    res.json(report);
  } catch (error) {
    console.error('Error generating monthly report:', error);
    res.status(500).json({ error: 'Failed to generate monthly report' });
  }
});

// Get expense summary by date range
router.get('/reports/summary', authenticateToken, async (req, res) => {
  try {
    const { outlet, startDate, endDate } = req.query;

    if (!outlet || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Outlet, startDate, and endDate are required'
      });
    }

    const summary = await expenseService.getExpenseSummary(
      outlet as string,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json(summary);
  } catch (error) {
    console.error('Error generating expense summary:', error);
    res.status(500).json({ error: 'Failed to generate expense summary' });
  }
});

export default router;
