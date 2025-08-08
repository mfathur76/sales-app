import React, { useState, useEffect } from 'react';
import { outletApi } from '../api/salesApi';
import './OutletManager.css';

const OutletManager = () => {
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    password: ''
  });

  useEffect(() => {
    loadOutlets();
  }, []);

  const loadOutlets = async () => {
    try {
      setLoading(true);
      const response = await outletApi.getAllOutlets();
      if (response.success) {
        setOutlets(response.data);
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to load outlets' });
      }
    } catch (error) {
      console.error('Error loading outlets:', error);
      setMessage({ type: 'error', text: 'Failed to load outlets' });
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
      code: '',
      name: '',
      password: ''
    });
    setEditingOutlet(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (editingOutlet) {
        // Update outlet
        const updateData = { name: formData.name };
        if (formData.password) {
          updateData.password = formData.password;
        }
        
        const response = await outletApi.updateOutlet(editingOutlet.code, updateData);
        if (response.success) {
          setMessage({ type: 'success', text: 'Outlet updated successfully!' });
          resetForm();
          loadOutlets();
        } else {
          setMessage({ type: 'error', text: response.error || 'Failed to update outlet' });
        }
      } else {
        // Create new outlet
        const response = await outletApi.createOutlet(formData);
        if (response.success) {
          setMessage({ type: 'success', text: 'Outlet created successfully!' });
          resetForm();
          loadOutlets();
        } else {
          setMessage({ type: 'error', text: response.error || 'Failed to create outlet' });
        }
      }
    } catch (error) {
      console.error('Error saving outlet:', error);
      setMessage({ type: 'error', text: 'Failed to save outlet' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (outlet) => {
    setEditingOutlet(outlet);
    setFormData({
      code: outlet.code,
      name: outlet.name,
      password: ''
    });
    setShowForm(true);
  };

  const handleDelete = async (code) => {
    if (!window.confirm('Are you sure you want to delete this outlet?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await outletApi.deleteOutlet(code);
      if (response.success) {
        setMessage({ type: 'success', text: 'Outlet deleted successfully!' });
        loadOutlets();
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to delete outlet' });
      }
    } catch (error) {
      console.error('Error deleting outlet:', error);
      setMessage({ type: 'error', text: 'Failed to delete outlet' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  if (loading && outlets.length === 0) {
    return (
      <div className="outlet-manager">
        <div className="loading">Loading outlets...</div>
      </div>
    );
  }

  return (
    <div className="outlet-manager">
      <div className="outlet-manager-header">
        <h2>Outlet Management</h2>
        <p>Manage outlet accounts and access</p>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="outlet-manager-actions">
        <button 
          onClick={() => setShowForm(true)} 
          className="add-outlet-btn"
          disabled={loading}
        >
          ➕ Add New Outlet
        </button>
      </div>

      {showForm && (
        <div className="outlet-form-section">
          <h3>{editingOutlet ? 'Edit Outlet' : 'Add New Outlet'}</h3>
          <form onSubmit={handleSubmit} className="outlet-form">
            <div className="form-group">
              <label htmlFor="code">Outlet Code *</label>
              <input
                type="text"
                id="code"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                placeholder="e.g., RM001"
                required
                disabled={editingOutlet !== null}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="name">Outlet Name *</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Risol Mejik Kelinci Raya"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                {editingOutlet ? 'New Password (leave empty to keep current)' : 'Password *'}
              </label>
              <input
                type="password"
                id="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder={editingOutlet ? 'Enter new password' : 'Enter password'}
                required={!editingOutlet}
                className="form-input"
              />
            </div>

            <div className="form-actions">
              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? 'Saving...' : (editingOutlet ? 'Update Outlet' : 'Create Outlet')}
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

      <div className="outlets-list">
        <h3>Outlet List</h3>
        {outlets.length === 0 ? (
          <div className="no-outlets">
            <p>No outlets found.</p>
          </div>
        ) : (
          <div className="outlets-table-container">
            <table className="outlets-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {outlets.map(outlet => (
                  <tr key={outlet.code}>
                    <td>{outlet.code}</td>
                    <td>{outlet.name}</td>
                    <td>{formatDate(outlet.createdAt)}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          onClick={() => handleEdit(outlet)}
                          className="edit-btn"
                          disabled={loading}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(outlet.code)}
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

export default OutletManager;
