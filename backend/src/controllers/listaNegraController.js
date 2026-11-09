import { query, debugPayload } from '../config/db.js';
import { getDefaultCobradorId } from '../services/seedService.js';
import { fetchHaciendaByCedula } from '../services/haciendaService.js';
import { DEFAULT_TELEFONO_LISTA_NEGRA, DEFAULT_CAMPO_LISTA_NEGRA } from './clientesController.js';

function cleanCedula9(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '').slice(0, 9);
  return digits.length === 9 ? digits : null;
}

/**
 * 1. GET /api/lista-negra
 * Retorna todas las personas activas en la Lista Negra
 */
export async function getListaNegra(req, res) {
  try {
    const cobradorId = req.query.cobrador_id || req.user?.id || await getDefaultCobradorId();

    const sql = `
      SELECT 
        ln.id,
        ln.cobrador_id,
        ln.cliente_id,
        ln.cedula,
        ln.nombre,
        ln.apellidos,
        ln.activo,
        ln.fecha_registro,
        c.telefono,
        c.ubicacion
      FROM lista_negra ln
      LEFT JOIN clientes c ON c.id = ln.cliente_id
      WHERE ln.cobrador_id = $1 AND ln.activo = true
      ORDER BY ln.fecha_registro DESC, ln.id DESC;
    `;

    const { rows } = await query(sql, [cobradorId]);
    return res.json(rows);
  } catch (err) {
    console.error('[Error SQL detallado]: Error al obtener registros de Lista Negra:', err);
    return res.status(500).json({
      error: 'No se pudieron consultar los registros de la Lista Negra en este momento.',
      userMessage: 'No se pudieron consultar los registros de la Lista Negra en este momento.',
      ...debugPayload(err)
    });
  }
}

/**
 * Función interna de búsqueda inteligente para verificar persona en Lista Negra,
 * clientes y morosidad acumulada en préstamos.
 */
