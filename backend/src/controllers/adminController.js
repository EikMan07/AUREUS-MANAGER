import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool, withTransaction, debugPayload } from '../config/db.js';
import { aplicarRetencionBitacora } from '../services/seedService.js';
import { aprovisionarEmpresaRag } from '../middlewares/ragLimites.js';

const ADMIN_EMAIL_UNICO = 'admin@cobrofirme.cr';

const EMAIL_STRICT_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const RESERVED_DISPOSABLE_DOMAINS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'test.com',
  'localhost',
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'yopmail.com',
  'trashmail.com'
]);

const validarCorreoEstrictamente = (correoRaw) => {
  const correo = String(correoRaw || '').trim().toLowerCase();
  if (!correo || !EMAIL_STRICT_REGEX.test(correo)) {
    return { valido: false, correo, motivo: 'El formato del correo electrónico no es válido.' };
  }
  const domain = correo.split('@')[1] || '';
  if (RESERVED_DISPOSABLE_DOMAINS.has(domain)) {
    return {
      valido: false,
      correo,
      motivo: 'No se permiten dominios de correo temporales o de prueba.'
    };
  }
  return { valido: true, correo };
};

let adminSchemaPrepared = false;

async function ensureAdminSchemaReady() {
  if (adminSchemaPrepared) return;
  try {
    await pool.query(`
      ALTER TABLE public.usuarios
        ADD COLUMN IF NOT EXISTS telefono varchar(32);
    `);

    await pool.query(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (
          SELECT tc.constraint_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = tc.constraint_name
           AND ccu.table_schema = tc.table_schema
          WHERE tc.table_schema = 'public'
            AND tc.table_name = 'bitacora_actividad'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_name = 'usuarios'
        ) LOOP
          EXECUTE 'ALTER TABLE public.bitacora_actividad DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
        END LOOP;
      END $$;
    `);
    adminSchemaPrepared = true;
  } catch (_err) {
    // Continuar de forma resiliente
  }
}

async function registrarBitacoraAdmin({ usuarioId, accionEnum, accionLabel, entidad, entidadId, detalle }) {
  await ensureAdminSchemaReady();
  try {
    await pool.query(
      `INSERT INTO bitacora_actividad (usuario_id, cobrador_id, accion, entidad, entidad_id, detalle)
       VALUES ($1, $1, $2, $3, $4, $5::jsonb)`,
      [
        usuarioId,
        accionEnum || 'USUARIO_REACTIVADO',
        entidad,
        entidadId,
        JSON.stringify({ accion_admin: accionLabel || accionEnum, ...(detalle || {}) })
      ]
    );
  } catch (_err) {
    // Ignorar en caso de restricción de tipo
  }
}

export function redactarPII(rawDetalle) {
  if (!rawDetalle) return 'Operación registrada en plataforma';
  const str = typeof rawDetalle === 'string' ? rawDetalle : JSON.stringify(rawDetalle);
  return str
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, 'registro')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, 'correo protegido')
    .replace(/\b[1-9]\d{8}\b/g, 'cédula protegida')
    .replace(/\b\d{4}[-\s]?\d{4}\b/g, 'teléfono protegido')
    .replace(
      /"(nombre|apellidos|nombre_completo|cedula|telefono|correo|correo_asignado|correo_actualizado|correo_eliminado|direccion|direccion_exacta)"\s*:\s*"[^"]*"/gi,
      '$1 protegido'
    )
    .replace(/[{}"[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatearEventoAuditoriaEjecutivo(row) {
  const det = row?.detalle && typeof row.detalle === 'object' ? row.detalle : {};
  const accionRaw = String(det.accion_admin || row?.accion || '').toUpperCase();
  const entidadRaw = String(row?.entidad || '').toLowerCase();

  let accion_legible = 'Actividad administrativa';
  let categoria_legible = 'Plataforma';
  let resumen_ejecutivo = 'Operación administrativa registrada bajo resguardo de privacidad.';

  if (accionRaw === 'CREAR_PRESTAMISTA_ADMIN') {
    accion_legible = 'Prestamista registrado';
    categoria_legible = 'Prestamistas';
    resumen_ejecutivo = 'Se registró una nueva cuenta de prestamista en la plataforma.';
  } else if (accionRaw === 'EDITAR_PRESTAMISTA_ADMIN') {
    accion_legible = 'Cuenta actualizada';
    categoria_legible = 'Prestamistas';
    resumen_ejecutivo = 'Se actualizaron los datos de perfil de una cuenta de prestamista.';
  } else if (
    accionRaw === 'CAMBIAR_ESTADO_PRESTAMISTA_ADMIN' ||
    accionRaw === 'USUARIO_SUSPENDIDO' ||
    accionRaw === 'USUARIO_REACTIVADO'
  ) {
    accion_legible = 'Estado de cuenta modificado';
    categoria_legible = 'Prestamistas';
    const estadoNuevo = String(det.estado_nuevo || '').toUpperCase();
    if (estadoNuevo === 'SUSPENDIDA' || accionRaw === 'USUARIO_SUSPENDIDO') {
      resumen_ejecutivo = 'Se suspendió temporalmente el acceso de una cuenta de prestamista.';
    } else if (estadoNuevo === 'ACTIVA') {
      resumen_ejecutivo = 'Se activó el acceso de una cuenta de prestamista.';
    } else {
      resumen_ejecutivo = 'Se actualizó el estado operativo de una cuenta de prestamista.';
    }
  } else if (
    accionRaw === 'RESTABLECER_PASSWORD_PRESTAMISTA_ADMIN' ||
    accionRaw === 'CLAVE_RESTABLECIDA'
  ) {
    accion_legible = 'Contraseña restablecida';
    categoria_legible = 'Seguridad';
    resumen_ejecutivo = 'Se renovó la contraseña de acceso para una cuenta de prestamista.';
  } else if (accionRaw === 'ELIMINAR_PRESTAMISTA_ADMIN') {
    accion_legible = 'Cuenta eliminada';
    categoria_legible = 'Prestamistas';
    resumen_ejecutivo = 'Se retiró definitivamente una cuenta de prestamista y sus registros asociados.';
  } else if (accionRaw === 'DEPURAR_ANTECEDENTES_ADMIN') {
    const prim = Number(det.registros_primarios_eliminados ?? 0);
    const sec = Number(det.registros_secundarios_eliminados ?? 0);
    accion_legible = 'Depuración ejecutada';
    categoria_legible = 'Depuración';
    resumen_ejecutivo = `Se depuraron ${prim} antecedentes históricos y ${sec} registros asociados.`;
  } else if (accionRaw === 'DEPURAR_PAPELERA_ADMIN') {
    const prim = Number(det.registros_primarios_eliminados ?? 0);
    const sec = Number(det.registros_secundarios_eliminados ?? 0);
    accion_legible = 'Papelera depurada';
    categoria_legible = 'Depuración';
    resumen_ejecutivo = `Se vaciaron ${prim} elementos de papelera y ${sec} registros asociados.`;
  } else if (accionRaw === 'LIMPIAR_AUDITORIA_ADMIN') {
    const elim = Number(det.registros_eliminados ?? 0);
    accion_legible = 'Historial de auditoría depurado';
    categoria_legible = 'Seguridad';
    resumen_ejecutivo = `Se ejecutó la limpieza manual del historial retirando ${elim} eventos antiguos.`;
  } else if (accionRaw.includes('CAMPANA') || entidadRaw.includes('campana')) {
    accion_legible = 'Campaña comercial creada';
    categoria_legible = 'CRM y Mercadeo';
    resumen_ejecutivo = 'Se registró o actualizó una campaña comercial de mercadeo.';
  } else if (accionRaw.includes('CRM') || entidadRaw.startsWith('crm')) {
    accion_legible = 'Seguimiento comercial actualizado';
    categoria_legible = 'CRM y Mercadeo';
    resumen_ejecutivo = 'Se actualizó el seguimiento comercial dentro de la plataforma.';
  } else if (accionRaw === 'INICIO_SESION') {
    accion_legible = 'Inicio de sesión';
    categoria_legible = 'Seguridad';
    resumen_ejecutivo = 'Se registró un inicio de sesión autorizado en la plataforma.';
  } else if (accionRaw === 'CIERRE_SESION') {
    accion_legible = 'Cierre de sesión';
    categoria_legible = 'Seguridad';
    resumen_ejecutivo = 'Se cerró y revocó una sesión activa de usuario.';
  } else if (accionRaw === 'CAMBIO_CONTRASENA') {
    accion_legible = 'Cambio de contraseña';
    categoria_legible = 'Seguridad';
    resumen_ejecutivo = 'Se actualizó la contraseña y se revocaron sesiones anteriores.';
  } else if (entidadRaw === 'lista_negra_global') {
    accion_legible = 'Consulta de riesgo actualizada';
    categoria_legible = 'Seguridad';
    resumen_ejecutivo = 'Se registró un movimiento administrativo en el control de riesgo.';
  }

  const resumenSeguro = redactarPII(resumen_ejecutivo).replace(/[/()]/g, '').trim();
  const actorRaw = String(row?.actor_nombre || '').trim();
  const actor =
    String(row?.actor_rol || '').toUpperCase() === 'ADMINISTRADOR' ||
    !actorRaw ||
    actorRaw === 'Cuenta histórica eliminada'
      ? 'Administración'
      : actorRaw;

  return {
    id: row.id,
    accion_legible,
    categoria_legible,
    resumen_ejecutivo: resumenSeguro,
    actor,
    fecha: row.fecha_evento,
  };
}

// 1. GET /api/admin/resumen (solo lectura)
export const getResumenPlataforma = async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM usuarios WHERE rol = 'COBRADOR') AS total_prestamistas,
        (SELECT COUNT(*)::int FROM usuarios WHERE rol = 'COBRADOR' AND estado_cuenta = 'ACTIVA') AS prestamistas_activos,
        (SELECT COUNT(*)::int FROM usuarios WHERE rol = 'COBRADOR' AND estado_cuenta = 'SUSPENDIDA') AS prestamistas_suspendidos,
        (SELECT COUNT(*)::int FROM usuarios WHERE rol = 'COBRADOR' AND estado_cuenta = 'PENDIENTE_VERIFICACION') AS prestamistas_inactivos,
        (SELECT COUNT(*)::int FROM clientes) AS volumen_clientes_activos_global,
        (SELECT COUNT(*)::int FROM clientes_baneados) AS volumen_clientes_papelera_global,
        (SELECT COUNT(*)::int FROM prestamos) AS volumen_prestamos_activos_global,
        (SELECT COUNT(*)::int FROM historial_clientes_archivo) AS volumen_antecedentes_archivados_global,
        (SELECT COUNT(*)::int FROM historial_prestamos_archivo) AS volumen_prestamos_archivados_global,
        (SELECT COUNT(*)::int FROM bitacora_actividad) AS total_eventos_auditoria
    `);

    return res.json({
      ok: true,
      metricas: rows[0] || {},
      salud: {
        cumplimiento_ley_8968: 'ACTIVO — SIN ACCESO A OPERACIONES PRIVADAS',
        administrador_unico_activo: true,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[adminController] Error en getResumenPlataforma:', redactarPII(error?.message || 'Error'));
    return res.status(500).json({
      userMessage: 'No se pudo obtener el resumen global de la plataforma.',
      ...debugPayload(error)
    });
  }
};

// 2. GET /api/admin/prestamistas (solo lectura)
export const getPrestamistas = async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        u.id,
        u.usuario,
        u.nombre_completo,
        u.correo,
        u.telefono,
        u.rol,
        u.estado_cuenta,
        u.creado_en AS fecha_creacion,
        u.actualizado_en AS fecha_actualizacion,
        (SELECT COUNT(*)::int FROM clientes c WHERE c.cobrador_id = u.id) AS total_clientes_activos,
        (SELECT COUNT(*)::int FROM prestamos p WHERE p.cobrador_id = u.id) AS total_prestamos_activos,
        (SELECT COUNT(*)::int FROM clientes_baneados cb WHERE cb.cobrador_id = u.id) AS total_clientes_papelera,
        (SELECT COUNT(*)::int FROM historial_clientes_archivo hca WHERE hca.cobrador_id = u.id) AS total_antecedentes_archivados,
        (SELECT COUNT(*)::int FROM historial_prestamos_archivo hpa
          JOIN historial_clientes_archivo hca2 ON hca2.id = hpa.archivo_id
         WHERE hca2.cobrador_id = u.id) AS total_prestamos_archivados
      FROM usuarios u
      WHERE u.rol = 'COBRADOR'
      ORDER BY u.creado_en DESC
    `);

    return res.json({
      ok: true,
      total: rows.length,
      prestamistas: rows
    });
  } catch (error) {
    console.error('[adminController] Error en getPrestamistas:', redactarPII(error?.message || 'Error'));
    return res.status(500).json({
      userMessage: 'No se pudo cargar el directorio de prestamistas.',
      ...debugPayload(error)
    });
  }
};

// 3. POST /api/admin/prestamistas
export const crearPrestamistaAdmin = async (req, res) => {
  try {
    await ensureAdminSchemaReady();
    const { nombre_completo, correo, password, telefono, estado_cuenta, usuario } = req.body || {};

    const nombreLimpio = String(nombre_completo || '').trim();
    if (nombreLimpio.length < 3) {
      return res.status(400).json({
        userMessage: 'El nombre completo del prestamista debe tener al menos 3 caracteres.'
      });
    }

    const validacionCorreo = validarCorreoEstrictamente(correo);
    if (!validacionCorreo.valido) {
      return res.status(400).json({
        userMessage: validacionCorreo.motivo
      });
    }

    if (validacionCorreo.correo === ADMIN_EMAIL_UNICO) {
      return res.status(400).json({
        userMessage: 'El correo administrativo principal está reservado por el sistema.'
      });
    }

    if (!password || String(password).length < 6) {
      return res.status(400).json({
        userMessage: 'La contraseña inicial debe tener al menos 6 caracteres.'
      });
    }

    let telefonoLimpio = null;
    if (telefono !== undefined && telefono !== null && String(telefono).trim() !== '') {
      const soloDigitos = String(telefono).replace(/\D/g, '');
      const sinPrefijo =
        soloDigitos.length === 11 && soloDigitos.startsWith('506')
          ? soloDigitos.slice(3)
          : soloDigitos;
      if (!/^[2-8]\d{7}$/.test(sinPrefijo)) {
        return res.status(400).json({
          userMessage: 'El teléfono debe ser un número válido de 8 dígitos en Costa Rica.'
        });
      }
      telefonoLimpio = `${sinPrefijo.slice(0, 4)}-${sinPrefijo.slice(4)}`;
    }

    const baseUsername = String(
      usuario || validacionCorreo.correo.split('@')[0] || 'prestamista'
    )
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '')
      .slice(0, 36);
    const finalUsername = `${baseUsername || 'prestamista'}_${crypto.randomBytes(2).toString('hex')}`;

    const existente = await pool.query(
      `SELECT id FROM usuarios WHERE LOWER(correo) = LOWER($1) OR LOWER(usuario) = LOWER($2) LIMIT 1`,
      [validacionCorreo.correo, finalUsername]
    );
    if (existente.rows.length > 0) {
      return res.status(400).json({
        userMessage: 'Ya existe una cuenta registrada con ese correo electrónico.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(String(password), salt);

    const estadosPermitidos = ['ACTIVA', 'SUSPENDIDA', 'PENDIENTE_VERIFICACION'];
    const estadoFinal = estadosPermitidos.includes(estado_cuenta) ? estado_cuenta : 'ACTIVA';

    const { rows } = await pool.query(
      `INSERT INTO usuarios (
         usuario,
         nombre_completo,
         correo,
         correo_verificado,
         correo_verificado_en,
         password_hash,
         rol,
         telefono,
         estado_cuenta,
         consentimiento_aceptado,
         consentimiento_version,
         consentimiento_aceptado_en
       )
       VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, $4, 'COBRADOR', $5, $6, true, 'v1.0-2026', CURRENT_TIMESTAMP)
       RETURNING id, usuario, nombre_completo, correo, rol, telefono, estado_cuenta, creado_en AS fecha_creacion, actualizado_en AS fecha_actualizacion`,
      [finalUsername, nombreLimpio, validacionCorreo.correo, password_hash, telefonoLimpio, estadoFinal]
    );

    const nuevoPrestamista = rows[0];

    await aprovisionarEmpresaRag(nuevoPrestamista.id, nuevoPrestamista.nombre_completo, {
      seedBaseDocs: false
    }).catch(() => {});

    await registrarBitacoraAdmin({
      usuarioId: req.user.id,
      accionEnum: 'USUARIO_REACTIVADO',
      accionLabel: 'CREAR_PRESTAMISTA_ADMIN',
      entidad: 'usuarios',
      entidadId: nuevoPrestamista.id,
      detalle: {
        operacion: 'ALTA_PRESTAMISTA',
        correo_asignado: nuevoPrestamista.correo,
        estado_inicial: nuevoPrestamista.estado_cuenta
      }
    });

    return res.status(201).json({
      ok: true,
      message: 'Cuenta de prestamista creada exitosamente.',
      prestamista: {
        ...nuevoPrestamista,
        total_clientes_activos: 0,
        total_prestamos_activos: 0,
        total_clientes_papelera: 0,
        total_antecedentes_archivados: 0,
        total_prestamos_archivados: 0
      }
    });
  } catch (error) {
    console.error('[adminController] Error en crearPrestamistaAdmin:', redactarPII(error?.message || 'Error'));
    return res.status(500).json({
      userMessage: 'No se pudo crear la cuenta del prestamista.',
      ...debugPayload(error)
    });
  }
};

// 4. PUT /api/admin/prestamistas/:id
export const editarPrestamistaAdmin = async (req, res) => {
  try {
    await ensureAdminSchemaReady();
    const { id } = req.params;
    const { nombre_completo, correo, telefono } = req.body || {};

    const targetRes = await pool.query(
      `SELECT id, nombre_completo, correo, telefono, rol, estado_cuenta FROM usuarios WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (targetRes.rows.length === 0) {
      return res.status(404).json({
        userMessage: 'No se encontró la cuenta del prestamista solicitado.'
      });
    }

    const targetUser = targetRes.rows[0];
    if (targetUser.rol === 'ADMINISTRADOR') {
      return res.status(403).json({
        userMessage: 'La cuenta del Administrador Único no se edita desde el directorio de prestamistas.'
      });
    }

    const nombreLimpio =
      nombre_completo !== undefined ? String(nombre_completo).trim() : targetUser.nombre_completo;
    if (!nombreLimpio || nombreLimpio.length < 3) {
      return res.status(400).json({
        userMessage: 'El nombre completo debe tener al menos 3 caracteres.'
      });
    }

    let correoLimpio = targetUser.correo;
    if (correo !== undefined && String(correo).trim().toLowerCase() !== targetUser.correo) {
      const validacionCorreo = validarCorreoEstrictamente(correo);
      if (!validacionCorreo.valido) {
        return res.status(400).json({
          userMessage: validacionCorreo.motivo
        });
      }
      const dupRes = await pool.query(
        `SELECT id FROM usuarios WHERE LOWER(correo) = LOWER($1) AND id <> $2 LIMIT 1`,
        [validacionCorreo.correo, id]
      );
      if (dupRes.rows.length > 0) {
        return res.status(400).json({
          userMessage: 'Ese correo electrónico ya pertenece a otra cuenta registrada.'
        });
      }
      correoLimpio = validacionCorreo.correo;
    }

    let telefonoLimpio = targetUser.telefono;
    if (telefono !== undefined) {
      const rawTel = String(telefono || '').trim();
      if (!rawTel) {
        telefonoLimpio = null;
      } else {
        const soloDigitos = rawTel.replace(/\D/g, '');
        const sinPrefijo =
          soloDigitos.length === 11 && soloDigitos.startsWith('506')
            ? soloDigitos.slice(3)
            : soloDigitos;
        if (!/^[2-8]\d{7}$/.test(sinPrefijo)) {
          return res.status(400).json({
            userMessage: 'El teléfono debe ser un número válido de 8 dígitos en Costa Rica.'
          });
        }
        telefonoLimpio = `${sinPrefijo.slice(0, 4)}-${sinPrefijo.slice(4)}`;
      }
    }

    const { rows } = await pool.query(
      `UPDATE usuarios
       SET nombre_completo = $1,
           correo = $2,
           telefono = $3,
           rol = 'COBRADOR',
           actualizado_en = CURRENT_TIMESTAMP
       WHERE id = $4 AND rol = 'COBRADOR'
       RETURNING id, usuario, nombre_completo, correo, telefono, rol, estado_cuenta, creado_en AS fecha_creacion, actualizado_en AS fecha_actualizacion`,
      [nombreLimpio, correoLimpio, telefonoLimpio, id]
    );

    await registrarBitacoraAdmin({
      usuarioId: req.user.id,
      accionEnum: 'USUARIO_REACTIVADO',
      accionLabel: 'EDITAR_PRESTAMISTA_ADMIN',
      entidad: 'usuarios',
      entidadId: id,
      detalle: {
        operacion: 'ACTUALIZAR_DATOS_PRESTAMISTA',
        correo_actualizado: correoLimpio
      }
    });

    return res.json({
      ok: true,
      message: 'Datos del prestamista actualizados correctamente.',
      prestamista: rows[0]
    });
  } catch (error) {
    console.error('[adminController] Error en editarPrestamistaAdmin:', redactarPII(error?.message || 'Error'));
    return res.status(500).json({
      userMessage: 'No se pudieron actualizar los datos del prestamista.',
      ...debugPayload(error)
    });
  }
};

