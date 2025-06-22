import React, { useState } from 'react';
import { adminApi } from '../api/salesApi';
import './AdminLogin.css';

const AdminLogin = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      setError('Username dan password harus diisi');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await adminApi.login(formData.username, formData.password);
      
      if (response.success) {
        onLogin(response.data);
      } else {
        setError(response.error || 'Login gagal');
      }
    } catch (err) {
      console.error('Admin login error:', err);
      setError('Terjadi kesalahan saat login');
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = () => {
    console.log('🖱️ Login button clicked');
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <div className="admin-logo">
            <span className="admin-logo-icon">👨‍💼</span>
            <div className="admin-logo-text">
              <h1>Admin Panel</h1>
              <p>Sales Management System</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          {error && (
            <div className="admin-error-message">
              ❌ {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Masukkan username"
              disabled={loading}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Masukkan password"
              disabled={loading}
              className="form-input"
            />
          </div>

          <button 
            type="submit" 
            className="admin-login-btn"
            disabled={loading}
            onClick={handleButtonClick}
          >
            {loading ? '⏳ Logging in...' : '🔐 Login Admin'}
          </button>
        </form>

        <div className="admin-login-footer">
          <p>Default credentials:</p>
          <p><strong>Username:</strong> admin</p>
          <p><strong>Password:</strong> admin123</p>
          <p className="warning">⚠️ Ganti password setelah login pertama!</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin; 