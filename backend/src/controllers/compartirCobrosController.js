import bcrypt from 'bcryptjs';
import { pool, query, debugPayload } from '../config/db.js';
import { getDefaultCobradorId } from '../services/seedService.js';

function getTodayCostaRicaISO() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

/**
 * GET /api/compartir/personas?q=...
 * Obtiene la lista de contactos vinculados del prestamista y realiza búsqueda en usuarios.
 */
export async function getPersonas(req, res) {
  try {
    const propietarioId = req.user?.id || req.query.cobrador_id || (await getDefaultCobradorId());
    const searchTerm = String(req.query.q || '').trim();

    // 1. Personas ya vinculadas en contactos_cobradores
    const sqlMisPersonas = `
      SELECT 
        c.id AS contacto_id,
        u.id AS usuario_id,
        ('CF-' || UPPER(SUBSTRING(u.id::text, 1, 8))) AS codigo_id,
        u.usuario,
        u.nombre_completo,
        u.correo,
        u.rol,
        c.creado_en
      FROM contactos_cobradores c
      JOIN usuarios u ON c.contacto_usuario_id = u.id
      WHERE c.propietario_id = $1::uuid
      ORDER BY u.nombre_completo ASC;
    `;
    const { rows: misPersonas } = await query(sqlMisPersonas, [propietarioId]);

    // 2. Resultados de búsqueda en usuarios (si se envía término q)
    let resultadosBusqueda = [];
    if (searchTerm.length > 0) {
      const cleanTerm = searchTerm.replace(/^CF-/i, '');
      const sqlBusqueda = `
        SELECT 
          u.id AS usuario_id,
          ('CF-' || UPPER(SUBSTRING(u.id::text, 1, 8))) AS codigo_id,
          u.usuario,
          u.nombre_completo,
          u.correo,
          u.rol,
          EXISTS (
            SELECT 1 FROM contactos_cobradores cc
            WHERE cc.propietario_id = $1::uuid AND cc.contacto_usuario_id = u.id
          ) AS ya_vinculado
        FROM usuarios u
        WHERE u.id <> $1::uuid
          AND (
            u.usuario ILIKE '%' || $2 || '%'
            OR u.nombre_completo ILIKE '%' || $2 || '%'
            OR u.id::text ILIKE '%' || $2 || '%'
            OR UPPER(SUBSTRING(u.id::text, 1, 8)) = UPPER($3)
          )
        ORDER BY u.nombre_completo ASC
        LIMIT 20;
      `;
      const { rows } = await query(sqlBusqueda, [propietarioId, searchTerm, cleanTerm]);
      resultadosBusqueda = rows;
    }

    return res.json({
      success: true,
      misPersonas,
      resultadosBusqueda
    });
  } catch (err) {
    console.error('[Compartir Cobros] Error al obtener personas:', err);
    return res.status(500).json({
      success: false,
      error: 'Error al consultar contactos de cobro.',
      userMessage: 'No se pudieron consultar los contactos en este momento.',
      ...debugPayload(err)
    });
  }
}

/**
 * POST /api/compartir/personas
 * Vincula una persona existente por contacto_usuario_id o registra una nueva persona en usuarios y la vincula.
 */
