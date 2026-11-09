import { query, debugPayload } from '../config/db.js';
import { getDefaultCobradorId } from '../services/seedService.js';

function cleanCedula9(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '').slice(0, 9);
  return digits.length === 9 ? digits : null;
}

// Valores por defecto no vacíos para compatibilidad futura al pasar un registro de lista_negra a clientes
export const DEFAULT_TELEFONO_LISTA_NEGRA = '0000-0000';
export const DEFAULT_CAMPO_LISTA_NEGRA = 'Sin ubicación';

function validarCamposObligatoriosCliente(body = {}, isEdit = false) {
  const rawCedula = (body.cedula ?? '').toString().trim().replace(/\D/g, '');
  const cleanNombre = (body.nombre ?? '').toString().trim();
  const rawApellidos = (body.apellidos ?? '').toString().trim();
  const cleanTelefono = (body.telefono ?? '').toString().trim();
  const cleanUbicacion = (body.ubicacion ?? '').toString().trim();
  const rawDetalles = (body.detalles ?? '').toString().trim();

  // Solo 3 campos son obligatorios: Nombre, Teléfono y Ubicación
  if (!cleanNombre || !cleanTelefono || !cleanUbicacion) {
    return {
      valid: false,
      error: isEdit
        ? 'No has completado los datos necesarios para guardar los cambios del cliente.'
        : 'No has completado los datos necesarios para registrar un nuevo cliente.'
    };
  }

  // Número de cédula es opcional (NULL si viene vacío); si se escribe algo, debe tener 9 dígitos
  if (rawCedula.length > 0 && !/^[0-9]{9}$/.test(rawCedula)) {
    return {
      valid: false,
      error: 'El Número de Cédula debe contener exactamente 9 dígitos numéricos.',
      field: 'cedula'
    };
  }

  return {
    valid: true,
    values: {
      cleanCedula: rawCedula.length === 9 ? rawCedula : null,
      cleanNombre,
      cleanApellidos: rawApellidos.length > 0 ? rawApellidos : null,
      cleanTelefono,
      cleanUbicacion,
      cleanDetalles: rawDetalles.length > 0 ? rawDetalles : null
    }
  };
}

export async function getClientes(req, res) {
  try {
    const cobradorId = req.query.cobrador_id || req.user?.id || await getDefaultCobradorId();

    const sql = `
      SELECT 
        id,
        cobrador_id,
        cedula,
        nombre,
        apellidos,
        telefono,
        ubicacion,
        detalles,
        estado,
        version,
        creado_en,
        actualizado_en
      FROM clientes
      WHERE estado = 'ACTIVO' AND cobrador_id = $1
      ORDER BY creado_en DESC;
    `;
    const { rows } = await query(sql, [cobradorId]);
    return res.json(rows);
  } catch (err) {
    console.error('[Error SQL detallado]: Error al consultar clientes:', err);
    return res.status(500).json({
      error: 'No se pudieron consultar los clientes en este momento.',
      userMessage: 'No se pudieron consultar los clientes en este momento.',
      ...debugPayload(err)
    });
  }
}

