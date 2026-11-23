import { pool, query, debugPayload } from '../config/db.js';

const SQL_CODIGO_EXPR = "COALESCE(NULLIF(BTRIM(u.codigo_vinculacion), ''), ('CF-' || UPPER(SUBSTRING(u.id::text FROM 1 FOR 8))))";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatPersonaRow(row, contactoId = null) {
  const codigo = String(row.codigo_vinculacion || row.codigo_id || '').trim()
    || `CF-${String(row.usuario_id || row.id || '').substring(0, 8).toUpperCase()}`;
  return {
    contacto_id: contactoId || row.contacto_id || null,
    usuario_id: row.usuario_id || row.id,
    codigo_id: codigo,
    codigo_vinculacion: codigo,
    usuario: row.usuario,
    username: row.usuario,
    nombre_completo: row.nombre_completo,
    correo: row.correo,
    rol: row.rol,
    foto_url: row.foto_url || null,
    creado_en: row.creado_en || undefined,
    ya_vinculado: typeof row.ya_vinculado === 'boolean' ? row.ya_vinculado : undefined
  };
}

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
 * Obtiene contactos vinculados filtrando únicamente por usuario o código de vinculación.
 */
export async function getPersonas(req, res) {
  try {
    const propietarioId = req.user?.id;
    if (!propietarioId) {
      return res.status(401).json({
        ok: false,
        success: false,
        error: 'No autenticado',
        userMessage: 'Debes iniciar sesión para continuar.'
      });
    }
    const searchTerm = String(req.query.q || '').trim();
    const cleanUserTerm = searchTerm.replace(/^@+/, '').toLowerCase();
    const upperTerm = searchTerm.toUpperCase();
    const cleanHexTerm = upperTerm.replace(/^CF-/i, '');

    // 1. Personas ya vinculadas en contactos_cobradores
    let misPersonas = [];
    if (searchTerm.length > 0) {
      const sqlMisPersonasFiltradas = `
        SELECT
          c.id AS contacto_id,
          u.id AS usuario_id,
          ${SQL_CODIGO_EXPR} AS codigo_vinculacion,
          ${SQL_CODIGO_EXPR} AS codigo_id,
          u.usuario,
          u.nombre_completo,
          u.correo,
          u.rol,
          u.foto_url,
          c.creado_en
        FROM contactos_cobradores c
        JOIN usuarios u ON c.contacto_usuario_id = u.id
        WHERE c.propietario_id = $1::uuid
          AND (
            LOWER(u.usuario) LIKE $2
            OR UPPER(${SQL_CODIGO_EXPR}) LIKE $3
            OR UPPER(SUBSTRING(u.id::text FROM 1 FOR 8)) LIKE $4
          )
        ORDER BY u.nombre_completo ASC;
      `;
      const { rows } = await query(sqlMisPersonasFiltradas, [
        propietarioId,
        `%${cleanUserTerm}%`,
        `%${upperTerm}%`,
        `%${cleanHexTerm}%`
      ]);
      misPersonas = rows.map((r) => formatPersonaRow(r));
    } else {
      const sqlMisPersonas = `
        SELECT
          c.id AS contacto_id,
          u.id AS usuario_id,
          ${SQL_CODIGO_EXPR} AS codigo_vinculacion,
          ${SQL_CODIGO_EXPR} AS codigo_id,
          u.usuario,
          u.nombre_completo,
          u.correo,
          u.rol,
          u.foto_url,
          c.creado_en
        FROM contactos_cobradores c
        JOIN usuarios u ON c.contacto_usuario_id = u.id
        WHERE c.propietario_id = $1::uuid
        ORDER BY u.nombre_completo ASC;
      `;
      const { rows } = await query(sqlMisPersonas, [propietarioId]);
      misPersonas = rows.map((r) => formatPersonaRow(r));
    }

    // 2. Resultados globales por nombre de usuario o código de vinculación (sin nombre_completo)
    let resultadosBusqueda = [];
    if (searchTerm.length > 0) {
      const sqlBusqueda = `
        SELECT
          u.id AS usuario_id,
          ${SQL_CODIGO_EXPR} AS codigo_vinculacion,
          ${SQL_CODIGO_EXPR} AS codigo_id,
          u.usuario,
          u.nombre_completo,
          u.correo,
          u.rol,
          u.foto_url,
          EXISTS (
            SELECT 1 FROM contactos_cobradores cc
            WHERE cc.propietario_id = $1::uuid AND cc.contacto_usuario_id = u.id
          ) AS ya_vinculado
        FROM usuarios u
        WHERE u.id <> $1::uuid
          AND (
            LOWER(u.usuario) LIKE $2
            OR UPPER(${SQL_CODIGO_EXPR}) LIKE $3
            OR UPPER(SUBSTRING(u.id::text FROM 1 FOR 8)) LIKE $4
          )
        ORDER BY u.usuario ASC
        LIMIT 20;
      `;
      const { rows } = await query(sqlBusqueda, [
        propietarioId,
        `%${cleanUserTerm}%`,
        `%${upperTerm}%`,
        `%${cleanHexTerm}%`
      ]);
      resultadosBusqueda = rows.map((r) => formatPersonaRow(r));
    }

    return res.json({
      ok: true,
      success: true,
      misPersonas,
      resultadosBusqueda
    });
  } catch (err) {
    console.error('[Compartir Cobros] Error al obtener personas:', err);
    return res.status(500).json({
      ok: false,
      success: false,
      error: 'Error al consultar contactos de cobro.',
      userMessage: 'No se pudieron consultar los contactos en este momento.',
      ...debugPayload(err)
    });
  }
}