export async function agregarPersona(req, res) {
  try {
    const propietarioId = req.user?.id || req.body.cobrador_id || (await getDefaultCobradorId());
    const { contacto_usuario_id, nombre_completo, usuario } = req.body || {};

    // CASO A: Vincular persona existente por UUID
    if (contacto_usuario_id) {
      if (contacto_usuario_id === propietarioId) {
        return res.status(400).json({
          success: false,
          userMessage: 'No puedes agregarte a ti mismo como contacto vinculado.'
        });
      }

      const { rows: userRows } = await query(
        `SELECT id, usuario, nombre_completo, correo, rol FROM usuarios WHERE id = $1::uuid;`,
        [contacto_usuario_id]
      );
      if (userRows.length === 0) {
        return res.status(404).json({
          success: false,
          userMessage: 'La persona seleccionada no existe.'
        });
      }

      await query(
        `INSERT INTO contactos_cobradores (propietario_id, contacto_usuario_id)
         VALUES ($1::uuid, $2::uuid)
         ON CONFLICT (propietario_id, contacto_usuario_id) DO NOTHING;`,
        [propietarioId, contacto_usuario_id]
      );

      const target = userRows[0];
      return res.json({
        success: true,
        mensaje: 'Persona vinculada con éxito.',
        persona: {
          usuario_id: target.id,
          codigo_id: 'CF-' + target.id.substring(0, 8).toUpperCase(),
          usuario: target.usuario,
          nombre_completo: target.nombre_completo,
          correo: target.correo,
          rol: target.rol
        }
      });
    }

    // CASO B: Registro y alta rápida de un nuevo cobrador / compañero
    const cleanNombre = String(nombre_completo || '').trim();
    const cleanUsuario = String(usuario || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, '');

    if (!cleanNombre || cleanNombre.length < 2) {
      return res.status(400).json({
        success: false,
        userMessage: 'Debes indicar el nombre completo de la persona.'
      });
    }
    if (!cleanUsuario || cleanUsuario.length < 3) {
      return res.status(400).json({
        success: false,
        userMessage: 'El nombre de usuario debe tener al menos 3 caracteres alfanuméricos.'
      });
    }

    // Comprobar si el username ya existe
    const { rows: existingUser } = await query(
      `SELECT id, usuario, nombre_completo, rol FROM usuarios WHERE usuario = $1;`,
      [cleanUsuario]
    );

    let targetUserId = null;
    let targetUserData = null;

    if (existingUser.length > 0) {
      targetUserId = existingUser[0].id;
      targetUserData = existingUser[0];
    } else {
      // Crear nuevo usuario con rol COBRADOR y contraseña por defecto
      const salt = bcrypt.genSaltSync(10);
      const defaultHash = bcrypt.hashSync('CobroFirme2026!', salt);
      const email = `${cleanUsuario}@cobrofirme.cr`;

      const insertSql = `
        INSERT INTO usuarios (
          usuario,
          nombre_completo,
          correo,
          correo_verificado,
          password_hash,
          rol,
          estado_cuenta
        ) VALUES (
          $1,
          $2,
          $3,
          true,
          $4,
          'COBRADOR'::public.rol_usuario,
          'ACTIVA'::public.estado_cuenta
        )
        RETURNING id, usuario, nombre_completo, correo, rol;
      `;
      const { rows: createdRows } = await query(insertSql, [
        cleanUsuario,
        cleanNombre,
        email,
        defaultHash
      ]);
      targetUserId = createdRows[0].id;
      targetUserData = createdRows[0];
    }

    if (targetUserId === propietarioId) {
      return res.status(400).json({
        success: false,
        userMessage: 'No puedes agregarte a ti mismo como contacto vinculado.'
      });
    }

    // Vincular automáticamente a contactos_cobradores
    await query(
      `INSERT INTO contactos_cobradores (propietario_id, contacto_usuario_id)
       VALUES ($1::uuid, $2::uuid)
       ON CONFLICT (propietario_id, contacto_usuario_id) DO NOTHING;`,
      [propietarioId, targetUserId]
    );

    return res.json({
      success: true,
      mensaje: 'Persona vinculada con éxito.',
      persona: {
        usuario_id: targetUserId,
        codigo_id: 'CF-' + targetUserId.substring(0, 8).toUpperCase(),
        usuario: targetUserData.usuario,
        nombre_completo: targetUserData.nombre_completo,
        rol: targetUserData.rol
      }
    });
  } catch (err) {
    console.error('[Compartir Cobros] Error al agregar persona:', err);
    return res.status(500).json({
      success: false,
      error: 'Error interno al vincular persona.',
      userMessage: 'No se pudo agregar o vincular a la persona.',
      ...debugPayload(err)
    });
  }
}

/**
 * DELETE /api/compartir/personas/:contactoId
 * Quita a una persona de la lista de contactos vinculados.
 */
export async function eliminarPersona(req, res) {
  try {
    const propietarioId = req.user?.id || req.query.cobrador_id || (await getDefaultCobradorId());
    const { contactoId } = req.params;

    if (!contactoId) {
      return res.status(400).json({
        success: false,
        userMessage: 'Identificador de contacto no especificado.'
      });
    }

    await query(
      `DELETE FROM contactos_cobradores 
       WHERE (id = $1::uuid OR contacto_usuario_id = $1::uuid)
         AND propietario_id = $2::uuid;`,
      [contactoId, propietarioId]
    );

    return res.json({
      success: true,
      mensaje: 'Contacto retirado de la lista con éxito.'
    });
  } catch (err) {
    console.error('[Compartir Cobros] Error al eliminar persona:', err);
    return res.status(500).json({
      success: false,
      error: 'Error al retirar contacto.',
      userMessage: 'No se pudo retirar el contacto en este momento.',
      ...debugPayload(err)
    });
  }
}

/**
 * GET /api/compartir/resumen-dia?fecha=YYYY-MM-DD
 * Consulta los cobros programados para una fecha específica con todos los datos requeridos para la vista previa y el PDF.
 */
