const DEFAULT_AWS_API_BASE_URL = 'https://c28ub1rja2.execute-api.ap-southeast-3.amazonaws.com/prod/api';

const normalizeApiUrl = (url) => url.replace(/\/$/, '');

// Default to AWS API in production; localhost remains for local development.
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  const envApiBaseUrl = process.env.REACT_APP_API_BASE_URL;

  if (envApiBaseUrl) {
    return normalizeApiUrl(envApiBaseUrl);
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001/api';
  }

  return DEFAULT_AWS_API_BASE_URL;
};

export const API_BASE_URL = getApiBaseUrl();

// Helper function to get auth token
const getAuthToken = () => {
  // Check for admin token first
  const adminData = localStorage.getItem('adminData');
  
  if (adminData) {
    try {
      const admin = JSON.parse(adminData);
      if (admin.token) {
        return admin.token;
      }
    } catch (error) {
      console.error('Error parsing admin data:', error);
    }
  }
  
  // Check for user token
  const userData = localStorage.getItem('userData');
  
  if (userData) {
    try {
      const user = JSON.parse(userData);
      if (user.token) {
        return user.token;
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
  }
  
  return null;
};

// Helper function to make authenticated requests
const makeAuthenticatedRequest = async (url, options = {}) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    if (response.status === 401) {
      // Token expired or invalid, redirect to login
      localStorage.removeItem('userData');
      localStorage.removeItem('adminData');
      window.location.reload();
      throw new Error('Authentication failed');
    }
    
    // For 404 errors, return the error response as JSON
    if (response.status === 404) {
      const errorData = await response.json().catch(() => ({ error: 'Not found' }));
      throw new Error(`404: ${errorData.error || 'Resource not found'}`);
    }
    
    // Try to get error message from response
    try {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    } catch (parseError) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  return response.json();
};

// Auth API
export const authApi = {
  // Login outlet
  login: async (outlet, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ outlet, password }),
      });

      const data = await response.json();
      
      if (data.success && data.data) {
        // Store user data with token
        const userData = {
          outlet: data.data.outlet,
          name: data.data.name,
          token: data.data.token,
          isAuthenticated: true
        };
        localStorage.setItem('userData', JSON.stringify(userData));
      }

      return data;
    } catch (error) {
      throw error;
    }
  },

  // Get all outlets (for admin)
  getOutlets: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/outlets`);
    return response.json();
  },

  // Get auth token
  getToken: () => {
    return getAuthToken();
  },

  // Logout
  logout: () => {
    localStorage.removeItem('userData');
  }
};

// Sales API
export const salesApi = {
  // Get all sales (filtered by user's outlet) - alias for getAllSales
  getSales: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    
    const url = `${API_BASE_URL}/sales${params.toString() ? `?${params.toString()}` : ''}`;
    return makeAuthenticatedRequest(url);
  },

  // Get all sales (filtered by user's outlet)
  getAllSales: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    
    const url = `${API_BASE_URL}/sales${params.toString() ? `?${params.toString()}` : ''}`;
    return makeAuthenticatedRequest(url);
  },

  // Get sales statistics (filtered by user's outlet) - alias for getSalesStatistics
  getSalesStats: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    
    const url = `${API_BASE_URL}/sales/stats${params.toString() ? `?${params.toString()}` : ''}`;
    return makeAuthenticatedRequest(url);
  },

  // Get sales statistics (filtered by user's outlet)
  getSalesStatistics: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    
    const url = `${API_BASE_URL}/sales/stats${params.toString() ? `?${params.toString()}` : ''}`;
    return makeAuthenticatedRequest(url);
  },

  // Get sales statistics overview (filtered by user's outlet)
  getSalesStatisticsOverview: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    
    const url = `${API_BASE_URL}/sales/stats/overview${params.toString() ? `?${params.toString()}` : ''}`;
    return makeAuthenticatedRequest(url);
  },

  // Get available outlets (only user's outlet)
  getOutletOptions: async () => {
    return makeAuthenticatedRequest(`${API_BASE_URL}/sales/outlets`);
  },

  // Get sale by outlet and date
  getSaleByOutletAndDate: async (outlet, date) => {
    return makeAuthenticatedRequest(`${API_BASE_URL}/sales/${outlet}/${date}`);
  },

  // Create new sale
  createSale: async (saleData) => {
    return makeAuthenticatedRequest(`${API_BASE_URL}/sales`, {
      method: 'POST',
      body: JSON.stringify(saleData),
    });
  },

  // Update sale
  updateSale: async (outlet, date, updateData) => {
    return makeAuthenticatedRequest(`${API_BASE_URL}/sales/${outlet}/${date}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  },

  // Delete sale
  deleteSale: async (outlet, date) => {
    return makeAuthenticatedRequest(`${API_BASE_URL}/sales/${outlet}/${date}`, {
      method: 'DELETE',
    });
  },
};

