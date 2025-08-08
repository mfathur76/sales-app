const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
let authToken = '';

// Login to get token
async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    authToken = response.data.token;
    console.log('✅ Login successful');
    return authToken;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

// Get expense categories
async function getCategories() {
  try {
    const response = await axios.get(`${BASE_URL}/expenses/categories`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Categories:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get categories:', error.response?.data || error.message);
  }
}

// Create new expense
async function createExpense(expenseData) {
  try {
    const response = await axios.post(`${BASE_URL}/expenses`, expenseData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Expense created:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to create expense:', error.response?.data || error.message);
  }
}

// Get all expenses
async function getExpenses() {
  try {
    const response = await axios.get(`${BASE_URL}/expenses`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Expenses:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get expenses:', error.response?.data || error.message);
  }
}

// Get weekly report
async function getWeeklyReport(outlet, weekStart) {
  try {
    const response = await axios.get(`${BASE_URL}/expenses/reports/weekly`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { outlet, weekStart }
    });
    console.log('✅ Weekly report:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get weekly report:', error.response?.data || error.message);
  }
}

// Get monthly report
async function getMonthlyReport(outlet, month, year) {
  try {
    const response = await axios.get(`${BASE_URL}/expenses/reports/monthly`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { outlet, month, year }
    });
    console.log('✅ Monthly report:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get monthly report:', error.response?.data || error.message);
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Expense API Tests...\n');

  // Login
  await login();

  // Get categories
  console.log('\n📋 Getting expense categories...');
  const categories = await getCategories();
  const belanjaPasarCategory = categories.find(cat => cat.name === 'Belanja Pasar');

  if (!belanjaPasarCategory) {
    console.error('❌ Belanja Pasar category not found');
    return;
  }

  // Create sample expenses for August 7, 2025
  console.log('\n💰 Creating sample expenses...');
  
  const expenses = [
    {
      outlet: 'OUTLET001',
      categoryId: belanjaPasarCategory.id,
      date: '2025-08-07',
      description: 'Wortel',
      quantity: 35,
      unitPrice: 4000,
      notes: 'Belanja pasar pagi'
    },
    {
      outlet: 'OUTLET001',
      categoryId: belanjaPasarCategory.id,
      date: '2025-08-07',
      description: 'Cabe Ceplus',
      quantity: 6,
      unitPrice: 27000,
      notes: 'Belanja pasar pagi'
    },
    {
      outlet: 'OUTLET001',
      categoryId: belanjaPasarCategory.id,
      date: '2025-08-07',
      description: 'Bawang Merah',
      quantity: 1,
      unitPrice: 52000,
      notes: 'Belanja pasar pagi'
    },
    {
      outlet: 'OUTLET001',
      categoryId: belanjaPasarCategory.id,
      date: '2025-08-07',
      description: 'Kentang',
      quantity: 35,
      unitPrice: 14000,
      notes: 'Belanja pasar pagi'
    },
    {
      outlet: 'OUTLET001',
      categoryId: belanjaPasarCategory.id,
      date: '2025-08-07',
      description: 'Jagung Manis',
      quantity: 8,
      unitPrice: 4375,
      notes: 'Belanja pasar pagi'
    }
  ];

  for (const expense of expenses) {
    await createExpense(expense);
  }

  // Get all expenses
  console.log('\n📊 Getting all expenses...');
  await getExpenses();

  // Get weekly report
  console.log('\n📈 Getting weekly report...');
  await getWeeklyReport('OUTLET001', '2025-08-04');

  // Get monthly report
  console.log('\n📊 Getting monthly report...');
  await getMonthlyReport('OUTLET001', 8, 2025);

  console.log('\n🎉 All tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  login,
  getCategories,
  createExpense,
  getExpenses,
  getWeeklyReport,
  getMonthlyReport
};