export async function getResumenDiaParaCompartir(req, res) {
  try {
    const propietarioId = req.user?.id || req.query.cobrador_id || (await getDefaultCobradorId());
    const fecha = req.query.fecha || getTodayCostaRicaISO();

    const sqlCobros = `
      SELECT 
        a.id,
        a.prestamo_id,
        a.cliente_id,
        a.numero_cobro,
        to_char(a.fecha_cobro_actual, 'YYYY-MM-DD') AS fecha_cobro_actual,
        a.monto_cuota,
        a.estado AS estado_cuota,
        a.compartido_con_usuario_id,
        to_char(a.compartido_en, 'YYYY-MM-DD HH24:MI') AS compartido_en,
        u_comp.nombre_completo AS compartido_con_nombre,
        u_comp.usuario AS compartido_con_usuario,
        c.cedula,
        c.nombre,
        c.apellidos,
        TRIM(c.nombre || ' ' || COALESCE(c.apellidos, '')) AS nombre_completo,
        c.telefono,
        c.ubicacion,
        c.detalles
      FROM agenda_cobros a
      JOIN prestamos p ON a.prestamo_id = p.id
      JOIN clientes c ON a.cliente_id = c.id
      LEFT JOIN usuarios u_comp ON a.compartido_con_usuario_id = u_comp.id
      WHERE a.cobrador_id = $1::uuid
        AND a.fecha_cobro_actual = $2::date
        AND a.estado IN ('PENDIENTE'::public.estado_cuota_cobro, 'PASADO_DE_DIA'::public.estado_cuota_cobro)
        AND p.estado IN ('ACTIVO'::public.estado_prestamo, 'ATRASADO'::public.estado_prestamo, 'ARREGLO_PAGO'::public.estado_prestamo, 'RENOVADO'::public.estado_prestamo)
        AND c.estado = 'ACTIVO'::public.estado_cliente
      ORDER BY c.nombre ASC, c.apellidos ASC;
    `;
    const { rows: cobros } = await query(sqlCobros, [propietarioId, fecha]);

    const totalCobros = cobros.length;
    const montoTotal = cobros.reduce((sum, c) => sum + Number(c.monto_cuota || 0), 0);

    return res.json({
      success: true,
      fecha,
      total_cobros: totalCobros,
      monto_total: montoTotal,
      cobros
    });
  } catch (err) {
    console.error('[Compartir Cobros] Error al obtener resumen del día:', err);
    return res.status(500).json({
      success: false,
      error: 'Error al consultar cobros del día.',
      userMessage: 'No se pudieron consultar los cobros para la fecha indicada.',
      ...debugPayload(err)
    });
  }
}

/**
 * POST /api/compartir/dia
 * Comparte todos (o los seleccionados) cobros de una fecha con una persona vinculada.
 */
