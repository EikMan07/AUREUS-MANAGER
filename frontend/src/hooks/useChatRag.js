import { useState, useRef, useCallback, useEffect } from 'react';
import {
  getCsrfToken,
  setCsrfToken,
  sanitizeUserFacingMessage
} from '../services/apiClient.js';

async function ensureCsrfTokenReady() {
  let token = getCsrfToken();
  if (token) return token;

  try {
    const res = await fetch('/api/auth/yo', {
      method: 'GET',
      credentials: 'include'
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.csrfToken) {
        setCsrfToken(data.csrfToken);
        token = data.csrfToken;
      }
    }
  } catch {
    // Continuar con lo disponible
  }
  return token || '';
}

async function parseErrorResponse(resp, fallbackMsg) {
  let data = null;
  try {
    data = await resp.json();
  } catch {
    data = null;
  }
  const msg = data?.userMessage || data?.error || data?.message || fallbackMsg;
  return sanitizeUserFacingMessage(msg, fallbackMsg);
}

export function useChatRag() {
  const [mensajes, setMensajes] = useState([]);
  const [cargandoStream, setCargandoStream] = useState(false);
  const [errorStream, setErrorStream] = useState('');
  const [estadoRag, setEstadoRag] = useState(null);
  const [cargandoEstado, setCargandoEstado] = useState(false);
  const [accionEnCurso, setAccionEnCurso] = useState(false);
  const [avisoAccion, setAvisoAccion] = useState(null);

  const abortControllerRef = useRef(null);

  const cancelarStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setCargandoStream(false);
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const cargarEstadoRag = useCallback(async () => {
    setCargandoEstado(true);
    try {
      const resp = await fetch('/api/seneca/rag/estado', {
        method: 'GET',
        credentials: 'include'
      });
      if (!resp.ok) {
        return null;
      }
      const data = await resp.json();
      if (data?.ok) {
        setEstadoRag(data);
      }
      return data;
    } catch {
      return null;
    } finally {
      setCargandoEstado(false);
    }
  }, []);

  const enviarPregunta = useCallback(
    async (rawPregunta) => {
      const pregunta = String(rawPregunta || '').trim();
      if (!pregunta || cargandoStream) return false;

      setErrorStream('');
      setAvisoAccion(null);

      const userId = `usr-${Date.now()}`;
      const botId = `bot-${Date.now() + 1}`;

      setMensajes((prev) => [
        ...prev,
        { id: userId, rol: 'usuario', texto: pregunta },
        { id: botId, rol: 'asistente', texto: '', fuentes: [] }
      ]);

      const controller = new AbortController();
      abortControllerRef.current = controller;
      setCargandoStream(true);

      try {
        const csrfToken = await ensureCsrfTokenReady();
        const headers = {
          'Content-Type': 'application/json'
        };
        if (csrfToken) {
          headers['X-CSRF-Token'] = csrfToken;
        }

        const resp = await fetch('/api/seneca/rag/stream', {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify({ pregunta }),
          signal: controller.signal
        });

        if (!resp.ok) {
          const fallbackMsg =
            resp.status === 429
              ? 'Se alcanzó el límite mensual de consultas de tu plan actual.'
              : resp.status === 403
                ? 'No cuentas con permisos suficientes para esta acción.'
                : 'No fue posible completar la consulta en este momento.';
          const friendly = await parseErrorResponse(resp, fallbackMsg);
          setErrorStream(friendly);
          setMensajes((prev) => {
            const copy = [...prev];
            const idx = copy.findIndex((m) => m.id === botId);
            if (idx !== -1) {
              copy[idx] = { ...copy[idx], texto: friendly, fuentes: [] };
            }
            return copy;
          });
          return false;
        }

        if (!resp.body) {
          throw new Error('Respuesta sin flujo de lectura.');
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const jsonText = trimmed.slice(5).trim();
            if (!jsonText) continue;

            try {
              const dato = JSON.parse(jsonText);
              if (dato.error) {
                setErrorStream(dato.error);
              }
              const fragmento =
                typeof dato.delta === 'string'
                  ? dato.delta
                  : typeof dato.token === 'string'
                    ? dato.token
                    : typeof dato.chunk === 'string'
                      ? dato.chunk
                      : '';
              if (fragmento.length > 0 || dato.fin) {
                setMensajes((prev) => {
                  const copy = [...prev];
                  const idx = copy.findIndex((m) => m.id === botId);
                  if (idx === -1) return prev;
                  const target = { ...copy[idx] };
                  if (fragmento.length > 0) {
                    target.texto = `${target.texto || ''}${fragmento}`;
                  }
                  if (dato.fin) {
                    if (
                      typeof dato.textoFinal === 'string' &&
                      dato.textoFinal.length > 0
                    ) {
                      target.texto = dato.textoFinal;
                    }
                    target.fuentes = Array.isArray(dato.fuentes)
                      ? dato.fuentes
                      : [];
                  }
                  copy[idx] = target;
                  return copy;
                });
              }
            } catch {
              // Ignorar fragmento parcial hasta completar línea JSON
            }
          }
        }

        cargarEstadoRag();
        return true;
      } catch (err) {
        if (err?.name === 'AbortError') {
          return false;
        }
        const msg = sanitizeUserFacingMessage(
          err?.message,
          'No fue posible completar la consulta en este momento.'
        );
        setErrorStream(msg);
        setMensajes((prev) => {
          const copy = [...prev];
          const idx = copy.findIndex((m) => m.id === botId);
          if (idx !== -1 && !copy[idx].texto) {
            copy[idx] = { ...copy[idx], texto: msg, fuentes: [] };
          }
          return copy;
        });
        return false;
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        setCargandoStream(false);
      }
    },
    [cargandoStream, cargarEstadoRag]
  );

  const limpiarChat = useCallback(() => {
    cancelarStream();
    setMensajes([]);
    setErrorStream('');
  }, [cancelarStream]);

  const subirDocumento = useCallback(
    async (archivo) => {
      if (!archivo || accionEnCurso) return null;
      setAccionEnCurso(true);
      setAvisoAccion(null);

      try {
        const csrfToken = await ensureCsrfTokenReady();
        const formData = new FormData();
        formData.append('archivo', archivo);

        const headers = {};
        if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

        const resp = await fetch('/api/seneca/rag/documentos', {
          method: 'POST',
          credentials: 'include',
          headers,
          body: formData
        });

        if (!resp.ok) {
          const msg = await parseErrorResponse(
            resp,
            'No se pudo subir e indexar el documento.'
          );
          setAvisoAccion({ tipo: 'error', texto: msg });
          return null;
        }

        const data = await resp.json();
        setAvisoAccion({
          tipo: 'ok',
          texto: `Documento ${data.nombre} indexado con ${data.num_fragmentos} fragmentos.`
        });
        await cargarEstadoRag();
        return data;
      } catch {
        setAvisoAccion({
          tipo: 'error',
          texto: 'No fue posible procesar el documento seleccionado.'
        });
        return null;
      } finally {
        setAccionEnCurso(false);
      }
    },
    [accionEnCurso, cargarEstadoRag]
  );

  const eliminarDocumento = useCallback(
    async (docId) => {
      if (!docId || accionEnCurso) return false;
      setAccionEnCurso(true);
      setAvisoAccion(null);

      try {
        const csrfToken = await ensureCsrfTokenReady();
        const headers = {};
        if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

        const resp = await fetch(`/api/seneca/rag/documentos/${docId}`, {
          method: 'DELETE',
          credentials: 'include',
          headers
        });

        if (!resp.ok) {
          const msg = await parseErrorResponse(
            resp,
            'No se pudo eliminar el documento.'
          );
          setAvisoAccion({ tipo: 'error', texto: msg });
          return false;
        }

        setAvisoAccion({
          tipo: 'ok',
          texto: 'Documento retirado de la base documental.'
        });
        await cargarEstadoRag();
        return true;
      } catch {
        setAvisoAccion({
          tipo: 'error',
          texto: 'No fue posible retirar el documento en este momento.'
        });
        return false;
      } finally {
        setAccionEnCurso(false);
      }
    },
    [accionEnCurso, cargarEstadoRag]
  );

  const conectarDrive = useCallback(
    async (carpetaInput = '') => {
      if (accionEnCurso) return null;
      setAccionEnCurso(true);
      setAvisoAccion(null);

      try {
        const csrfToken = await ensureCsrfTokenReady();
        const headers = { 'Content-Type': 'application/json' };
        if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

        const resp = await fetch('/api/seneca/rag/drive/conectar', {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify({ carpetaInput })
        });

        if (!resp.ok) {
          const msg = await parseErrorResponse(
            resp,
            'No se pudo conectar la carpeta de Google Drive.'
          );
          setAvisoAccion({ tipo: 'error', texto: msg });
          return null;
        }

        const data = await resp.json();
        setAvisoAccion({
          tipo: 'ok',
          texto: `Carpeta ${data.carpetaNombre || 'conectada'} sincronizada con ${data.totalEnDrive || 0} archivos.`
        });
        await cargarEstadoRag();
        return data;
      } catch {
        setAvisoAccion({
          tipo: 'error',
          texto: 'No fue posible conectar con Google Drive.'
        });
        return null;
      } finally {
        setAccionEnCurso(false);
      }
    },
    [accionEnCurso, cargarEstadoRag]
  );

  const sincronizarDriveAhora = useCallback(async () => {
    if (accionEnCurso) return null;
    setAccionEnCurso(true);
    setAvisoAccion(null);

    try {
      const csrfToken = await ensureCsrfTokenReady();
      const headers = { 'Content-Type': 'application/json' };
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

      const resp = await fetch('/api/seneca/rag/drive/sincronizar', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({})
      });

      if (!resp.ok) {
        const msg = await parseErrorResponse(
          resp,
          'No se pudo sincronizar la carpeta de Google Drive.'
        );
        setAvisoAccion({ tipo: 'error', texto: msg });
        return null;
      }

      const data = await resp.json();
      setAvisoAccion({
        tipo: 'ok',
        texto: `Sincronización completada: ${data.sincronizados || 0} actualizados y ${data.omitidos || 0} al día.`
      });
      await cargarEstadoRag();
      return data;
    } catch {
      setAvisoAccion({
        tipo: 'error',
        texto: 'No fue posible sincronizar los archivos de Google Drive.'
      });
      return null;
    } finally {
      setAccionEnCurso(false);
    }
  }, [accionEnCurso, cargarEstadoRag]);

  const cambiarPlan = useCallback(
    async (payload) => {
      if (accionEnCurso) return false;
      setAccionEnCurso(true);
      setAvisoAccion(null);

      try {
        const csrfToken = await ensureCsrfTokenReady();
        const headers = { 'Content-Type': 'application/json' };
        if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

        const resp = await fetch('/api/seneca/rag/plan', {
          method: 'PUT',
          credentials: 'include',
          headers,
          body: JSON.stringify(payload || {})
        });

        if (!resp.ok) {
          const msg = await parseErrorResponse(
            resp,
            'No se pudo actualizar el plan de consultas.'
          );
          setAvisoAccion({ tipo: 'error', texto: msg });
          return false;
        }

        setAvisoAccion({
          tipo: 'ok',
          texto: 'Plan de consultas actualizado correctamente.'
        });
        await cargarEstadoRag();
        return true;
      } catch {
        setAvisoAccion({
          tipo: 'error',
          texto: 'No se pudo cambiar el plan en este momento.'
        });
        return false;
      } finally {
        setAccionEnCurso(false);
      }
    },
    [accionEnCurso, cargarEstadoRag]
  );

  return {
    mensajes,
    cargandoStream,
    errorStream,
    estadoRag,
    cargandoEstado,
    accionEnCurso,
    avisoAccion,
    cargarEstadoRag,
    enviarPregunta,
    cancelarStream,
    limpiarChat,
    subirDocumento,
    eliminarDocumento,
    conectarDrive,
    sincronizarDriveAhora,
    cambiarPlan
  };
}

export default useChatRag;