export async function verificarPersonaInterna(cobradorId, searchTerm) {
  const q = String(searchTerm || '').trim();
  if (!q) return null;

  const cleanDigits = q.replace(/\D/g, '');
  const cleanCedula = cleanDigits.length === 9 ? cleanDigits : '';
  const textTerm = `%${q}%`;
  const phoneTerm = cleanDigits.length >= 4 ? `%${cleanDigits}%` : '';

  // 1. Buscar en clientes con sus préstamos y su vinculación con lista_negra
  const sqlClientes = `
    SELECT 
      c.id AS cliente_id,
      c.nombre,
      c.apellidos,
      c.cedula,
      c.telefono,
      c.ubicacion,
      c.estado AS estado_cliente,
      ln.id AS lista_negra_id,
      COALESCE(ln.activo, false) AS en_lista_negra,
      ln.fecha_registro AS fecha_registro_lista_negra,
      COALESCE(MAX(p.periodos_atrasados_acumulados), 0)::int AS periodos_atrasados_max,
      COALESCE(SUM(CASE WHEN p.estado NOT IN ('LIQUIDADO', 'SUSPENDIDO') THEN p.periodos_atrasados_acumulados * p.cuota ELSE 0 END), 0)::numeric AS monto_atrasado,
      COALESCE(SUM(CASE WHEN p.estado NOT IN ('LIQUIDADO', 'SUSPENDIDO') THEN p.saldo_por_pagar ELSE 0 END), 0)::numeric AS saldo_total_pendiente,
      COUNT(p.id) FILTER (WHERE p.estado NOT IN ('LIQUIDADO', 'SUSPENDIDO'))::int AS prestamos_activos_count,
      COUNT(p.id) FILTER (WHERE p.estado = 'ATRASADO')::int AS prestamos_atrasados_count,
      MAX(p.modalidad::text) AS modalidad
    FROM clientes c
    LEFT JOIN lista_negra ln ON (ln.cliente_id = c.id OR (ln.cedula IS NOT NULL AND ln.cedula = c.cedula)) AND ln.activo = true AND ln.cobrador_id = $1
    LEFT JOIN prestamos p ON p.cliente_id = c.id
    WHERE c.cobrador_id = $1
      AND (
        ( $2 <> '' AND translate(lower(c.nombre || ' ' || COALESCE(c.apellidos, '')), 'áéíóúüñ', 'aeiouun') LIKE translate(lower($2), 'áéíóúüñ', 'aeiouun') )
        OR ( $3 <> '' AND c.cedula = $3 )
        OR ( $4 <> '' AND replace(COALESCE(c.telefono, ''), '-', '') LIKE $4 )
        OR ( $2 <> '' AND translate(lower(COALESCE(c.ubicacion, '')), 'áéíóúüñ', 'aeiouun') LIKE translate(lower($2), 'áéíóúüñ', 'aeiouun') )
      )
    GROUP BY c.id, c.nombre, c.apellidos, c.cedula, c.telefono, c.ubicacion, c.estado, ln.id, ln.activo, ln.fecha_registro
    ORDER BY en_lista_negra DESC, periodos_atrasados_max DESC, c.nombre ASC
    LIMIT 1;
  `;

  const { rows: clientRows } = await query(sqlClientes, [cobradorId, textTerm, cleanCedula, phoneTerm]);

  if (clientRows.length > 0) {
    const row = clientRows[0];
    const enListaNegra = Boolean(row.en_lista_negra || row.estado_cliente === 'EN_LISTA_NEGRA');
    const periodosAtrasados = Number(row.periodos_atrasados_max || 0);
    const montoAtrasado = Number(row.monto_atrasado || 0);
    const tieneMorosidad = (periodosAtrasados > 0 || Number(row.prestamos_atrasados_count || 0) > 0);

    return {
      encontrado: true,
      enListaNegra,
      tieneMorosidad,
      registro: {
        cliente_id: row.cliente_id,
        id: row.lista_negra_id || row.cliente_id,
        lista_negra_id: row.lista_negra_id,
        nombre: row.nombre,
        apellidos: row.apellidos || '',
        cedula: row.cedula,
        telefono: row.telefono,
        ubicacion: row.ubicacion,
        fecha_registro: row.fecha_registro_lista_negra,
        periodos_atrasados_acumulados: periodosAtrasados,
        modalidad: row.modalidad || 'SEMANAL',
        monto_atrasado: montoAtrasado,
        saldo_total_pendiente: Number(row.saldo_total_pendiente || 0),
        prestamos_activos_count: Number(row.prestamos_activos_count || 0),
        prestamos_atrasados_count: Number(row.prestamos_atrasados_count || 0),
        estado_cliente: row.estado_cliente
      }
    };
  }

  // 2. Si no se encontró en clientes, buscar si existe directamente en lista_negra (sin cliente asociado o con cliente vinculado)
  const sqlListaNegra = `
    SELECT 
      ln.id,
      ln.cobrador_id,
      ln.cliente_id,
      ln.cedula,
      ln.nombre,
      ln.apellidos,
      ln.activo,
      ln.fecha_registro,
      c.telefono,
      c.ubicacion
    FROM lista_negra ln
    LEFT JOIN clientes c ON c.id = ln.cliente_id
    WHERE ln.cobrador_id = $1
      AND ln.activo = true
      AND (
        ( $2 <> '' AND translate(lower(ln.nombre || ' ' || COALESCE(ln.apellidos, '')), 'áéíóúüñ', 'aeiouun') LIKE translate(lower($2), 'áéíóúüñ', 'aeiouun') )
        OR ( $3 <> '' AND ln.cedula = $3 )
        OR ( $2 <> '' AND translate(lower(COALESCE(c.ubicacion, '')), 'áéíóúüñ', 'aeiouun') LIKE translate(lower($2), 'áéíóúüñ', 'aeiouun') )
      )
    ORDER BY ln.fecha_registro DESC
    LIMIT 1;
  `;
  const { rows: lnRows } = await query(sqlListaNegra, [cobradorId, textTerm, cleanCedula]);

  if (lnRows.length > 0) {
    const lnRow = lnRows[0];
    return {
      encontrado: true,
      enListaNegra: true,
      tieneMorosidad: false,
      registro: {
        cliente_id: lnRow.cliente_id,
        id: lnRow.id,
        lista_negra_id: lnRow.id,
        nombre: lnRow.nombre,
        apellidos: lnRow.apellidos || '',
        cedula: lnRow.cedula,
        telefono: lnRow.telefono || null,
        ubicacion: lnRow.ubicacion || null,
        fecha_registro: lnRow.fecha_registro,
        periodos_atrasados_acumulados: 0,
        modalidad: null,
        monto_atrasado: 0
      }
    };
  }

  // 3. Si no existe en BD local y la consulta tiene formato de 9 dígitos de cédula, consultar Hacienda CR
  if (cleanCedula.length === 9) {
    try {
      const hacienda = await fetchHaciendaByCedula(cleanCedula, 3500);
      if (hacienda && hacienda.nombre) {
        return {
          encontrado: true,
          enListaNegra: false,
          tieneMorosidad: false,
          origen: 'hacienda',
          registro: {
            nombre: hacienda.nombre,
            apellidos: hacienda.apellidos || '',
            cedula: cleanCedula,
            telefono: null,
            ubicacion: null,
            periodos_atrasados_acumulados: 0,
            modalidad: null,
            monto_atrasado: 0
          }
        };
      }
    } catch {
      // Ignorar timeout o error de red hacia Hacienda
    }

    return {
      encontrado: false,
      enListaNegra: false,
      tieneMorosidad: false,
      cedula: cleanCedula,
      registro: {
        cedula: cleanCedula,
        nombre: '',
        apellidos: '',
        periodos_atrasados_acumulados: 0,
        modalidad: null,
        monto_atrasado: 0
      }
    };
  }

  return {
    encontrado: false,
    enListaNegra: false,
    tieneMorosidad: false,
    termino: q,
    registro: null
  };
}

