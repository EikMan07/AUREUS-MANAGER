import { query, pool, debugPayload } from '../config/db.js';
import { getDefaultCobradorId } from '../services/seedService.js';
import {
  restorePrestamoFromBaneado,
  restoreClienteFromBaneadoRow,
  ensureArchivoCliente,
  archivePrestamoBaneado,
  purgeExpiredPapeleraForCobrador,
  ensureHistorialArchivoSchema,
} from '../utils/papeleraHelpers.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cleanCedula9(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '').slice(0, 9);
  return digits.length === 9 ? digits : null;
}

function calcDiasRestantes(fechaBorradoDefinitivo) {
  if (!fechaBorradoDefinitivo) return 30;
  const diffMs = new Date(fechaBorradoDefinitivo).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / 86400000));
}

/**
 * GET /api/papelera
 * Retorna la lista unificada y agrupada por cliente_id de registros en papelera
 * (combinando clientes_baneados y prestamos_baneados sin duplicar tarjetas de cliente).
 */
export async function getPapelera(req, res) {
  const client = await pool.connect();
  try {
    const cobradorId = req.query.cobrador_id || req.user?.id || (await getDefaultCobradorId());

    // 1. Purga automática transaccional de registros vencidos (> 30 días) archivando historial
    await ensureHistorialArchivoSchema();
    await client.query('BEGIN');
    await purgeExpiredPapeleraForCobrador(client, cobradorId);
    await client.query('COMMIT');

    // 2. Consultar ambas tablas activas en papelera
    const [clientesRes, prestamosRes] = await Promise.all([
      query(
        `SELECT cb.*,
                GREATEST(0, CEIL(EXTRACT(EPOCH FROM (cb.fecha_borrado_definitivo - now())) / 86400.0))::int AS dias_restantes
         FROM clientes_baneados cb
         WHERE cb.cobrador_id = $1::uuid
           AND cb.fecha_borrado_definitivo > now()
         ORDER BY cb.fecha_envio_papelera DESC;`,
        [cobradorId]
      ),
      query(
        `SELECT pb.id, pb.cobrador_id, pb.cliente_id, pb.cliente_nombre, pb.cliente_apellidos,
                pb.cliente_cedula, pb.cliente_telefono, pb.origen_papelera, pb.categoria_previa,
                pb.monto_prestado, pb.porcentaje_interes, pb.monto_total_financiar,
                pb.monto_pagado_acumulado, pb.saldo_por_pagar, pb.cuota, pb.modalidad,
                to_char(pb.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
                to_char(pb.fecha_final, 'YYYY-MM-DD') AS fecha_final,
                pb.estado_previo, pb.periodos_pagados, pb.total_periodos,
                pb.periodos_atrasados_acumulados, pb.fecha_envio_papelera,
                pb.fecha_borrado_definitivo,
                GREATEST(0, CEIL(EXTRACT(EPOCH FROM (pb.fecha_borrado_definitivo - now())) / 86400.0))::int AS dias_restantes
         FROM prestamos_baneados pb
         WHERE pb.cobrador_id = $1::uuid
           AND pb.fecha_borrado_definitivo > now()
         ORDER BY pb.fecha_envio_papelera DESC, pb.creado_en ASC;`,
        [cobradorId]
      ),
    ]);

    const clientesBaneadosMap = new Map(clientesRes.rows.map((c) => [c.id, c]));

    // 3. Enriquecer con clientes activos para los casos donde solo se eliminó el préstamo
    const missingClientIds = [
      ...new Set(
        prestamosRes.rows
          .map((p) => p.cliente_id)
          .filter((cid) => cid && !clientesBaneadosMap.has(cid))
      ),
    ];

    let activeClientsMap = new Map();
    if (missingClientIds.length > 0) {
      const { rows: activeRows } = await query(
        `SELECT id, cobrador_id, cedula, nombre, apellidos, telefono,
                telefono_secundario, ubicacion, detalles
         FROM clientes
         WHERE id = ANY($1::uuid[]) AND cobrador_id = $2::uuid;`,
        [missingClientIds, cobradorId]
      );
      activeClientsMap = new Map(activeRows.map((c) => [c.id, c]));
    }

    // 4. Agrupar estrictamente por cliente_id
    const groupedMap = new Map();

    for (const c of clientesRes.rows) {
      groupedMap.set(c.id, {
        id: c.id,
        cobrador_id: c.cobrador_id,
        cedula: c.cedula ? String(c.cedula).trim() : null,
        nombre: c.nombre || '',
        apellidos: c.apellidos || '',
        telefono: c.telefono || '',
        telefono_secundario: c.telefono_secundario || '',
        ubicacion: c.ubicacion || '',
        detalles: c.detalles || '',
        cliente_en_papelera: true,
        fecha_envio_papelera: c.fecha_envio_papelera,
        fecha_borrado_definitivo: c.fecha_borrado_definitivo,
        dias_restantes: Number(c.dias_restantes ?? calcDiasRestantes(c.fecha_borrado_definitivo)),
        prestamos_papelera: [],
      });
    }

    for (const p of prestamosRes.rows) {
      const cid = p.cliente_id;
      let entry = groupedMap.get(cid);
      if (!entry) {
        const activeCli = activeClientsMap.get(cid);
        entry = {
          id: cid,
          cobrador_id: p.cobrador_id,
          cedula: activeCli?.cedula
            ? String(activeCli.cedula).trim()
            : p.cliente_cedula
              ? String(p.cliente_cedula).trim()
              : null,
          nombre: activeCli?.nombre || p.cliente_nombre || 'Cliente',
          apellidos: activeCli?.apellidos || p.cliente_apellidos || '',
          telefono: activeCli?.telefono || p.cliente_telefono || '',
          telefono_secundario: activeCli?.telefono_secundario || '',
          ubicacion: activeCli?.ubicacion || '',
          detalles: activeCli?.detalles || '',
          cliente_en_papelera: false,
          fecha_envio_papelera: p.fecha_envio_papelera,
          fecha_borrado_definitivo: p.fecha_borrado_definitivo,
          dias_restantes: Number(p.dias_restantes ?? calcDiasRestantes(p.fecha_borrado_definitivo)),
          prestamos_papelera: [],
        };
        groupedMap.set(cid, entry);
      } else {
        // Actualizar fecha más reciente de actividad si un préstamo fue enviado más tarde
        if (
          p.fecha_envio_papelera &&
          new Date(p.fecha_envio_papelera).getTime() > new Date(entry.fecha_envio_papelera).getTime()
        ) {
          entry.fecha_envio_papelera = p.fecha_envio_papelera;
        }
      }

      entry.prestamos_papelera.push({
        id: p.id,
        cliente_id: p.cliente_id,
        monto_prestado: Number(p.monto_prestado ?? 0),
        porcentaje_interes: Number(p.porcentaje_interes ?? 0),
        monto_total_financiar: Number(p.monto_total_financiar ?? 0),
        monto_pagado_acumulado: Number(p.monto_pagado_acumulado ?? 0),
        saldo_por_pagar: Number(p.saldo_por_pagar ?? 0),
        cuota: Number(p.cuota ?? 0),
        modalidad: p.modalidad,
        fecha_inicio: p.fecha_inicio,
        fecha_final: p.fecha_final,
        estado_previo: p.estado_previo,
        categoria_previa: p.categoria_previa,
        origen_papelera: p.origen_papelera,
        periodos_pagados: Number(p.periodos_pagados ?? 0),
        total_periodos: Number(p.total_periodos ?? 0),
        periodos_atrasados_acumulados: Number(p.periodos_atrasados_acumulados ?? 0),
        fecha_envio_papelera: p.fecha_envio_papelera,
        fecha_borrado_definitivo: p.fecha_borrado_definitivo,
        dias_restantes: Number(p.dias_restantes ?? calcDiasRestantes(p.fecha_borrado_definitivo)),
      });
    }

    // 5. Compatibilidad de campos agregados y ordenamiento final
    const rows = Array.from(groupedMap.values())
      .map((entry) => {
        const totalSaldo = entry.prestamos_papelera.reduce(
          (acc, lp) => acc + Number(lp.saldo_por_pagar || 0),
          0
        );
        return {
          ...entry,
          prestamos_suspendidos_count: entry.prestamos_papelera.length,
          saldo_total_pendiente: totalSaldo,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.fecha_envio_papelera || 0).getTime() -
          new Date(a.fecha_envio_papelera || 0).getTime()
      );

    return res.json(rows);
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore rollback failure on closed/idle tx
    }
    console.error('[Error SQL detallado]: Error en getPapelera:', err);
    return res.status(500).json({
      error: 'No se pudo consultar los registros de la papelera.',
      userMessage: 'No se pudo consultar la papelera en este momento.',
      ...debugPayload(err),
    });
  } finally {
    client.release();
  }
}

