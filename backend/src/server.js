import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './config/db.js';
import { ensureBaseUser } from './services/seedService.js';
import clientesRoutes from './routes/clientesRoutes.js';
import haciendaRoutes from './routes/haciendaRoutes.js';
import cobrosRoutes from './routes/cobrosRoutes.js';
import ocrRoutes from './routes/ocrRoutes.js';
import prestamosRoutes from './routes/prestamosRoutes.js';
import { initOcrWorker, terminateOcrWorker } from './services/ocrService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Rutas de API
app.use('/api/clientes', clientesRoutes);
app.use('/api/hacienda', haciendaRoutes);
app.use('/api/cobros', cobrosRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/prestamos', prestamosRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT now() AS server_time, current_setting(\'timezone\') AS timezone;');
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

// Inicialización del servidor
async function startServer() {
  try {
    console.log('[Servidor] Verificando conexión a PostgreSQL cobro_firme_db...');
    const client = await pool.connect();
    const tzRes = await client.query("SHOW timezone;");
    console.log(`[Servidor] Conexión establecida con éxito. Zona horaria activa: ${tzRes.rows[0].TimeZone}`);
    client.release();

    // Semilla técnica base
    await ensureBaseUser();

    app.listen(PORT, () => {
      console.log(`[Servidor] Cobro-Firme Backend activo y escuchando en http://localhost:${PORT}`);
    });

    // Worker OCR persistente: se precarga en segundo plano para que la primera foto ya lo encuentre listo
    initOcrWorker().catch(() => {
      console.warn('[OCR] Se reintentará la carga del worker en la primera petición.');
    });
  } catch (err) {
    console.error('[Servidor] Error crítico al inicializar el servidor o conectar a la base de datos:', err);
    process.exit(1);
  }
}

startServer();

// Liberar el worker OCR al detener el proceso
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await terminateOcrWorker();
    process.exit(0);
  });
}
