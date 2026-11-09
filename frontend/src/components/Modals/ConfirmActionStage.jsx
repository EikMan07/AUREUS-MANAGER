import React from 'react';

/**
 * ConfirmActionStage
 * Tarjeta/Cápsula Escénica Compacta de Confirmación (Estilo React Bits Pro):
 * - variant="pago": Verde Dólar Ejecutivo con dibujo progresivo de anillo y Check SVG.
 * - variant="pasar": Ámbar Ejecutivo con trazado horario y rotación elástica de manecillas.
 * - variant="nopago": Rojo Carmesí con pulso de sellado y cruz SVG trazada en dos tiempos.
 *
 * @param {'pago' | 'pasar' | 'nopago'} variant
 * @param {'animating' | 'exiting'} phase
 * @param {string} clientName
 * @param {number|string} amount
 * @param {string} subtitle
 */
export function ConfirmActionStage({
  variant = 'pago',
  phase = 'animating',
  clientName = '',
  amount = 0,
  subtitle = '',
  detailPill = '',
  isPlural = false
}) {
  const isExiting = phase === 'exiting';

  const rawName = variant === 'pasar' ? (clientName || 'Cliente') : (clientName || subtitle || 'Cliente');
  const cleanClient = String(rawName)
    .replace(/\bnull\b/gi, '')
    .replace(/\bundefined\b/gi, '')
    .trim() || 'Cliente';

  return (
    <div
      className={`confirm-action-stage-wrapper ${isExiting ? 'stage-exiting' : 'stage-entering'}`}
      style={{
        width: '280px',
        maxWidth: '92vw',
        padding: '28px 24px',
        borderRadius: '28px',
        backgroundColor: '#ffffff',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        pointerEvents: 'none',
        zIndex: 100000,
        boxSizing: 'border-box'
      }}
      aria-live="polite"
      role="status"
    >
      {variant === 'pago' && (
        <PagoStageContent clientName={cleanClient} amount={amount} />
      )}
      {variant === 'pasar' && (
        <PasarStageContent clientName={cleanClient} subtitle={subtitle} />
      )}
      {variant === 'nopago' && (
        <NoPagoStageContent clientName={cleanClient} />
      )}
      {variant === 'editar_cliente' && (
        <EditarClienteStageContent clientName={cleanClient} />
      )}
      {variant === 'lista_negra' && (
        <ListaNegraStageContent clientName={cleanClient} />
      )}
      {variant === 'eliminar_cliente' && (
        <EliminarClienteStageContent clientName={cleanClient} />
      )}
      {variant === 'eliminar_definitivo' && (
        <EliminarDefinitivoStageContent clientName={cleanClient} detailPill={detailPill} />
      )}
      {variant === 'nuevo_prestamo' && (
        <NuevoPrestamoStageContent clientName={cleanClient} detailPill={detailPill} />
      )}
      {variant === 'eliminar_prestamo_pendiente' && (
        <EliminarPrestamoPendienteStageContent clientName={cleanClient} detailPill={detailPill} isPlural={isPlural} />
      )}
      {variant === 'eliminar_prestamo_registrado' && (
        <EliminarPrestamoRegistradoStageContent clientName={cleanClient} detailPill={detailPill} isPlural={isPlural} />
      )}
      {variant === 'eliminar_prestamo_atrasado' && (
        <EliminarPrestamoAtrasadoStageContent clientName={cleanClient} detailPill={detailPill} isPlural={isPlural} />
      )}
    </div>
  );
}

/**
 * VARIANTE 1 — Confirmar "Pagó"
 * Contenedor circular de 88x88px con fondo #D6E7D6, anillo exterior expansivo en #8FB89A y núcleo #0A3323.
 */