/**
 * POST /api/papelera/prestamo/:prestamoId/restaurar
 * Restaura un préstamo individual desde prestamos_baneados hacia prestamos (+ sus cobros y pagos).
 * Si el cliente dueño está en clientes_baneados, lo restaura automáticamente a ACTIVO
 * y conserva sus demás préstamos en papelera como 'PRESTAMO_ELIMINADO'.
 */
export async function restaurarPrestamo(req, res) {
  const client = await pool.connect();
  try {
    const { prestamoId } = req.params;
    if (!UUID_REGEX.test(String(prestamoId || ''))) {
      return res.status(400).json({ error: 'Identificador de préstamo inválido.' });
    }

    const cobradorId = req.body?.cobrador_id || req.user?.id || (await getDefaultCobradorId());

    await ensureHistorialArchivoSchema();
    await client.query('BEGIN');

    const { rows: pbRows } = await client.query(
      `SELECT * FROM prestamos_baneados
       WHERE id = $1::uuid AND cobrador_id = $2::uuid
       FOR UPDATE;`,
      [prestamoId, cobradorId]
    );

    if (pbRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Préstamo no encontrado en la papelera.' });
    }

    const loanRow = pbRows[0];
    const clienteId = loanRow.cliente_id;
    let clienteRestauradoConElPrestamo = false;

    const { rows: activeCliRows } = await client.query(
      'SELECT id FROM clientes WHERE id = $1::uuid FOR UPDATE;',
      [clienteId]
    );

    if (activeCliRows.length === 0) {
      const { rows: cbRows } = await client.query(
        'SELECT * FROM clientes_baneados WHERE id = $1::uuid AND cobrador_id = $2::uuid FOR UPDATE;',
        [clienteId, cobradorId]
      );

      if (cbRows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          error: 'El cliente propietario del préstamo no se encontró para restaurar.',
        });
      }

      await restoreClienteFromBaneadoRow(client, cbRows[0]);
      clienteRestauradoConElPrestamo = true;

      // Otros préstamos del cliente que aún queden en papelera pasan a origen PRESTAMO_ELIMINADO
      await client.query(
        `UPDATE prestamos_baneados
         SET origen_papelera = 'PRESTAMO_ELIMINADO'
         WHERE cliente_id = $1::uuid
           AND cobrador_id = $2::uuid
           AND id <> $3::uuid;`,
        [clienteId, cobradorId, prestamoId]
      );
    }

    await restorePrestamoFromBaneado(client, loanRow);

    await client.query(
      `INSERT INTO bitacora_actividad (
         usuario_id, cobrador_id, accion, entidad, entidad_id, cedula, detalle
       ) VALUES ($1::uuid, $2::uuid, 'CLIENTE_RESTAURADO'::public.accion_bitacora, 'prestamos', $3::uuid, $4, $5);`,
      [
        cobradorId,
        cobradorId,
        prestamoId,
        cleanCedula9(loanRow.cliente_cedula),
        JSON.stringify({
          motivo: 'Préstamo restaurado desde la papelera',
          cliente_id: clienteId,
          cliente_restaurado_automaticamente: clienteRestauradoConElPrestamo,
        }),
      ]
    );

    await client.query('COMMIT');

    return res.json({
      ok: true,
      prestamo_id: prestamoId,
      cliente_id: clienteId,
      clienteRestauradoConElPrestamo,
      mensaje: clienteRestauradoConElPrestamo
        ? 'Préstamo y cliente restaurados exitosamente.'
        : 'Préstamo restaurado exitosamente.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Error SQL detallado]: Error en restaurarPrestamo:', err);
    return res.status(500).json({
      error: 'No se pudo restaurar el préstamo desde la papelera.',
      userMessage: 'No se pudo restaurar el préstamo en este momento.',
      ...debugPayload(err),
    });
  } finally {
    client.release();
  }
}

