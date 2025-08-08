import React, { useState, useEffect } from 'react';
import './SalesManager.css';

const SalesManager = ({ user }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simple loading effect
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

    // Error boundary for rendering
  try {
    return (
      <div className="sales-manager">
        <div className="sales-header">
          <h2>Manajemen Penjualan</h2>
          <p>Kelola data penjualan outlet</p>
        </div>

        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>Sales Manager Component Loaded Successfully!</p>
          <p>Admin: {user?.name || 'Unknown'}</p>
          <p>Role: {user?.role || 'Unknown'}</p>
          <p>Loading: {loading ? 'Yes' : 'No'}</p>
          <p>Status: Ready</p>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error rendering SalesManager:', error);
    return (
      <div className="sales-manager">
        <div className="sales-header">
          <h2>Manajemen Penjualan</h2>
          <p>Kelola data penjualan outlet</p>
        </div>
        <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
          <p>Error loading Sales Manager</p>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }
  };

export default SalesManager;
