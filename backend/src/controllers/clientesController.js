import { query, pool, debugPayload } from '../config/db.js';
import { getDefaultCobradorId } from '../services/seedService.js';
import {
  snapshotPrestamoToBaneado,
  ensureHistorialArchivoSchema,
} from '../utils/papeleraHelpers.js';

function cleanCedula9(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '').slice(0, 9);
  return digits.length === 9 ? digits : null;
}

// Valores por defecto no vacíos para compatibilidad futura al pasar un registro de lista_negra a clientes
export const DEFAULT_TELEFONO_LISTA_NEGRA = '+506 0000-0000';
export const DEFAULT_CAMPO_LISTA_NEGRA = 'Sin ubicación';

export const COUNTRY_PHONE_DIGITS = {
  '+506': 8,
  '+505': 8,
  '+507': 8,
  '+503': 8,
  '+504': 8,
  '+502': 8,
  '+53': 8,
  '+34': 9,
  '+51': 9,
  '+56': 9,
  '+593': 9,
  '+1': 10,
  '+57': 10,
  '+58': 10,
  '+52': 10,
  '+54': 10
};

export const normalizePersonName = (str) =>
  String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export function namesMatchSamePerson(nomA, apeA, nomB, apeB) {
  const nA = normalizePersonName(nomA);
  const aA = normalizePersonName(apeA);
  const nB = normalizePersonName(nomB);
  const aB = normalizePersonName(apeB);
  if (!nA || !nB) return false;
  const fullA = `${nA} ${aA}`.trim();
  const fullB = `${nB} ${aB}`.trim();
  if (fullA === fullB) return true;
  if (fullA.includes(fullB) || fullB.includes(fullA)) return true;
  const firstTokenA = nA.split(' ')[0];
  const firstTokenB = nB.split(' ')[0];
  if (firstTokenA && firstTokenB && firstTokenA === firstTokenB) {
    if (!aA || !aB) return true;
    const firstApeA = aA.split(' ')[0];
    const firstApeB = aB.split(' ')[0];
    if (aA.includes(aB) || aB.includes(aA) || firstApeA === firstApeB) return true;
  }
  return false;
}

export function normalizePhoneKeyBackend(phoneStr = '') {
  const str = String(phoneStr || '').trim();
  if (!str) return '';
  if (str.startsWith('+')) {
    const sortedCodes = Object.keys(COUNTRY_PHONE_DIGITS).sort((a, b) => b.length - a.length);
    const foundCode = sortedCodes.find((c) => str.startsWith(c));
    if (foundCode) {
      const digits = str.slice(foundCode.length).replace(/\D/g, '');
      return `${foundCode}${digits}`;
    }
    const codeMatch = str.match(/^\+\d{1,4}/);
    if (codeMatch) {
      const code = codeMatch[0];
      const rest = str.slice(code.length).replace(/\D/g, '');
      return `${code}${rest}`;
    }
  }
  const localDigits = str.replace(/\D/g, '');
  return `+506${localDigits}`;
}

function validarTelefonoPorPais(phoneStr = '') {
  const str = String(phoneStr || '').trim();
  if (!str) return { valid: false, error: 'El teléfono es obligatorio.', field: 'telefono' };

  let countryCode = '+506';
  let rawDigits = '';

  if (str.startsWith('+')) {
    const sortedCodes = Object.keys(COUNTRY_PHONE_DIGITS).sort((a, b) => b.length - a.length);
    const foundCode = sortedCodes.find((c) => str.startsWith(c));
    if (foundCode) {
      countryCode = foundCode;
      rawDigits = str.slice(foundCode.length).replace(/\D/g, '');
    } else {
      const codeMatch = str.match(/^\+\d{1,4}/);
      countryCode = codeMatch ? codeMatch[0] : '+506';
      rawDigits = str.slice(countryCode.length).replace(/\D/g, '');
    }
  } else {
    countryCode = '+506';
    rawDigits = str.replace(/\D/g, '');
  }

  const expectedDigits = COUNTRY_PHONE_DIGITS[countryCode] || 8;
  if (rawDigits.length !== expectedDigits) {
    return {
      valid: false,
      error: 'El número de teléfono está incompleto. Verifica que tenga todos los dígitos requeridos.',
      field: 'telefono'
    };
  }

  return {
    valid: true,
    countryCode,
    rawDigits
  };
}