/**
 * DELETE /api/papelera/prestamo/:prestamoId
 * Archiva el préstamo individual en historial_prestamos_archivo y lo elimina definitivamente de prestamos_baneados.
 */
export async function eliminarPrestamoDefinitivo(req, res) {
  const client = await pool.connect();
  try {
    const { prestamoId } = req.params;
    if (!UUID_REGEX.test(String(prestamoId || ''))) {
      return res.status(400).json({ error: 'Identificador de préstamo inválido.' });
    }

    const cobradorId = req.query.cobrador_id || req.user?.id || (await getDefaultCobradorId());

    await ensureHistorialArchivoSchema();
    await client.query('BEGIN');

    const { rows: pbRows } = await client.query(
      `SELECT * FROM prestamos_baneados
       WHERE id = $1::uuid AND cobrador_id = $2::uuid
       FOR UPDATE;`,
      [prestamoId, cobradorId]
    );

    if (pbRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Préstamo no encontrado en la papelera.' });
    }

    const loanRow = pbRows[0];
    const clienteId = loanRow.cliente_id;

    // Obtener datos del dueño (activo o en clientes_baneados)
    const { rows: activeCli } = await client.query(
      'SELECT * FROM clientes WHERE id = $1::uuid;',
      [clienteId]
    );
    const { rows: bannedCli } =
      activeCli.length === 0
        ? await client.query('SELECT * FROM clientes_baneados WHERE id = $1::uuid;', [clienteId])
        : { rows: [] };

    const cli = activeCli[0] || bannedCli[0] || null;
    const archivoId = await ensureArchivoCliente(client, {
      cobradorId,
      cedula: cli?.cedula ?? loanRow.cliente_cedula,
      nombre: cli?.nombre ?? loanRow.cliente_nombre,
      apellidos: cli?.apellidos ?? loanRow.cliente_apellidos,
      telefono: cli?.telefono ?? loanRow.cliente_telefono,
      telefonoSecundario: cli?.telefono_secundario ?? null,
      ubicacion: cli?.ubicacion ?? null,
      detalles: cli?.detalles ?? null,
      clienteIdActual: activeCli[0] ? activeCli[0].id : null,
    });

    await archivePrestamoBaneado(client, archivoId, loanRow);
    await client.query('DELETE FROM prestamos_baneados WHERE id = $1::uuid;', [prestamoId]);

    try {
      await client.query('SAVEPOINT sp_notif_del;');
      await client.query('DELETE FROM notificaciones_revisadas WHERE notificacion_id LIKE $1;', [
        `%${prestamoId}%`,
      ]);
    } catch {
      await client.query('ROLLBACK TO SAVEPOINT sp_notif_del;');
    }

    await client.query(
      `INSERT INTO bitacora_actividad (
         usuario_id, cobrador_id, accion, entidad, entidad_id, cedula, detalle
       ) VALUES ($1::uuid, $2::uuid, 'CLIENTE_ELIMINADO_DEFINITIVO'::public.accion_bitacora, 'prestamos', $3::uuid, $4, $5);`,
      [
        cobradorId,
        cobradorId,
        prestamoId,
        cleanCedula9(cli?.cedula ?? loanRow.cliente_cedula),
        JSON.stringify({
          motivo: 'Préstamo eliminado definitivamente desde la papelera',
          cliente_id: clienteId,
        }),
      ]
    );

    await client.query('COMMIT');

    return res.json({
      ok: true,
      prestamo_id: prestamoId,
      mensaje: 'Préstamo archivado y eliminado definitivamente.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Error SQL detallado]: Error en eliminarPrestamoDefinitivo:', err);
    return res.status(500).json({
      error: 'No se pudo eliminar definitivamente el préstamo.',
      userMessage: 'No se pudo eliminar el préstamo definitivamente en este momento.',
      ...debugPayload(err),
    });
  } finally {
    client.release();
  }
}

/**
 * POST /api/papelera/:id/restaurar
 * Restaura un cliente desde clientes_baneados y/o todos sus préstamos en prestamos_baneados.
 */
export async function restaurarCliente(req, res) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const cobradorId = req.body?.cobrador_id || req.user?.id || (await getDefaultCobradorId());
    const restaurarPrestamosIndividuales =
      req.body?.restaurarPrestamosIndividuales !== undefined
        ? Boolean(req.body.restaurarPrestamosIndividuales)
        : true;

    await ensureHistorialArchivoSchema();
    await client.query('BEGIN');

    const { rows: cbRows } = await client.query(
      'SELECT * FROM clientes_baneados WHERE id = $1::uuid AND cobrador_id = $2::uuid FOR UPDATE;',
      [id, cobradorId]
    );
    const { rows: pbRows } = await client.query(
      `SELECT * FROM prestamos_baneados
       WHERE cliente_id = $1::uuid AND cobrador_id = $2::uuid
       ORDER BY fecha_envio_papelera ASC
       FOR UPDATE;`,
      [id, cobradorId]
    );

    if (cbRows.length === 0 && pbRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Registro no encontrado en la papelera.' });
    }

    let clienteRow = cbRows[0] || null;
    let loansToRestore = [];

    if (clienteRow) {
      await restoreClienteFromBaneadoRow(client, clienteRow);
      loansToRestore = restaurarPrestamosIndividuales
        ? pbRows
        : pbRows.filter((p) => p.origen_papelera === 'CLIENTE_ELIMINADO');
    } else {
      // Cliente ya activo: restaurar todos sus préstamos pendientes en prestamos_baneados
      const { rows: activeCli } = await client.query(
        'SELECT * FROM clientes WHERE id = $1::uuid AND cobrador_id = $2::uuid FOR UPDATE;',
        [id, cobradorId]
      );
      if (activeCli.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Cliente propietario no encontrado para restaurar sus préstamos.' });
      }
      clienteRow = activeCli[0];
      loansToRestore = pbRows;
    }

    for (const loanRow of loansToRestore) {
      await restorePrestamoFromBaneado(client, loanRow);
    }

    const finalCedula = cleanCedula9(clienteRow.cedula);
    await client.query(
      `INSERT INTO bitacora_actividad (
         usuario_id, cobrador_id, accion, entidad, entidad_id, cedula, detalle
       ) VALUES ($1::uuid, $2::uuid, 'CLIENTE_RESTAURADO'::public.accion_bitacora, 'clientes', $3::uuid, $4, $5);`,
      [
        cobradorId,
        cobradorId,
        id,
        finalCedula,
        JSON.stringify({
          motivo: 'Restaurado desde la papelera',
          nombre_completo: `${clienteRow.nombre || ''} ${clienteRow.apellidos || ''}`.trim(),
          prestamos_restaurados: loansToRestore.length,
        }),
      ]
    );

    await client.query('COMMIT');

    return res.json({
      ok: true,
      prestamosRestaurados: loansToRestore.length,
      mensaje: cbRows.length > 0
        ? 'Cliente restaurado exitosamente.'
        : 'Préstamos del cliente restaurados exitosamente.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Error SQL detallado]: Error en restaurarCliente:', err);
    return res.status(500).json({
      error: 'No se pudo restaurar el registro desde la papelera.',
      userMessage: 'No se pudo completar la restauración en este momento.',
      ...debugPayload(err),
    });
  } finally {
    client.release();
  }
}

