import { query, debugPayload } from '../config/db.js';
import { getDefaultCobradorId } from '../services/seedService.js';

function cleanCedula9(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '').slice(0, 9);
  return digits.length === 9 ? digits : null;
}

/**
 * GET /api/papelera
 * Obtiene la lista de clientes en la papelera con días restantes y préstamos suspendidos
 */
export async function getPapelera(req, res) {
  try {
    const cobradorId = req.query.cobrador_id || req.user?.id || await getDefaultCobradorId();

    const sql = `
      SELECT 
        c.id,
        c.cobrador_id,
        c.cedula,
        c.nombre,
        c.apellidos,
        c.telefono,
        c.ubicacion,
        c.detalles,
        c.estado,
        c.fecha_envio_papelera,
        COALESCE(c.fecha_borrado_definitivo, c.fecha_envio_papelera + interval '30 days', now() + interval '30 days') AS fecha_borrado_definitivo,
        GREATEST(0, CEIL(EXTRACT(EPOCH FROM (COALESCE(c.fecha_borrado_definitivo, c.fecha_envio_papelera + interval '30 days', now() + interval '30 days') - now())) / 86400))::int AS dias_restantes,
        COUNT(p.id)::int AS prestamos_suspendidos_count,
        COALESCE(SUM(p.saldo_por_pagar), 0)::numeric AS saldo_total_pendiente
      FROM clientes c
      LEFT JOIN prestamos p ON p.cliente_id = c.id AND p.estado = 'SUSPENDIDO'::public.estado_prestamo
      WHERE c.estado = 'EN_PAPELERA'::public.estado_cliente
        AND c.cobrador_id = $1::uuid
      GROUP BY c.id
      ORDER BY c.fecha_borrado_definitivo ASC, c.creado_en DESC;
    `;

    const { rows } = await query(sql, [cobradorId]);
    return res.json(rows);
  } catch (err) {
    console.error('[Error SQL detallado]: Error al obtener clientes de la papelera:', err);
    return res.status(500).json({
      error: 'No se pudo obtener la información de la papelera en este momento.',
      userMessage: 'No se pudo obtener la información de la papelera en este momento.',
      ...debugPayload(err)
    });
  }
}

/**
 * POST /api/papelera/:id/restaurar
 * Restaura un cliente de la papelera a 'ACTIVO' y reactiva sus préstamos suspendidos
 */
export async function restaurarCliente(req, res) {
  try {
    const { id } = req.params;
    const cobradorId = req.body.cobrador_id || req.user?.id || await getDefaultCobradorId();

    const checkSql = `
      SELECT id, cedula, nombre, apellidos 
        FROM clientes 
       WHERE id = $1::uuid AND estado = 'EN_PAPELERA'::public.estado_cliente;
    `;
    const { rows: clientRows } = await query(checkSql, [id]);
    if (clientRows.length === 0) {
      return res.status(404).json({ error: 'El cliente no se encuentra en la papelera o ya fue restaurado.' });
    }

    const clienteTarget = clientRows[0];

    // 1. Restaurar cliente a estado ACTIVO y limpiar fechas de papelera
    const restoreSql = `
      UPDATE clientes
         SET estado = 'ACTIVO'::public.estado_cliente,
             fecha_envio_papelera = NULL,
             fecha_borrado_definitivo = NULL,
             actualizado_en = now(),
             version = COALESCE(version, 1) + 1
       WHERE id = $1::uuid
       RETURNING *;
    `;
    const { rows: restoredRows } = await query(restoreSql, [id]);
    const restoredCliente = restoredRows[0];

    // 2. Reactivar préstamos asociados suspendidos
    await query('SELECT reactivar_prestamos_cliente($1::uuid);', [id]);

    // 3. Registrar en bitácora de actividad
    const finalCedula = cleanCedula9(clienteTarget.cedula);
    const logSql = `
      INSERT INTO bitacora_actividad (
        usuario_id,
        cobrador_id,
        accion,
        entidad,
        entidad_id,
        cedula,
        detalle
      ) VALUES ($1::uuid, $2::uuid, 'CLIENTE_RESTAURADO'::public.accion_bitacora, 'clientes', $3::uuid, $4, $5);
    `;
    await query(logSql, [
      cobradorId,
      cobradorId,
      id,
      finalCedula,
      JSON.stringify({
        motivo: req.body.motivo || 'Restaurado desde la papelera por el cobrador',
        nombre_completo: `${clienteTarget.nombre || ''} ${clienteTarget.apellidos || ''}`.trim()
      })
    ]);

    return res.json({
      message: 'Cliente restaurado exitosamente',
      cliente: restoredCliente
    });
  } catch (err) {
    console.error('[Error SQL detallado]: Error al restaurar cliente de la papelera:', err);
    return res.status(500).json({
      error: 'No se pudo restaurar el cliente en este momento.',
      userMessage: 'No se pudo restaurar el cliente en este momento.',
      ...debugPayload(err)
    });
  }
}