function validarCamposObligatoriosCliente(body = {}, isEdit = false) {
  const tipoCliente = body.tipoCliente || body.tipo_cliente;
  const rawCedula = (body.cedula ?? '').toString().trim().replace(/\D/g, '');
  const cleanNombre = (body.nombre ?? '').toString().trim();
  const rawApellidos = (body.apellidos ?? '').toString().trim();
  const cleanTelefono = (body.telefono ?? '').toString().trim();
  const rawTelefonoSecundario = (body.telefono_secundario ?? body.telefonoSecundario ?? '').toString().trim();
  const cleanUbicacion = (body.ubicacion ?? '').toString().trim();
  const rawDetalles = (body.detalles ?? '').toString().trim();

  // Si el tipo de cliente es COSTARRICENSE, el Número de Cédula es 100% obligatorio y debe tener 9 dígitos
  if (tipoCliente === 'COSTARRICENSE') {
    if (!rawCedula || rawCedula.length !== 9) {
      return {
        valid: false,
        error: isEdit
          ? 'No has completado todos los datos obligatorios del cliente.'
          : 'No has completado los datos necesarios para registrar un nuevo cliente.',
        field: 'cedula'
      };
    }
  }

  // Campos obligatorios: Nombre, Teléfono y Ubicación
  if (!cleanNombre || !cleanTelefono || !cleanUbicacion) {
    return {
      valid: false,
      error: isEdit
        ? 'No has completado todos los datos obligatorios del cliente.'
        : 'No has completado los datos necesarios para registrar un nuevo cliente.'
    };
  }

  // Validación estricta de cantidad de dígitos de teléfono principal según el país
  const validTel = validarTelefonoPorPais(cleanTelefono);
  if (!validTel.valid) {
    return {
      valid: false,
      error: validTel.error,
      field: validTel.field
    };
  }

  // Validación estricta de teléfono secundario si el usuario digitó datos en él
  let cleanTelefonoSecundario = null;
  if (rawTelefonoSecundario.length > 0) {
    const validTelSec = validarTelefonoPorPais(rawTelefonoSecundario);
    if (!validTelSec.valid) {
      return {
        valid: false,
        error: 'El teléfono secundario está incompleto. Verifica que tenga todos los dígitos requeridos o déjalo vacío.',
        field: 'telefonoSecundario'
      };
    }

    if (normalizePhoneKeyBackend(rawTelefonoSecundario) === normalizePhoneKeyBackend(cleanTelefono)) {
      return {
        valid: false,
        error: 'El teléfono secundario no puede ser igual al teléfono principal.',
        field: 'telefonoSecundario'
      };
    }

    cleanTelefonoSecundario = rawTelefonoSecundario;
  }

  // Número de cédula es opcional en extranjero (NULL si viene vacío); si se escribe algo, debe tener exactamente 9 dígitos
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
      cleanTelefonoSecundario,
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
        telefono_secundario,
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
      cleanTelefonoSecundario,
      cleanUbicacion,
      cleanDetalles
    } = validacion.values;

    const cobradorId = req.body.cobrador_id || req.user?.id || await getDefaultCobradorId();

    const phoneKey = normalizePhoneKeyBackend(cleanTelefono);
    const secPhoneKey = cleanTelefonoSecundario ? normalizePhoneKeyBackend(cleanTelefonoSecundario) : null;

    // Buscar si ya existe el mismo cliente en la cartera activa del cobrador (Idempotencia)
    let existingCliente = null;

    if (cleanCedula) {
      // Modalidad Costarricense: búsqueda por cédula exacta de 9 dígitos en clientes activos
      const { rows } = await query(
        `SELECT * FROM clientes
         WHERE estado = 'ACTIVO'
           AND cobrador_id = $1
           AND cedula = $2
         LIMIT 1;`,
        [cobradorId, cleanCedula]
      );
      if (rows.length > 0) {
        const candidate = rows[0];
        if (namesMatchSamePerson(cleanNombre, cleanApellidos, candidate.nombre, candidate.apellidos)) {
          existingCliente = candidate;
        } else {
          return res.status(409).json({
            error: 'Este número de cédula ya se encuentra registrado.',
            userMessage: 'Este número de cédula ya se encuentra registrado.',
            field: 'cedula'
          });
        }
      }
    } else {
      // Modalidad Extranjero (sin cédula): búsqueda por coincidencia exacta de nombre y apellidos normalizados
      const { rows } = await query(
        `SELECT * FROM clientes
         WHERE estado = 'ACTIVO'
           AND cobrador_id = $1
           AND cedula IS NULL;`,
        [cobradorId]
      );
      const targetNom = normalizePersonName(cleanNombre);
      const targetApe = normalizePersonName(cleanApellidos);
      const match = rows.find(
        (c) => normalizePersonName(c.nombre) === targetNom && normalizePersonName(c.apellidos) === targetApe
      );
      if (match) {
        existingCliente = match;
      }
    }

    if (existingCliente) {
      const existingId = existingCliente.id;

      // 1. Verificar si el nuevo teléfono principal pertenece a otro cliente registrado DISTINTO
      const { rows: dupPhone } = await query(
        `SELECT id FROM clientes
         WHERE estado = 'ACTIVO'
           AND cobrador_id = $3
           AND id <> $2
           AND (
             (CASE 
               WHEN telefono LIKE '+%' THEN '+' || regexp_replace(telefono, '[^0-9]', '', 'g')
               ELSE '+506' || regexp_replace(telefono, '[^0-9]', '', 'g')
             END = $1)
             OR
             (telefono_secundario IS NOT NULL AND CASE 
               WHEN telefono_secundario LIKE '+%' THEN '+' || regexp_replace(telefono_secundario, '[^0-9]', '', 'g')
               ELSE '+506' || regexp_replace(telefono_secundario, '[^0-9]', '', 'g')
             END = $1)
           )
         LIMIT 1;`,
        [phoneKey, existingId, cobradorId]
      );
      if (dupPhone.length > 0) {
        return res.status(409).json({
          error: 'Este número de teléfono ya pertenece a otro cliente registrado.',
          userMessage: 'Este número de teléfono ya pertenece a otro cliente registrado.',
          field: 'telefono'
        });
      }

      // 2. Verificar si el nuevo teléfono secundario pertenece a otro cliente registrado DISTINTO
      if (cleanTelefonoSecundario && secPhoneKey) {
        const { rows: dupSecPhone } = await query(
          `SELECT id FROM clientes
           WHERE estado = 'ACTIVO'
             AND cobrador_id = $3
             AND id <> $2
             AND (
               (CASE 
                 WHEN telefono LIKE '+%' THEN '+' || regexp_replace(telefono, '[^0-9]', '', 'g')
                 ELSE '+506' || regexp_replace(telefono, '[^0-9]', '', 'g')
               END = $1)
               OR
               (telefono_secundario IS NOT NULL AND CASE 
                 WHEN telefono_secundario LIKE '+%' THEN '+' || regexp_replace(telefono_secundario, '[^0-9]', '', 'g')
                 ELSE '+506' || regexp_replace(telefono_secundario, '[^0-9]', '', 'g')
               END = $1)
             )
           LIMIT 1;`,
          [secPhoneKey, existingId, cobradorId]
        );
        if (dupSecPhone.length > 0) {
          return res.status(409).json({
            error: 'Este teléfono secundario ya se encuentra registrado en otro cliente.',
            userMessage: 'Este teléfono secundario ya se encuentra registrado en otro cliente.',
            field: 'telefonoSecundario'
          });
        }
      }

      // 3. Comparar campo por campo los valores entrantes contra existingCliente
      const nameChanged = cleanNombre !== (existingCliente.nombre || '').trim();
      const apellidosChanged = (cleanApellidos || null) !== (existingCliente.apellidos ? existingCliente.apellidos.trim() : null);
      const phoneChanged = phoneKey !== normalizePhoneKeyBackend(existingCliente.telefono);
      const existingSecKey = existingCliente.telefono_secundario ? normalizePhoneKeyBackend(existingCliente.telefono_secundario) : null;
      const secPhoneChanged = secPhoneKey !== existingSecKey;
      const ubicacionChanged = cleanUbicacion !== (existingCliente.ubicacion || '').trim();
      const detallesChanged = (cleanDetalles || null) !== (existingCliente.detalles ? existingCliente.detalles.trim() : null);

      const hasChanges = nameChanged || apellidosChanged || phoneChanged || secPhoneChanged || ubicacionChanged || detallesChanged;

      // Subcaso A: Todos los datos son exactamente idénticos -> No tocar base de datos ni version
      if (!hasChanges) {
        return res.status(200).json({
          ...existingCliente,
          idempotentAction: 'NO_CHANGE'
        });
      }

      // Subcaso B: Al menos un dato cambió -> UPDATE únicamente del registro existente
      const updateSql = `
        UPDATE clientes
        SET 
          cedula = $1,
          nombre = $2,
          apellidos = $3,
          telefono = $4,
          telefono_secundario = $5,
          ubicacion = $6,
          detalles = $7,
          version = COALESCE(version, 1) + 1,
          actualizado_en = now()
        WHERE id = $8 AND estado = 'ACTIVO'
        RETURNING *;
      `;

      const { rows: updatedRows } = await query(updateSql, [
        cleanCedula,
        cleanNombre,
        cleanApellidos,
        cleanTelefono,
        cleanTelefonoSecundario,
        cleanUbicacion,
        cleanDetalles,
        existingId
      ]);

      const updatedCliente = updatedRows[0] || existingCliente;

      // Registrar en bitácora de actividad (inmutable) con casteo estricto
      try {
        const finalCedula = cleanCedula9(updatedCliente.cedula);
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
          updatedCliente.id,
          finalCedula,
          JSON.stringify({
            nombre: updatedCliente.nombre,
            apellidos: updatedCliente.apellidos,
            telefono: updatedCliente.telefono,
            telefono_secundario: updatedCliente.telefono_secundario,
            ubicacion: updatedCliente.ubicacion,
            detalles: updatedCliente.detalles,
            idempotente: true
          })
        ]);
      } catch (logErr) {
        console.warn('[Bitacora]: No se pudo registrar la actualización idempotente:', logErr.message);
      }

      return res.status(200).json({
        ...updatedCliente,
        idempotentAction: 'UPDATED'
      });
    }

    // Si NO existe el mismo cliente: Verificaciones de conflicto para Cliente Nuevo
    // 1. Verificar duplicidad de teléfono principal entre clientes activos
    const { rows: dupPhone } = await query(
      `SELECT id FROM clientes
       WHERE estado = 'ACTIVO'
         AND cobrador_id = $2
         AND (
           (CASE 
             WHEN telefono LIKE '+%' THEN '+' || regexp_replace(telefono, '[^0-9]', '', 'g')
             ELSE '+506' || regexp_replace(telefono, '[^0-9]', '', 'g')
           END = $1)
           OR
           (telefono_secundario IS NOT NULL AND CASE 
             WHEN telefono_secundario LIKE '+%' THEN '+' || regexp_replace(telefono_secundario, '[^0-9]', '', 'g')
             ELSE '+506' || regexp_replace(telefono_secundario, '[^0-9]', '', 'g')
           END = $1)
         )
       LIMIT 1;`,
      [phoneKey, cobradorId]
    );
    if (dupPhone.length > 0) {
      return res.status(409).json({
        error: 'Este número de teléfono ya pertenece a otro cliente registrado.',
        userMessage: 'Este número de teléfono ya pertenece a otro cliente registrado.',
        field: 'telefono'
      });
    }

    // 2. Verificar duplicidad de teléfono secundario si fue provisto
    if (cleanTelefonoSecundario && secPhoneKey) {
      const { rows: dupSecPhone } = await query(
        `SELECT id FROM clientes
         WHERE estado = 'ACTIVO'
           AND cobrador_id = $2
           AND (
             (CASE 
               WHEN telefono LIKE '+%' THEN '+' || regexp_replace(telefono, '[^0-9]', '', 'g')
               ELSE '+506' || regexp_replace(telefono, '[^0-9]', '', 'g')
             END = $1)
             OR
             (telefono_secundario IS NOT NULL AND CASE 
               WHEN telefono_secundario LIKE '+%' THEN '+' || regexp_replace(telefono_secundario, '[^0-9]', '', 'g')
               ELSE '+506' || regexp_replace(telefono_secundario, '[^0-9]', '', 'g')
             END = $1)
           )
         LIMIT 1;`,
        [secPhoneKey, cobradorId]
      );
      if (dupSecPhone.length > 0) {
        return res.status(409).json({
          error: 'Este teléfono secundario ya se encuentra registrado en otro cliente.',
          userMessage: 'Este teléfono secundario ya se encuentra registrado en otro cliente.',
          field: 'telefonoSecundario'
        });
      }
    }

    // 3. Verificar duplicidad de cédula si el usuario ingresó una cédula
    if (cleanCedula) {
      const { rows: dupCedula } = await query(
        `SELECT id FROM clientes
         WHERE estado = 'ACTIVO'
           AND cobrador_id = $2
           AND cedula = $1
         LIMIT 1;`,
        [cleanCedula, cobradorId]
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
        telefono_secundario,
        ubicacion,
        detalles,
        estado
      ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, 'ACTIVO'::public.estado_cliente)
      RETURNING *;
    `;

    const { rows } = await query(insertSql, [
      cobradorId,
      cleanCedula,
      cleanNombre,
      cleanApellidos,
      cleanTelefono,
      cleanTelefonoSecundario,
      cleanUbicacion,
      cleanDetalles,
    ]);

    const nuevoCliente = rows[0];

    // Registro en bitácora de actividad (inmutable) con casteo estricto
    try {
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
          telefono_secundario: nuevoCliente.telefono_secundario,
          ubicacion: nuevoCliente.ubicacion,
          detalles: nuevoCliente.detalles
        })
      ]);
    } catch (logErr) {
      console.warn('[Bitacora]: No se pudo registrar la creación del cliente:', logErr.message);
    }

    return res.status(201).json({
      ...nuevoCliente,
      idempotentAction: 'CREATED'
    });
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
      cleanTelefonoSecundario,
      cleanUbicacion,
      cleanDetalles
    } = validacion.values;

    const cobradorId = req.body.cobrador_id || req.user?.id || await getDefaultCobradorId();

    const phoneKey = normalizePhoneKeyBackend(cleanTelefono);

    // 1. Verificar duplicidad de teléfono excluyendo el cliente actual
    const { rows: dupPhone } = await query(
      `SELECT id FROM clientes
       WHERE estado = 'ACTIVO'
         AND cobrador_id = $3
         AND (
           (CASE 
             WHEN telefono LIKE '+%' THEN '+' || regexp_replace(telefono, '[^0-9]', '', 'g')
             ELSE '+506' || regexp_replace(telefono, '[^0-9]', '', 'g')
           END = $1)
           OR
           (telefono_secundario IS NOT NULL AND CASE 
             WHEN telefono_secundario LIKE '+%' THEN '+' || regexp_replace(telefono_secundario, '[^0-9]', '', 'g')
             ELSE '+506' || regexp_replace(telefono_secundario, '[^0-9]', '', 'g')
           END = $1)
         )
         AND ($2::uuid IS NULL OR id <> $2::uuid)
       LIMIT 1;`,
      [phoneKey, id, cobradorId]
    );
    if (dupPhone.length > 0) {
      return res.status(409).json({
        error: 'Este número de teléfono ya se encuentra registrado.',
        userMessage: 'Este número de teléfono ya se encuentra registrado.',
        field: 'telefono'
      });
    }

    // 2. Verificar duplicidad de teléfono secundario si fue provisto
    if (cleanTelefonoSecundario) {
      const secPhoneKey = normalizePhoneKeyBackend(cleanTelefonoSecundario);
      const { rows: dupSecPhone } = await query(
        `SELECT id FROM clientes
         WHERE estado = 'ACTIVO'
           AND cobrador_id = $3
           AND (
             (CASE 
               WHEN telefono LIKE '+%' THEN '+' || regexp_replace(telefono, '[^0-9]', '', 'g')
               ELSE '+506' || regexp_replace(telefono, '[^0-9]', '', 'g')
             END = $1)
             OR
             (telefono_secundario IS NOT NULL AND CASE 
               WHEN telefono_secundario LIKE '+%' THEN '+' || regexp_replace(telefono_secundario, '[^0-9]', '', 'g')
               ELSE '+506' || regexp_replace(telefono_secundario, '[^0-9]', '', 'g')
             END = $1)
           )
           AND ($2::uuid IS NULL OR id <> $2::uuid)
         LIMIT 1;`,
        [secPhoneKey, id, cobradorId]
      );
      if (dupSecPhone.length > 0) {
        return res.status(409).json({
          error: 'Este teléfono secundario ya se encuentra registrado en otro cliente.',
          userMessage: 'Este teléfono secundario ya se encuentra registrado en otro cliente.',
          field: 'telefonoSecundario'
        });
      }
    }

    // 3. Verificar duplicidad de cédula si el usuario ingresó una cédula
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
        telefono_secundario = $5,
        ubicacion = $6,
        detalles = $7,
        version = version + 1,
        actualizado_en = now()
      WHERE id = $8 AND estado = 'ACTIVO'
      RETURNING *;
    `;

    const { rows } = await query(updateSql, [
      cleanCedula,
      cleanNombre,
      cleanApellidos,
      cleanTelefono,
      cleanTelefonoSecundario,
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
        telefono_secundario: clienteActualizado.telefono_secundario,
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
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const cobradorId = req.body?.cobrador_id || req.user?.id || await getDefaultCobradorId();

    await client.query('BEGIN');

    // 1. Obtener datos del cliente actual desde la tabla clientes
    const { rows: clientRows } = await client.query(
      'SELECT * FROM clientes WHERE id = $1::uuid FOR UPDATE;',
      [id]
    );

    if (clientRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cliente no encontrado o ya eliminado.' });
    }

    const c = clientRows[0];

    // 2. Suspender préstamos asociados para congelar cobros
    await client.query('SELECT suspender_prestamos_cliente($1::uuid);', [id]);

    // Respaldo de seguridad en prestamos_baneados ANTES de borrar el cliente por ON DELETE CASCADE
    const { rows: activePrestamosRows } = await client.query(
      'SELECT * FROM prestamos WHERE cliente_id = $1::uuid FOR UPDATE;',
      [id]
    );

    const hoyRes = await client.query(
      `SELECT to_char((now() AT TIME ZONE 'America/Costa_Rica')::date, 'YYYY-MM-DD') AS hoy`
    );
    const fechaHoyCR = hoyRes.rows[0]?.hoy || null;

    for (const loanRow of activePrestamosRows) {
      await snapshotPrestamoToBaneado(client, {
        loanRow,
        clienteRow: c,
        origenPapelera: 'CLIENTE_ELIMINADO',
        fechaHoyCR,
      });
    }

    // Respaldo adicional en JSONB de clientes_baneados
    const { rows: prestamosRows } = await client.query(`
      SELECT p.*,
        COALESCE((
          SELECT jsonb_agg(pg.*) FROM pagos_prestamo pg WHERE pg.prestamo_id = p.id
        ), '[]'::jsonb) AS pagos
      FROM prestamos p
      WHERE p.cliente_id = $1::uuid;
    `, [id]);

    // Retirar préstamos activos y dependencias a papelera (sin dejar huérfanos SUSPENDIDOS en tablas activas)
    const activeLoanIds = activePrestamosRows.map((r) => r.id);
    if (activeLoanIds.length > 0) {
      await client.query('DELETE FROM historial_pasar_dia WHERE prestamo_id = ANY($1::uuid[]);', [activeLoanIds]);
      await client.query('DELETE FROM pagos_prestamo WHERE prestamo_id = ANY($1::uuid[]);', [activeLoanIds]);
      await client.query('DELETE FROM arreglos_pago WHERE prestamo_id = ANY($1::uuid[]);', [activeLoanIds]);
      await client.query('DELETE FROM renovaciones_prestamo WHERE prestamo_id = ANY($1::uuid[]);', [activeLoanIds]);
      await client.query('DELETE FROM agenda_cobros WHERE prestamo_id = ANY($1::uuid[]);', [activeLoanIds]);
      await client.query('DELETE FROM prestamos WHERE id = ANY($1::uuid[]);', [activeLoanIds]);
    }

    // 3. Mover al cliente a la tabla clientes_baneados (con 30 días de retención)
    const insertBaneadoSql = `
      INSERT INTO clientes_baneados (
        id,
        cobrador_id,
        cedula,
        nombre,
        apellidos,
        telefono,
        telefono_secundario,
        ubicacion,
        detalles,
        version,
        creado_originalmente_en,
        fecha_envio_papelera,
        fecha_borrado_definitivo,
        respaldo_prestamos
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        COALESCE($10, 1),
        $11,
        now(),
        now() + interval '30 days',
        $12::jsonb
      )
      RETURNING *;
    `;

    const { rows: baneadoRows } = await client.query(insertBaneadoSql, [
      c.id,
      c.cobrador_id,
      c.cedula,
      c.nombre,
      c.apellidos,
      c.telefono,
      c.telefono_secundario || null,
      c.ubicacion,
      c.detalles,
      c.version,
      c.creado_en,
      JSON.stringify(prestamosRows)
    ]);

    const clienteBaneado = baneadoRows[0];

    // 4. Eliminar al cliente de la tabla clientes para dejar la tabla limpia
    await client.query('DELETE FROM clientes WHERE id = $1::uuid;', [id]);

    // 5. Registrar en bitácora de actividad
    const finalCedula = cleanCedula9(clienteBaneado.cedula);
    const logSql = `
      INSERT INTO bitacora_actividad (
        usuario_id,
        cobrador_id,
        accion,
        entidad,
        entidad_id,
        cedula,
        detalle
      ) VALUES ($1::uuid, $2::uuid, 'CLIENTE_A_PAPELERA'::public.accion_bitacora, 'clientes_baneados', $3::uuid, $4, $5);
    `;
    await client.query(logSql, [
      cobradorId,
      cobradorId,
      clienteBaneado.id,
      finalCedula,
      JSON.stringify({
        motivo: req.body?.motivo || 'Enviado a papelera por el cobrador',
        fecha_borrado_definitivo: clienteBaneado.fecha_borrado_definitivo,
        nombre_completo: `${clienteBaneado.nombre || ''} ${clienteBaneado.apellidos || ''}`.trim()
      })
    ]);

    await client.query('COMMIT');

    return res.json({
      message: 'Cliente enviado a la papelera exitosamente',
      cliente: {
        ...clienteBaneado,
        estado: 'EN_PAPELERA'
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Error SQL detallado]: Error al enviar cliente a papelera:', err);
    return res.status(500).json({
      error: 'No se pudo mover el cliente a la papelera en este momento.',
      userMessage: 'No se pudo mover el cliente a la papelera en este momento.',
      ...debugPayload(err)
    });
  } finally {
    client.release();
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

function safeNumericValue(val, fallback = 0) {
  if (val === undefined || val === null || val === '') return fallback;
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
}

function extractPhoneTailDigits(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length < 8) return null;
  return {
    digits,
    tail8: digits.slice(-8),
    tail10: digits.length >= 10 ? digits.slice(-10) : digits,
    normalizedKey: normalizePhoneKeyBackend(raw),
  };
}

function phonesMatchForLookup(storedPhone, targets) {
  const storedInfo = extractPhoneTailDigits(storedPhone);
  if (!storedInfo) return false;
  return targets.some((t) => {
    if (storedInfo.normalizedKey && t.normalizedKey && storedInfo.normalizedKey === t.normalizedKey) {
      return true;
    }
    if (t.digits.length >= 10 && storedInfo.digits.length >= 10) {
      return storedInfo.tail10 === t.tail10;
    }
    return storedInfo.tail8 === t.tail8;
  });
}

export async function consultarHistorialArchivo(req, res) {
  try {
    await ensureHistorialArchivoSchema();
    const cobradorId = req.query.cobrador_id || req.user?.id || await getDefaultCobradorId();

    const cedulaClean = cleanCedula9(req.query.cedula);
    const phoneTargets = [req.query.telefono, req.query.telefono_secundario]
      .map(extractPhoneTailDigits)
      .filter(Boolean);
    const tail8List = [...new Set(phoneTargets.map((t) => t.tail8))];

    const normNom = normalizePersonName(req.query.nombre);
    const normApe = normalizePersonName(req.query.apellidos);
    const allowNameLookup = normNom.length >= 2 && (normApe.length >= 2 || (req.query.tipo_cliente === 'EXTRANJERO' && normNom.length >= 3));

    if (!cedulaClean && tail8List.length === 0 && !allowNameLookup) {
      return res.json({ ok: true, encontrado: false });
    }

    // 1. Verificar si la persona ya existe activa en la tabla clientes del mismo cobrador
    const { rows: activeCandidates } = await query(
      `SELECT id, cedula, nombre, apellidos, telefono, telefono_secundario
       FROM clientes
       WHERE cobrador_id = $1::uuid
         AND estado = 'ACTIVO'::public.estado_cliente
         AND (
           ($2::text IS NOT NULL AND TRIM(COALESCE(cedula, '')) = $2::text)
           OR (
             CARDINALITY($3::text[]) > 0 AND (
               RIGHT(regexp_replace(COALESCE(telefono, ''), '[^0-9]', '', 'g'), 8) = ANY($3::text[])
               OR RIGHT(regexp_replace(COALESCE(telefono_secundario, ''), '[^0-9]', '', 'g'), 8) = ANY($3::text[])
             )
           )
           OR ($4::boolean = true AND LOWER(TRIM(COALESCE(nombre, ''))) <> '')
         );`,
      [cobradorId, cedulaClean, tail8List, allowNameLookup]
    );

    const activeMatch = activeCandidates.find((c) => {
      if (cedulaClean && String(c.cedula || '').trim() === cedulaClean) return true;
      if (phoneTargets.length > 0 && (phonesMatchForLookup(c.telefono, phoneTargets) || phonesMatchForLookup(c.telefono_secundario, phoneTargets))) {
        return true;
      }
      if (allowNameLookup) {
        const cNom = normalizePersonName(c.nombre);
        const cApe = normalizePersonName(c.apellidos);
        if (normApe.length >= 2) {
          return cNom === normNom && cApe === normApe;
        }
        return cNom === normNom && !cApe;
      }
      return false;
    });

    if (activeMatch) {
      return res.json({ ok: true, encontrado: false });
    }

    // 2. Buscar coincidencia en historial_clientes_archivo para este cobrador
    const { rows: archiveCandidates } = await query(
      `SELECT id, cliente_id_actual, cedula, nombre, apellidos, telefono,
              telefono_secundario, ubicacion, detalles, fecha_eliminacion
       FROM historial_clientes_archivo
       WHERE cobrador_id = $1::uuid
         AND (
           ($2::text IS NOT NULL AND TRIM(COALESCE(cedula, '')) = $2::text)
           OR (
             CARDINALITY($3::text[]) > 0 AND (
               RIGHT(regexp_replace(COALESCE(telefono, ''), '[^0-9]', '', 'g'), 8) = ANY($3::text[])
               OR RIGHT(regexp_replace(COALESCE(telefono_secundario, ''), '[^0-9]', '', 'g'), 8) = ANY($3::text[])
             )
           )
           OR ($4::boolean = true AND LOWER(TRIM(COALESCE(nombre, ''))) <> '')
         )
       ORDER BY fecha_eliminacion DESC;`,
      [cobradorId, cedulaClean, tail8List, allowNameLookup]
    );

    let archivoMatch = null;
    if (cedulaClean) {
      archivoMatch = archiveCandidates.find((r) => String(r.cedula || '').trim() === cedulaClean) || null;
    }
    if (!archivoMatch && phoneTargets.length > 0) {
      archivoMatch = archiveCandidates.find(
        (r) => phonesMatchForLookup(r.telefono, phoneTargets) || phonesMatchForLookup(r.telefono_secundario, phoneTargets)
      ) || null;
    }
    if (!archivoMatch && allowNameLookup) {
      archivoMatch = archiveCandidates.find((r) => {
        const rNom = normalizePersonName(r.nombre);
        const rApe = normalizePersonName(r.apellidos);
        if (normApe.length >= 2) {
          return rNom === normNom && rApe === normApe;
        }
        return rNom === normNom && !rApe;
      }) || null;
    }

    if (!archivoMatch) {
      return res.json({ ok: true, encontrado: false });
    }

    // 3. Consultar préstamos archivados asociados al registro
    const { rows: loanRows } = await query(
      `SELECT
         id,
         prestamo_id_original,
         monto_prestado,
         monto_total_financiar,
         cuota,
         monto_pagado,
         monto_pagado_acumulado,
         saldo_pendiente,
         saldo_por_pagar,
         periodos_pagados,
         total_periodos,
         periodos_atrasados_acumulados,
         modalidad::text AS modalidad,
         estado_final::text AS estado_final,
         estado_al_eliminar,
         to_char(fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
         to_char(fecha_final, 'YYYY-MM-DD') AS fecha_final,
         archivado_en
       FROM historial_prestamos_archivo
       WHERE archivo_id = $1::uuid
       ORDER BY archivado_en DESC, fecha_inicio DESC;`,
      [archivoMatch.id]
    );

    const normalizedLoans = loanRows.map((l) => {
      const useNewCols = l.estado_al_eliminar !== null && l.estado_al_eliminar !== undefined;
      const montoPrestado = safeNumericValue(l.monto_prestado, 0);
      const montoTotalFinanciar = safeNumericValue(l.monto_total_financiar, 0);
      const montoPagado = useNewCols
        ? safeNumericValue(l.monto_pagado_acumulado, 0)
        : safeNumericValue(l.monto_pagado ?? l.monto_pagado_acumulado, 0);
      const saldoPorPagar = useNewCols
        ? safeNumericValue(l.saldo_por_pagar, 0)
        : safeNumericValue(l.saldo_pendiente ?? l.saldo_por_pagar, 0);
      const atrasosAcum = safeNumericValue(l.periodos_atrasados_acumulados, 0);

      return {
        id: l.id,
        prestamo_original_id: l.prestamo_id_original,
        monto_prestado: montoPrestado,
        monto_total_financiar: montoTotalFinanciar,
        cuota: safeNumericValue(l.cuota, 0),
        monto_pagado_acumulado: montoPagado,
        saldo_por_pagar: saldoPorPagar,
        periodos_pagados: safeNumericValue(l.periodos_pagados, 0),
        total_periodos: safeNumericValue(l.total_periodos, 0),
        periodos_atrasados_acumulados: atrasosAcum,
        modalidad: l.modalidad || 'SEMANAL',
        estado_al_eliminar: l.estado_al_eliminar || l.estado_final || 'ACTIVO',
        fecha_inicio: l.fecha_inicio || null,
        fecha_final: l.fecha_final || null,
      };
    });

    const totalPrestamos = normalizedLoans.length;
    const prestamosCompletados = normalizedLoans.filter((l) => l.saldo_por_pagar <= 0).length;
    const prestamosInconclusos = normalizedLoans.filter((l) => l.saldo_por_pagar > 0).length;
    const totalPrestado = normalizedLoans.reduce((sum, l) => sum + l.monto_prestado, 0);
    const totalAbonado = normalizedLoans.reduce((sum, l) => sum + l.monto_pagado_acumulado, 0);
    const saldoImpagoTotal = normalizedLoans.reduce((sum, l) => sum + l.saldo_por_pagar, 0);
    const atrasosTotales = normalizedLoans.reduce((sum, l) => sum + l.periodos_atrasados_acumulados, 0);

    let clasificacion = 'SIN_PRESTAMOS';
    if (saldoImpagoTotal > 0 || atrasosTotales > 0) {
      clasificacion = 'DEUDA_PENDIENTE';
    } else if (totalPrestamos > 0 && saldoImpagoTotal <= 0) {
      clasificacion = 'BUEN_PAGADOR';
    }

    const nombreCompleto = [archivoMatch.nombre, archivoMatch.apellidos]
      .filter((s) => typeof s === 'string' && s.trim())
      .join(' ')
      .trim();

    return res.json({
      ok: true,
      encontrado: true,
      cliente_historico: {
        id: archivoMatch.id,
        cliente_original_id: archivoMatch.cliente_id_actual || null,
        tipo_cliente: archivoMatch.cedula ? 'COSTARRICENSE' : 'EXTRANJERO',
        cedula: archivoMatch.cedula ? String(archivoMatch.cedula).trim() : null,
        nombre: archivoMatch.nombre || '',
        apellidos: archivoMatch.apellidos || '',
        nombre_completo: nombreCompleto,
        telefono: archivoMatch.telefono || '',
        telefono_secundario: archivoMatch.telefono_secundario || '',
        ubicacion: archivoMatch.ubicacion || '',
        detalles: archivoMatch.detalles || '',
        fecha_eliminacion: archivoMatch.fecha_eliminacion,
      },
      resumen: {
        total_prestamos: totalPrestamos,
        prestamos_completados: prestamosCompletados,
        prestamos_inconclusos: prestamosInconclusos,
        total_prestado: totalPrestado,
        total_abonado: totalAbonado,
        saldo_impago_total: saldoImpagoTotal,
        atrasos_totales: atrasosTotales,
        clasificacion,
      },
      prestamos: normalizedLoans.slice(0, 5),
    });
  } catch (err) {
    console.error('[Error SQL detallado]: Error en consultarHistorialArchivo:', err);
    return res.status(500).json({
      error: 'No se pudo consultar el historial previo de clientes.',
      userMessage: 'No se pudo verificar el historial previo en este momento.',
      ...debugPayload(err),
    });
  }
}