function PagoStageContent({ clientName, amount }) {
  const formattedAmount = `₡${Math.round(Number(amount || 0)).toLocaleString('en-US')}`;

  return (
    <>
      <div
        style={{
          position: 'relative',
          width: '88px',
          height: '88px',
          borderRadius: '50%',
          backgroundColor: '#D6E7D6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '18px'
        }}
      >
        {/* Anillo exterior expansivo animado */}
        <span
          style={{
            position: 'absolute',
            inset: '-6px',
            borderRadius: '50%',
            border: '2.5px solid #8FB89A',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid #D6E7D6',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        {/* Círculo interior #0A3323 */}
        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            backgroundColor: '#0A3323',
            boxShadow: '0 8px 20px rgba(10, 51, 35, 0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg
            width="72"
            height="72"
            viewBox="0 0 72 72"
            style={{ position: 'absolute', inset: 0 }}
          >
            {/* Anillo de progreso circular (550ms) */}
            <circle
              cx="36"
              cy="36"
              r="31"
              fill="none"
              stroke="#8FB89A"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="195"
              strokeDashoffset="195"
              style={{
                transformOrigin: '36px 36px',
                transform: 'rotate(-90deg)',
                animation: 'cfStrokeDraw 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            />

            {/* Check ancho y nítido en #D6E7D6 (500ms con delay 180ms) */}
            <path
              d="M22 37.5 L31.5 47 L50.5 26.5"
              fill="none"
              stroke="#D6E7D6"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="100"
              strokeDashoffset="100"
              style={{
                animation: 'cfStrokeDraw 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.18s forwards'
              }}
            />
          </svg>
        </div>
      </div>

      {/* Título principal */}
      <div
        style={{
          fontSize: '18px',
          fontWeight: 900,
          color: '#0A3323',
          letterSpacing: '-0.01em',
          lineHeight: 1.25
        }}
      >
        Pago registrado
      </div>

      {/* Subtítulo con nombre limpio del cliente */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#475569',
          marginTop: '6px',
          lineHeight: 1.35,
          maxWidth: '100%',
          wordBreak: 'break-word'
        }}
      >
        {clientName}
      </div>

      {/* Píldora inferior en Verde Dólar */}
      <div
        style={{
          marginTop: '14px',
          backgroundColor: '#0A3323',
          border: '1px solid #8FB89A',
          color: '#D6E7D6',
          fontSize: '15px',
          fontWeight: 800,
          padding: '6px 18px',
          borderRadius: '9999px',
          boxShadow: '0 4px 12px rgba(10, 51, 35, 0.2)',
          animation: 'cfPillSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) 0.22s backwards'
        }}
      >
        {formattedAmount}
      </div>
    </>
  );
}

/**
 * VARIANTE 2 — Confirmar "Pasar de Día"
 * Contenedor circular de 88x88px con fondo #FEF3C7, onda cálida en #FDE68A y círculo interior #D97706.
 */
function PasarStageContent({ clientName, subtitle }) {
  return (
    <>
      <div
        style={{
          position: 'relative',
          width: '88px',
          height: '88px',
          borderRadius: '50%',
          backgroundColor: '#FEF3C7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '18px'
        }}
      >
        {/* Onda cálida expansiva */}
        <span
          style={{
            position: 'absolute',
            inset: '-6px',
            borderRadius: '50%',
            border: '2.5px solid #FDE68A',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid #FEF3C7',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        {/* Círculo interior #D97706 */}
        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            backgroundColor: '#D97706',
            boxShadow: '0 8px 20px rgba(217, 119, 6, 0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg
            width="72"
            height="72"
            viewBox="0 0 72 72"
            style={{ position: 'absolute', inset: 0 }}
          >
            {/* Anillo horario trazado en 550ms */}
            <circle
              cx="36"
              cy="36"
              r="31"
              fill="none"
              stroke="#FEF3C7"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="195"
              strokeDashoffset="195"
              style={{
                transformOrigin: '36px 36px',
                transform: 'rotate(-90deg)',
                animation: 'cfStrokeDraw 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            />

            {/* Esfera interior de reloj */}
            <circle
              cx="36"
              cy="36"
              r="20"
              fill="rgba(255, 255, 255, 0.14)"
              stroke="#FFFFFF"
              strokeWidth="2.2"
            />

            {/* Eje central */}
            <circle cx="36" cy="36" r="3" fill="#FFFFFF" />

            {/* Aguja horaria con giro elástico */}
            <line
              x1="36"
              y1="36"
              x2="36"
              y2="26"
              stroke="#FEF3C7"
              strokeWidth="3.2"
              strokeLinecap="round"
              style={{
                transformOrigin: '36px 36px',
                animation: 'cfClockHourAdvance 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) 0.12s forwards'
              }}
            />

            {/* Aguja minutera con rotación de 360 grados */}
            <line
              x1="36"
              y1="36"
              x2="36"
              y2="21"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{
                transformOrigin: '36px 36px',
                animation: 'cfClockHandsSweep 0.68s cubic-bezier(0.16, 1, 0.3, 1) 0.08s forwards'
              }}
            />
          </svg>
        </div>
      </div>

      {/* Título principal */}
      <div
        style={{
          fontSize: '18px',
          fontWeight: 900,
          color: '#92400E',
          letterSpacing: '-0.01em',
          lineHeight: 1.25
        }}
      >
        Cobro reprogramado
      </div>

      {/* Subtítulo con nombre limpio del cliente */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#475569',
          marginTop: '6px',
          lineHeight: 1.35,
          maxWidth: '100%',
          wordBreak: 'break-word'
        }}
      >
        {clientName}
      </div>

      {/* Píldora inferior en Ámbar con la nueva fecha */}
      <div
        style={{
          marginTop: '14px',
          backgroundColor: '#FEF3C7',
          border: '1px solid #FCD34D',
          color: '#92400E',
          fontSize: '12.5px',
          fontWeight: 800,
          padding: '6px 14px',
          borderRadius: '9999px',
          lineHeight: 1.3,
          animation: 'cfPillSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) 0.22s backwards'
        }}
      >
        {subtitle || 'Nueva fecha asignada'}
      </div>
    </>
  );
}

/**
 * VARIANTE 3 — Confirmar "No Pago"
 * Contenedor circular de 88x88px con fondo #FFE4E6, onda suave en #FECDD3 y círculo interior #E11D48.
 */
function NoPagoStageContent({ clientName }) {
  return (
    <>
      <div
        style={{
          position: 'relative',
          width: '88px',
          height: '88px',
          borderRadius: '50%',
          backgroundColor: '#FFE4E6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '18px',
          animation: 'cfStampShake 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards'
        }}
      >
        {/* Onda de alerta suave */}
        <span
          style={{
            position: 'absolute',
            inset: '-6px',
            borderRadius: '50%',
            border: '2.5px solid #FECDD3',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid #FFE4E6',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        {/* Círculo interior #E11D48 */}
        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            backgroundColor: '#E11D48',
            boxShadow: '0 8px 20px rgba(225, 29, 72, 0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg
            width="72"
            height="72"
            viewBox="0 0 72 72"
            style={{ position: 'absolute', inset: 0 }}
          >
            {/* Anillo de advertencia trazado en 500ms */}
            <circle
              cx="36"
              cy="36"
              r="31"
              fill="none"
              stroke="#FECDD3"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="195"
              strokeDashoffset="195"
              style={{
                transformOrigin: '36px 36px',
                transform: 'rotate(-90deg)',
                animation: 'cfStrokeDraw 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            />

            {/* Trazo 1 de la cruz (180ms a 450ms) */}
            <line
              x1="25"
              y1="25"
              x2="47"
              y2="47"
              stroke="#FFFFFF"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeDasharray="45"
              strokeDashoffset="45"
              style={{
                animation: 'cfStrokeDraw 0.27s cubic-bezier(0.16, 1, 0.3, 1) 0.18s forwards'
              }}
            />

            {/* Trazo 2 de la cruz (350ms a 620ms) */}
            <line
              x1="47"
              y1="25"
              x2="25"
              y2="47"
              stroke="#FFFFFF"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeDasharray="45"
              strokeDashoffset="45"
              style={{
                animation: 'cfStrokeDraw 0.27s cubic-bezier(0.16, 1, 0.3, 1) 0.35s forwards'
              }}
            />
          </svg>
        </div>
      </div>

      {/* Título principal */}
      <div
        style={{
          fontSize: '18px',
          fontWeight: 900,
          color: '#9F1239',
          letterSpacing: '-0.01em',
          lineHeight: 1.25
        }}
      >
        No pago registrado
      </div>

      {/* Subtítulo con nombre limpio del cliente */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#475569',
          marginTop: '6px',
          lineHeight: 1.35,
          maxWidth: '100%',
          wordBreak: 'break-word'
        }}
      >
        {clientName}
      </div>

      {/* Píldora inferior en Rojo Suave */}
      <div
        style={{
          marginTop: '14px',
          backgroundColor: '#FFE4E6',
          border: '1px solid #FDA4AF',
          color: '#BE123C',
          fontSize: '12.5px',
          fontWeight: 800,
          padding: '6px 14px',
          borderRadius: '9999px',
          lineHeight: 1.3,
          animation: 'cfPillSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) 0.22s backwards'
        }}
      >
        Acumulado para próximo cobro
      </div>
    </>
  );
}

/**
 * VARIANTE 4 — Confirmar "Editar Cliente" (Turquesa / Esmeralda Ejecutivo)
 * Círculo exterior 88x88px en #CCFBF1, onda doble en #5EEAD4 y núcleo con gradiente #115E59 -> #0D9488.
 */
function EditarClienteStageContent({ clientName }) {
  return (
    <>
      <div
        style={{
          position: 'relative',
          width: '88px',
          height: '88px',
          borderRadius: '50%',
          backgroundColor: '#CCFBF1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '18px'
        }}
      >
        {/* Onda expansiva doble en #5EEAD4 */}
        <span
          style={{
            position: 'absolute',
            inset: '-6px',
            borderRadius: '50%',
            border: '2.5px solid #5EEAD4',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid #5EEAD4',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        {/* Núcleo interior 72x72px con gradiente Turquesa Ejecutivo */}
        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #115E59 0%, #0D9488 100%)',
            boxShadow: '0 8px 20px rgba(13, 148, 136, 0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg
            width="72"
            height="72"
            viewBox="0 0 72 72"
            style={{ position: 'absolute', inset: 0 }}
          >
            {/* Anillo perimetral luminoso */}
            <circle
              cx="36"
              cy="36"
              r="31"
              fill="none"
              stroke="#5EEAD4"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeDasharray="195"
              strokeDashoffset="195"
              style={{
                transformOrigin: '36px 36px',
                transform: 'rotate(-90deg)',
                animation: 'cfStrokeDraw 0.52s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            />

            {/* Silueta de credencial / usuario */}
            <circle
              cx="31"
              cy="27"
              r="6.2"
              fill="rgba(204, 251, 241, 0.18)"
              stroke="#CCFBF1"
              strokeWidth="2.8"
            />
            <path
              d="M20 46.5 C20 40.2 24.8 36.8 31 36.8 C35.2 36.8 38.6 38.4 40.5 41.5"
              fill="none"
              stroke="#CCFBF1"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeDasharray="50"
              strokeDashoffset="50"
              style={{
                animation: 'cfStrokeDraw 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.08s forwards'
              }}
            />

            {/* Lápiz de edición deslizando diagonalmente */}
            <g
              style={{
                transformOrigin: '43px 32px',
                animation: 'cfPencilGlide 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
              }}
            >
              <path
                d="M47.5 21.5 L52.5 26.5 L40 39 L34 40 L35 34 Z"
                fill="rgba(255, 255, 255, 0.22)"
                stroke="#FFFFFF"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>

            {/* Trazo luminoso / Check de actualización */}
            <path
              d="M36 48.5 L41.5 53 L52.5 41.5"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="40"
              strokeDashoffset="40"
              style={{
                animation: 'cfStrokeDraw 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.28s forwards'
              }}
            />
          </svg>
        </div>
      </div>

      {/* Título principal */}
      <div
        style={{
          fontSize: '18px',
          fontWeight: 900,
          color: '#115E59',
          letterSpacing: '-0.01em',
          lineHeight: 1.25
        }}
      >
        Cliente actualizado
      </div>

      {/* Subtítulo con nombre limpio del cliente */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#475569',
          marginTop: '6px',
          lineHeight: 1.35,
          maxWidth: '100%',
          wordBreak: 'break-word'
        }}
      >
        {clientName}
      </div>

      {/* Píldora inferior */}
      <div
        style={{
          marginTop: '14px',
          backgroundColor: '#CCFBF1',
          border: '1px solid #99F6E4',
          color: '#0F766E',
          fontSize: '12.5px',
          fontWeight: 800,
          padding: '6px 14px',
          borderRadius: '9999px',
          lineHeight: 1.3,
          animation: 'cfPillSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) 0.22s backwards'
        }}
      >
        Datos guardados correctamente
      </div>
    </>
  );
}

/**
 * VARIANTE 5 — Confirmar "Enviar a Lista Negra" (Rojo Escudo Profundo / Granate)
 * Círculo exterior 88x88px en #FEE2E2, onda doble en #FCA5A5 y núcleo con gradiente #450A0A -> #991B1B.
 */
function ListaNegraStageContent({ clientName }) {
  return (
    <>
      <div
        style={{
          position: 'relative',
          width: '88px',
          height: '88px',
          borderRadius: '50%',
          backgroundColor: '#FEE2E2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '18px',
          animation: 'cfStampShake 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards'
        }}
      >
        {/* Onda expansiva doble en #FCA5A5 */}
        <span
          style={{
            position: 'absolute',
            inset: '-6px',
            borderRadius: '50%',
            border: '2.5px solid #FCA5A5',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid #FCA5A5',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        {/* Núcleo interior 72x72px con gradiente Granate Profundo */}
        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #450A0A 0%, #991B1B 100%)',
            boxShadow: '0 8px 20px rgba(153, 27, 27, 0.32)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg
            width="72"
            height="72"
            viewBox="0 0 72 72"
            style={{ position: 'absolute', inset: 0 }}
          >
            {/* Contorno del Escudo Ejecutivo trazado de arriba hacia abajo (520ms) */}
            <path
              d="M36 16.5 L52 23 V35 C52 45.8 44.8 53.2 36 56.5 C27.2 53.2 20 45.8 20 35 V23 L36 16.5 Z"
              fill="rgba(254, 202, 202, 0.15)"
              stroke="#FFFFFF"
              strokeWidth="3.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="135"
              strokeDashoffset="135"
              style={{
                animation: 'cfStrokeDraw 0.52s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            />

            {/* Símbolo central de restricción (!) */}
            <line
              x1="36"
              y1="26.5"
              x2="36"
              y2="38.5"
              stroke="#FCA5A5"
              strokeWidth="4.2"
              strokeLinecap="round"
              strokeDasharray="24"
              strokeDashoffset="24"
              style={{
                animation: 'cfStrokeDraw 0.3s cubic-bezier(0.16, 1, 0.3, 1) 0.24s forwards'
              }}
            />
            <circle
              cx="36"
              cy="45.5"
              r="2.6"
              fill="#FFFFFF"
            />
          </svg>
        </div>
      </div>

      {/* Título principal */}
      <div
        style={{
          fontSize: '18px',
          fontWeight: 900,
          color: '#7F1D1D',
          letterSpacing: '-0.01em',
          lineHeight: 1.25
        }}
      >
        Enviado a Lista Negra
      </div>

      {/* Subtítulo con nombre limpio del cliente */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#475569',
          marginTop: '6px',
          lineHeight: 1.35,
          maxWidth: '100%',
          wordBreak: 'break-word'
        }}
      >
        {clientName}
      </div>

      {/* Píldora inferior */}
      <div
        style={{
          marginTop: '14px',
          backgroundColor: '#FEE2E2',
          border: '1px solid #FECACA',
          color: '#991B1B',
          fontSize: '12.5px',
          fontWeight: 800,
          padding: '6px 14px',
          borderRadius: '9999px',
          lineHeight: 1.3,
          animation: 'cfPillSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) 0.22s backwards'
        }}
      >
        Registro bloqueado
      </div>
    </>
  );
}

/**
 * VARIANTE 6 — Confirmar "Eliminar Cliente" hacia la Papelera (Terracota / Carmesí de Archivo)
 * Círculo exterior 88x88px en #FFEDD5, onda doble en #FDBA74 y núcleo con gradiente #9A3412 -> #EA580C.
 */
function EliminarClienteStageContent({ clientName }) {
  return (
    <>
      <div
        style={{
          position: 'relative',
          width: '88px',
          height: '88px',
          borderRadius: '50%',
          backgroundColor: '#FFEDD5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '18px'
        }}
      >
        {/* Onda expansiva doble en #FDBA74 */}
        <span
          style={{
            position: 'absolute',
            inset: '-6px',
            borderRadius: '50%',
            border: '2.5px solid #FDBA74',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid #FDBA74',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        {/* Núcleo interior 72x72px con gradiente Terracota de Archivo */}
        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #9A3412 0%, #EA580C 100%)',
            boxShadow: '0 8px 20px rgba(234, 88, 12, 0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg
            width="72"
            height="72"
            viewBox="0 0 72 72"
            style={{ position: 'absolute', inset: 0 }}
          >
            {/* Anillo perimetral */}
            <circle
              cx="36"
              cy="36"
              r="31"
              fill="none"
              stroke="#FDBA74"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeDasharray="195"
              strokeDashoffset="195"
              style={{
                transformOrigin: '36px 36px',
                transform: 'rotate(-90deg)',
                animation: 'cfStrokeDraw 0.52s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            />

            {/* Tarjeta que entra en la papelera */}
            <rect
              x="30"
              y="18"
              width="12"
              height="10"
              rx="2"
              fill="#FFEDD5"
              style={{
                transformOrigin: '36px 23px',
                animation: 'cfCardIntoTrash 0.58s cubic-bezier(0.22, 1, 0.36, 1) 0.08s forwards'
              }}
            />

            {/* Tapa superior con apertura y cierre elástico */}
            <g
              style={{
                transformOrigin: '23px 26px',
                animation: 'cfTrashLidOpenClose 0.68s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
              }}
            >
              <path
                d="M31 26 V22 C31 20.8 32 20 33.2 20 H38.8 C40 20 41 20.8 41 22 V26"
                fill="none"
                stroke="#FDBA74"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <line
                x1="22"
                y1="26"
                x2="50"
                y2="26"
                stroke="#FFFFFF"
                strokeWidth="3.3"
                strokeLinecap="round"
              />
            </g>

            {/* Cuerpo de la Papelera */}
            <path
              d="M25.5 29.5 L27.5 51 C27.7 52.8 29 54 31 54 H41 C43 54 44.3 52.8 44.5 51 L46.5 29.5"
              fill="rgba(255, 237, 213, 0.16)"
              stroke="#FFFFFF"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="110"
              strokeDashoffset="110"
              style={{
                animation: 'cfStrokeDraw 0.48s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            />

            {/* Ranuras interiores */}
            <line
              x1="33"
              y1="35"
              x2="33.5"
              y2="47.5"
              stroke="#FDBA74"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <line
              x1="39"
              y1="35"
              x2="38.5"
              y2="47.5"
              stroke="#FDBA74"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* Título principal */}
      <div
        style={{
          fontSize: '18px',
          fontWeight: 900,
          color: '#9A3412',
          letterSpacing: '-0.01em',
          lineHeight: 1.25
        }}
      >
        Cliente en Papelera
      </div>

      {/* Subtítulo con nombre limpio del cliente */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#475569',
          marginTop: '6px',
          lineHeight: 1.35,
          maxWidth: '100%',
          wordBreak: 'break-word'
        }}
      >
        {clientName}
      </div>

      {/* Píldora inferior */}
      <div
        style={{
          marginTop: '14px',
          backgroundColor: '#FFEDD5',
          border: '1px solid #FED7AA',
          color: '#9A3412',
          fontSize: '12.5px',
          fontWeight: 800,
          padding: '6px 14px',
          borderRadius: '9999px',
          lineHeight: 1.3,
          animation: 'cfPillSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) 0.22s backwards'
        }}
      >
        Se conservará por 30 días
      </div>
    </>
  );
}

/**
 * VARIANTE 7 — Confirmar "Eliminar Definitivamente" en el Módulo de Papelera
 * Paleta: Rojo Carmesí Definitivo (#FEE2E2 / #FCA5A5 / gradiente #7F1D1D -> #DC2626)
 */
function EliminarDefinitivoStageContent({ clientName, detailPill }) {
  return (
    <>
      <div
        style={{
          position: 'relative',
          width: '88px',
          height: '88px',
          borderRadius: '50%',
          backgroundColor: '#FEE2E2',
          border: '1.5px solid #FCA5A5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '18px',
          animation: 'cfStampShake 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards'
        }}
      >
        <span
          style={{
            position: 'absolute',
            inset: '-6px',
            borderRadius: '50%',
            border: '2.5px solid #FCA5A5',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid #FEE2E2',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #7F1D1D 0%, #DC2626 100%)',
            boxShadow: '0 12px 28px rgba(185, 28, 28, 0.32)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg
            width="72"
            height="72"
            viewBox="0 0 72 72"
            style={{ position: 'absolute', inset: 0 }}
          >
            {/* Anillo perimetral */}
            <circle
              cx="36"
              cy="36"
              r="31"
              fill="none"
              stroke="#FCA5A5"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeDasharray="195"
              strokeDashoffset="195"
              style={{
                transformOrigin: '36px 36px',
                transform: 'rotate(-90deg)',
                animation: 'cfStrokeDraw 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            />

            {/* Tapa y asa de la papelera blanca */}
            <path
              d="M31 24 V20.5 C31 19.5 32 18.8 33.2 18.8 H38.8 C40 18.8 41 19.5 41 20.5 V24"
              fill="none"
              stroke="#FCA5A5"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <line
              x1="22"
              y1="24.5"
              x2="50"
              y2="24.5"
              stroke="#FFFFFF"
              strokeWidth="3.2"
              strokeLinecap="round"
            />

            {/* Cuerpo de la papelera blanca */}
            <path
              d="M25.5 28 L27.5 51.5 C27.7 53.2 29 54.5 31 54.5 H41 C43 54.5 44.3 53.2 44.5 51.5 L46.5 28"
              fill="rgba(254, 226, 226, 0.16)"
              stroke="#FFFFFF"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="110"
              strokeDashoffset="110"
              style={{
                animation: 'cfStrokeDraw 0.48s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            />

            {/* Símbolo X central trazado progresivamente sellando el borrado permanente */}
            <line
              x1="31.5"
              y1="35.5"
              x2="40.5"
              y2="44.5"
              stroke="#FFFFFF"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeDasharray="24"
              strokeDashoffset="24"
              style={{
                animation: 'cfStrokeDraw 0.26s cubic-bezier(0.16, 1, 0.3, 1) 0.22s forwards'
              }}
            />
            <line
              x1="40.5"
              y1="35.5"
              x2="31.5"
              y2="44.5"
              stroke="#FFFFFF"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeDasharray="24"
              strokeDashoffset="24"
              style={{
                animation: 'cfStrokeDraw 0.26s cubic-bezier(0.16, 1, 0.3, 1) 0.36s forwards'
              }}
            />
          </svg>
        </div>
      </div>

      {/* Título principal */}
      <div
        style={{
          fontSize: '17.5px',
          fontWeight: 900,
          color: '#7F1D1D',
          letterSpacing: '-0.01em',
          lineHeight: 1.25
        }}
      >
        Ya se eliminó definitivamente
      </div>

      {/* Subtítulo con nombre limpio del cliente */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#475569',
          marginTop: '6px',
          lineHeight: 1.35,
          maxWidth: '100%',
          wordBreak: 'break-word'
        }}
      >
        {clientName}
      </div>

      {/* Píldora inferior */}
      <div
        style={{
          marginTop: '14px',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          color: '#991B1B',
          fontSize: '12.5px',
          fontWeight: 800,
          padding: '6px 14px',
          borderRadius: '9999px',
          lineHeight: 1.3,
          animation: 'cfPillSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) 0.22s backwards'
        }}
      >
        {detailPill || 'Borrado permanente'}
      </div>
    </>
  );
}

/**
 * VARIANTE 8 — Confirmar "Nuevo Préstamo" en NewLoanModal.jsx
 * Paleta: Verde Dólar Ejecutivo (#D6E7D6 / #8FB89A / gradiente #0A3323 -> #1B4D37)
 */
function NuevoPrestamoStageContent({ clientName, detailPill }) {
  return (
    <>
      <div
        style={{
          position: 'relative',
          width: '88px',
          height: '88px',
          borderRadius: '50%',
          backgroundColor: '#D6E7D6',
          border: '1.5px solid #8FB89A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '18px'
        }}
      >
        <span
          style={{
            position: 'absolute',
            inset: '-6px',
            borderRadius: '50%',
            border: '2.5px solid #8FB89A',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid #D6E7D6',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0A3323 0%, #1B4D37 100%)',
            boxShadow: '0 12px 28px rgba(10, 51, 35, 0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg
            width="72"
            height="72"
            viewBox="0 0 72 72"
            style={{ position: 'absolute', inset: 0 }}
          >
            {/* Anillo perimetral */}
            <circle
              cx="36"
              cy="36"
              r="31"
              fill="none"
              stroke="#8FB89A"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeDasharray="195"
              strokeDashoffset="195"
              style={{
                transformOrigin: '36px 36px',
                transform: 'rotate(-90deg)',
                animation: 'cfStrokeDraw 0.52s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            />

            {/* Billete / Contrato ejecutivo */}
            <rect
              x="19"
              y="22"
              width="30"
              height="21"
              rx="4"
              fill="rgba(214, 231, 214, 0.16)"
              stroke="#FFFFFF"
              strokeWidth="2.8"
              strokeDasharray="110"
              strokeDashoffset="110"
              style={{
                animation: 'cfStrokeDraw 0.46s cubic-bezier(0.16, 1, 0.3, 1) 0.06s forwards'
              }}
            />
            <circle
              cx="34"
              cy="32.5"
              r="4.5"
              fill="none"
              stroke="#D6E7D6"
              strokeWidth="2.2"
            />

            {/* Insignia Check en #D6E7D6 trazada progresivamente */}
            <circle
              cx="47"
              cy="44"
              r="10"
              fill="#0A3323"
              stroke="#8FB89A"
              strokeWidth="2"
            />
            <path
              d="M42.5 44 L45.8 47.2 L52 40.5"
              fill="none"
              stroke="#D6E7D6"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="30"
              strokeDashoffset="30"
              style={{
                animation: 'cfStrokeDraw 0.38s cubic-bezier(0.16, 1, 0.3, 1) 0.24s forwards'
              }}
            />
          </svg>
        </div>
      </div>

      {/* Título principal */}
      <div
        style={{
          fontSize: '18px',
          fontWeight: 900,
          color: '#0A3323',
          letterSpacing: '-0.01em',
          lineHeight: 1.25
        }}
      >
        Préstamo registrado
      </div>

      {/* Subtítulo con nombre limpio del cliente */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#475569',
          marginTop: '6px',
          lineHeight: 1.35,
          maxWidth: '100%',
          wordBreak: 'break-word'
        }}
      >
        {clientName}
      </div>

      {/* Píldora inferior */}
      <div
        style={{
          marginTop: '14px',
          backgroundColor: '#D6E7D6',
          border: '1px solid #8FB89A',
          color: '#0A3323',
          fontSize: '12.5px',
          fontWeight: 800,
          padding: '6px 14px',
          borderRadius: '9999px',
          lineHeight: 1.3,
          animation: 'cfPillSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) 0.22s backwards'
        }}
      >
        {detailPill || 'Calendario de cobros listo'}
      </div>
    </>
  );
}

/**
 * VARIANTE 9 — Confirmar eliminar préstamo desde el apartado "Pendientes"
 * Paleta: Ámbar / Cobre Ejecutivo (#FEF3C7 / #FCD34D / gradiente #78350F -> #D97706)
 */
function EliminarPrestamoPendienteStageContent({ clientName, detailPill, isPlural }) {
  return (
    <>
      <div
        style={{
          position: 'relative',
          width: '88px',
          height: '88px',
          borderRadius: '50%',
          backgroundColor: '#FEF3C7',
          border: '1.5px solid #FCD34D',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '18px'
        }}
      >
        <span
          style={{
            position: 'absolute',
            inset: '-6px',
            borderRadius: '50%',
            border: '2.5px solid #FCD34D',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid #FEF3C7',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #78350F 0%, #D97706 100%)',
            boxShadow: '0 12px 28px rgba(180, 83, 9, 0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg
            width="72"
            height="72"
            viewBox="0 0 72 72"
            style={{ position: 'absolute', inset: 0 }}
          >
            <circle
              cx="36"
              cy="36"
              r="31"
              fill="none"
              stroke="#FDE68A"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeDasharray="195"
              strokeDashoffset="195"
              style={{
                transformOrigin: '36px 36px',
                transform: 'rotate(-90deg)',
                animation: 'cfStrokeDraw 0.52s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            />

            {/* Documento con reloj pendiente que desciende hacia la papelera */}
            <g
              style={{
                transformOrigin: '36px 22px',
                animation: 'cfCardIntoTrash 0.58s cubic-bezier(0.22, 1, 0.36, 1) 0.08s forwards'
              }}
            >
              <rect x="29" y="15" width="14" height="12" rx="2" fill="#FEF3C7" />
              <circle cx="36" cy="21" r="3.5" fill="none" stroke="#92400E" strokeWidth="1.6" />
              <polyline points="36,19 36,21 37.8,21" fill="none" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round" />
            </g>

            {/* Tapa con cierre elástico */}
            <g
              style={{
                transformOrigin: '23px 27px',
                animation: 'cfTrashLidOpenClose 0.68s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
              }}
            >
              <path
                d="M31 27 V23 C31 21.8 32 21 33.2 21 H38.8 C40 21 41 21.8 41 23 V27"
                fill="none"
                stroke="#FDE68A"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <line x1="22" y1="27" x2="50" y2="27" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" />
            </g>

            {/* Cuerpo de la papelera */}
            <path
              d="M25.5 30 L27.5 51.5 C27.7 53.2 29 54.5 31 54.5 H41 C43 54.5 44.3 53.2 44.5 51.5 L46.5 30"
              fill="rgba(254, 243, 199, 0.16)"
              stroke="#FFFFFF"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="110"
              strokeDashoffset="110"
              style={{
                animation: 'cfStrokeDraw 0.48s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            />
            <line x1="33" y1="36" x2="33.5" y2="48" stroke="#FDE68A" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="39" y1="36" x2="38.5" y2="48" stroke="#FDE68A" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <div
        style={{
          fontSize: '17.5px',
          fontWeight: 900,
          color: '#78350F',
          letterSpacing: '-0.01em',
          lineHeight: 1.25
        }}
      >
        {isPlural ? 'Préstamos pendientes eliminados' : 'Préstamo pendiente eliminado'}
      </div>

      <div
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#475569',
          marginTop: '6px',
          lineHeight: 1.35,
          maxWidth: '100%',
          wordBreak: 'break-word'
        }}
      >
        {clientName}
      </div>

      <div
        style={{
          marginTop: '14px',
          backgroundColor: '#FFFBEB',
          border: '1px solid #FDE68A',
          color: '#92400E',
          fontSize: '12.5px',
          fontWeight: 800,
          padding: '6px 14px',
          borderRadius: '9999px',
          lineHeight: 1.3,
          animation: 'cfPillSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) 0.22s backwards'
        }}
      >
        {detailPill || 'Cobros pendientes retirados'}
      </div>
    </>
  );
}

/**
 * VARIANTE 10 — Confirmar eliminar préstamo desde el apartado "Registrados"
 * Paleta: Verde Pizarra / Archivo (#D6E7D6 / #8FB89A / gradiente #1B4D37 -> #2E6B4F)
 */
function EliminarPrestamoRegistradoStageContent({ clientName, detailPill, isPlural }) {
  return (
    <>
      <div
        style={{
          position: 'relative',
          width: '88px',
          height: '88px',
          borderRadius: '50%',
          backgroundColor: '#D6E7D6',
          border: '1.5px solid #8FB89A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '18px'
        }}
      >
        <span
          style={{
            position: 'absolute',
            inset: '-6px',
            borderRadius: '50%',
            border: '2.5px solid #8FB89A',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid #D6E7D6',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1B4D37 0%, #2E6B4F 100%)',
            boxShadow: '0 12px 28px rgba(27, 77, 55, 0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg
            width="72"
            height="72"
            viewBox="0 0 72 72"
            style={{ position: 'absolute', inset: 0 }}
          >
            <circle
              cx="36"
              cy="36"
              r="31"
              fill="none"
              stroke="#8FB89A"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeDasharray="195"
              strokeDashoffset="195"
              style={{
                transformOrigin: '36px 36px',
                transform: 'rotate(-90deg)',
                animation: 'cfStrokeDraw 0.52s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            />

            {/* Documento finiquitado con check que se pliega dentro de la papelera */}
            <g
              style={{
                transformOrigin: '36px 22px',
                animation: 'cfCardIntoTrash 0.58s cubic-bezier(0.22, 1, 0.36, 1) 0.08s forwards'
              }}
            >
              <rect x="29" y="15" width="14" height="12" rx="2" fill="#D6E7D6" />
              <polyline points="33,21 35.2,23.2 39.5,18.8" fill="none" stroke="#0A3323" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>

            {/* Tapa con cierre elástico */}
            <g
              style={{
                transformOrigin: '23px 27px',
                animation: 'cfTrashLidOpenClose 0.68s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
              }}
            >
              <path
                d="M31 27 V23 C31 21.8 32 21 33.2 21 H38.8 C40 21 41 21.8 41 23 V27"
                fill="none"
                stroke="#D6E7D6"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <line x1="22" y1="27" x2="50" y2="27" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" />
            </g>

            {/* Cuerpo de la papelera */}
            <path
              d="M25.5 30 L27.5 51.5 C27.7 53.2 29 54.5 31 54.5 H41 C43 54.5 44.3 53.2 44.5 51.5 L46.5 30"
              fill="rgba(214, 231, 214, 0.16)"
              stroke="#FFFFFF"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="110"
              strokeDashoffset="110"
              style={{
                animation: 'cfStrokeDraw 0.48s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            />
            <line x1="33" y1="36" x2="33.5" y2="48" stroke="#D6E7D6" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="39" y1="36" x2="38.5" y2="48" stroke="#D6E7D6" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <div
        style={{
          fontSize: '17.5px',
          fontWeight: 900,
          color: '#0A3323',
          letterSpacing: '-0.01em',
          lineHeight: 1.25
        }}
      >
        {isPlural ? 'Préstamos registrados eliminados' : 'Préstamo registrado eliminado'}
      </div>

      <div
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#475569',
          marginTop: '6px',
          lineHeight: 1.35,
          maxWidth: '100%',
          wordBreak: 'break-word'
        }}
      >
        {clientName}
      </div>

      <div
        style={{
          marginTop: '14px',
          backgroundColor: '#D6E7D6',
          border: '1px solid #8FB89A',
          color: '#0A3323',
          fontSize: '12.5px',
          fontWeight: 800,
          padding: '6px 14px',
          borderRadius: '9999px',
          lineHeight: 1.3,
          animation: 'cfPillSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) 0.22s backwards'
        }}
      >
        {detailPill || 'Préstamo pagado eliminado'}
      </div>
    </>
  );
}

/**
 * VARIANTE 11 — Confirmar eliminar préstamo desde el apartado "Atrasados"
 * Paleta: Rojo Mora Profundo (#FFE4E6 / #FDA4AF / gradiente #881337 -> #E11D48)
 */
function EliminarPrestamoAtrasadoStageContent({ clientName, detailPill, isPlural }) {
  return (
    <>
      <div
        style={{
          position: 'relative',
          width: '88px',
          height: '88px',
          borderRadius: '50%',
          backgroundColor: '#FFE4E6',
          border: '1.5px solid #FDA4AF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '18px',
          animation: 'cfStampShake 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards'
        }}
      >
        <span
          style={{
            position: 'absolute',
            inset: '-6px',
            borderRadius: '50%',
            border: '2.5px solid #FDA4AF',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid #FFE4E6',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #881337 0%, #E11D48 100%)',
            boxShadow: '0 12px 28px rgba(190, 18, 60, 0.30)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg
            width="72"
            height="72"
            viewBox="0 0 72 72"
            style={{ position: 'absolute', inset: 0 }}
          >
            <circle
              cx="36"
              cy="36"
              r="31"
              fill="none"
              stroke="#FECDD3"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeDasharray="195"
              strokeDashoffset="195"
              style={{
                transformOrigin: '36px 36px',
                transform: 'rotate(-90deg)',
                animation: 'cfStrokeDraw 0.52s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            />

            {/* Documento con insignia de alerta de atraso (!) que cae en la papelera */}
            <g
              style={{
                transformOrigin: '36px 22px',
                animation: 'cfCardIntoTrash 0.58s cubic-bezier(0.22, 1, 0.36, 1) 0.08s forwards'
              }}
            >
              <rect x="29" y="15" width="14" height="12" rx="2" fill="#FFE4E6" />
              <line x1="36" y1="17.5" x2="36" y2="22" stroke="#9F1239" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="36" cy="24.5" r="1.2" fill="#9F1239" />
            </g>

            {/* Tapa con cierre elástico */}
            <g
              style={{
                transformOrigin: '23px 27px',
                animation: 'cfTrashLidOpenClose 0.68s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
              }}
            >
              <path
                d="M31 27 V23 C31 21.8 32 21 33.2 21 H38.8 C40 21 41 21.8 41 23 V27"
                fill="none"
                stroke="#FECDD3"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <line x1="22" y1="27" x2="50" y2="27" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" />
            </g>

            {/* Cuerpo de la papelera */}
            <path
              d="M25.5 30 L27.5 51.5 C27.7 53.2 29 54.5 31 54.5 H41 C43 54.5 44.3 53.2 44.5 51.5 L46.5 30"
              fill="rgba(255, 228, 230, 0.16)"
              stroke="#FFFFFF"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="110"
              strokeDashoffset="110"
              style={{
                animation: 'cfStrokeDraw 0.48s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            />
            <line x1="33" y1="36" x2="33.5" y2="48" stroke="#FECDD3" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="39" y1="36" x2="38.5" y2="48" stroke="#FECDD3" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <div
        style={{
          fontSize: '17.5px',
          fontWeight: 900,
          color: '#881337',
          letterSpacing: '-0.01em',
          lineHeight: 1.25
        }}
      >
        {isPlural ? 'Préstamos atrasados eliminados' : 'Préstamo atrasado eliminado'}
      </div>

      <div
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#475569',
          marginTop: '6px',
          lineHeight: 1.35,
          maxWidth: '100%',
          wordBreak: 'break-word'
        }}
      >
        {clientName}
      </div>

      <div
        style={{
          marginTop: '14px',
          backgroundColor: '#FFF1F2',
          border: '1px solid #FECDD3',
          color: '#9F1239',
          fontSize: '12.5px',
          fontWeight: 800,
          padding: '6px 14px',
          borderRadius: '9999px',
          lineHeight: 1.3,
          animation: 'cfPillSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) 0.22s backwards'
        }}
      >
        {detailPill || 'Deuda atrasada eliminada'}
      </div>
    </>
  );
}

export default ConfirmActionStage;
