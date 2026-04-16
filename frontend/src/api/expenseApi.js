import { authApi, API_BASE_URL } from './salesApi';

class ExpenseApi {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async getAuthHeaders() {
    const token = authApi.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  async request(path, options = {}) {
    const response = await fetch(`${this.baseURL}${path}`, {
      ...options,
      headers: await this.getAuthHeaders()
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message = payload?.error || payload?.message || `HTTP error! status: ${response.status}`;
      throw new Error(message);
    }

    if (payload && typeof payload === 'object' && 'data' in payload) {
      return payload.data;
    }

    return payload;
  }

  // Get all expense categories
  async getCategories() {
    try {
      return await this.request('/expenses/categories', { method: 'GET' });
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  // Get all item masters
  async getItems() {
    try {
      return await this.request('/expenses/items', { method: 'GET' });
    } catch (error) {
      console.error('Error fetching items:', error);
      throw error;
    }
  }

  // Create new expense category
  async createCategory(name, description) {
    try {
      return await this.request('/expenses/categories', {
        method: 'POST',
        body: JSON.stringify({ name, description })
      });
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  // Create new item master
  async createItem(itemData) {
    try {
      return await this.request('/expenses/items', {
        method: 'POST',
        body: JSON.stringify(itemData)
      });
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  }

  // Update item master
  async updateItem(id, itemData) {
    try {
      return await this.request(`/expenses/items/${id}`, {
        method: 'PUT',
        body: JSON.stringify(itemData)
      });
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }

  // Delete item master
  async deleteItem(id) {
    try {
      return await this.request(`/expenses/items/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }

  // Update expense category
  async updateCategory(id, updateData) {
    try {
      return await this.request(`/expenses/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  // Delete expense category
  async deleteCategory(id) {
    try {
      return await this.request(`/expenses/categories/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  // Get all expenses with filters
  async getExpenses(filters = {}) {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params.append(key, filters[key]);
        }
      });

      const path = `/expenses${params.toString() ? `?${params.toString()}` : ''}`;
      return await this.request(path, { method: 'GET' });
    } catch (error) {
      console.error('Error fetching expenses:', error);
      throw error;
    }
  }

  // Get all expenses with advanced filtering (for verification)
  async getAllExpenses(outlet, categoryId, startDate, endDate, status) {
    try {
      const params = new URLSearchParams();
      if (outlet) params.append('outlet', outlet);
      if (categoryId) params.append('categoryId', categoryId);
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());
      if (status) params.append('status', status);

      const path = `/expenses${params.toString() ? `?${params.toString()}` : ''}`;
      return await this.request(path, { method: 'GET' });
    } catch (error) {
      console.error('Error fetching expenses:', error);
      throw error;
    }
  }

  // Get expense by ID
  async getExpenseById(id) {
    try {
      return await this.request(`/expenses/${id}`, { method: 'GET' });
    } catch (error) {
      console.error('Error fetching expense:', error);
      throw error;
    }
  }

  // Create new expense
  async createExpense(expenseData) {
    try {
      return await this.request('/expenses', {
        method: 'POST',
        body: JSON.stringify(expenseData)
      });
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  }

  // Update expense
  async updateExpense(id, updateData) {
    try {
      return await this.request(`/expenses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  }

  // Delete expense
  async deleteExpense(id) {
    try {
      return await this.request(`/expenses/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }

  // Get weekly expense report
  async getWeeklyReport(outlets, weekStart, status) {
    try {
      const params = new URLSearchParams({
        outlets: Array.isArray(outlets) ? outlets.join(',') : outlets,
        weekStart: weekStart instanceof Date ? weekStart.toISOString() : weekStart
      });
      
      // Only add status parameter if provided
      if (status) {
        params.append('status', status);
      }

      return await this.request(`/expenses/reports/weekly?${params}`, { method: 'GET' });
    } catch (error) {
      console.error('Error fetching weekly report:', error);
      throw error;
    }
  }

  // Get monthly expense report
  async getMonthlyReport(outlets, month, year, status) {
    try {
      const params = new URLSearchParams({
        outlets: Array.isArray(outlets) ? outlets.join(',') : outlets,
        month: month.toString(),
        year: year.toString()
      });
      
      // Only add status parameter if provided
      if (status) {
        params.append('status', status);
      }

      return await this.request(`/expenses/reports/monthly?${params}`, { method: 'GET' });
    } catch (error) {
      console.error('Error fetching monthly report:', error);
      throw error;
    }
  }

  // Get expense summary by date range
  async getExpenseSummary(outlet, startDate, endDate) {
    try {
      const params = new URLSearchParams({
        outlet,
        startDate,
        endDate
      });

      return await this.request(`/expenses/reports/summary?${params}`, { method: 'GET' });
    } catch (error) {
      console.error('Error fetching expense summary:', error);
      throw error;
    }
  }
}

export const expenseApi = new ExpenseApi();
