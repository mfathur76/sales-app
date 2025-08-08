#!/bin/bash

echo "🔧 Fixing Table Scrolling Issue..."

# Set variables
SERVER_IP="your-server-ip"
SSH_KEY="DOSSHKEY"
FRONTEND_DIR="/var/www/sales-app/frontend"

# Create fixed CSS content
cat > frontend/src/components/AdminReport_scroll_fix.css << 'EOF'
.admin-report {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
}

.report-header h1 {
  color: #333;
  margin: 0;
  font-size: 28px;
}

.header-actions {
  display: flex;
  gap: 15px;
  align-items: center;
}

.export-btn {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.export-btn:hover:not(:disabled) {
  background-color: #218838;
}

.export-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.logout-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.logout-btn:hover {
  background-color: #c82333;
}

/* Filters Section */
.filters-section {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
  border: 1px solid #e0e0e0;
}

.filters-section h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 18px;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.filter-item {
  display: flex;
  flex-direction: column;
}

.filter-item label {
  margin-bottom: 5px;
  font-weight: 500;
  color: #555;
}

.filter-item input,
.filter-item select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.filter-item input:focus,
.filter-item select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.refresh-btn {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.refresh-btn:hover:not(:disabled) {
  background-color: #0056b3;
}

.refresh-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

/* Error and Success Messages */
.error-message,
.success-message {
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-message {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.success-message {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.error-message button,
.success-message button {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-weight: bold;
  padding: 5px 10px;
  border-radius: 3px;
}

.error-message button:hover {
  background-color: #f1b0b7;
}

.success-message button:hover {
  background-color: #c3e6cb;
}

/* Loading */
.loading {
  text-align: center;
  padding: 40px;
  font-size: 18px;
  color: #666;
}

/* Report Content */
.report-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.report-summary {
  padding: 20px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.report-summary h2 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 20px;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: white;
  border-radius: 5px;
  border: 1px solid #e0e0e0;
}

.stat-label {
  font-weight: 500;
  color: #555;
}

.stat-value {
  font-weight: bold;
  color: #333;
}

.no-data {
  text-align: center;
  padding: 40px;
  color: #666;
  font-style: italic;
}

/* Table Container - FIXED SCROLLING */
.table-container {
  overflow-x: auto;
  overflow-y: auto;
  max-width: 100%;
  max-height: 60vh;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  position: relative;
}

.report-table {
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.report-table th,
.report-table td {
  padding: 6px 4px;
  text-align: center;
  border: 1px solid #e0e0e0;
  vertical-align: middle;
  min-width: 100px;
}

.report-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #333;
  position: sticky;
  top: 0;
  z-index: 10;
  white-space: nowrap;
  min-width: 100px;
}

.report-table th[rowspan="2"] {
  background-color: #e9ecef;
  font-weight: 700;
}

.report-table th[colspan="2"] {
  background-color: #dee2e6;
  font-weight: 600;
}

.report-table tr:hover {
  background-color: #f8f9fa;
}

.amount-cell {
  font-weight: 500;
  min-width: 100px;
  font-size: 10px;
}

.total-staff {
  background-color: #e3f2fd;
  font-weight: 600;
}

.total-admin {
  background-color: #f3e5f5;
  font-weight: 600;
}

.breakdown {
  margin-top: 5px;
  font-size: 12px;
  color: #666;
}

.breakdown small {
  display: block;
  margin: 2px 0;
}

.difference-cell {
  font-weight: bold;
  text-align: center;
}

.difference-over {
  color: #28a745;
  background-color: #d4edda;
}

.difference-under {
  color: #dc3545;
  background-color: #f8d7da;
}

.difference-match {
  color: #6c757d;
  background-color: #e2e3e5;
}

.percentage-cell {
  text-align: center;
  font-weight: 500;
}

.status-cell {
  text-align: center;
  font-weight: bold;
  text-transform: uppercase;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
}

.status-cell.difference-over {
  background-color: #d4edda;
  color: #155724;
}

.status-cell.difference-under {
  background-color: #f8d7da;
  color: #721c24;
}

.status-cell.difference-match {
  background-color: #e2e3e5;
  color: #6c757d;
}

/* Responsive Design */
@media (max-width: 768px) {
  .admin-report {
    padding: 10px;
  }

  .report-header {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }

  .report-header h1 {
    font-size: 24px;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .filters-grid {
    grid-template-columns: 1fr;
  }

  .summary-stats {
    grid-template-columns: 1fr;
  }

  .report-table {
    font-size: 12px;
  }

  .report-table th,
  .report-table td {
    padding: 8px 6px;
  }

  .amount-cell {
    min-width: 120px;
  }

  .breakdown {
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .report-table {
    font-size: 11px;
  }

  .report-table th,
  .report-table td {
    padding: 6px 4px;
  }

  .amount-cell {
    min-width: 100px;
  }

  .breakdown {
    font-size: 10px;
  }
}
EOF

# Upload the fixed CSS file
echo "📤 Uploading fixed CSS file..."
scp -i $SSH_KEY frontend/src/components/AdminReport_scroll_fix.css root@$SERVER_IP:$FRONTEND_DIR/src/components/AdminReport.css

if [ $? -eq 0 ]; then
    echo "✅ CSS file uploaded successfully"
else
    echo "❌ Failed to upload CSS file"
    exit 1
fi

# SSH into server and restart frontend
echo "🔧 Restarting frontend..."
ssh -i $SSH_KEY root@$SERVER_IP << 'EOF'
    cd /var/www/sales-app/frontend
    
    # Build the frontend
    echo "🔨 Building frontend..."
    npm run build
    
    # Restart PM2 process
    echo "🔄 Restarting PM2 frontend process..."
    pm2 restart sales-frontend
    
    # Check status
    echo "📊 PM2 Status:"
    pm2 status
    
    echo "✅ Table scrolling fix deployed successfully!"
    echo "🔧 Changes made:"
    echo "   - Fixed horizontal scrolling with width: max-content"
    echo "   - Fixed vertical scrolling with max-height: 60vh"
    echo "   - Added min-width to table cells for better layout"
    echo "   - Improved sticky header positioning"
EOF

echo "🎉 Fix completed!" 