import dotenv from 'dotenv';
import app from './app.js';
import { pool } from './config/db.js';
import { ensureBaseUser } from './services/seedService.js';
import { initOcrWorker, terminateOcrWorker } from './services/ocrService.js';

dotenv.config();

const PORT = process.env.PUERTO || process.env.PORT || 5000;

async function startServer() {
  try {
    console.log('[Servidor] Verificando conexión a PostgreSQL cobro_firme_db...');
    const client = await pool.connect();
    const tzRes = await client.query("SHOW timezone;");
    console.log(`[Servidor] Conexión establecida con éxito. Zona horaria activa: ${tzRes.rows[0].TimeZone}`);
    client.release();

    // Semilla técnica base
    await ensureBaseUser();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Servidor] Cobro-Firme Backend activo y escuchando en http://localhost:${PORT} y http://127.0.0.1:${PORT}`);
    });

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

// Liberar el worker OCR al detener el proceso
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await terminateOcrWorker();
    process.exit(0);
  });
}