export async function createCliente(req, res) {
  try {
    const validacion = validarCamposObligatoriosCliente(req.body, false);
    if (!validacion.valid) {
      return res.status(400).json({ error: validacion.error, userMessage: validacion.error, field: validacion.field || null });
    }

    const {
      cleanCedula,
      cleanNombre,
      cleanApellidos,
      cleanTelefono,
      cleanUbicacion,
      cleanDetalles
    } = validacion.values;

    const cobradorId = req.body.cobrador_id || req.user?.id || await getDefaultCobradorId();

    // 1. Verificar duplicidad de teléfono entre clientes activos
    const { rows: dupPhone } = await query(
      `SELECT id FROM clientes
       WHERE estado = 'ACTIVO'
         AND cobrador_id = $3
         AND regexp_replace(telefono, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')
         AND ($2::uuid IS NULL OR id <> $2::uuid)
       LIMIT 1;`,
      [cleanTelefono, null, cobradorId]
    );
    if (dupPhone.length > 0) {
      return res.status(409).json({
        error: 'Este número de teléfono ya se encuentra registrado.',
        userMessage: 'Este número de teléfono ya se encuentra registrado.',
        field: 'telefono'
      });
    }

    // 2. Verificar duplicidad de cédula si el usuario ingresó una cédula
    if (cleanCedula) {
      const { rows: dupCedula } = await query(
        `SELECT id FROM clientes
         WHERE estado = 'ACTIVO'
           AND cobrador_id = $3
           AND cedula = $1
           AND ($2::uuid IS NULL OR id <> $2::uuid)
         LIMIT 1;`,
        [cleanCedula, null, cobradorId]
      );
      if (dupCedula.length > 0) {
        return res.status(409).json({
          error: 'Este número de cédula ya se encuentra registrado.',
          userMessage: 'Este número de cédula ya se encuentra registrado.',
          field: 'cedula'
        });
      }
    }

    const insertSql = `
      INSERT INTO clientes (
        cobrador_id,
        cedula,
        nombre,
        apellidos,
        telefono,
        ubicacion,
        detalles,
        estado
      ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, 'ACTIVO'::public.estado_cliente)
      RETURNING *;
    `;

    const { rows } = await query(insertSql, [
      cobradorId,
      cleanCedula,
      cleanNombre,
      cleanApellidos,
      cleanTelefono,
      cleanUbicacion,
      cleanDetalles,
    ]);

    const nuevoCliente = rows[0];

    // Registro en bitácora de actividad (inmutable) con casteo estricto
    const finalCedula = cleanCedula9(nuevoCliente.cedula);
    const logSql = `
      INSERT INTO bitacora_actividad (
        usuario_id,
        cobrador_id,
        accion,
        entidad,
        entidad_id,
        cedula,
        detalle
      ) VALUES ($1::uuid, $2::uuid, 'CLIENTE_CREADO'::public.accion_bitacora, 'clientes', $3::uuid, $4, $5);
    `;
    await query(logSql, [
      cobradorId,
      cobradorId,
      nuevoCliente.id,
      finalCedula,
      JSON.stringify({
        nombre: nuevoCliente.nombre,
        apellidos: nuevoCliente.apellidos,
        telefono: nuevoCliente.telefono,
        ubicacion: nuevoCliente.ubicacion,
        detalles: nuevoCliente.detalles
      })
    ]);

    return res.status(201).json(nuevoCliente);
  } catch (err) {
    if (err.code === '23505') { // Llave duplicada (cobrador_id, cedula)
      return res.status(409).json({
        error: 'Este número de cédula ya se encuentra registrado.',
        userMessage: 'Este número de cédula ya se encuentra registrado.',
        field: 'cedula'
      });
    }
    if (err.code === '23514' || err.code === '23502') {
      return res.status(400).json({
        error: 'No has completado los datos necesarios para registrar un nuevo cliente.',
        userMessage: 'No has completado los datos necesarios para registrar un nuevo cliente.'
      });
    }
    console.error('[Error SQL detallado]: Error al crear cliente:', err);
    return res.status(500).json({
      error: 'Ocurrió un inconveniente al registrar el cliente. Por favor, inténtalo nuevamente.',
      userMessage: 'Ocurrió un inconveniente al registrar el cliente. Por favor, inténtalo nuevamente.',
      ...debugPayload(err)
    });
  }
}