/**
 * 2. GET /api/lista-negra/consultar/:cedula
 * Consulta por cédula manteniendo compatibilidad
 */
export async function consultarCedulaListaNegra(req, res) {
  try {
    const cobradorId = req.query.cobrador_id || req.user?.id || await getDefaultCobradorId();
    const { cedula } = req.params;
    const resultado = await verificarPersonaInterna(cobradorId, cedula);

    if (!resultado) {
      return res.status(400).json({ error: 'Debes proporcionar un número de cédula válido.' });
    }

    return res.json(resultado);
  } catch (err) {
    console.error('[Error SQL detallado]: Error al consultar cédula en Lista Negra:', err);
    return res.status(500).json({
      error: 'No se pudo consultar la cédula en la Lista Negra en este momento.',
      userMessage: 'No se pudo consultar la cédula en la Lista Negra en este momento.',
      ...debugPayload(err)
    });
  }
}

/**
 * 2b. GET /api/lista-negra/verificar
 * Verificación en tiempo real por Nombre, Cédula o Teléfono
 */
export async function verificarPersonaListaNegra(req, res) {
  try {
    const cobradorId = req.query.cobrador_id || req.user?.id || await getDefaultCobradorId();
    const q = req.query.q || req.query.query || req.query.cedula || '';
    const resultado = await verificarPersonaInterna(cobradorId, q);

    if (!resultado) {
      return res.status(400).json({ error: 'Debes proporcionar un término de búsqueda.' });
    }

    return res.json(resultado);
  } catch (err) {
    console.error('[Error SQL detallado]: Error al verificar persona en Lista Negra:', err);
    return res.status(500).json({
      error: 'No se pudo verificar a la persona en este momento.',
      userMessage: 'No se pudo verificar a la persona en este momento.',
      ...debugPayload(err)
    });
  }
}

