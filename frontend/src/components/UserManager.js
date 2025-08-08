import React, { useState, useEffect } from 'react';
import { adminApi } from '../api/salesApi';
import './UserManager.css';

const UserManager = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    password: '',
    role: 'admin'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAllAdmins();
      if (response.success) {
        setUsers(response.data);
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to load users' });
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setMessage({ type: 'error', text: 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      username: '',
      name: '',
      password: '',
      role: 'admin'
    });
    setEditingUser(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (editingUser) {
        // Update user
        const updateData = { 
          name: formData.name,
          role: formData.role
        };
        
        const response = await adminApi.updateAdmin(editingUser.username, updateData);
        if (response.success) {
          setMessage({ type: 'success', text: 'User updated successfully!' });
          resetForm();
          loadUsers();
        } else {
          setMessage({ type: 'error', text: response.error || 'Failed to update user' });
        }
      } else {
        // Create new user
        const response = await adminApi.createAdmin(formData);
        if (response.success) {
          setMessage({ type: 'success', text: 'User created successfully!' });
          resetForm();
          loadUsers();
        } else {
          setMessage({ type: 'error', text: response.error || 'Failed to create user' });
        }
      }
    } catch (error) {
      console.error('Error saving user:', error);
      setMessage({ type: 'error', text: 'Failed to save user' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      name: user.name,
      password: '',
      role: user.role
    });
    setShowForm(true);
  };

  const handleDelete = async (username) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await adminApi.deleteAdmin(username);
      if (response.success) {
        setMessage({ type: 'success', text: 'User deleted successfully!' });
        loadUsers();
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to delete user' });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setMessage({ type: 'error', text: 'Failed to delete user' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  const getRoleBadge = (role) => {
    const roleColors = {
      'super_admin': '#e74c3c',
      'admin': '#3498db'
    };
    
    return (
      <span 
        className="role-badge"
        style={{ backgroundColor: roleColors[role] || '#95a5a6' }}
      >
        {role.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getStatusBadge = (isActive) => {
    return (
      <span className={`status-badge ${isActive ? 'active' : 'inactive'}`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  if (loading && users.length === 0) {
    return (
      <div className="user-manager">
        <div className="loading">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="user-manager">
      <div className="user-manager-header">
        <h2>User Management</h2>
        <p>Manage admin user accounts and permissions</p>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="user-manager-actions">
        <button 
          onClick={() => setShowForm(true)} 
          className="add-user-btn"
          disabled={loading}
        >
          ➕ Add New User
        </button>
      </div>

      {showForm && (
        <div className="user-form-section">
          <h3>{editingUser ? 'Edit User' : 'Add New User'}</h3>
          <form onSubmit={handleSubmit} className="user-form">
            <div className="form-group">
              <label htmlFor="username">Username *</label>
              <input
                type="text"
                id="username"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="e.g., admin2"
                required
                disabled={editingUser !== null}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., John Doe"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                {editingUser ? 'New Password (leave empty to keep current)' : 'Password *'}
              </label>
              <input
                type="password"
                id="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder={editingUser ? 'Enter new password' : 'Enter password'}
                required={!editingUser}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="role">Role *</label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                required
                className="form-input"
              >
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
              </button>
              <button 
                type="button" 
                onClick={resetForm} 
                className="cancel-btn"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="users-list">
        <h3>User List</h3>
        {users.length === 0 ? (
          <div className="no-users">
            <p>No users found.</p>
          </div>
        ) : (
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.username}>
                    <td>{user.username}</td>
                    <td>{user.name}</td>
                    <td>{getRoleBadge(user.role)}</td>
                    <td>{getStatusBadge(user.isActive)}</td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          onClick={() => handleEdit(user)}
                          className="edit-btn"
                          disabled={loading}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(user.username)}
                          className="delete-btn"
                          disabled={loading}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManager;
