import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth';
import testRoutes from './routes/test';
import adminRoutes from './routes/admin';
import { initTelegramBot } from './bot/telegram';

const app = express();
const PORT = process.env.PORT || 3001;

// 1. Security Headers
app.use(helmet({
  contentSecurityPolicy: false, // Allows Telegram Web App embedded iframes
  crossOriginEmbedderPolicy: false,
}));

// 2. CORS configuration (supports local dev and deployed frontend)
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server) or matching origins
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive for educational placement test deployment
    }
  },
  credentials: true,
}));

// 3. Body Parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 4. Rate Limiting: 300 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please slow down.' },
});
app.use('/api/', globalLimiter);

// 5. Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'UNATION English Placement Test Backend',
    timestamp: new Date().toISOString(),
  });
});

// 6. Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/admin', adminRoutes);

// 7. 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.path}` });
});

// 8. Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Error]:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error. Please try again later.',
  });
});

// 9. Start Server
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 UNATION English Placement Server running on port ${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔑 Admin Login: http://localhost:${PORT}/api/auth/login`);
  console.log(`=================================================`);

  // Initialize background Telegram Bot polling if token is configured
  initTelegramBot();
});

export default app;