/**
 * 3. POST /api/lista-negra
 * Registra directamente a una persona en la Lista Negra (sin motivo)
 */
export async function registrarEnListaNegra(req, res) {
  try {
    const cobradorId = req.body.cobrador_id || req.user?.id || await getDefaultCobradorId();
    const { cedula, nombre, apellidos } = req.body;

    const trimmedNombre = (nombre || '').trim();
    const trimmedApellidos = (apellidos || '').trim();
    const cleanCedula = cleanCedula9(cedula);

    if (!trimmedNombre) {
      return res.status(400).json({
        error: 'El nombre es obligatorio.',
        userMessage: 'El nombre es obligatorio.'
      });
    }

    if (cedula && !cleanCedula) {
      return res.status(400).json({
        error: 'La cédula debe contener exactamente 9 dígitos numéricos.',
        userMessage: 'La cédula debe contener exactamente 9 dígitos numéricos.'
      });
    }

    // 1. Verificar si ya se encuentra activa en la Lista Negra
    if (cleanCedula) {
      const { rows: existActivo } = await query(
        `SELECT id FROM lista_negra WHERE cobrador_id = $1 AND cedula = $2 AND activo = true LIMIT 1;`,
        [cobradorId, cleanCedula]
      );
      if (existActivo.length > 0) {
        return res.status(400).json({
          error: 'Esta persona ya se encuentra activa en la Lista Negra.',
          userMessage: 'Esta persona ya se encuentra activa en la Lista Negra.'
        });
      }
    }

    // 2. Verificar si coincide con un cliente existente en la base de datos
    let clienteId = req.body.cliente_id || null;
    if (!clienteId && cleanCedula) {
      const { rows: clientRows } = await query(
        `SELECT id FROM clientes WHERE cobrador_id = $1 AND cedula = $2 LIMIT 1;`,
        [cobradorId, cleanCedula]
      );
      if (clientRows.length > 0) {
        clienteId = clientRows[0].id;
      }
    }

    // Si existe cliente, actualizar su estado a EN_LISTA_NEGRA y suspender sus préstamos con casteo explícito
    if (clienteId) {
      await query(
        `UPDATE clientes 
         SET estado = 'EN_LISTA_NEGRA'::public.estado_cliente, version = COALESCE(version, 1) + 1, actualizado_en = now()
         WHERE id = $1::uuid AND cobrador_id = $2::uuid;`,
        [clienteId, cobradorId]
      );
      await query('SELECT suspender_prestamos_cliente($1);', [clienteId]);
    }

    // 3. Insertar o reactivar en lista_negra
    let registroInsertado = null;

    if (cleanCedula) {
      const insertSql = `
        INSERT INTO lista_negra (
          cobrador_id,
          cliente_id,
          cedula,
          nombre,
          apellidos,
          activo,
          fecha_registro,
          fecha_salida
        ) VALUES (
          $1::uuid, $2, $3, $4, $5, true, (now() AT TIME ZONE 'America/Costa_Rica')::date, NULL
        )
        ON CONFLICT (cobrador_id, cedula) DO UPDATE
        SET activo = true,
            cliente_id = COALESCE(EXCLUDED.cliente_id, lista_negra.cliente_id),
            nombre = EXCLUDED.nombre,
            apellidos = EXCLUDED.apellidos,
            fecha_registro = (now() AT TIME ZONE 'America/Costa_Rica')::date,
            fecha_salida = NULL
        RETURNING *;
      `;
      const { rows } = await query(insertSql, [
        cobradorId,
        clienteId,
        cleanCedula,
        trimmedNombre,
        trimmedApellidos || null
      ]);
      registroInsertado = rows[0];
    } else {
      const insertSql = `
        INSERT INTO lista_negra (
          cobrador_id,
          cliente_id,
          cedula,
          nombre,
          apellidos,
          activo,
          fecha_registro,
          fecha_salida
        ) VALUES (
          $1::uuid, $2, NULL, $3, $4, true, (now() AT TIME ZONE 'America/Costa_Rica')::date, NULL
        )
        RETURNING *;
      `;
      const { rows } = await query(insertSql, [
        cobradorId,
        clienteId,
        trimmedNombre,
        trimmedApellidos || null
      ]);
      registroInsertado = rows[0];
    }

    // 4. Bitácora de actividad con casteo explícito de enum
    const logSql = `
      INSERT INTO bitacora_actividad (
        usuario_id,
        cobrador_id,
        accion,
        entidad,
        entidad_id,
        cedula,
        detalle
      ) VALUES ($1::uuid, $2::uuid, 'CLIENTE_A_LISTA_NEGRA'::public.accion_bitacora, 'lista_negra', $3::uuid, $4, $5);
    `;
    await query(logSql, [
      cobradorId,
      cobradorId,
      registroInsertado.id,
      cleanCedula,
      JSON.stringify({
        nombre: trimmedNombre,
        apellidos: trimmedApellidos || null,
        motivo: 'Registro manual en Lista Negra'
      })
    ]);

    return res.status(201).json({
      ok: true,
      mensaje: 'Persona registrada exitosamente en la Lista Negra.',
      userMessage: 'Persona registrada exitosamente en la Lista Negra.',
      registro: registroInsertado
    });
  } catch (err) {
    console.error('[Error SQL detallado]: Error al registrar persona en Lista Negra:', err);
    return res.status(500).json({
      error: 'No se pudo registrar a la persona en la Lista Negra en este momento.',
      userMessage: 'No se pudo registrar a la persona en la Lista Negra en este momento.',
      ...debugPayload(err)
    });
  }
}