/**
 * DELETE /api/papelera/:id
 * Archiva y elimina definitivamente tanto el cliente (si está en clientes_baneados) como todos sus
 * préstamos en prestamos_baneados.
 */
export async function eliminarDefinitivo(req, res) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const cobradorId = req.query.cobrador_id || req.user?.id || (await getDefaultCobradorId());

    await ensureHistorialArchivoSchema();
    await client.query('BEGIN');

    const { rows: cbRows } = await client.query(
      'SELECT * FROM clientes_baneados WHERE id = $1::uuid AND cobrador_id = $2::uuid FOR UPDATE;',
      [id, cobradorId]
    );
    const { rows: pbRows } = await client.query(
      'SELECT * FROM prestamos_baneados WHERE cliente_id = $1::uuid AND cobrador_id = $2::uuid FOR UPDATE;',
      [id, cobradorId]
    );

    if (cbRows.length === 0 && pbRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Registro no encontrado en la papelera.' });
    }

    const activeRes =
      cbRows.length === 0
        ? await client.query('SELECT * FROM clientes WHERE id = $1::uuid;', [id])
        : { rows: [] };
    const cli = cbRows[0] || activeRes.rows[0] || {
      cedula: pbRows[0]?.cliente_cedula,
      nombre: pbRows[0]?.cliente_nombre,
      apellidos: pbRows[0]?.cliente_apellidos,
      telefono: pbRows[0]?.cliente_telefono,
      ubicacion: null,
      detalles: null,
    };

    const archivoId = await ensureArchivoCliente(client, {
      cobradorId,
      cedula: cli.cedula,
      nombre: cli.nombre,
      apellidos: cli.apellidos,
      telefono: cli.telefono,
      telefonoSecundario: cli.telefono_secundario ?? null,
      ubicacion: cli.ubicacion,
      detalles: cli.detalles,
      clienteIdActual: activeRes.rows[0] ? activeRes.rows[0].id : null,
    });

    for (const loanRow of pbRows) {
      await archivePrestamoBaneado(client, archivoId, loanRow);
    }

    await client.query(
      'DELETE FROM prestamos_baneados WHERE cliente_id = $1::uuid AND cobrador_id = $2::uuid;',
      [id, cobradorId]
    );
    if (cbRows.length > 0) {
      await client.query(
        'DELETE FROM clientes_baneados WHERE id = $1::uuid AND cobrador_id = $2::uuid;',
        [id, cobradorId]
      );
    }

    await client.query(
      `INSERT INTO bitacora_actividad (
         usuario_id, cobrador_id, accion, entidad, entidad_id, cedula, detalle
       ) VALUES ($1::uuid, $2::uuid, 'CLIENTE_ELIMINADO_DEFINITIVO'::public.accion_bitacora, 'clientes_baneados', $3::uuid, $4, $5);`,
      [
        cobradorId,
        cobradorId,
        id,
        cleanCedula9(cli.cedula),
        JSON.stringify({
          motivo: 'Eliminación definitiva manual desde la papelera',
          nombre_completo: `${cli.nombre || ''} ${cli.apellidos || ''}`.trim(),
          prestamos_archivados: pbRows.length,
        }),
      ]
    );

    await client.query('COMMIT');

    return res.json({
      ok: true,
      mensaje: 'Registro archivado y eliminado definitivamente.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Error SQL detallado]: Error en eliminarDefinitivo:', err);
    return res.status(500).json({
      error: 'No se pudo realizar la eliminación definitiva.',
      userMessage: 'No se pudo completar la eliminación definitiva.',
      ...debugPayload(err),
    });
  } finally {
    client.release();
  }
}