async function buscarUsuarioPorCodigo(rawCodigo) {
  const cleanCodeHex = rawCodigo.replace(/^CF-/i, '');
  const canonicalCodigo = cleanCodeHex ? `CF-${cleanCodeHex}` : rawCodigo;
  const sql = `
    SELECT
      u.id,
      u.usuario,
      u.nombre_completo,
      u.correo,
      u.rol,
      u.foto_url,
      ${SQL_CODIGO_EXPR} AS codigo_vinculacion
    FROM usuarios u
    WHERE UPPER(${SQL_CODIGO_EXPR}) = $1
       OR UPPER(REPLACE(${SQL_CODIGO_EXPR}, 'CF-', '')) = $2
       OR UPPER(SUBSTRING(u.id::text FROM 1 FOR 8)) = $2
    LIMIT 1;
  `;
  const { rows } = await query(sql, [canonicalCodigo, cleanCodeHex]);
  return rows[0] || null;
}

async function buscarUsuarioPorNombreUsuario(cleanUsername) {
  const sql = `
    SELECT
      u.id,
      u.usuario,
      u.nombre_completo,
      u.correo,
      u.rol,
      u.foto_url,
      ${SQL_CODIGO_EXPR} AS codigo_vinculacion
    FROM usuarios u
    WHERE LOWER(u.usuario) = LOWER($1)
    LIMIT 1;
  `;
  const { rows } = await query(sql, [cleanUsername]);
  return rows[0] || null;
}

/**
 * POST /api/compartir/personas
 * Vincula una cuenta existente exclusivamente por contacto_usuario_id, nombre de usuario o código de vinculación.
 */