// Admin API
export const adminApi = {
  // Login admin
  login: async (username, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Store admin data with token (backend already includes type and isAuthenticated)
        localStorage.setItem('adminData', JSON.stringify(data.data));
        
        // Return the admin data for immediate use
        return {
          success: true,
          data: data.data
        };
      } else {
        // If login failed, clear any existing admin data
        localStorage.removeItem('adminData');
      }

      return data;
    } catch (error) {
      console.error('Admin login error:', error);
      throw error;
    }
  },

  // Get admin profile
  getProfile: async () => {
    return makeAuthenticatedRequest(`${API_BASE_URL}/admin/profile`);
  },

  // Get all admins (super admin only)
  getAllAdmins: async () => {
    return makeAuthenticatedRequest(`${API_BASE_URL}/admin/list`);
  },

  // Create new admin (super admin only)
  createAdmin: async (adminData) => {
    return makeAuthenticatedRequest(`${API_BASE_URL}/admin/create`, {
      method: 'POST',
      body: JSON.stringify(adminData),
    });
  },

  // Update admin (super admin only)
  updateAdmin: async (username, adminData) => {
    return makeAuthenticatedRequest(`${API_BASE_URL}/admin/${username}`, {
      method: 'PUT',
      body: JSON.stringify(adminData),
    });
  },

  // Delete admin (super admin only)
  deleteAdmin: async (username) => {
    return makeAuthenticatedRequest(`${API_BASE_URL}/admin/${username}`, {
      method: 'DELETE',
    });
  },

  // Change admin password
  changePassword: async (oldPassword, newPassword) => {
    return makeAuthenticatedRequest(`${API_BASE_URL}/admin/change-password`, {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  },

  // Logout admin
  logout: () => {
    localStorage.removeItem('adminData');
  },

  // Get all sales for admin verification
  getAllSales: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    if (filters.start_date) queryParams.append('start_date', filters.start_date);
    if (filters.end_date) queryParams.append('end_date', filters.end_date);
    if (filters.outlet) queryParams.append('outlet', filters.outlet);
    if (filters.status) queryParams.append('status', filters.status);
    
    const url = `${API_BASE_URL}/admin/sales${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return makeAuthenticatedRequest(url);
  },

  // Update bank transfer amounts
  updateBankTransfer: async (outlet, date, bankData) => {
    return makeAuthenticatedRequest(`${API_BASE_URL}/admin/sales/${outlet}/${date}/bank-transfer`, {
      method: 'PUT',
      body: JSON.stringify(bankData),
    });
  },

  // Update sale status (approve/reject)
  updateSaleStatus: async (outlet, date, status, notes) => {
    const body = { status };
    if (notes) body.notes = notes;
    
    return makeAuthenticatedRequest(`${API_BASE_URL}/admin/sales/${outlet}/${date}/status`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }
};

// Outlet Management API
export const outletApi = {
  // Get all outlets (admin only)
  getAllOutlets: async () => {
    return makeAuthenticatedRequest(`${API_BASE_URL}/outlets`);
  },

  // Get outlet by code (admin only)
  getOutletByCode: async (code) => {
    return makeAuthenticatedRequest(`${API_BASE_URL}/outlets/${code}`);
  },

  // Create new outlet (admin only)
  createOutlet: async (outletData) => {
    return makeAuthenticatedRequest(`${API_BASE_URL}/outlets`, {
      method: 'POST',
      body: JSON.stringify(outletData),
    });
  },

  // Update outlet (admin only)
  updateOutlet: async (code, outletData) => {
    return makeAuthenticatedRequest(`${API_BASE_URL}/outlets/${code}`, {
      method: 'PUT',
      body: JSON.stringify(outletData),
    });
  },

  // Delete outlet (admin only)
  deleteOutlet: async (code) => {
    return makeAuthenticatedRequest(`${API_BASE_URL}/outlets/${code}`, {
      method: 'DELETE',
    });
  },

  // Change outlet password
  changePassword: async (code, oldPassword, newPassword) => {
    return makeAuthenticatedRequest(`${API_BASE_URL}/outlets/${code}/change-password`, {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  }
}; 