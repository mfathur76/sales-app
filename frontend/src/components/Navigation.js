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

  return (
    <nav className="navigation">
      <div className="nav-tabs">
        {pages.map(page => (
          <button
            key={page.id}
            className={`nav-tab ${activePage === page.id ? 'active' : ''}`}
            onClick={() => handleClick(page.id)}
            type="button"
          >
            <div className="nav-icon">{page.icon}</div>
            <div className="nav-label">{page.label}</div>
          </button>
        ))}
        
        {/* Logout button */}
        <button
          className="nav-tab logout-tab"
          onClick={onLogout}
          type="button"
        >
          <div className="nav-icon">🚪</div>
          <div className="nav-label">Logout</div>
        </button>
      </div>
    </nav>
  );
};

export default Navigation; 