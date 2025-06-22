// Get the current hostname and use it for API calls
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  console.log('🔍 getApiBaseUrl - hostname:', hostname);
  console.log('🔍 getApiBaseUrl - protocol:', protocol);
  console.log('🔍 getApiBaseUrl - full location:', window.location.href);
  
  // Force cache refresh with timestamp
  const timestamp = Date.now();
  console.log('🔍 getApiBaseUrl - timestamp:', timestamp);
  
  // Check if we're in production (deployed on DO)
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    // Use the same hostname for API calls in production
    const apiUrl = `${protocol}//${hostname}/api`;
    console.log('🔍 getApiBaseUrl - Production API URL:', apiUrl);
    console.log('🔍 getApiBaseUrl - FORCING PRODUCTION URL');
    return apiUrl;
  }
  
  // Use localhost for development
  const apiUrl = 'http://localhost:3001/api';
  console.log('🔍 getApiBaseUrl - Development API URL:', apiUrl);
  return apiUrl;
};

// Force API URL for production with domain support
const forceApiBaseUrl = () => {
  const hostname = window.location.hostname;
  
  // Check for specific domains
  if (hostname === 'sales.risolmejik.com') {
    return 'https://sales.risolmejik.com/api';
  }
  if (hostname === '152.42.232.39') {
    return 'http://152.42.232.39/api';
  }
  
  return getApiBaseUrl();
};

const API_BASE_URL = forceApiBaseUrl();
console.log('🔍 API_BASE_URL set to:', API_BASE_URL);
console.log('🔍 Current time:', new Date().toISOString());
console.log('🔍 FORCED API URL:', API_BASE_URL);

// Helper function to log debug info persistently
const debugLog = (message, data = null) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    message,
    data
  };
  
  // Get existing logs
  const existingLogs = localStorage.getItem('debugLogs') || '[]';
  const logs = JSON.parse(existingLogs);
  
  // Add new log (keep only last 20 logs)
  logs.push(logEntry);
  if (logs.length > 20) {
    logs.shift();
  }
  
  // Save back to localStorage
  localStorage.setItem('debugLogs', JSON.stringify(logs));
  
  // Also log to console
  console.log(`🔍 ${message}`, data);
};

// Helper function to get auth token
const getAuthToken = () => {
  // Check for admin token first
  const adminData = localStorage.getItem('adminData');
  debugLog('getAuthToken - adminData from localStorage', adminData ? 'EXISTS' : 'NULL');
  
  if (adminData) {
    try {
      const admin = JSON.parse(adminData);
      debugLog('getAuthToken - parsed admin data', admin);
      if (admin.token) {
        debugLog('getAuthToken - returning admin token');
        return admin.token;
      }
    } catch (error) {
      debugLog('getAuthToken - error parsing admin data', error.message);
    }
  }
  
  // Check for user token
  const userData = localStorage.getItem('userData');
  debugLog('getAuthToken - userData from localStorage', userData ? 'EXISTS' : 'NULL');
  
  if (userData) {
    try {
      const user = JSON.parse(userData);
      debugLog('getAuthToken - parsed user data', user);
      if (user.token) {
        debugLog('getAuthToken - returning user token');
        return user.token;
      }
    } catch (error) {
      debugLog('getAuthToken - error parsing user data', error.message);
    }
  }
  
  debugLog('getAuthToken - no token found');
  return null;
};

// Helper function to make authenticated requests
const makeAuthenticatedRequest = async (url, options = {}) => {
  const token = getAuthToken();
  debugLog('makeAuthenticatedRequest - URL', url);
  debugLog('makeAuthenticatedRequest - Token', token ? 'EXISTS' : 'NULL');
  
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

  debugLog('makeAuthenticatedRequest - Headers', config.headers);
  const response = await fetch(url, config);
  debugLog('makeAuthenticatedRequest - Response status', response.status);
  
  if (!response.ok) {
    if (response.status === 401) {
      debugLog('401 Error - Token might be invalid');
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
    debugLog('login - Starting login process', { outlet, password: '***' });
    debugLog('login - API URL', `${API_BASE_URL}/auth/login`);
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ outlet, password }),
      });

      debugLog('login - Response status', response.status);
      debugLog('login - Response headers', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      debugLog('login - Response data', data);
      
      if (data.success && data.data) {
        // Store user data with token
        const userData = {
          outlet: data.data.outlet,
          name: data.data.name,
          token: data.data.token,
          isAuthenticated: true
        };
        localStorage.setItem('userData', JSON.stringify(userData));
        debugLog('login - User data stored', userData);
      }

      return data;
    } catch (error) {
      debugLog('login - Fetch error', error.message);
      throw error;
    }
  },

  // Get all outlets (for admin)
  getOutlets: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/outlets`);
    return response.json();
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
        // Store admin data with token
        const adminData = {
          username: data.data.username,
          name: data.data.name,
          role: data.data.role,
          token: data.data.token,
          type: 'admin',
          isAuthenticated: true
        };
        localStorage.setItem('adminData', JSON.stringify(adminData));
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

  // Admin Sales Management
  // Get all sales for admin (all outlets)
  getAllSales: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.outlet) params.append('outlet', filters.outlet);
    if (filters.status) params.append('status', filters.status);
    
    const url = `${API_BASE_URL}/admin/sales${params.toString() ? `?${params.toString()}` : ''}`;
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
    return makeAuthenticatedRequest(`${API_BASE_URL}/admin/sales/${outlet}/${date}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },

  // Get admin sales statistics
  getSalesStats: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.outlet) params.append('outlet', filters.outlet);
    
    const url = `${API_BASE_URL}/admin/stats${params.toString() ? `?${params.toString()}` : ''}`;
    return makeAuthenticatedRequest(url);
  },

  // Logout admin
  logout: () => {
    localStorage.removeItem('adminData');
  }
}; 