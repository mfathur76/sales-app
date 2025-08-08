import React, { useState } from 'react';
import { adminApi, outletApi } from '../api/salesApi';
import './ChangePassword.css';

const ChangePassword = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    // Validation
    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'New password and confirm password do not match' });
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters long' });
      setLoading(false);
      return;
    }

    try {
      // Get user data from localStorage
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');

      let response;

      if (adminData.isAuthenticated) {
        // Admin user
        response = await adminApi.changePassword(formData.oldPassword, formData.newPassword);
      } else if (userData.isAuthenticated) {
        // Outlet user
        response = await outletApi.changePassword(userData.outlet, formData.oldPassword, formData.newPassword);
      } else {
        setMessage({ type: 'error', text: 'User not authenticated' });
        setLoading(false);
        return;
      }

      if (response.success) {
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        resetForm();
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to change password' });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage({ type: 'error', text: 'Failed to change password' });
    } finally {
      setLoading(false);
    }
  };

  // Get current user info
  const getUserInfo = () => {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');

    if (adminData.isAuthenticated) {
      return {
        type: 'Admin',
        name: adminData.name,
        username: adminData.username
      };
    } else if (userData.isAuthenticated) {
      return {
        type: 'Outlet',
        name: userData.name,
        username: userData.outlet
      };
    }
    return null;
  };

  const userInfo = getUserInfo();

  if (!userInfo) {
    return (
      <div className="change-password">
        <div className="error-message">
          User not authenticated. Please login again.
        </div>
      </div>
    );
  }

  return (
    <div className="change-password">
      <div className="change-password-header">
        <h2>Change Password</h2>
        <p>Update your account password</p>
      </div>

      <div className="user-info">
        <div className="info-item">
          <span className="label">User Type:</span>
          <span className="value">{userInfo.type}</span>
        </div>
        <div className="info-item">
          <span className="label">Name:</span>
          <span className="value">{userInfo.name}</span>
        </div>
        <div className="info-item">
          <span className="label">Username/Code:</span>
          <span className="value">{userInfo.username}</span>
        </div>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="password-form-section">
        <form onSubmit={handleSubmit} className="password-form">
          <div className="form-group">
            <label htmlFor="oldPassword">Current Password *</label>
            <input
              type="password"
              id="oldPassword"
              value={formData.oldPassword}
              onChange={(e) => handleInputChange('oldPassword', e.target.value)}
              placeholder="Enter your current password"
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">New Password *</label>
            <input
              type="password"
              id="newPassword"
              value={formData.newPassword}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              placeholder="Enter new password (min 6 characters)"
              required
              className="form-input"
            />
            <small className="form-help">
              Password must be at least 6 characters long
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password *</label>
            <input
              type="password"
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              placeholder="Confirm your new password"
              required
              className="form-input"
            />
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Changing Password...' : 'Change Password'}
            </button>
            <button 
              type="button" 
              onClick={resetForm} 
              className="reset-btn"
              disabled={loading}
            >
              Reset Form
            </button>
          </div>
        </form>
      </div>

      <div className="password-tips">
        <h3>Password Security Tips</h3>
        <ul>
          <li>Use at least 6 characters</li>
          <li>Include a mix of letters, numbers, and symbols</li>
          <li>Avoid using personal information</li>
          <li>Don't reuse passwords from other accounts</li>
          <li>Change your password regularly</li>
        </ul>
      </div>
    </div>
  );
};

export default ChangePassword;
