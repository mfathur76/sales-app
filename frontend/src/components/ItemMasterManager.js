import React, { useState, useEffect } from 'react';
import { expenseApi } from '../api/expenseApi';
import './ItemMasterManager.css';

const ItemMasterManager = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    standardPrice: '',
    unit: 'kg'
  });

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsData, categoriesData] = await Promise.all([
        expenseApi.getItems(),
        expenseApi.getCategories()
      ]);
      setItems(itemsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        name: formData.name,
        categoryId: formData.categoryId,
        standardPrice: formData.standardPrice ? parseFloat(formData.standardPrice) : null,
        unit: formData.unit
      };

      if (editingItem) {
        await expenseApi.updateItem(editingItem.id, submitData);
        showMessage('success', 'Item updated successfully!');
      } else {
        await expenseApi.createItem(submitData);
        showMessage('success', 'Item created successfully!');
      }

      handleCancel();
      loadData();
    } catch (error) {
      console.error('Error saving item:', error);
      showMessage('error', error.message || 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      categoryId: item.categoryId,
      standardPrice: item.standardPrice?.toString() || '',
      unit: item.unit
    });
    setShowForm(true);
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      await expenseApi.deleteItem(itemId);
      showMessage('success', 'Item deleted successfully!');
      loadData();
    } catch (error) {
      console.error('Error deleting item:', error);
      showMessage('error', error.message || 'Failed to delete item');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingItem(null);
    setFormData({
      name: '',
      categoryId: '',
      standardPrice: '',
      unit: 'kg'
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading && items.length === 0) {
    return (
      <div className="item-master-manager">
        <div className="loading">Loading items...</div>
      </div>
    );
  }

  return (
    <div className="item-master-manager">
      <div className="manager-header">
        <h2>Item Master Management</h2>
        <p>Manage items that can be used for expense recording</p>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="manager-actions">
        <button
          onClick={() => setShowForm(true)}
          className="add-btn"
          disabled={showForm}
        >
          ➕ Add New Item
        </button>
      </div>

      {showForm && (
        <div className="form-overlay">
          <div className="form-container">
            <h3>{editingItem ? 'Edit Item' : 'Add New Item'}</h3>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Item Name *</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Wortel, Kentang, Bawang Merah"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="categoryId">Category *</label>
                <select
                  id="categoryId"
                  value={formData.categoryId}
                  onChange={(e) => handleInputChange('categoryId', e.target.value)}
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="standardPrice">Standard Price (Rp)</label>
                  <input
                    type="number"
                    id="standardPrice"
                    value={formData.standardPrice}
                    onChange={(e) => handleInputChange('standardPrice', e.target.value)}
                    placeholder="0"
                    min="0"
                    step="100"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="unit">Unit</label>
                  <select
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => handleInputChange('unit', e.target.value)}
                  >
                    <option value="kg">kg</option>
                    <option value="pcs">pcs</option>
                    <option value="liter">liter</option>
                    <option value="gram">gram</option>
                    <option value="pack">pack</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" disabled={loading} className="save-btn">
                  {loading ? 'Saving...' : (editingItem ? 'Update Item' : 'Create Item')}
                </button>
                <button type="button" onClick={handleCancel} className="cancel-btn">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="items-grid">
        {items.length === 0 ? (
          <div className="no-items">
            <p>No items found. Create your first item!</p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="item-card">
              <div className="item-header">
                <h3>{item.name}</h3>
                <div className="item-actions">
                  <button
                    onClick={() => handleEdit(item)}
                    className="edit-btn"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="delete-btn"
                    title="Delete"
                    disabled={item.expenseCount > 0}
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              <div className="item-details">
                <div className="detail-row">
                  <span className="label">Category:</span>
                  <span className="value">{item.categoryRef?.name}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Unit:</span>
                  <span className="value">{item.unit}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Standard Price:</span>
                  <span className="value">
                    {item.standardPrice ? `Rp ${item.standardPrice.toLocaleString()}` : 'Not set'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Used in Expenses:</span>
                  <span className="value">{item.expenseCount} times</span>
                </div>
              </div>

              {item.expenseCount > 0 && (
                <div className="item-warning">
                  ⚠️ Cannot delete: Item is being used in {item.expenseCount} expense(s)
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {items.length > 0 && (
        <div className="items-summary">
          <h3>Summary</h3>
          <div className="summary-stats">
            <div className="stat">
              <span className="stat-label">Total Items:</span>
              <span className="stat-value">{items.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Categories:</span>
              <span className="stat-value">{categories.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemMasterManager;