export async function agregarPersona(req, res) {
  try {
    const propietarioId = req.user?.id;
    if (!propietarioId) {
      return res.status(401).json({
        ok: false,
        success: false,
        error: 'No autenticado',
        userMessage: 'Debes iniciar sesión para continuar.'
      });
    }
    const {
      contacto_usuario_id,
      username,
      usuario,
      codigo,
      codigo_vinculacion
    } = req.body || {};

    let usuarioEncontrado = null;

    // Opción directa desde resultados de búsqueda en vivo
    if (contacto_usuario_id) {
      if (!UUID_REGEX.test(String(contacto_usuario_id))) {
        return res.status(400).json({
          ok: false,
          success: false,
          userMessage: 'Identificador de usuario inválido.'
        });
      }
      const { rows } = await query(
        `SELECT
          u.id,
          u.usuario,
          u.nombre_completo,
          u.correo,
          u.rol,
          u.foto_url,
          ${SQL_CODIGO_EXPR} AS codigo_vinculacion
         FROM usuarios u
         WHERE u.id = $1::uuid
         LIMIT 1;`,
        [contacto_usuario_id]
      );
      usuarioEncontrado = rows[0] || null;
      if (!usuarioEncontrado) {
        return res.status(404).json({
          ok: false,
          success: false,
          userMessage: 'La cuenta seleccionada ya no se encuentra registrada.'
        });
      }
    } else {
      // Validación estricta por las 2 opciones: Nombre de usuario o Código de vinculación
      const cleanUsername = String(username ?? usuario ?? '').trim().replace(/^@+/, '');
      const cleanCodigo = String(codigo ?? codigo_vinculacion ?? '').trim().toUpperCase();

      if (!cleanUsername && !cleanCodigo) {
        return res.status(400).json({
          ok: false,
          success: false,
          userMessage: 'Ingresa el nombre de usuario o el código de la persona para vincularla.'
        });
      }

      if (cleanUsername && cleanCodigo) {
        const matchUser = await buscarUsuarioPorNombreUsuario(cleanUsername);
        const codeHex = cleanCodigo.replace(/^CF-/i, '');
        const canonicalCode = codeHex ? `CF-${codeHex}` : cleanCodigo;

        if (!matchUser) {
          const matchCode = await buscarUsuarioPorCodigo(cleanCodigo);
          if (matchCode) {
            return res.status(400).json({
              ok: false,
              success: false,
              userMessage: 'El nombre de usuario y el código ingresados no corresponden a la misma cuenta.'
            });
          }
          return res.status(404).json({
            ok: false,
            success: false,
            userMessage: 'No se encontró ninguna cuenta registrada con ese nombre de usuario o código.'
          });
        }

        const resolvedCode = String(matchUser.codigo_vinculacion || '').toUpperCase();
        const resolvedHex = resolvedCode.replace(/^CF-/i, '');
        if (resolvedCode !== canonicalCode && resolvedHex !== codeHex) {
          return res.status(400).json({
            ok: false,
            success: false,
            userMessage: 'El nombre de usuario y el código ingresados no corresponden a la misma cuenta.'
          });
        }
        usuarioEncontrado = matchUser;
      } else if (cleanUsername) {
        usuarioEncontrado = await buscarUsuarioPorNombreUsuario(cleanUsername);
      } else {
        usuarioEncontrado = await buscarUsuarioPorCodigo(cleanCodigo);
      }

      if (!usuarioEncontrado) {
        return res.status(404).json({
          ok: false,
          success: false,
          userMessage: 'No se encontró ninguna cuenta registrada con ese nombre de usuario o código.'
        });
      }
    }

    if (usuarioEncontrado.id === propietarioId) {
      return res.status(400).json({
        ok: false,
        success: false,
        userMessage: 'No puedes vincularte a tu propia cuenta.'
      });
    }

    const { rows: existingContact } = await query(
      `SELECT id FROM contactos_cobradores
        WHERE propietario_id = $1::uuid AND contacto_usuario_id = $2::uuid
        LIMIT 1;`,
      [propietarioId, usuarioEncontrado.id]
    );

    if (existingContact.length > 0) {
      return res.status(200).json({
        ok: true,
        success: true,
        yaVinculada: true,
        persona: formatPersonaRow(usuarioEncontrado, existingContact[0].id),
        userMessage: 'Esta persona ya se encuentra en tu lista.',
        mensaje: 'Esta persona ya se encuentra en tu lista.'
      });
    }

    const { rows: insertedRows } = await query(
      `INSERT INTO contactos_cobradores (propietario_id, contacto_usuario_id)
       VALUES ($1::uuid, $2::uuid)
       RETURNING id;`,
      [propietarioId, usuarioEncontrado.id]
    );

    return res.status(201).json({
      ok: true,
      success: true,
      yaVinculada: false,
      persona: formatPersonaRow(usuarioEncontrado, insertedRows[0]?.id || null),
      userMessage: 'Persona vinculada correctamente.',
      mensaje: 'Persona vinculada correctamente.'
    });
  } catch (err) {
    console.error('[Compartir Cobros] Error al agregar persona:', err);
    return res.status(500).json({
      ok: false,
      success: false,
      error: 'Error interno al vincular persona.',
      userMessage: 'No se pudo vincular a la persona en este momento.',
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
    const propietarioId = req.user?.id;
    if (!propietarioId) {
      return res.status(401).json({
        ok: false,
        success: false,
        error: 'No autenticado',
        userMessage: 'Debes iniciar sesión para continuar.'
      });
    }
    const { contactoId } = req.params;

    if (!contactoId || !UUID_REGEX.test(String(contactoId))) {
      return res.status(400).json({
        ok: false,
        success: false,
        userMessage: 'Identificador de contacto no especificado o inválido.'
      });
    }

    await query(
      `DELETE FROM contactos_cobradores
       WHERE (id = $1::uuid OR contacto_usuario_id = $1::uuid)
         AND propietario_id = $2::uuid;`,
      [contactoId, propietarioId]
    );

    return res.json({
      ok: true,
      success: true,
      userMessage: 'Contacto retirado de la lista con éxito.',
      mensaje: 'Contacto retirado de la lista con éxito.'
    });
  } catch (err) {
    console.error('[Compartir Cobros] Error al eliminar persona:', err);
    return res.status(500).json({
      ok: false,
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
    const propietarioId = req.user?.id;
    if (!propietarioId) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado',
        userMessage: 'Debes iniciar sesión para continuar.'
      });
    }
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
  const propietarioId = req.user?.id;
  if (!propietarioId) {
    return res.status(401).json({
      success: false,
      error: 'No autenticado',
      userMessage: 'Debes iniciar sesión para continuar.'
    });
  }
  const client = await pool.connect();
  try {
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
    if (!UUID_REGEX.test(String(destinatario_id))) {
      return res.status(400).json({
        success: false,
        userMessage: 'La persona seleccionada no es válida.'
      });
    }
    if (destinatario_id === propietarioId) {
      return res.status(400).json({
        success: false,
        userMessage: 'No puedes compartir cobros contigo mismo.'
      });
    }

    await client.query('BEGIN');

    // 1. Validación ReBAC estricta: exige vínculo previo activo en contactos_cobradores y destinatario COBRADOR ACTIVA
    const relRes = await client.query(
      `SELECT cc.id, u.id AS destinatario_id, u.nombre_completo, u.usuario
       FROM contactos_cobradores cc
       INNER JOIN usuarios u ON u.id = cc.contacto_usuario_id
       WHERE cc.propietario_id = $1::uuid
         AND cc.contacto_usuario_id = $2::uuid
         AND u.rol = 'COBRADOR'::public.rol_usuario
         AND u.estado_cuenta = 'ACTIVA'::public.estado_cuenta
       LIMIT 1;`,
      [propietarioId, destinatario_id]
    );

    if (relRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        ok: false,
        success: false,
        error: 'Relacion no autorizada',
        userMessage: 'Solo puedes compartir cobros con personas vinculadas en tu lista de contactos.'
      });
    }
    const destinatario = {
      id: relRes.rows[0].destinatario_id,
      nombre_completo: relRes.rows[0].nombre_completo,
      usuario: relRes.rows[0].usuario
    };

    const propRes = await client.query(
      `SELECT id, nombre_completo, usuario FROM usuarios WHERE id = $1::uuid;`,
      [propietarioId]
    );
    const propietarioNombre = propRes.rows[0]?.nombre_completo || propRes.rows[0]?.usuario || 'Otro prestamista';

    // 2. Actualizar agenda_cobros con trazabilidad completa de delegación
    let updateSql = '';
    let params = [];

    if (Array.isArray(agenda_ids) && agenda_ids.length > 0) {
      updateSql = `
        UPDATE agenda_cobros
        SET compartido_con_usuario_id = $1::uuid,
            compartido_por_usuario_id = $2::uuid,
            compartido_en = now(),
            gestionado_por_usuario_id = NULL,
            gestionado_accion = NULL,
            gestionado_en = NULL
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
            compartido_por_usuario_id = $2::uuid,
            compartido_en = now(),
            gestionado_por_usuario_id = NULL,
            gestionado_accion = NULL,
            gestionado_en = NULL
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

    // 4. Crear notificación interna para el destinatario con fecha explícita, propietario, conteo y monto
    const montoLegible = `₡${Math.round(montoTotal).toLocaleString('en-US')}`;
    const notifMsg = cantidadCobros === 1
      ? `${propietarioNombre} compartió 1 cobro contigo para la fecha ${fecha_cobro} por ${montoLegible}.`
      : `${propietarioNombre} compartió ${cantidadCobros} cobros contigo para la fecha ${fecha_cobro} por ${montoLegible}.`;

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
    const propietarioId = req.user?.id;
    if (!propietarioId) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado',
        userMessage: 'Debes iniciar sesión para continuar.'
      });
    }
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
          compartido_por_usuario_id = NULL,
          compartido_en = NULL
      WHERE cobrador_id = $1::uuid
        AND fecha_cobro_actual = $2::date
        AND estado IN ('PENDIENTE'::public.estado_cuota_cobro, 'PASADO_DE_DIA'::public.estado_cuota_cobro)
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

/**
 * POST /api/compartir/revertir-cobro/:agendaId
 * Permite al propietario retirar el envío individual de un cobro pendiente antes de que el receptor lo gestione.
 */
export async function revertirCobroCompartido(req, res) {
  try {
    const propietarioId = req.user?.id;
    if (!propietarioId) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado',
        userMessage: 'Debes iniciar sesión para continuar.'
      });
    }
    const { agendaId } = req.params;

    if (!agendaId || !UUID_REGEX.test(agendaId)) {
      return res.status(400).json({
        success: false,
        userMessage: 'El identificador del cobro indicado no es válido.'
      });
    }

    const checkRes = await query(
      `SELECT a.id, p.cobrador_id, a.estado
       FROM agenda_cobros a
       JOIN prestamos p ON a.prestamo_id = p.id
       WHERE a.id = $1::uuid;`,
      [agendaId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        userMessage: 'No se encontró el cobro solicitado.'
      });
    }

    const row = checkRes.rows[0];
    if (String(row.cobrador_id) !== String(propietarioId)) {
      return res.status(403).json({
        success: false,
        userMessage: 'Solo el prestamista propietario puede retirar este envío.'
      });
    }

    if (row.estado !== 'PENDIENTE' && row.estado !== 'PASADO_DE_DIA') {
      return res.status(409).json({
        success: false,
        userMessage: 'Este cobro ya fue gestionado y no se puede retirar.'
      });
    }

    const { rows: updated } = await query(
      `UPDATE agenda_cobros
       SET compartido_con_usuario_id = NULL,
           compartido_por_usuario_id = NULL,
           compartido_en = NULL
       WHERE id = $1::uuid
         AND estado IN ('PENDIENTE'::public.estado_cuota_cobro, 'PASADO_DE_DIA'::public.estado_cuota_cobro)
       RETURNING id;`,
      [agendaId]
    );

    return res.json({
      success: true,
      mensaje: 'Envío retirado con éxito.',
      revertido: updated.length > 0,
      id: agendaId
    });
  } catch (err) {
    console.error('[Compartir Cobros] Error al revertir cobro individual:', err);
    return res.status(500).json({
      success: false,
      error: 'Error al retirar envío de cobro.',
      userMessage: 'No se pudo retirar el envío en este momento.',
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
  dejarDeCompartirDia,
  revertirCobroCompartido
};

