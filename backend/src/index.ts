import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { salesRouter } from './routes/sales';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import expenseRoutes from './routes/expenses';
import outletRoutes from './routes/outlets';
import { AuthService } from './services/authService';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Initialize database and outlets
async function initializeApp() {
  try {
    // Initialize outlet data
    await AuthService.initializeOutlets();
    console.log('✅ Outlets initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing app:', error);
  }
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sales', salesRouter);
app.use('/api/admin', adminRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/outlets', outletRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Sales API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start server
app.listen(Number(PORT), '0.0.0.0', async () => {
  await initializeApp();
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/api/health`);
  console.log(`🔐 Auth endpoints: http://0.0.0.0:${PORT}/api/auth`);
  console.log(`💰 Sales endpoints: http://0.0.0.0:${PORT}/api/sales`);
  console.log(`💸 Expense endpoints: http://0.0.0.0:${PORT}/api/expenses`);
  console.log(`🌐 Accessible from: http://192.168.1.22:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
}); 