/**
 * DELETE /api/papelera/:id
 * Elimina definitivamente un cliente individual archivando su historial
 */
export async function eliminarDefinitivo(req, res) {
  try {
    const { id } = req.params;
    const cobradorId = req.body?.cobrador_id || req.query?.cobrador_id || req.user?.id || await getDefaultCobradorId();

    const checkSql = `
      SELECT id, cedula, nombre, apellidos 
        FROM clientes 
       WHERE id = $1::uuid AND estado = 'EN_PAPELERA'::public.estado_cliente;
    `;
    const { rows: clientRows } = await query(checkSql, [id]);
    if (clientRows.length === 0) {
      return res.status(404).json({ error: 'El cliente no se encuentra en la papelera o ya fue eliminado.' });
    }

    const clienteTarget = clientRows[0];
    const finalCedula = cleanCedula9(clienteTarget.cedula);

    // 1. Registrar en bitácora antes del borrado en cascada
    const logSql = `
      INSERT INTO bitacora_actividad (
        usuario_id,
        cobrador_id,
        accion,
        entidad,
        entidad_id,
        cedula,
        detalle
      ) VALUES ($1::uuid, $2::uuid, 'CLIENTE_ELIMINADO_DEFINITIVO'::public.accion_bitacora, 'clientes', $3::uuid, $4, $5);
    `;
    await query(logSql, [
      cobradorId,
      cobradorId,
      id,
      finalCedula,
      JSON.stringify({
        nombre_completo: `${clienteTarget.nombre || ''} ${clienteTarget.apellidos || ''}`.trim(),
        accion_manual: true
      })
    ]);

    // 2. Archivar historial financiero y borrar en cascada
    await query('SELECT archivar_y_eliminar_cliente($1::uuid);', [id]);

    return res.json({
      message: 'Cliente eliminado definitivamente y archivado en el historial con éxito.'
    });
  } catch (err) {
    console.error('[Error SQL detallado]: Error al eliminar cliente definitivamente:', err);
    return res.status(500).json({
      error: 'No se pudo eliminar definitivamente al cliente en este momento.',
      userMessage: 'No se pudo eliminar definitivamente al cliente en este momento.',
      ...debugPayload(err)
    });
  }
}

/**
 * DELETE /api/papelera
 * POST /api/papelera/vaciar
 * Vacía por completo la papelera archivando el historial de todos los clientes en papelera
 */
export async function vaciarPapelera(req, res) {
  try {
    const cobradorId = req.body?.cobrador_id || req.query?.cobrador_id || req.user?.id || await getDefaultCobradorId();

    const sqlFind = `
      SELECT id, cedula, nombre, apellidos 
        FROM clientes 
       WHERE estado = 'EN_PAPELERA'::public.estado_cliente
         AND cobrador_id = $1::uuid;
    `;
    const { rows: clientesEnPapelera } = await query(sqlFind, [cobradorId]);

    if (clientesEnPapelera.length === 0) {
      return res.json({
        message: 'La papelera ya está vacía.',
        totalEliminados: 0
      });
    }

    let eliminadosCount = 0;

    for (const c of clientesEnPapelera) {
      const finalCedula = cleanCedula9(c.cedula);
      await query(`
        INSERT INTO bitacora_actividad (
          usuario_id,
          cobrador_id,
          accion,
          entidad,
          entidad_id,
          cedula,
          detalle
        ) VALUES ($1::uuid, $2::uuid, 'CLIENTE_ELIMINADO_DEFINITIVO'::public.accion_bitacora, 'clientes', $3::uuid, $4, $5);
      `, [
        cobradorId,
        cobradorId,
        c.id,
        finalCedula,
        JSON.stringify({
          nombre_completo: `${c.nombre || ''} ${c.apellidos || ''}`.trim(),
          origen: 'VACIAR_PAPELERA'
        })
      ]);

      await query('SELECT archivar_y_eliminar_cliente($1::uuid);', [c.id]);
      eliminadosCount++;
    }

    return res.json({
      message: `Papelera vaciada con éxito. Se eliminaron definitivamente ${eliminadosCount} clientes.`,
      totalEliminados: eliminadosCount
    });
  } catch (err) {
    console.error('[Error SQL detallado]: Error al vaciar papelera:', err);
    return res.status(500).json({
      error: 'No se pudo vaciar la papelera en este momento.',
      userMessage: 'No se pudo vaciar la papelera en este momento.',
      ...debugPayload(err)
    });
  }
}