export async function updateCliente(req, res) {
  try {
    const { id } = req.params;
    const validacion = validarCamposObligatoriosCliente(req.body, true);
    if (!validacion.valid) {
      return res.status(400).json({ error: validacion.error, field: validacion.field || null });
    }

    const {
      cleanCedula,
      cleanNombre,
      cleanApellidos,
      cleanTelefono,
      cleanUbicacion,
      cleanDetalles
    } = validacion.values;

    const cobradorId = req.body.cobrador_id || req.user?.id || await getDefaultCobradorId();

    // 1. Verificar duplicidad de teléfono excluyendo el cliente actual
    const { rows: dupPhone } = await query(
      `SELECT id FROM clientes
       WHERE estado = 'ACTIVO'
         AND cobrador_id = $3
         AND regexp_replace(telefono, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')
         AND ($2::uuid IS NULL OR id <> $2::uuid)
       LIMIT 1;`,
      [cleanTelefono, id, cobradorId]
    );
    if (dupPhone.length > 0) {
      return res.status(409).json({
        error: 'Este número de teléfono ya se encuentra registrado.',
        field: 'telefono'
      });
    }

    // 2. Verificar duplicidad de cédula si el usuario ingresó una cédula
    if (cleanCedula) {
      const { rows: dupCedula } = await query(
        `SELECT id FROM clientes
         WHERE estado = 'ACTIVO'
           AND cobrador_id = $3
           AND cedula = $1
           AND ($2::uuid IS NULL OR id <> $2::uuid)
         LIMIT 1;`,
        [cleanCedula, id, cobradorId]
      );
      if (dupCedula.length > 0) {
        return res.status(409).json({
          error: 'Este número de cédula ya se encuentra registrado.',
          field: 'cedula'
        });
      }
    }

    const updateSql = `
      UPDATE clientes
      SET 
        cedula = $1,
        nombre = $2,
        apellidos = $3,
        telefono = $4,
        ubicacion = $5,
        detalles = $6,
        version = version + 1,
        actualizado_en = now()
      WHERE id = $7 AND estado = 'ACTIVO'
      RETURNING *;
    `;

    const { rows } = await query(updateSql, [
      cleanCedula,
      cleanNombre,
      cleanApellidos,
      cleanTelefono,
      cleanUbicacion,
      cleanDetalles,
      id
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado o inactivo.' });
    }

    const clienteActualizado = rows[0];

    // Registrar en bitácora con casteo explícito
    const finalCedula = cleanCedula9(clienteActualizado.cedula);
    const logSql = `
      INSERT INTO bitacora_actividad (
        usuario_id,
        cobrador_id,
        accion,
        entidad,
        entidad_id,
        cedula,
        detalle
      ) VALUES ($1::uuid, $2::uuid, 'CLIENTE_EDITADO'::public.accion_bitacora, 'clientes', $3::uuid, $4, $5);
    `;
    await query(logSql, [
      cobradorId,
      cobradorId,
      clienteActualizado.id,
      finalCedula,
      JSON.stringify({
        nombre: clienteActualizado.nombre,
        apellidos: clienteActualizado.apellidos,
        telefono: clienteActualizado.telefono,
        ubicacion: clienteActualizado.ubicacion,
        detalles: clienteActualizado.detalles
      })
    ]);

    return res.json(clienteActualizado);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        error: 'Este número de cédula ya se encuentra registrado.',
        userMessage: 'Este número de cédula ya se encuentra registrado.',
        field: 'cedula'
      });
    }
    if (err.code === '23514' || err.code === '23502') {
      return res.status(400).json({
        error: 'No has completado los datos necesarios para guardar los cambios del cliente.',
        userMessage: 'No has completado los datos necesarios para guardar los cambios del cliente.'
      });
    }
    console.error('[Error SQL detallado]: Error al actualizar cliente:', err);
    return res.status(500).json({
      error: 'Ocurrió un inconveniente al actualizar el cliente. Por favor, inténtalo nuevamente.',
      userMessage: 'Ocurrió un inconveniente al actualizar el cliente. Por favor, inténtalo nuevamente.',
      ...debugPayload(err)
    });
  }
}

export async function enviarPapelera(req, res) {
  try {
    const { id } = req.params;
    const cobradorId = req.body.cobrador_id || req.user?.id || await getDefaultCobradorId();

    const updateSql = `
      UPDATE clientes
      SET 
        estado = 'EN_PAPELERA'::public.estado_cliente,
        fecha_envio_papelera = now(),
        fecha_borrado_definitivo = now() + interval '30 days',
        version = COALESCE(version, 1) + 1,
        actualizado_en = now()
      WHERE id = $1::uuid
      RETURNING *;
    `;

    const { rows } = await query(updateSql, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado.' });
    }

    const clienteEnPapelera = rows[0];

    // Suspender préstamos asociados
    await query('SELECT suspender_prestamos_cliente($1);', [id]);

    // Registrar en bitácora
    const finalCedula = cleanCedula9(clienteEnPapelera.cedula);
    const logSql = `
      INSERT INTO bitacora_actividad (
        usuario_id,
        cobrador_id,
        accion,
        entidad,
        entidad_id,
        cedula,
        detalle
      ) VALUES ($1::uuid, $2::uuid, 'CLIENTE_A_PAPELERA'::public.accion_bitacora, 'clientes', $3::uuid, $4, $5);
    `;
    await query(logSql, [
      cobradorId,
      cobradorId,
      clienteEnPapelera.id,
      finalCedula,
      JSON.stringify({
        motivo: req.body.motivo || 'Enviado a papelera por el cobrador',
        fecha_borrado_definitivo: clienteEnPapelera.fecha_borrado_definitivo
      })
    ]);

    return res.json({
      message: 'Cliente enviado a la papelera exitosamente',
      cliente: clienteEnPapelera
    });
  } catch (err) {
    console.error('[Error SQL detallado]: Error al enviar cliente a papelera:', err);
    return res.status(500).json({
      error: 'No se pudo mover el cliente a la papelera en este momento.',
      userMessage: 'No se pudo mover el cliente a la papelera en este momento.',
      ...debugPayload(err)
    });
  }
}

