import React, { useState, useEffect } from 'react';
import { salesApi, authApi, adminApi } from './api/salesApi';
import Navigation from './components/Navigation';
import SalesList from './components/SalesList';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import AdminReport from './components/AdminReport';
import ExpenseManager from './components/ExpenseManager';
import ExpenseReport from './components/ExpenseReport';
import './App.css';

// Loading Skeleton Component
const LoadingSkeleton = () => (
  <div className="loading-skeleton">
    <div className="skeleton-header">
      <div className="skeleton-logo"></div>
      <div className="skeleton-text"></div>
    </div>
    <div className="skeleton-content">
      <div className="skeleton-card"></div>
      <div className="skeleton-card"></div>
      <div className="skeleton-card"></div>
    </div>
  </div>
);

// Logo Component
const Logo = () => (
  <div className="logo">
    <span className="logo-icon">💰</span>
    <div className="logo-text">
      <span className="logo-title">Sales App</span>
      <span className="logo-subtitle">Sales Tracker</span>
    </div>
  </div>
);

// Quick Input Form Component - Mobile Optimized
const QuickInputForm = ({ user }) => {
  const [sale, setSale] = useState({
    outlet: user?.outlet || '',
    date: new Date().toISOString().split('T')[0],
    cash: 0,
    qris: 0,
    gojek: 0,
    shopee: 0,
    grab: 0,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Add null check for user after hooks
  if (!user) {
    return (
      <div className="mobile-container">
        <div className="loading">Loading user data...</div>
      </div>
    );
  }

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (getTotalSales() === 0) {
      showMessage('error', 'Minimal ada satu metode pembayaran yang diisi!');
      return;
    }

    setLoading(true);
    
    try {
      let existingSale = null;
      
      try {
        const existingSaleResponse = await salesApi.getSaleByOutletAndDate(sale.outlet, sale.date);
        
        // Handle different response formats
        existingSale = existingSaleResponse.success && existingSaleResponse.data 
          ? existingSaleResponse.data 
          : existingSaleResponse;
      } catch (error) {
        // If 404 error, it means no existing sale found, which is fine
        if (error.message.includes('404') || error.message.includes('not found')) {
          existingSale = null;
        } else {
          throw error; // Re-throw other errors
        }
      }
      
      if (existingSale && Object.keys(existingSale).length > 0) {
        await salesApi.updateSale(sale.outlet, sale.date, sale);
        showMessage('success', 'Data berhasil diperbarui!');
      } else {
        await salesApi.createSale(sale);
        showMessage('success', 'Data berhasil disimpan!');
      }

      // Reset form
      setSale({
        outlet: user.outlet || '',
        date: new Date().toISOString().split('T')[0],
        cash: 0,
        qris: 0,
        gojek: 0,
        shopee: 0,
        grab: 0,
      });

    } catch (error) {
      console.error('Error saving sale:', error);
      showMessage('error', `Gagal menyimpan: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getTotalSales = () => {
    return sale.cash + sale.qris + sale.gojek + sale.shopee + sale.grab;
  };

  const handlePaymentChange = (method, value) => {
    setSale(prev => ({ ...prev, [method]: parseFloat(value) || 0 }));
  };

  const getDisplayValue = (method) => {
    const value = sale[method];
    return value === 0 ? '' : value.toString();
  };

  const getDisplayAmount = (method) => {
    const value = sale[method];
    return value === 0 ? 'Rp 0' : formatCurrency(value);
  };

  const handleInputFocus = (e) => {
    // Select all text when focusing on input
    e.target.select();
  };

  const handleInputBlur = (method, value) => {
    // Ensure the value is properly formatted when leaving the field
    const numValue = parseFloat(value) || 0;
    setSale(prev => ({ ...prev, [method]: numValue }));
  };

  const paymentMethods = [
    { key: 'cash', icon: '💵', label: 'Cash', color: '#10B981' },
    { key: 'qris', icon: '📱', label: 'QRIS', color: '#3B82F6' },
    { key: 'gojek', icon: '🟢', label: 'Gojek', color: '#10B981' },
    { key: 'shopee', icon: '🟠', label: 'Shopee', color: '#F59E0B' },
    { key: 'grab', icon: '🟢', label: 'Grab', color: '#10B981' },
  ];

  return (
    <div className="mobile-container">
      {/* Header */}
      <div className="mobile-header">
        <Logo />
        <div className="outlet-info">
          <span className="outlet-name">{user.outlet || 'Unknown Outlet'}</span>
          <span className="outlet-user">{user.name || 'Unknown User'}</span>
        </div>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`mobile-message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Date Selector */}
      <div className="date-selector">
        <label htmlFor="date">📅 Tanggal</label>
        <input 
          type="date" 
          id="date"
          value={sale.date}
          onChange={(e) => setSale({...sale, date: e.target.value})}
          className="date-input"
        />
      </div>

      {/* Simplified Payment Input */}
      <div className="payment-methods">
        <h3>💳 Input Pembayaran</h3>
        
        <div className="payment-inputs-grid">
          {paymentMethods.map((method) => (
            <div key={method.key} className="payment-input-item">
              <div className="payment-input-header">
                <span className="payment-icon">{method.icon}</span>
                <span className="payment-label">{method.label}</span>
              </div>
              <div className="payment-input-wrapper">
                <span className="currency-symbol">Rp</span>
                                  <input
                    type="number"
                    value={getDisplayValue(method.key)}
                    onChange={(e) => handlePaymentChange(method.key, e.target.value)}
                    placeholder="Masukkan jumlah"
                    className="payment-input-field"
                    disabled={loading}
                    onFocus={handleInputFocus}
                    onBlur={(e) => handleInputBlur(method.key, e.target.value)}
                  />
              </div>
              <div className="payment-amount-display">
                {getDisplayAmount(method.key)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="summary-section">
        <div className="summary-card">
          <h3>📊 Total</h3>
          <div className="total-summary">
            <span className="total-label">Total Penjualan</span>
            <span className="total-amount">{formatCurrency(getTotalSales())}</span>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button 
        onClick={handleSubmit} 
        className="mobile-submit-btn" 
        disabled={loading || getTotalSales() === 0}
      >
        {loading ? '⏳ Menyimpan...' : '💾 Simpan Data'}
      </button>
    </div>
  );
};

// Main App Component
function App() {
  const [activePage, setActivePage] = useState('input');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [userType, setUserType] = useState(null); // 'outlet' or 'admin'





  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        // Check for admin user first (higher priority)
        const adminData = localStorage.getItem('adminData');
        
        if (adminData) {
          try {
            const parsedAdmin = JSON.parse(adminData);
            
            if (parsedAdmin.isAuthenticated && parsedAdmin.token) {
              setAdmin(parsedAdmin);
              setUserType('admin');
              return; // Exit early if admin is authenticated
            } else {
              localStorage.removeItem('adminData');
            }
          } catch (error) {
            console.error('Error parsing admin data:', error);
            localStorage.removeItem('adminData');
          }
        }

        // Check for outlet user
        const userData = localStorage.getItem('userData');
        
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            
            if (parsedUser.isAuthenticated && parsedUser.token) {
              setUser(parsedUser);
              setUserType('outlet');
              return;
            } else {
              localStorage.removeItem('userData');
            }
          } catch (error) {
            console.error('Error parsing user data:', error);
            localStorage.removeItem('userData');
          }
        }
      } catch (error) {
        console.error('Critical error in useEffect:', error);
      }
    };

    // Only run once on mount
    checkAuth();
  }, []); // Empty dependency array to ensure it only runs once

  const handleLogin = (userData) => {
    setUser(userData);
    setUserType('outlet');
  };

  const handleAdminLogin = (adminData) => {
    if (adminData && adminData.isAuthenticated && adminData.token) {
      setAdmin(adminData);
      setUserType('admin');
    }
  };

  const handleLogout = () => {
    if (userType === 'admin') {
      adminApi.logout();
      setAdmin(null);
    } else {
      authApi.logout();
      setUser(null);
    }
    setUserType(null);
    setActivePage('input');
  };

  const handlePageChange = (page) => {
    setIsLoading(true);
    setActivePage(page);
    setTimeout(() => setIsLoading(false), 300);
  };

  const renderPage = () => {
    if (isLoading) {
      return <LoadingSkeleton />;
    }

    // Add null check for user in outlet pages
    if (userType === 'outlet' && !user) {
      return <div className="loading">Loading user data...</div>;
    }

    // Add null check for admin in admin pages
    if (userType === 'admin' && !admin) {
      return <div className="loading">Loading admin data...</div>;
    }

    switch (activePage) {
      case 'input':
        if (userType === 'admin') return <AdminDashboard admin={admin} />;
        return <QuickInputForm user={user} />;
      case 'list':
        if (userType === 'admin') return <AdminDashboard admin={admin} />;
        return <SalesList user={user} />;
      case 'expense':
        if (userType === 'admin') return <AdminDashboard admin={admin} />;
        return <ExpenseManager user={user} />;
      case 'dashboard':
        if (userType === 'admin') return <AdminDashboard admin={admin} />;
        return <Dashboard user={user} />;
      case 'report':
        if (userType === 'admin') return <AdminReport />;
        return <ExpenseReport user={user} />;
      default:
        if (userType === 'admin') return <AdminDashboard admin={admin} />;
        return <QuickInputForm user={user} />;
    }
  };

  // Show login if not authenticated
  if (!user && !admin) {
    return (
      <div className="login-selection">
        <div className="login-selection-container">
          <h1>Sales Management System</h1>
          <p>Pilih jenis login:</p>
          
          <div className="login-buttons">
            <button 
              onClick={() => setUserType('outlet')} 
              className="login-type-btn outlet-btn"
            >
              🏪 Outlet Staff
            </button>
            <button 
              onClick={() => setUserType('admin')} 
              className="login-type-btn admin-btn"
            >
              👨‍💼 Admin Panel
            </button>
          </div>
          
          {userType === 'outlet' && <Login onLogin={handleLogin} />}
          {userType === 'admin' && <AdminLogin onLogin={handleAdminLogin} />}
        </div>
      </div>
    );
  }

  // For admin users, show admin interface
  if (admin && userType === 'admin') {
    try {
      return (
        <div className="admin-app">
          <main className="admin-main">
            {renderPage()}
          </main>
          <Navigation 
            activePage={activePage} 
            onPageChange={handlePageChange} 
            userType={userType}
            onLogout={handleLogout}
          />
        </div>
      );
    } catch (error) {
      console.error('Error rendering admin interface:', error);
      
      // Don't logout automatically, just show error
      return (
        <div className="admin-app">
          <main className="admin-main">
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <h2>Error</h2>
              <p>Terjadi kesalahan saat memuat halaman admin.</p>
              <p>Error: {error.message}</p>
              <button onClick={() => window.location.reload()}>Refresh Halaman</button>
            </div>
          </main>
        </div>
      );
    }
  }

  return (
    <div className="mobile-app">
      {/* App Header with Logout */}
      <header className="mobile-app-header">
        <div className="header-content">
          <div className="header-info">
            <span className="header-outlet">🏪 {user?.outlet || 'Unknown Outlet'}</span>
            <span className="header-user">{user?.name || 'Unknown User'}</span>
          </div>
          <button onClick={handleLogout} className="header-logout-btn" title="Logout">
            🚪
          </button>
        </div>
      </header>
      
      <main className="mobile-main">
        {renderPage()}
      </main>
      <Navigation 
        activePage={activePage} 
        onPageChange={handlePageChange} 
        userType={userType}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default App; 