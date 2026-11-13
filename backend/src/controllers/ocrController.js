import { scanCedulaBuffer } from '../services/ocrService.js';
import { fetchHaciendaByCedula } from '../services/haciendaService.js';

/**
 * POST /api/ocr/cedula  (multipart/form-data, campo "imagen")
 * 200 -> { cedula, nombre, apellidos, fuente: 'hacienda' | 'ocr' }
 * 422 -> no se detectó una cédula en la imagen
 */
export async function scanCedula(req, res) {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ error: 'No se recibió ninguna imagen.' });
  }

  try {
    const started = Date.now();
    const card = await scanCedulaBuffer(req.file.buffer);

    if (!card) {
      return res.status(422).json({
        error: 'No se detectó un número de cédula en la foto.'
      });
    }

    // Hacienda primero; si falla la red, respaldo con los campos impresos leídos por OCR
    const hacienda = await fetchHaciendaByCedula(card.cleanCedula, 4500);
    const fromHacienda = hacienda.status === 'ok';

    console.log(`[OCR] Cédula ${card.cleanCedula} vía ${card.intento}, nombre desde ${fromHacienda ? 'Hacienda' : 'OCR'} (total ${Date.now() - started}ms)`);

    return res.json({
      cedula: card.cleanCedula,
      nombre: fromHacienda ? hacienda.nombre : card.nombre,
      apellidos: fromHacienda ? hacienda.apellidos : card.apellidos,
      fuente: fromHacienda ? 'hacienda' : 'ocr',
      haciendaInfo: fromHacienda ? {
        status: 'ok',
        esMoroso: hacienda.esMoroso,
        omiso: hacienda.omiso,
        estadoHacienda: hacienda.estadoHacienda,
        nombreOficial: hacienda.nombreOficial
      } : {
        status: hacienda.status === 'not_found' ? 'not_found' : 'error',
        esMoroso: false,
        omiso: false,
        estadoHacienda: '',
        nombreOficial: ''
      }
    });
  } catch (err) {
    console.error('[OCR] Error procesando imagen:', err);
    return res.status(500).json({ error: 'Error interno al procesar la imagen.' });
  }
}