/**
 * 4. POST /api/lista-negra/:id/sacar
 * Retira a la persona de la Lista Negra y la restaura/envía a Clientes registrados (Módulo 2)
 */
export async function sacarDeListaNegra(req, res) {
  try {
    const cobradorId = req.body.cobrador_id || req.user?.id || await getDefaultCobradorId();
    const { id } = req.params;

    // 1. Obtener y actualizar el registro en lista_negra
    const updateLnSql = `
      UPDATE lista_negra
      SET activo = false,
          fecha_salida = now()
      WHERE id = $1::uuid AND cobrador_id = $2::uuid AND activo = true
      RETURNING *;
    `;
    const { rows: lnRows } = await query(updateLnSql, [id, cobradorId]);

    if (lnRows.length === 0) {
      return res.status(404).json({
        error: 'El registro no existe o ya no está activo en la Lista Negra.',
        userMessage: 'El registro no existe o ya no está activo en la Lista Negra.'
      });
    }

    const regLn = lnRows[0];
    let finalClienteId = regLn.cliente_id;

    // 2. Si tenía cliente_id asociado, reactivarlo en clientes con casteo explícito de estado_cliente
    if (finalClienteId) {
      await query(
        `UPDATE clientes
         SET estado = 'ACTIVO'::public.estado_cliente,
             version = COALESCE(version, 1) + 1,
             actualizado_en = now()
         WHERE id = $1::uuid AND cobrador_id = $2::uuid;`,
        [finalClienteId, cobradorId]
      );
      // Reactivar préstamos que estaban suspendidos
      await query('SELECT reactivar_prestamos_cliente($1);', [finalClienteId]);
    } else if (regLn.cedula) {
      // Si no tenía cliente_id pero tiene cédula, comprobar si existe un cliente con esa cédula
      const { rows: clientCheck } = await query(
        `SELECT id FROM clientes WHERE cobrador_id = $1::uuid AND cedula = $2 LIMIT 1;`,
        [cobradorId, regLn.cedula]
      );

      if (clientCheck.length > 0) {
        finalClienteId = clientCheck[0].id;
        await query(
          `UPDATE clientes
           SET estado = 'ACTIVO'::public.estado_cliente,
               version = COALESCE(version, 1) + 1,
               actualizado_en = now()
           WHERE id = $1::uuid AND cobrador_id = $2::uuid;`,
          [finalClienteId, cobradorId]
        );
        await query('SELECT reactivar_prestamos_cliente($1);', [finalClienteId]);
        await query(`UPDATE lista_negra SET cliente_id = $1::uuid WHERE id = $2::uuid;`, [finalClienteId, id]);
      } else {
        // Crear el cliente en la tabla clientes para que aparezca en el Módulo 2
        const insertClientSql = `
          INSERT INTO clientes (
            cobrador_id,
            nombre,
            apellidos,
            cedula,
            telefono,
            ubicacion,
            detalles,
            estado
          ) VALUES (
            $1::uuid, $2, $3, $4, $5, $6, 'Restaurado desde Lista Negra', 'ACTIVO'::public.estado_cliente
          ) RETURNING id;
        `;
        const { rows: newClientRows } = await query(insertClientSql, [
          cobradorId,
          regLn.nombre,
          regLn.apellidos || '',
          cleanCedula9(regLn.cedula),
          DEFAULT_TELEFONO_LISTA_NEGRA,
          DEFAULT_CAMPO_LISTA_NEGRA
        ]);
        finalClienteId = newClientRows[0].id;
        await query(`UPDATE lista_negra SET cliente_id = $1::uuid WHERE id = $2::uuid;`, [finalClienteId, id]);
      }
    } else {
      // Sin cliente_id y sin cédula: crear cliente en tabla clientes
      const insertClientSql = `
        INSERT INTO clientes (
          cobrador_id,
          nombre,
          apellidos,
          cedula,
          telefono,
          ubicacion,
          detalles,
          estado
        ) VALUES (
          $1::uuid, $2, $3, NULL, $4, $5, 'Restaurado desde Lista Negra', 'ACTIVO'::public.estado_cliente
        ) RETURNING id;
      `;
      const { rows: newClientRows } = await query(insertClientSql, [
        cobradorId,
        regLn.nombre,
        regLn.apellidos || '',
        DEFAULT_TELEFONO_LISTA_NEGRA,
        DEFAULT_CAMPO_LISTA_NEGRA
      ]);
      finalClienteId = newClientRows[0].id;
      await query(`UPDATE lista_negra SET cliente_id = $1::uuid WHERE id = $2::uuid;`, [finalClienteId, id]);
    }

    // 3. Bitácora de actividad con casteo explícito de enum
    const finalCedula = cleanCedula9(regLn.cedula);
    const logSql = `
      INSERT INTO bitacora_actividad (
        usuario_id,
        cobrador_id,
        accion,
        entidad,
        entidad_id,
        cedula,
        detalle
      ) VALUES ($1::uuid, $2::uuid, 'CLIENTE_SACADO_DE_LISTA_NEGRA'::public.accion_bitacora, 'lista_negra', $3::uuid, $4, $5);
    `;
    await query(logSql, [
      cobradorId,
      cobradorId,
      id,
      finalCedula,
      JSON.stringify({
        nombre: regLn.nombre,
        apellidos: regLn.apellidos || '',
        detalle: 'Retirado de Lista Negra y restaurado a Clientes'
      })
    ]);

    return res.json({
      ok: true,
      mensaje: 'Persona retirada de la Lista Negra y enviada a Clientes registrados.',
      userMessage: 'Persona retirada de la Lista Negra y enviada a Clientes registrados.',
      clienteId: finalClienteId
    });
  } catch (err) {
    console.error('[Error SQL detallado]: Error al sacar persona de Lista Negra:', err);
    return res.status(500).json({
      error: 'No se pudo retirar a la persona de la Lista Negra en este momento.',
      userMessage: 'No se pudo retirar a la persona de la Lista Negra en este momento.',
      ...debugPayload(err)
    });
  }
}