/**
 * DELETE /api/papelera  ó  POST /api/papelera/vaciar
 * Archiva y vacía toda la papelera del cobrador (clientes_baneados + prestamos_baneados).
 */
export async function vaciarPapelera(req, res) {
  const client = await pool.connect();
  try {
    const cobradorId =
      req.body?.cobrador_id || req.query.cobrador_id || req.user?.id || (await getDefaultCobradorId());

    await ensureHistorialArchivoSchema();
    await client.query('BEGIN');

    const { rows: clientesList } = await client.query(
      'SELECT * FROM clientes_baneados WHERE cobrador_id = $1::uuid FOR UPDATE;',
      [cobradorId]
    );
    const { rows: prestamosList } = await client.query(
      'SELECT * FROM prestamos_baneados WHERE cobrador_id = $1::uuid FOR UPDATE;',
      [cobradorId]
    );

    const archivoPorCliente = new Map();

    // 1. Archivar todos los clientes en clientes_baneados
    for (const c of clientesList) {
      const archivoId = await ensureArchivoCliente(client, {
        cobradorId,
        cedula: c.cedula,
        nombre: c.nombre,
        apellidos: c.apellidos,
        telefono: c.telefono,
        telefonoSecundario: c.telefono_secundario ?? null,
        ubicacion: c.ubicacion,
        detalles: c.detalles,
        clienteIdActual: null,
      });
      archivoPorCliente.set(c.id, archivoId);
    }

    // 2. Asegurar archivo para préstamos individuales cuyos clientes siguen activos
    const remainingCliIds = [
      ...new Set(
        prestamosList.map((p) => p.cliente_id).filter((cid) => !archivoPorCliente.has(cid))
      ),
    ];

    if (remainingCliIds.length > 0) {
      const { rows: activeRows } = await client.query(
        'SELECT * FROM clientes WHERE id = ANY($1::uuid[]) AND cobrador_id = $2::uuid;',
        [remainingCliIds, cobradorId]
      );
      const activeMap = new Map(activeRows.map((a) => [a.id, a]));

      for (const cid of remainingCliIds) {
        const cli = activeMap.get(cid);
        const sampleLoan = prestamosList.find((p) => p.cliente_id === cid);
        const archivoId = await ensureArchivoCliente(client, {
          cobradorId,
          cedula: cli?.cedula ?? sampleLoan?.cliente_cedula,
          nombre: cli?.nombre ?? sampleLoan?.cliente_nombre,
          apellidos: cli?.apellidos ?? sampleLoan?.cliente_apellidos,
          telefono: cli?.telefono ?? sampleLoan?.cliente_telefono,
          telefonoSecundario: cli?.telefono_secundario ?? null,
          ubicacion: cli?.ubicacion ?? null,
          detalles: cli?.detalles ?? null,
          clienteIdActual: cli ? cli.id : null,
        });
        archivoPorCliente.set(cid, archivoId);
      }
    }

    // 3. Archivar todos los préstamos en historial_prestamos_archivo
    for (const loanRow of prestamosList) {
      const archivoId = archivoPorCliente.get(loanRow.cliente_id);
      if (archivoId) {
        await archivePrestamoBaneado(client, archivoId, loanRow);
      }
    }

    // 4. Registrar bitácora y vaciar ambas tablas
    for (const c of clientesList) {
      await client.query(
        `INSERT INTO bitacora_actividad (
           usuario_id, cobrador_id, accion, entidad, entidad_id, cedula, detalle
         ) VALUES ($1::uuid, $2::uuid, 'CLIENTE_ELIMINADO_DEFINITIVO'::public.accion_bitacora, 'clientes_baneados', $3::uuid, $4, $5);`,
        [
          cobradorId,
          cobradorId,
          c.id,
          cleanCedula9(c.cedula),
          JSON.stringify({
            motivo: 'Vaciado manual total de la papelera',
            nombre_completo: `${c.nombre || ''} ${c.apellidos || ''}`.trim(),
          }),
        ]
      );
    }

    await client.query('DELETE FROM prestamos_baneados WHERE cobrador_id = $1::uuid;', [cobradorId]);
    await client.query('DELETE FROM clientes_baneados WHERE cobrador_id = $1::uuid;', [cobradorId]);

    await client.query('COMMIT');

    return res.json({
      ok: true,
      mensaje: `Se archivaron y vaciaron ${clientesList.length + remainingCliIds.length} registros de la papelera.`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Error SQL detallado]: Error en vaciarPapelera:', err);
    return res.status(500).json({
      error: 'No se pudo vaciar la papelera.',
      userMessage: 'No se pudo vaciar la papelera en este momento.',
      ...debugPayload(err),
    });
  } finally {
    client.release();
  }
}