export async function compartirCobrosDia(req, res) {
  const client = await pool.connect();
  try {
    const propietarioId = req.user?.id || req.body.cobrador_id || (await getDefaultCobradorId());
    const { destinatario_id, fecha_cobro, agenda_ids } = req.body || {};

    if (!destinatario_id) {
      return res.status(400).json({
        success: false,
        userMessage: 'Debes seleccionar a la persona con quien deseas compartir los cobros.'
      });
    }
    if (!fecha_cobro) {
      return res.status(400).json({
        success: false,
        userMessage: 'Debes indicar la fecha de cobro a compartir.'
      });
    }
    if (destinatario_id === propietarioId) {
      return res.status(400).json({
        success: false,
        userMessage: 'No puedes compartir cobros contigo mismo.'
      });
    }

    await client.query('BEGIN');

    // 1. Verificar existencia del destinatario
    const destRes = await client.query(
      `SELECT id, nombre_completo, usuario FROM usuarios WHERE id = $1::uuid;`,
      [destinatario_id]
    );
    if (destRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        userMessage: 'La persona seleccionada no existe en la lista de usuarios.'
      });
    }
    const destinatario = destRes.rows[0];

    // 2. Actualizar agenda_cobros
    let updateSql = '';
    let params = [];

    if (Array.isArray(agenda_ids) && agenda_ids.length > 0) {
      updateSql = `
        UPDATE agenda_cobros
        SET compartido_con_usuario_id = $1::uuid,
            compartido_en = now()
        WHERE cobrador_id = $2::uuid
          AND fecha_cobro_actual = $3::date
          AND id = ANY($4::uuid[])
          AND estado IN ('PENDIENTE'::public.estado_cuota_cobro, 'PASADO_DE_DIA'::public.estado_cuota_cobro)
        RETURNING id, monto_cuota;
      `;
      params = [destinatario_id, propietarioId, fecha_cobro, agenda_ids];
    } else {
      updateSql = `
        UPDATE agenda_cobros
        SET compartido_con_usuario_id = $1::uuid,
            compartido_en = now()
        WHERE cobrador_id = $2::uuid
          AND fecha_cobro_actual = $3::date
          AND estado IN ('PENDIENTE'::public.estado_cuota_cobro, 'PASADO_DE_DIA'::public.estado_cuota_cobro)
        RETURNING id, monto_cuota;
      `;
      params = [destinatario_id, propietarioId, fecha_cobro];
    }

    const { rows: updatedRows } = await client.query(updateSql, params);

    if (updatedRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        userMessage: 'No hay cobros pendientes para compartir en la fecha seleccionada.'
      });
    }

    const cantidadCobros = updatedRows.length;
    const montoTotal = updatedRows.reduce((sum, r) => sum + Number(r.monto_cuota || 0), 0);

    // 3. Registrar el envío en cobros_compartidos_dia
    await client.query(
      `INSERT INTO cobros_compartidos_dia (
        propietario_id, destinatario_id, fecha_cobro, cantidad_cobros, monto_total_esperado
      ) VALUES ($1::uuid, $2::uuid, $3::date, $4::int, $5::numeric);`,
      [propietarioId, destinatario_id, fecha_cobro, cantidadCobros, montoTotal]
    );

    // 4. Crear notificación interna para el destinatario
    const notifMsg = cantidadCobros === 1
      ? `Tienes 1 cobro asignado para gestionar en la fecha ${fecha_cobro}.`
      : `Tienes ${cantidadCobros} cobros asignados para gestionar en la fecha ${fecha_cobro}.`;

    await client.query(
      `INSERT INTO notificaciones (
        usuario_id, titulo, mensaje, monto_resaltado, leida
      ) VALUES ($1::uuid, $2, $3, $4, false);`,
      [destinatario_id, `Cobros recibidos para ${fecha_cobro}`, notifMsg, montoTotal]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      mensaje: `Se compartieron ${cantidadCobros} cobros con ${destinatario.nombre_completo}.`,
      fecha_cobro,
      cantidad_cobros: cantidadCobros,
      monto_total_esperado: montoTotal,
      destinatario: {
        id: destinatario.id,
        nombre_completo: destinatario.nombre_completo,
        usuario: destinatario.usuario
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Compartir Cobros] Error al compartir cobros del día:', err);
    return res.status(500).json({
      success: false,
      error: 'Error al compartir cobros del día.',
      userMessage: 'No se pudieron compartir los cobros en este momento.',
      ...debugPayload(err)
    });
  } finally {
    client.release();
  }
}

/**
 * DELETE /api/compartir/dia
 * Deshace el compartir de cobros de una fecha (retoma los cobros para el propietario).
 */
export async function dejarDeCompartirDia(req, res) {
  try {
    const propietarioId = req.user?.id || req.body?.cobrador_id || (await getDefaultCobradorId());
    const fecha = req.body?.fecha_cobro || req.query?.fecha_cobro;
    const destinatarioId = req.body?.destinatario_id || req.query?.destinatario_id || null;

    if (!fecha) {
      return res.status(400).json({
        success: false,
        userMessage: 'Debes indicar la fecha de cobro que deseas retomar.'
      });
    }

    let updateSql = `
      UPDATE agenda_cobros
      SET compartido_con_usuario_id = NULL,
          compartido_en = NULL
      WHERE cobrador_id = $1::uuid
        AND fecha_cobro_actual = $2::date
    `;
    const params = [propietarioId, fecha];

    if (destinatarioId) {
      updateSql += ` AND compartido_con_usuario_id = $3::uuid`;
      params.push(destinatarioId);
    }
    updateSql += ` RETURNING id;`;

    const { rows: revertedRows } = await query(updateSql, params);

    // Limpiar cobros_compartidos_dia
    let deleteRegistroSql = `
      DELETE FROM cobros_compartidos_dia
      WHERE propietario_id = $1::uuid
        AND fecha_cobro = $2::date
    `;
    const delParams = [propietarioId, fecha];
    if (destinatarioId) {
      deleteRegistroSql += ` AND destinatario_id = $3::uuid`;
      delParams.push(destinatarioId);
    }
    await query(deleteRegistroSql, delParams);

    return res.json({
      success: true,
      mensaje: 'Cobros retomados con éxito.',
      revertidos: revertedRows.length
    });
  } catch (err) {
    console.error('[Compartir Cobros] Error al dejar de compartir:', err);
    return res.status(500).json({
      success: false,
      error: 'Error al dejar de compartir cobros.',
      userMessage: 'No se pudieron retomar los cobros en este momento.',
      ...debugPayload(err)
    });
  }
}

export default {
  getPersonas,
  agregarPersona,
  eliminarPersona,
  getResumenDiaParaCompartir,
  compartirCobrosDia,
  dejarDeCompartirDia
};

