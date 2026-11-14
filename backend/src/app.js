import express from 'express';
import cors from 'cors';
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

// Middlewares
import { errorHandler } from './middlewares/errorHandler.js';
import { verificarOrigen } from './middlewares/csrf.js';

dotenv.config();

const app = express();

// Middlewares globales
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
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

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT now() AS server_time, current_setting('timezone') AS timezone;");
    return res.json({
      status: 'ok',
      service: 'Cobro-Firme Backend',
      database: 'cobro_firme_db',
      db_time: rows[0].server_time,
      timezone: rows[0].timezone
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// Manejador 404 (Ruta no encontrada)
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    status: 404,
    error: 'Recurso no encontrado',
    userMessage: 'La dirección o el registro solicitado no existe.'
  });
});

// Middleware global de manejo de errores
app.use(errorHandler);

export default app;

