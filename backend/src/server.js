import dotenv from 'dotenv';
import cron from 'node-cron';
import app from './app.js';
import { pool } from './config/db.js';
import {
  ensureBaseUser,
  aplicarRetencionBitacora
} from './services/seedService.js';
import {
  ensureHistorialArchivoSchema,
  purgeExpiredPapeleraGlobal
} from './utils/papeleraHelpers.js';
import { ensureRagSchema } from './db/ragSchema.js';
import { inicializarEmpresasRagUsuariosExistentes } from './middlewares/ragLimites.js';
import {
  iniciarCronSincronizacionDrive,
  detenerCronSincronizacionDrive
} from './jobs/sincronizar-drive.js';
import { initOcrWorker, terminateOcrWorker } from './services/ocrService.js';

dotenv.config();

const PORT = process.env.PUERTO || process.env.PORT || 5000;
let dailyMaintenanceTask = null;

async function startServer() {
  try {
    console.log('[Servidor] Verificando conexión a PostgreSQL cobro_firme_db...');
    const client = await pool.connect();
    const tzRes = await client.query("SHOW timezone;");
    console.log(`[Servidor] Conexión establecida con éxito. Zona horaria activa: ${tzRes.rows[0].TimeZone}`);
    client.release();

    // Semilla técnica base y verificación idempotente de esquemas al arranque
    await ensureBaseUser();
    await ensureHistorialArchivoSchema();
    await purgeExpiredPapeleraGlobal();
    await ensureRagSchema();
    await inicializarEmpresasRagUsuariosExistentes();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Servidor] Cobro-Firme Backend activo y escuchando en http://localhost:${PORT} y http://127.0.0.1:${PORT}`);
    });

    // Sincronización periódica cada hora de carpetas de Google Drive vinculadas
    iniciarCronSincronizacionDrive();

    // Tarea diaria de mantenimiento (03:00 America/Costa_Rica): retención de bitácora y purga de papelera > 30 días
    dailyMaintenanceTask = cron.schedule(
      '0 3 * * *',
      async () => {
        try {
          await aplicarRetencionBitacora();
          await purgeExpiredPapeleraGlobal();
        } catch (err) {
          console.error('[Mantenimiento Diario] Error ejecutando tarea programada:', err?.message || err);
        }
      },
      { timezone: 'America/Costa_Rica' }
    );

    // Worker OCR persistente: se precarga en segundo plano
    initOcrWorker().catch(() => {
      console.warn('[OCR] Se reintentará la carga del worker en la primera petición.');
    });
  } catch (err) {
    console.error('[Servidor] Error crítico al inicializar el servidor o conectar a la base de datos:', err);
    process.exit(1);
  }
}

startServer();

process.on('unhandledRejection', (reason) => {
  console.error('[Servidor] Promesa no manejada:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Servidor] Excepción no capturada:', err);
});

// Liberar cron jobs y worker OCR al detener el proceso
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    detenerCronSincronizacionDrive();
    if (dailyMaintenanceTask) {
      dailyMaintenanceTask.stop();
      dailyMaintenanceTask = null;
    }
    await terminateOcrWorker();
    process.exit(0);
  });
}