export async function enviarListaNegra(req, res) {
  try {
    const { id } = req.params;
    const cobradorId = req.body.cobrador_id || req.user?.id || await getDefaultCobradorId();

    const updateSql = `
      UPDATE clientes
      SET 
        estado = 'EN_LISTA_NEGRA'::public.estado_cliente,
        version = COALESCE(version, 1) + 1,
        actualizado_en = now()
      WHERE id = $1::uuid
      RETURNING *;
    `;

    const { rows } = await query(updateSql, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado.' });
    }

    const cliente = rows[0];

    // Insertar o reactivar en lista_negra (soportando clientes con o sin cédula)
    if (cliente.cedula) {
      const listaNegraSql = `
        INSERT INTO lista_negra (
          cobrador_id,
          cliente_id,
          cedula,
          nombre,
          apellidos,
          activo,
          fecha_registro
        ) VALUES ($1, $2, $3, $4, $5, true, (now() AT TIME ZONE 'America/Costa_Rica')::date)
        ON CONFLICT (cobrador_id, cedula) DO UPDATE
        SET activo = true,
            cliente_id = EXCLUDED.cliente_id,
            nombre = EXCLUDED.nombre,
            apellidos = EXCLUDED.apellidos,
            fecha_salida = NULL;
      `;
      await query(listaNegraSql, [
        cobradorId,
        cliente.id,
        cliente.cedula,
        cliente.nombre,
        cliente.apellidos
      ]);
    } else {
      const { rows: existingLn } = await query(
        'SELECT id FROM lista_negra WHERE cobrador_id = $1 AND cliente_id = $2 LIMIT 1;',
        [cobradorId, cliente.id]
      );
      if (existingLn.length > 0) {
        await query(
          `UPDATE lista_negra
           SET activo = true, nombre = $1, apellidos = $2, fecha_salida = NULL
           WHERE id = $3;`,
          [cliente.nombre, cliente.apellidos, existingLn[0].id]
        );
      } else {
        await query(
          `INSERT INTO lista_negra (
            cobrador_id, cliente_id, cedula, nombre, apellidos, activo, fecha_registro
          ) VALUES ($1, $2, NULL, $3, $4, true, (now() AT TIME ZONE 'America/Costa_Rica')::date);`,
          [cobradorId, cliente.id, cliente.nombre, cliente.apellidos]
        );
      }
    }

    // Suspender préstamos asociados
    await query('SELECT suspender_prestamos_cliente($1);', [id]);

    // Registrar en bitácora con casteo explícito
    const finalCedula = cleanCedula9(cliente.cedula);
    const logSql = `
      INSERT INTO bitacora_actividad (
        usuario_id,
        cobrador_id,
        accion,
        entidad,
        entidad_id,
        cedula,
        detalle
      ) VALUES ($1::uuid, $2::uuid, 'CLIENTE_A_LISTA_NEGRA'::public.accion_bitacora, 'clientes', $3::uuid, $4, $5);
    `;
    await query(logSql, [
      cobradorId,
      cobradorId,
      cliente.id,
      finalCedula,
      JSON.stringify({
        motivo: req.body.motivo || 'Enviado a lista negra por el cobrador'
      })
    ]);

    return res.json({
      message: 'Cliente enviado a la lista negra exitosamente',
      cliente
    });
  } catch (err) {
    console.error('[Error SQL detallado]: Error al enviar cliente a lista negra:', err);
    return res.status(500).json({
      error: 'No se pudo bloquear al cliente en este momento.',
      userMessage: 'No se pudo bloquear al cliente en este momento.',
      ...debugPayload(err)
    });
  }
}