// 5. PATCH /api/admin/prestamistas/:id/estado
export const cambiarEstadoPrestamistaAdmin = async (req, res) => {
  try {
    await ensureAdminSchemaReady();
    const { id } = req.params;
    const { estado_cuenta } = req.body || {};

    const estadoNormalizado =
      estado_cuenta === 'INACTIVA' ? 'PENDIENTE_VERIFICACION' : estado_cuenta;
    const estadosPermitidos = ['ACTIVA', 'SUSPENDIDA', 'PENDIENTE_VERIFICACION'];
    if (!estadosPermitidos.includes(estadoNormalizado)) {
      return res.status(400).json({
        userMessage: 'El estado de cuenta debe ser ACTIVA o SUSPENDIDA.'
      });
    }

    const targetRes = await pool.query(
      `SELECT id, rol, estado_cuenta, correo FROM usuarios WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (targetRes.rows.length === 0) {
      return res.status(404).json({
        userMessage: 'No se encontró la cuenta del prestamista.'
      });
    }

    if (targetRes.rows[0].rol === 'ADMINISTRADOR') {
      return res.status(403).json({
        userMessage: 'No se permite suspender ni desactivar la cuenta del Administrador Único.'
      });
    }

    const { rows } = await pool.query(
      `UPDATE usuarios
       SET estado_cuenta = $1,
           token_version = COALESCE(token_version, 1) + 1,
           actualizado_en = CURRENT_TIMESTAMP
       WHERE id = $2 AND rol = 'COBRADOR'
       RETURNING id, usuario, nombre_completo, correo, telefono, rol, estado_cuenta, creado_en AS fecha_creacion, actualizado_en AS fecha_actualizacion`,
      [estadoNormalizado, id]
    );

    await registrarBitacoraAdmin({
      usuarioId: req.user.id,
      accionEnum:
        estadoNormalizado === 'SUSPENDIDA' ? 'USUARIO_SUSPENDIDO' : 'USUARIO_REACTIVADO',
      accionLabel: 'CAMBIAR_ESTADO_PRESTAMISTA_ADMIN',
      entidad: 'usuarios',
      entidadId: id,
      detalle: {
        operacion: 'CAMBIO_ESTADO_CUENTA',
        estado_anterior: targetRes.rows[0].estado_cuenta,
        estado_nuevo: estadoNormalizado
      }
    });

    return res.json({
      ok: true,
      message: `El estado de la cuenta cambió a ${estadoNormalizado}.`,
      prestamista: rows[0]
    });
  } catch (error) {
    console.error('[adminController] Error en cambiarEstadoPrestamistaAdmin:', redactarPII(error?.message || 'Error'));
    return res.status(500).json({
      userMessage: 'No se pudo cambiar el estado de la cuenta del prestamista.',
      ...debugPayload(error)
    });
  }
};

// 6. POST /api/admin/prestamistas/:id/password
export const restablecerPasswordPrestamistaAdmin = async (req, res) => {
  try {
    await ensureAdminSchemaReady();
    const { id } = req.params;
    const rawPass = String(req.body?.nuevaPassword || req.body?.password || '').trim();

    if (rawPass.length > 0 && rawPass.length < 8) {
      return res.status(400).json({
        userMessage: 'La nueva contraseña debe tener al menos 8 caracteres.'
      });
    }

    const targetRes = await pool.query(
      `SELECT id, rol, correo, nombre_completo FROM usuarios WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (targetRes.rows.length === 0) {
      return res.status(404).json({
        userMessage: 'No se encontró la cuenta del prestamista.'
      });
    }

    if (targetRes.rows[0].rol === 'ADMINISTRADOR') {
      return res.status(403).json({
        userMessage: 'La contraseña del Administrador Único se gestiona desde su perfil.'
      });
    }

    const passwordPlana =
      rawPass.length >= 8
        ? rawPass
        : `CF-${crypto.randomBytes(3).toString('hex').toUpperCase()}26`;

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(passwordPlana, salt);

    await pool.query(
      `UPDATE usuarios
       SET password_hash = $1,
           token_version = COALESCE(token_version, 1) + 1,
           intentos_fallidos = 0,
           bloqueado_hasta = NULL,
           actualizado_en = CURRENT_TIMESTAMP
       WHERE id = $2 AND rol = 'COBRADOR'`,
      [password_hash, id]
    );

    await registrarBitacoraAdmin({
      usuarioId: req.user.id,
      accionEnum: 'CLAVE_RESTABLECIDA',
      accionLabel: 'RESTABLECER_PASSWORD_PRESTAMISTA_ADMIN',
      entidad: 'usuarios',
      entidadId: id,
      detalle: {
        operacion: 'RESTABLECIMIENTO_CREDENCIALES_ADMIN'
      }
    });

    return res.json({
      ok: true,
      message: 'Contraseña restablecida correctamente.',
      credencialTemporal: passwordPlana
    });
  } catch (error) {
    console.error('[adminController] Error en restablecerPasswordPrestamistaAdmin:', redactarPII(error?.message || 'Error'));
    return res.status(500).json({
      userMessage: 'No se pudo restablecer la contraseña del prestamista.',
      ...debugPayload(error)
    });
  }
};

// 7. DELETE /api/admin/prestamistas/:id
export const eliminarPrestamistaAdmin = async (req, res) => {
  await ensureAdminSchemaReady();
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const targetRes = await client.query(
      `SELECT id, rol, correo, nombre_completo FROM usuarios WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (targetRes.rows.length === 0) {
      return res.status(404).json({
        userMessage: 'No se encontró la cuenta del prestamista que deseas eliminar.'
      });
    }

    const targetUser = targetRes.rows[0];
    if (targetUser.rol === 'ADMINISTRADOR' || id === req.user.id) {
      return res.status(403).json({
        userMessage: 'Está estrictamente prohibido eliminar la cuenta del Administrador Único.'
      });
    }

    await client.query('BEGIN');

    await client.query(`DELETE FROM verificaciones_correo WHERE usuario_id = $1`, [id]);
    await client.query(`DELETE FROM credenciales_webauthn WHERE usuario_id = $1`, [id]);
    await client.query(`DELETE FROM suscripciones_push WHERE usuario_id = $1`, [id]);
    await client.query(`DELETE FROM notificaciones WHERE usuario_id = $1`, [id]);
    await client.query(`DELETE FROM metricas_diarias_resumen WHERE cobrador_id = $1`, [id]);
    await client.query(
      `DELETE FROM contactos_cobradores WHERE propietario_id = $1 OR contacto_usuario_id = $1`,
      [id]
    );
    await client.query(
      `DELETE FROM transferencias_cartera
       WHERE cobrador_origen_id = $1 OR cobrador_destino_id = $1 OR realizado_por = $1`,
      [id]
    );
    await client.query(
      `DELETE FROM lista_negra_global
       WHERE compartida_por = $1 OR cobrador_origen_id = $1 OR retirada_por = $1`,
      [id]
    );

    await client.query(
      `DELETE FROM historial_pasar_dia
       WHERE prestamo_id IN (SELECT id FROM prestamos WHERE cobrador_id = $1)`,
      [id]
    );

    await client.query(
      `DELETE FROM cobros_compartidos_dia
       WHERE propietario_id = $1 OR destinatario_id = $1`,
      [id]
    );

    await client.query(
      `DELETE FROM pagos_prestamo
       WHERE cobrador_id = $1
          OR registrado_por = $1
          OR prestamo_id IN (SELECT id FROM prestamos WHERE cobrador_id = $1)`,
      [id]
    );

    await client.query(
      `DELETE FROM arreglos_pago
       WHERE prestamo_id IN (SELECT id FROM prestamos WHERE cobrador_id = $1)`,
      [id]
    );

    await client.query(
      `DELETE FROM renovaciones_prestamo
       WHERE prestamo_id IN (SELECT id FROM prestamos WHERE cobrador_id = $1)`,
      [id]
    );

    await client.query(
      `DELETE FROM agenda_cobros
       WHERE cobrador_id = $1
          OR compartido_con_usuario_id = $1
          OR gestionado_por_usuario_id = $1
          OR compartido_por_usuario_id = $1
          OR prestamo_id IN (SELECT id FROM prestamos WHERE cobrador_id = $1)`,
      [id]
    );

    await client.query(
      `DELETE FROM prestamos
       WHERE cobrador_id = $1
          OR cliente_id IN (SELECT id FROM clientes WHERE cobrador_id = $1)`,
      [id]
    );

    await client.query(`DELETE FROM prestamos_baneados WHERE cobrador_id = $1`, [id]);
    await client.query(`DELETE FROM clientes_baneados WHERE cobrador_id = $1`, [id]);
    await client.query(`DELETE FROM lista_negra WHERE cobrador_id = $1`, [id]);

    await client.query(
      `DELETE FROM historial_prestamos_archivo
       WHERE archivo_id IN (SELECT id FROM historial_clientes_archivo WHERE cobrador_id = $1)`,
      [id]
    );

    await client.query(`DELETE FROM historial_clientes_archivo WHERE cobrador_id = $1`, [id]);
    await client.query(`DELETE FROM clientes WHERE cobrador_id = $1`, [id]);
    await client.query(`DELETE FROM usuarios WHERE id = $1 AND rol = 'COBRADOR'`, [id]);

    await client.query('COMMIT');

    await registrarBitacoraAdmin({
      usuarioId: req.user.id,
      accionEnum: 'CLIENTE_ELIMINADO_DEFINITIVO',
      accionLabel: 'ELIMINAR_PRESTAMISTA_ADMIN',
      entidad: 'usuarios',
      entidadId: id,
      detalle: {
        operacion: 'BAJA_DEFINITIVA_PRESTAMISTA',
        correo_eliminado: targetUser.correo
      }
    });

    return res.json({
      ok: true,
      message: 'La cuenta del prestamista y sus registros asociados fueron eliminados definitivamente.',
      idEliminado: id
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[adminController] Error en eliminarPrestamistaAdmin:', redactarPII(error?.message || 'Error'));
    return res.status(500).json({
      userMessage: 'No se pudo eliminar definitivamente la cuenta del prestamista.',
      ...debugPayload(error)
    });
  } finally {
    client.release();
  }
};

// 8A. GET /api/admin/depuracion/antecedentes (solo lectura)
export const getResumenAntecedentesPorPrestamista = async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        u.id AS prestamista_id,
        u.nombre_completo,
        u.correo,
        u.estado_cuenta,
        (SELECT COUNT(*)::int FROM historial_clientes_archivo hca WHERE hca.cobrador_id = u.id) AS cantidad_antecedentes,
        (SELECT COUNT(*)::int FROM historial_prestamos_archivo hpa
          JOIN historial_clientes_archivo hca2 ON hca2.id = hpa.archivo_id
         WHERE hca2.cobrador_id = u.id) AS cantidad_prestamos_archivados,
        (SELECT COALESCE(SUM(hca.saldo_impago_historico), 0)::numeric(15,2) FROM historial_clientes_archivo hca WHERE hca.cobrador_id = u.id) AS monto_incobrable_acumulado,
        (SELECT COUNT(*)::int FROM clientes_baneados cb WHERE cb.cobrador_id = u.id) AS clientes_en_papelera,
        (SELECT COUNT(*)::int FROM prestamos_baneados pb WHERE pb.cobrador_id = u.id) AS prestamos_en_papelera
      FROM usuarios u
      WHERE u.rol = 'COBRADOR'
      ORDER BY cantidad_antecedentes DESC, clientes_en_papelera DESC, u.nombre_completo ASC
    `);

    return res.json({
      ok: true,
      prestamistas: rows
    });
  } catch (error) {
    console.error('[adminController] Error en getResumenAntecedentesPorPrestamista:', redactarPII(error?.message || 'Error'));
    return res.status(500).json({
      userMessage: 'No se pudo obtener el resumen de depuración por prestamista.',
      ...debugPayload(error)
    });
  }
};

