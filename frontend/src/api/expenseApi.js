import { authApi } from './salesApi';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class ExpenseApi {
  constructor() {
    this.baseURL = BASE_URL;
  }

  async getAuthHeaders() {
    const token = authApi.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Get all expense categories
  async getCategories() {
    try {
      const response = await fetch(`${this.baseURL}/expenses/categories`, {
        method: 'GET',
        headers: await this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  // Get all item masters
  async getItems() {
    try {
      const response = await fetch(`${this.baseURL}/expenses/items`, {
        method: 'GET',
        headers: await this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching items:', error);
      throw error;
    }
  }

  // Create new expense category
  async createCategory(name, description) {
    try {
      const response = await fetch(`${this.baseURL}/expenses/categories`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ name, description })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  // Create new item master
  async createItem(itemData) {
    try {
      const response = await fetch(`${this.baseURL}/expenses/items`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(itemData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  }

  // Update item master
  async updateItem(id, itemData) {
    try {
      const response = await fetch(`${this.baseURL}/expenses/items/${id}`, {
        method: 'PUT',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(itemData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }

  // Delete item master
  async deleteItem(id) {
    try {
      const response = await fetch(`${this.baseURL}/expenses/items/${id}`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }

  // Update expense category
  async updateCategory(id, updateData) {
    try {
      const response = await fetch(`${this.baseURL}/expenses/categories/${id}`, {
        method: 'PUT',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  // Delete expense category
  async deleteCategory(id) {
    try {
      const response = await fetch(`${this.baseURL}/expenses/categories/${id}`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
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

      const url = `${this.baseURL}/expenses${params.toString() ? `?${params.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: await this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
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

      const url = `${this.baseURL}/expenses${params.toString() ? `?${params.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: await this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching expenses:', error);
      throw error;
    }
  }

  // Get expense by ID
  async getExpenseById(id) {
    try {
      const response = await fetch(`${this.baseURL}/expenses/${id}`, {
        method: 'GET',
        headers: await this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching expense:', error);
      throw error;
    }
  }

  // Create new expense
  async createExpense(expenseData) {
    try {
      const response = await fetch(`${this.baseURL}/expenses`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(expenseData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  }

  // Update expense
  async updateExpense(id, updateData) {
    try {
      const response = await fetch(`${this.baseURL}/expenses/${id}`, {
        method: 'PUT',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  }

  // Delete expense
  async deleteExpense(id) {
    try {
      const response = await fetch(`${this.baseURL}/expenses/${id}`, {
        method: 'DELETE',
        headers: await this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }

  // Approve expense
  async approveExpense(id, approvedBy) {
    try {
      const response = await fetch(`${this.baseURL}/expenses/${id}/approve`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ approvedBy })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error approving expense:', error);
      throw error;
    }
  }

  // Reject expense
  async rejectExpense(id, approvedBy, rejectionReason) {
    try {
      const response = await fetch(`${this.baseURL}/expenses/${id}/reject`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ approvedBy, rejectionReason })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error rejecting expense:', error);
      throw error;
    }
  }

  // Get weekly expense report
  async getWeeklyReport(outlets, weekStart) {
    try {
      const params = new URLSearchParams({
        outlets: Array.isArray(outlets) ? outlets.join(',') : outlets,
        weekStart
      });

      const response = await fetch(`${this.baseURL}/expenses/reports/weekly?${params}`, {
        method: 'GET',
        headers: await this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching weekly report:', error);
      throw error;
    }
  }

  // Get monthly expense report
  async getMonthlyReport(outlets, month, year) {
    try {
      const params = new URLSearchParams({
        outlets: Array.isArray(outlets) ? outlets.join(',') : outlets,
        month: month.toString(),
        year: year.toString()
      });

      const response = await fetch(`${this.baseURL}/expenses/reports/monthly?${params}`, {
        method: 'GET',
        headers: await this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
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

      const response = await fetch(`${this.baseURL}/expenses/reports/summary?${params}`, {
        method: 'GET',
        headers: await this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching expense summary:', error);
      throw error;
    }
  }
}

export const expenseApi = new ExpenseApi();
