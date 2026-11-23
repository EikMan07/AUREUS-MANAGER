import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { pool } from './config/db.js';

// Rutas de la API
import authRoutes from './routes/authRoutes.js';
import clientesRoutes from './routes/clientesRoutes.js';
import haciendaRoutes from './routes/haciendaRoutes.js';
import cobrosRoutes from './routes/cobrosRoutes.js';
import ocrRoutes from './routes/ocrRoutes.js';
import prestamosRoutes from './routes/prestamosRoutes.js';
import resumenRoutes from './routes/resumenRoutes.js';
import listaNegraRoutes from './routes/listaNegraRoutes.js';
import papeleraRoutes from './routes/papeleraRoutes.js';
import notificacionesRoutes from './routes/notificacionesRoutes.js';
import compartirCobrosRoutes from './routes/compartirCobrosRoutes.js';
import senecaRoutes from './routes/senecaRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import crmRoutes from './routes/crm.routes.js';
import crmAdminRoutes from './routes/crmAdmin.routes.js';

// Middlewares
import { errorHandler } from './middlewares/errorHandler.js';
import {
  getAllowedOrigins,
  getAllowedOriginsList,
  verificarOrigen,
} from './middlewares/csrf.js';
import { apiGlobalRateLimiter } from './middlewares/rateLimiters.js';

dotenv.config();

const app = express();
const allowedOriginsList = getAllowedOriginsList();

// Endurecimiento HTTP base y cabeceras de seguridad
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://lh3.googleusercontent.com',
          'https://avatars.githubusercontent.com',
        ],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", ...allowedOriginsList],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts:
      process.env.NODE_ENV === 'production'
        ? { maxAge: 31536000, includeSubDomains: true, preload: false }
        : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      const normalizedOrigin = String(origin).trim().replace(/\/+$/, '');
      if (getAllowedOrigins().has(normalizedOrigin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['X-CSRF-Token'],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use('/api', apiGlobalRateLimiter);
app.use('/api', verificarOrigen);

// Middleware de registro de peticiones (logging)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Montaje de rutas
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/hacienda', haciendaRoutes);
app.use('/api/cobros', cobrosRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/prestamos', prestamosRoutes);
app.use('/api/resumen', resumenRoutes);
app.use('/api/lista-negra', listaNegraRoutes);
app.use('/api/papelera', papeleraRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/compartir', compartirCobrosRoutes);
app.use('/api/seneca', senecaRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/admin/crm', crmAdminRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint (sin exponer detalles internos ni versiones)
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1;');
    return res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Health] Error al comprobar disponibilidad:', err?.message || err);
    return res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Manejador 404 (Ruta no encontrada)
app.use((_req, res) => {
  res.status(404).json({
    ok: false,
    status: 404,
    error: 'Recurso no encontrado',
    userMessage: 'La dirección o el registro solicitado no existe.',
  });
});

// Middleware global de manejo de errores
app.use(errorHandler);

export default app;
