import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import auditRoutes from './routes/audit.js';
import reportRoutes from './routes/report.js';
import leadsRoutes from './routes/leads.js';
import { initDatabase } from '../database/db.js';

dotenv.config();

// Initialize database on startup
initDatabase().catch(console.error);

const app = express();
const PORT = process.env.PORT || 4001;

// CORS configuration - поддерживает несколько origins
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:4000', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Разрешаем запросы без origin (например, Postman, curl)
    if (!origin) return callback(null, true);
    
    // Проверяем, есть ли origin в списке разрешенных
    if (allowedOrigins.includes(origin) || allowedOrigins.some(allowed => origin?.includes(allowed))) {
      callback(null, true);
    } else {
      // Для разработки разрешаем все vercel.app и localhost
      if (origin.includes('vercel.app') || origin.includes('localhost')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Увеличиваем лимит размера тела запроса для загрузки изображений (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/audit', auditRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/leads', leadsRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

