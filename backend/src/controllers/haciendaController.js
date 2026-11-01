import { fetchHaciendaByCedula, parseOfficialFullName } from '../services/haciendaService.js';

// Re-export para compatibilidad con cualquier import existente
export { parseOfficialFullName };

export async function lookupHacienda(req, res) {
  try {
    const { cedula } = req.params;
    const cleanCedula = (cedula || '').replace(/\D/g, '').slice(0, 9);

    if (cleanCedula.length !== 9) {
      return res.status(400).json({ error: 'La cédula debe contener exactamente 9 dígitos.' });
    }

    const result = await fetchHaciendaByCedula(cleanCedula, 4500);

    if (result.status === 'ok') {
      return res.json({
        cedula: cleanCedula,
        nombre: result.nombre,
        apellidos: result.apellidos,
        nombreCompleto: `${result.nombre} ${result.apellidos}`.trim()
      });
    }
    if (result.status === 'not_found') {
      return res.status(404).json({ error: 'Cédula no encontrada en el registro oficial.' });
    }
    if (result.status === 'timeout') {
      return res.status(504).json({ error: 'Tiempo de espera agotado al consultar Hacienda CR.' });
    }
    return res.status(502).json({ error: 'Error al consultar el registro de Hacienda CR.' });
  } catch (err) {
    console.error('Error en proxy Hacienda:', err);
    return res.status(500).json({ error: 'Error interno en la consulta de cédula.' });
  }
}
