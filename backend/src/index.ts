import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { salesRouter } from './routes/sales';
import authRoutes from './routes/auth';
import { AuthService } from './services/authService';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
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
app.listen(PORT, async () => {
  await initializeApp();
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
  console.log(`💰 Sales endpoints: http://localhost:${PORT}/api/sales`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
}); 