// 8B. DELETE /api/admin/depuracion/antecedentes/:targetId
export const depurarAntecedentesPrestamista = async (req, res) => {
  await ensureAdminSchemaReady();
  const client = await pool.connect();
  try {
    const { targetId } = req.params;
    const tipo = String(req.query.tipo || 'antecedentes').toLowerCase();

    const userRes = await client.query(
      `SELECT id, nombre_completo, correo, rol FROM usuarios WHERE id = $1 LIMIT 1`,
      [targetId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({
        userMessage: 'No se encontró el prestamista seleccionado para depuración.'
      });
    }

    await client.query('BEGIN');

    let eliminadosPrimarios = 0;
    let eliminadosSecundarios = 0;

    if (tipo === 'papelera' || tipo === 'ambos') {
      const delPrestBan = await client.query(
        `DELETE FROM prestamos_baneados WHERE cobrador_id = $1::uuid`,
        [targetId]
      );
      eliminadosSecundarios += delPrestBan.rowCount;

      const delCliBan = await client.query(
        `DELETE FROM clientes_baneados WHERE cobrador_id = $1::uuid`,
        [targetId]
      );
      eliminadosPrimarios += delCliBan.rowCount;
    }

    if (tipo !== 'papelera') {
      const delLoans = await client.query(
        `DELETE FROM historial_prestamos_archivo
         WHERE archivo_id IN (SELECT id FROM historial_clientes_archivo WHERE cobrador_id = $1::uuid)`,
        [targetId]
      );
      eliminadosSecundarios += delLoans.rowCount;

      const delArch = await client.query(
        `DELETE FROM historial_clientes_archivo WHERE cobrador_id = $1::uuid`,
        [targetId]
      );
      eliminadosPrimarios += delArch.rowCount;
    }

    await client.query('COMMIT');

    await registrarBitacoraAdmin({
      usuarioId: req.user.id,
      accionEnum: 'CLIENTE_ELIMINADO_DEFINITIVO',
      accionLabel: tipo === 'papelera' ? 'DEPURAR_PAPELERA_ADMIN' : 'DEPURAR_ANTECEDENTES_ADMIN',
      entidad: 'depuracion',
      entidadId: targetId,
      detalle: {
        operacion: tipo === 'papelera' ? 'PURGA_PAPELERA_PRESTAMISTA' : 'PURGA_ANTECEDENTES_PRESTAMISTA',
        registros_primarios_eliminados: eliminadosPrimarios,
        registros_secundarios_eliminados: eliminadosSecundarios
      }
    });

    return res.json({
      ok: true,
      tipo,
      prestamistaId: targetId,
      eliminadosPrimarios,
      eliminadosSecundarios,
      message:
        tipo === 'papelera'
          ? 'La papelera del prestamista fue vaciada definitivamente.'
          : 'Los antecedentes y préstamos archivados del prestamista fueron depurados definitivamente.'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[adminController] Error en depurarAntecedentesPrestamista:', redactarPII(error?.message || 'Error'));
    return res.status(500).json({
      userMessage: 'No se pudo completar la depuración administrativa solicitada.',
      ...debugPayload(error)
    });
  } finally {
    client.release();
  }
};

// 9. GET /api/admin/auditoria (solo lectura)
export const getBitacoraAuditoriaAdmin = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 15, 1), 25);
    const offset = (page - 1) * limit;

    const { rows: countRows } = await pool.query('SELECT COUNT(*)::int AS total FROM bitacora_actividad');
    const total = Number(countRows[0]?.total ?? 0);
    const totalPaginas = Math.max(1, Math.ceil(total / limit));

    const { rows } = await pool.query(
      `SELECT
         b.id,
         b.usuario_id,
         b.cobrador_id,
         b.accion,
         b.entidad,
         b.entidad_id,
         b.detalle,
         b.fecha_hora AS fecha_evento,
         u.nombre_completo AS actor_nombre,
         COALESCE(u.rol::text, 'ADMINISTRADOR') AS actor_rol
       FROM bitacora_actividad b
       LEFT JOIN usuarios u ON u.id = COALESCE(b.usuario_id, b.cobrador_id)
       ORDER BY b.fecha_hora DESC, b.id DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const eventos = rows.map(formatearEventoAuditoriaEjecutivo);

    return res.json({
      ok: true,
      eventos,
      paginacion: {
        page,
        limit,
        total,
        totalPaginas,
      },
      politicaRetencion: {
        dias: 30,
        maximoRegistros: 200,
      },
    });
  } catch (error) {
    console.error('[adminController] Error en getBitacoraAuditoriaAdmin:', redactarPII(error?.message || 'Error'));
    return res.status(500).json({
      userMessage: 'No se pudo consultar la bitácora de auditoría.',
      ...debugPayload(error)
    });
  }
};

// 10. DELETE /api/admin/auditoria/limpiar
export const limpiarAuditoriaAdmin = async (req, res) => {
  try {
    await ensureAdminSchemaReady();
    await aplicarRetencionBitacora();

    const modo =
      String(req.query.modo || req.body?.modo || 'antiguos').toLowerCase() === 'todo'
        ? 'todo'
        : 'antiguos';

    const eliminados = await withTransaction(async (client) => {
      await client.query("SELECT set_config('aureus.allow_bitacora_purge', 'on', true);");

      let count = 0;
      if (modo === 'todo') {
        const delAll = await client.query('DELETE FROM bitacora_actividad');
        count = Number(delAll.rowCount || 0);
      } else {
        const delOld = await client.query(
          "DELETE FROM bitacora_actividad WHERE fecha_hora < now() - interval '7 days'"
        );
        count = Number(delOld.rowCount || 0);
      }

      const detalleLimpieza = JSON.stringify({
        accion_admin: 'LIMPIAR_AUDITORIA_ADMIN',
        operacion: modo === 'todo' ? 'LIMPIEZA_TOTAL_AUDITORIA' : 'LIMPIEZA_ANTIGUOS_AUDITORIA',
        registros_eliminados: count,
      });

      await client.query(
        `INSERT INTO bitacora_actividad (usuario_id, cobrador_id, accion, entidad, entidad_id, detalle)
         VALUES ($1::uuid, $1::uuid, 'USUARIO_REACTIVADO'::public.accion_bitacora, 'seguridad', $2::uuid, $3::jsonb)`,
        [req.user.id, req.user.id, detalleLimpieza]
      );

      return count;
    });

    return res.status(200).json({
      ok: true,
      eliminados,
      modo,
      userMessage: 'Historial de auditoría depurado correctamente.',
    });
  } catch (error) {
    console.error('[adminController] Error en limpiarAuditoriaAdmin:', redactarPII(error?.message || 'Error'));
    return res.status(500).json({
      ok: false,
      userMessage: 'No se pudo limpiar el historial de auditoría en este momento.',
      ...debugPayload(error),
    });
  }
};
