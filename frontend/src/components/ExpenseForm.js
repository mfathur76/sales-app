import React, { useState, useEffect, useRef } from 'react';
import { expenseApi } from '../api/expenseApi';
import './ExpenseForm.css';

const ExpenseForm = ({ onExpenseAdded }) => {
  const [formData, setFormData] = useState({
    outlet: '',
    itemId: '',
    date: new Date().toISOString().split('T')[0],
    quantity: '',
    actualPrice: '',
    notes: '',
    isCash: true
  });

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Search functionality
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      const [itemsData, categoriesData] = await Promise.all([
        expenseApi.getItems(),
        expenseApi.getCategories()
      ]);
      setItems(itemsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Failed to load data' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    // Validate that an item is selected
    if (!formData.itemId) {
      setMessage({ type: 'error', text: 'Please select an item' });
      setLoading(false);
      return;
    }

    try {
      // Get user's outlet from localStorage
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const outlet = userData.outlet || '';

      if (!outlet) {
        setMessage({ type: 'error', text: 'Outlet information not found' });
        setLoading(false);
        return;
      }

      const expenseData = {
        ...formData,
        outlet,
        quantity: parseFloat(formData.quantity),
        actualPrice: parseFloat(formData.actualPrice),
        totalPrice: parseFloat(formData.quantity) * parseFloat(formData.actualPrice),
        isCash: !!formData.isCash
      };

      await expenseApi.createExpense(expenseData);
      
      setMessage({ type: 'success', text: 'Expense created successfully!' });
      setFormData({
        outlet: '',
        itemId: '',
        date: new Date().toISOString().split('T')[0],
        quantity: '',
        actualPrice: '',
        notes: '',
        isCash: true
      });
      
      // Clear search term
      setSearchTerm('');

      if (onExpenseAdded) {
        onExpenseAdded();
      }
    } catch (error) {
      console.error('Error creating expense:', error);
  const categoryMap = categories.reduce((acc, category) => {
    acc[category.id] = category;
    return acc;
  }, {});
      setMessage({ type: 'error', text: error.message || 'Failed to create expense' });
    } finally {
      setLoading(false);
    }
  };
        (categoryMap[item.categoryId]?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getSelectedItem = () => {
    return items.find(item => item.id === formData.itemId);
  };

  const selectedItem = getSelectedItem();

  // Filter items based on search term
  const filteredItems = searchTerm 
    ? items.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.categoryRef?.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : items;

  // Handle search input change
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setShowDropdown(true);
    if (!value) {
      setFormData(prev => ({ ...prev, itemId: '' }));
    }
  };

  // Handle input focus to show all items
  const handleInputFocus = () => {
    setShowDropdown(true);
  };

  // Handle item selection
  const handleItemSelect = (item) => {
    setFormData(prev => ({ ...prev, itemId: item.id }));
    setSearchTerm(item.name);
    setShowDropdown(false);
  };

  // Handle clear selection
  const handleClearSelection = () => {
    setFormData(prev => ({ ...prev, itemId: '' }));
    setSearchTerm('');
    setShowDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="expense-form">
      <h2>Add New Expense</h2>
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group" ref={dropdownRef}>
          <label htmlFor="itemSearch">Item *</label>
          <div className="search-container">
            <input
              type="text"
              id="itemSearch"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={handleInputFocus}
              placeholder={formData.itemId ? "Item selected" : "Type to search items..."}
              className={`search-input ${formData.itemId ? 'item-selected' : ''}`}
            />
            {formData.itemId && (
              <button
                type="button"
                onClick={handleClearSelection}
                title="Clear selection"
              >
                ×
              </button>
            )}
            {showDropdown && (
              <div className="search-dropdown">
                {filteredItems.length > 0 ? (
                  filteredItems.map(item => (
                    <div
                      key={item.id}
                      className="dropdown-item"
                      onClick={() => handleItemSelect(item)}
                    >
                      <div className="item-name">{item.name}</div>
                      <span className="category">{item.categoryRef?.name}</span>
                      <span className="unit">({item.unit})</span>
                    </div>
                  ))
                ) : searchTerm ? (
                  <div className="no-results">No items found</div>
                ) : (
                  <div className="no-results">All items</div>
                )}
              </div>
            )}
          </div>
        </div>

        {selectedItem && (
          <div className="item-info">
            <p><strong>Category:</strong> {selectedItem.categoryRef?.name}</p>
            <p><strong>Standard Price:</strong> Rp {selectedItem.standardPrice?.toLocaleString() || 'Not set'}</p>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="date">Date *</label>
          <input
            type="date"
            id="date"
            value={formData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="quantity">Quantity *</label>
            <input
              type="number"
              id="quantity"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', e.target.value)}
              min="0.01"
              step="0.01"
              placeholder="0.00"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="actualPrice">Actual Price (Rp) *</label>
            <input
              type="number"
              id="actualPrice"
              value={formData.actualPrice}
              onChange={(e) => handleInputChange('actualPrice', e.target.value)}
              min="0"
              placeholder="0"
              required
            />
          </div>
        </div>

        {formData.quantity && formData.actualPrice && (
          <div className="total-price">
            <strong>Total Price: Rp {(parseFloat(formData.quantity) * parseFloat(formData.actualPrice)).toLocaleString()}</strong>
          </div>
        )}

        <div className="form-group">
          <label>Bayar Cash?</label>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <label>
              <input
                type="radio"
                name="isCash"
                checked={!!formData.isCash}
                onChange={() => handleInputChange('isCash', true)}
              />{' '}
              Yes
            </label>
            <label>
              <input
                type="radio"
                name="isCash"
                checked={!formData.isCash}
                onChange={() => handleInputChange('isCash', false)}
              />{' '}
              No (Non-Cash)
            </label>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Additional notes (optional)"
            rows="3"
          />
        </div>

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Creating...' : 'Create Expense'}
        </button>
      </form>
    </div>
  );
};

export default ExpenseForm;
