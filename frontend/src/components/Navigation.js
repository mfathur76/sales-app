import React from 'react';

const Navigation = ({ activePage, onPageChange, userType, onLogout }) => {
  // Different pages for admin vs outlet
  const outletPages = [
    { id: 'input', label: 'Input', icon: '📝' },
    { id: 'list', label: 'Data', icon: '📊' },
    { id: 'expense', label: 'Pengeluaran', icon: '💰' },
    { id: 'dashboard', label: 'Dashboard', icon: '📈' },
    { id: 'report', label: 'Laporan', icon: '📑' }
  ];

  const adminPages = [
    { id: 'sales', label: 'Penjualan', icon: '📊' },
    { id: 'outlets', label: 'Outlet', icon: '🏪' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'password', label: 'Password', icon: '🔐' }
  ];

  const pages = userType === 'admin' ? adminPages : outletPages;

  const handleClick = (pageId) => {
    onPageChange(pageId);
  };

  const navStyle = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'white',
    borderTop: '1px solid #e5e7eb',
    padding: '8px 16px 20px',
    zIndex: 100,
    boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.1)'
  };

  const tabsStyle = {
    display: 'flex',
    justifyContent: 'space-around',
    gap: '8px'
  };

  const tabStyle = (isActive) => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '12px 8px',
    borderRadius: '12px',
    color: isActive ? '#667eea' : '#6b7280',
    textDecoration: 'none',
    fontSize: '0.75rem',
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    background: isActive ? '#f3f4f6' : 'transparent',
    minHeight: '60px'
  });

  const iconStyle = {
    fontSize: '1.25rem'
  };

  const labelStyle = {
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: 1
  };

  return (
    <nav style={navStyle}>
      <div style={tabsStyle}>
        {pages.map(page => (
          <button
            key={page.id}
            style={tabStyle(activePage === page.id)}
            onClick={() => handleClick(page.id)}
            type="button"
          >
            <div style={iconStyle}>{page.icon}</div>
            <div style={labelStyle}>{page.label}</div>
          </button>
        ))}
        
        {/* Logout button */}
        <button
          style={{
            ...tabStyle(false),
            color: '#ef4444',
            background: '#fef2f2'
          }}
          onClick={onLogout}
          type="button"
        >
          <div style={iconStyle}>🚪</div>
          <div style={labelStyle}>Logout</div>
        </button>
      </div>
    </nav>
  );
};

export default Navigation; 