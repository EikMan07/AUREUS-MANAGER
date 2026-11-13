import React, { useRef, useEffect } from 'react';
import { playConfirmationChime } from '../../utils/confirmationSound';

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
  // Todos los Hooks al inicio del componente antes de cualquier lógica o retorno
  const hasPlayedSoundRef = useRef(false);

  useEffect(() => {
    if (phase === 'animating' && !hasPlayedSoundRef.current) {
      hasPlayedSoundRef.current = true;
      playConfirmationChime();
    } else if (phase === 'idle') {
      hasPlayedSoundRef.current = false;
    }
  }, [phase]);

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
        backgroundColor: 'var(--aureus-bg-surface)',
        boxShadow: '0 25px 50px -12px rgba(37, 42, 49, 0.24)',
        border: '1px solid var(--aureus-border-subtle)',
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
      {variant === 'retirar_lista_negra' && (
        <RetirarListaNegraStageContent clientName={cleanClient} detailPill={detailPill} />
      )}
      {variant === 'restaurar_cliente' && (
        <RestaurarClienteStageContent clientName={cleanClient} detailPill={detailPill} />
      )}
      {variant === 'restaurar_prestamo' && (
        <RestaurarPrestamoStageContent clientName={cleanClient} detailPill={detailPill} isPlural={isPlural} />
      )}
      {variant === 'nuevo_cliente' && (
        <NuevoClienteStageContent clientName={cleanClient} detailPill={detailPill} />
      )}
      {variant === 'renovar_prestamo' && (
        <RenovarPrestamoStageContent clientName={cleanClient} detailPill={detailPill} />
      )}
      {variant === 'arreglo_pago' && (
        <ArregloPagoStageContent clientName={cleanClient} detailPill={detailPill} />
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
          backgroundColor: 'var(--aureus-green-light)',
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
            border: '2.5px solid #94C2B2',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid var(--aureus-border-gold)',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        {/* Círculo interior Verde financiero #397D67 */}
        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2D6654 0%, #397D67 100%)',
            boxShadow: '0 8px 20px rgba(57, 125, 103, 0.28)',
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
              stroke="#94C2B2"
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

            {/* Check ancho y nítido en blanco */}
            <path
              d="M22 37.5 L31.5 47 L50.5 26.5"
              fill="none"
              stroke="#FFFFFF"
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
          color: 'var(--aureus-green-text)',
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
          color: 'var(--aureus-text-secondary)',
          marginTop: '6px',
          lineHeight: 1.35,
          maxWidth: '100%',
          wordBreak: 'break-word'
        }}
      >
        {clientName}
      </div>

      {/* Píldora inferior en Verde financiero Aureus */}
      <div
        style={{
          marginTop: '14px',
          backgroundColor: '#397D67',
          border: '1px solid var(--aureus-green-border)',
          color: '#FFFFFF',
          fontSize: '15px',
          fontWeight: 800,
          padding: '6px 18px',
          borderRadius: '9999px',
          boxShadow: '0 4px 12px rgba(57, 125, 103, 0.22)',
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
          backgroundColor: 'var(--aureus-gold-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '18px'
        }}
      >
        {/* Onda cálida expansiva Dorado Aureus */}
        <span
          style={{
            position: 'absolute',
            inset: '-6px',
            borderRadius: '50%',
            border: '2.5px solid #D5C295',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid #F7F2E4',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        {/* Círculo interior Dorado Aureus #B69A55 */}
        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #9E8342 0%, #B69A55 100%)',
            boxShadow: '0 8px 20px rgba(182, 154, 85, 0.28)',
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
              stroke="#F7F2E4"
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
              stroke="#F7F2E4"
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
          color: 'var(--aureus-text-primary)',
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
          color: 'var(--aureus-text-secondary)',
          marginTop: '6px',
          lineHeight: 1.35,
          maxWidth: '100%',
          wordBreak: 'break-word'
        }}
      >
        {clientName}
      </div>

      {/* Píldora inferior en Dorado Aureus con la nueva fecha */}
      <div
        style={{
          marginTop: '14px',
          backgroundColor: 'var(--aureus-gold-light)',
          border: '1px solid var(--aureus-border-gold)',
          color: 'var(--aureus-gold-text)',
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
          backgroundColor: 'var(--aureus-red-light)',
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
            border: '2.5px solid #E6ABA8',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid #FCEEE9',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        {/* Círculo interior Rojo alerta #C65D58 */}
        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #9D4440 0%, #C65D58 100%)',
            boxShadow: '0 8px 20px rgba(198, 93, 88, 0.28)',
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
              stroke="#FCEEE9"
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
          color: 'var(--aureus-red-text)',
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
          color: 'var(--aureus-text-secondary)',
          marginTop: '6px',
          lineHeight: 1.35,
          maxWidth: '100%',
          wordBreak: 'break-word'
        }}
      >
        {clientName}
      </div>

      {/* Píldora inferior en Rojo alerta suave */}
      <div
        style={{
          marginTop: '14px',
          backgroundColor: 'var(--aureus-red-light)',
          border: '1px solid var(--aureus-red-border)',
          color: 'var(--aureus-red-text)',
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
          backgroundColor: 'var(--aureus-gold-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '18px'
        }}
      >
        {/* Onda expansiva doble en Dorado Aureus */}
        <span
          style={{
            position: 'absolute',
            inset: '-6px',
            borderRadius: '50%',
            border: '2.5px solid #D5C295',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid #F7F2E4',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        {/* Núcleo interior 72x72px Dorado Aureus */}
        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #9E8342 0%, #B69A55 100%)',
            boxShadow: '0 8px 20px rgba(182, 154, 85, 0.28)',
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
              stroke="#F7F2E4"
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
              fill="rgba(247, 242, 228, 0.18)"
              stroke="#F7F2E4"
              strokeWidth="2.8"
            />
            <path
              d="M20 46.5 C20 40.2 24.8 36.8 31 36.8 C35.2 36.8 38.6 38.4 40.5 41.5"
              fill="none"
              stroke="#F7F2E4"
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
          color: 'var(--aureus-text-primary)',
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
          color: 'var(--aureus-text-secondary)',
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
          backgroundColor: 'var(--aureus-gold-light)',
          border: '1px solid var(--aureus-border-gold)',
          color: 'var(--aureus-gold-text)',
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
 * VARIANTE 5 — Confirmar "Enviar a Lista Negra" (Gris Pizarra / Carbón Ejecutivo)
 * Círculo exterior 88x88px en #E2E8F0, onda doble en rgba(51, 65, 85, 0.22) y núcleo con gradiente #0F172A -> #334155.
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
          backgroundColor: 'var(--aureus-bg-elevated)',
          border: '1.5px solid #E5E0D5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '18px',
          animation: 'cfStampShake 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards'
        }}
      >
        {/* Onda expansiva doble en Grafito */}
        <span
          style={{
            position: 'absolute',
            inset: '-6px',
            borderRadius: '50%',
            border: '2.5px solid rgba(37, 42, 49, 0.22)',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid rgba(37, 42, 49, 0.14)',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        {/* Núcleo interior 72x72px con gradiente Grafito Ejecutivo */}
        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #252A31 0%, #4A5058 100%)',
            boxShadow: '0 12px 28px rgba(37, 42, 49, 0.28)',
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
              fill="rgba(241, 245, 249, 0.12)"
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
              stroke="#CBD5E1"
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
          color: 'var(--aureus-text-primary)',
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
          color: 'var(--aureus-text-secondary)',
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
          backgroundColor: 'var(--aureus-bg-elevated)',
          border: '1px solid var(--aureus-border-subtle)',
          color: 'var(--aureus-text-secondary)',
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
 * VARIANTE 6 — Confirmar "Eliminar Cliente" hacia la Papelera (Rojo Carmesí de Eliminación)
 * Círculo exterior 88x88px en #FEE2E2, borde 1.5px solid #FCA5A5, onda doble en rgba(220, 38, 38, 0.24) y núcleo #991B1B -> #DC2626.
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
          backgroundColor: 'var(--aureus-red-light)',
          border: '1.5px solid var(--aureus-red-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '18px'
        }}
      >
        {/* Onda expansiva doble en Rojo Alerta */}
        <span
          style={{
            position: 'absolute',
            inset: '-6px',
            borderRadius: '50%',
            border: '2.5px solid rgba(198, 93, 88, 0.28)',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid rgba(198, 93, 88, 0.16)',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        {/* Núcleo interior 72x72px con gradiente Rojo Alerta */}
        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #9D4440 0%, #C65D58 100%)',
            boxShadow: '0 12px 28px rgba(198, 93, 88, 0.30)',
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
              stroke="#E6ABA8"
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
              fill="#FCEEE9"
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
                stroke="#E6ABA8"
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
              fill="rgba(252, 238, 233, 0.16)"
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
              stroke="#E6ABA8"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <line
              x1="39"
              y1="35"
              x2="38.5"
              y2="47.5"
              stroke="#E6ABA8"
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
          color: 'var(--aureus-red-text)',
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
          color: 'var(--aureus-text-secondary)',
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
          backgroundColor: 'var(--aureus-red-light)',
          border: '1px solid var(--aureus-red-border)',
          color: 'var(--aureus-red-text)',
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
          backgroundColor: 'var(--aureus-red-light)',
          border: '1.5px solid var(--aureus-red-border)',
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
            border: '2.5px solid #E6ABA8',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid #FCEEE9',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #9D4440 0%, #C65D58 100%)',
            boxShadow: '0 12px 28px rgba(198, 93, 88, 0.32)',
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
              stroke="#E6ABA8"
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
              stroke="#E6ABA8"
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
              fill="rgba(252, 238, 233, 0.16)"
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
          color: 'var(--aureus-red-text)',
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
          color: 'var(--aureus-text-secondary)',
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
          backgroundColor: 'var(--aureus-red-light)',
          border: '1px solid var(--aureus-red-border)',
          color: 'var(--aureus-red-text)',
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
          backgroundColor: 'var(--aureus-green-light)',
          border: '1.5px solid var(--aureus-green-border)',
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
            border: '2.5px solid #94C2B2',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid var(--aureus-border-gold)',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2D6654 0%, #397D67 100%)',
            boxShadow: '0 12px 28px rgba(57, 125, 103, 0.28)',
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
              stroke="#94C2B2"
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
              fill="rgba(230, 242, 238, 0.16)"
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
              stroke="#E6F2EE"
              strokeWidth="2.2"
            />

            {/* Insignia Check en Verde financiero y Dorado */}
            <circle
              cx="47"
              cy="44"
              r="10"
              fill="#B69A55"
              stroke="#FFFFFF"
              strokeWidth="2"
            />
            <path
              d="M42.5 44 L45.8 47.2 L52 40.5"
              fill="none"
              stroke="#FFFFFF"
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
          color: 'var(--aureus-green-text)',
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
          color: 'var(--aureus-text-secondary)',
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
          backgroundColor: 'var(--aureus-green-light)',
          border: '1px solid var(--aureus-green-border)',
          color: 'var(--aureus-green-text)',
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
          backgroundColor: 'var(--aureus-gold-light)',
          border: '1.5px solid var(--aureus-border-gold)',
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
            border: '2.5px solid #D5C295',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid #F7F2E4',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #9E8342 0%, #B69A55 100%)',
            boxShadow: '0 12px 28px rgba(182, 154, 85, 0.28)',
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
              stroke="#F7F2E4"
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
              <rect x="29" y="15" width="14" height="12" rx="2" fill="#F7F2E4" />
              <circle cx="36" cy="21" r="3.5" fill="none" stroke="#7D652E" strokeWidth="1.6" />
              <polyline points="36,19 36,21 37.8,21" fill="none" stroke="#7D652E" strokeWidth="1.5" strokeLinecap="round" />
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
                stroke="#F7F2E4"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <line x1="22" y1="27" x2="50" y2="27" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" />
            </g>

            {/* Cuerpo de la papelera */}
            <path
              d="M25.5 30 L27.5 51.5 C27.7 53.2 29 54.5 31 54.5 H41 C43 54.5 44.3 53.2 44.5 51.5 L46.5 30"
              fill="rgba(247, 242, 228, 0.16)"
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
            <line x1="33" y1="36" x2="33.5" y2="48" stroke="#F7F2E4" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="39" y1="36" x2="38.5" y2="48" stroke="#F7F2E4" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <div
        style={{
          fontSize: '17.5px',
          fontWeight: 900,
          color: 'var(--aureus-text-primary)',
          letterSpacing: '-0.01em',
          lineHeight: 1.25
        }}
      >
        {isPlural ? 'Préstamos enviados a papelera' : 'Préstamo enviado a papelera'}
      </div>

      <div
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: 'var(--aureus-text-secondary)',
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
          backgroundColor: 'var(--aureus-gold-light)',
          border: '1px solid var(--aureus-border-gold)',
          color: 'var(--aureus-gold-text)',
          fontSize: '12.5px',
          fontWeight: 800,
          padding: '6px 14px',
          borderRadius: '9999px',
          lineHeight: 1.3,
          animation: 'cfPillSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) 0.22s backwards'
        }}
      >
        {detailPill || 'En Papelera por 30 días'}
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
          backgroundColor: 'var(--aureus-green-light)',
          border: '1.5px solid var(--aureus-green-border)',
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
            border: '2.5px solid #94C2B2',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid #E6F2EE',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2D6654 0%, #397D67 100%)',
            boxShadow: '0 12px 28px rgba(57, 125, 103, 0.28)',
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
              stroke="#94C2B2"
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
              <rect x="29" y="15" width="14" height="12" rx="2" fill="#E6F2EE" />
              <polyline points="33,21 35.2,23.2 39.5,18.8" fill="none" stroke="#397D67" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                stroke="#E6F2EE"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <line x1="22" y1="27" x2="50" y2="27" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" />
            </g>

            {/* Cuerpo de la papelera */}
            <path
              d="M25.5 30 L27.5 51.5 C27.7 53.2 29 54.5 31 54.5 H41 C43 54.5 44.3 53.2 44.5 51.5 L46.5 30"
              fill="rgba(230, 242, 238, 0.16)"
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
            <line x1="33" y1="36" x2="33.5" y2="48" stroke="#E6F2EE" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="39" y1="36" x2="38.5" y2="48" stroke="#E6F2EE" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <div
        style={{
          fontSize: '17.5px',
          fontWeight: 900,
          color: 'var(--aureus-green-text)',
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
          color: 'var(--aureus-text-secondary)',
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
          backgroundColor: 'var(--aureus-green-light)',
          border: '1px solid var(--aureus-green-border)',
          color: 'var(--aureus-green-text)',
          fontSize: '12.5px',
          fontWeight: 800,
          padding: '6px 14px',
          borderRadius: '9999px',
          lineHeight: 1.3,
          animation: 'cfPillSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) 0.22s backwards'
        }}
      >
        {detailPill || 'En Papelera por 30 días'}
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
          backgroundColor: 'var(--aureus-red-light)',
          border: '1.5px solid var(--aureus-red-border)',
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
            border: '2.5px solid #E6ABA8',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid #FCEEE9',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #9D4440 0%, #C65D58 100%)',
            boxShadow: '0 12px 28px rgba(198, 93, 88, 0.30)',
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
              stroke="#E6ABA8"
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

            {/* Documento con insignia de alerta de atraso que cae en la papelera */}
            <g
              style={{
                transformOrigin: '36px 22px',
                animation: 'cfCardIntoTrash 0.58s cubic-bezier(0.22, 1, 0.36, 1) 0.08s forwards'
              }}
            >
              <rect x="29" y="15" width="14" height="12" rx="2" fill="#FCEEE9" />
              <line x1="36" y1="17.5" x2="36" y2="22" stroke="#8F3D39" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="36" cy="24.5" r="1.2" fill="#8F3D39" />
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
                stroke="#FCEEE9"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <line x1="22" y1="27" x2="50" y2="27" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" />
            </g>

            {/* Cuerpo de la papelera */}
            <path
              d="M25.5 30 L27.5 51.5 C27.7 53.2 29 54.5 31 54.5 H41 C43 54.5 44.3 53.2 44.5 51.5 L46.5 30"
              fill="rgba(252, 238, 233, 0.16)"
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
            <line x1="33" y1="36" x2="33.5" y2="48" stroke="#FCEEE9" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="39" y1="36" x2="38.5" y2="48" stroke="#FCEEE9" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <div
        style={{
          fontSize: '17.5px',
          fontWeight: 900,
          color: 'var(--aureus-red-text)',
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
          color: 'var(--aureus-text-secondary)',
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
          backgroundColor: 'var(--aureus-red-light)',
          border: '1px solid var(--aureus-red-border)',
          color: 'var(--aureus-red-text)',
          fontSize: '12.5px',
          fontWeight: 800,
          padding: '6px 14px',
          borderRadius: '9999px',
          lineHeight: 1.3,
          animation: 'cfPillSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) 0.22s backwards'
        }}
      >
        {detailPill || 'En Papelera por 30 días'}
      </div>
    </>
  );
}

/**
 * VARIANTE 12 — Confirmar "Sí, Retirar" en Lista Negra
 * Paleta: Verde Dólar Ejecutivo con escudo ShieldCheck y trazo de levantamiento de restricción
 */
function RetirarListaNegraStageContent({ clientName, detailPill }) {
  return (
    <>
      <div
        style={{
          position: 'relative',
          width: '88px',
          height: '88px',
          borderRadius: '50%',
          backgroundColor: 'var(--aureus-green-light)',
          border: '1.5px solid var(--aureus-green-border)',
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
            border: '2.5px solid rgba(57, 125, 103, 0.28)',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid var(--aureus-border-gold)',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2D6654 0%, #397D67 100%)',
            boxShadow: '0 12px 28px rgba(57, 125, 103, 0.28)',
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
              stroke="#94C2B2"
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

            {/* Escudo ejecutivo trazado en blanco */}
            <path
              d="M36 18 L50 23.5 V34.5 C50 43.8 44 50.8 36 53.5 C28 50.8 22 43.8 22 34.5 V23.5 L36 18 Z"
              fill="rgba(230, 242, 238, 0.16)"
              stroke="#FFFFFF"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="130"
              strokeDashoffset="130"
              style={{
                animation: 'cfStrokeDraw 0.52s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            />

            {/* Check luminoso indicando restricción levantada */}
            <path
              d="M28.5 36.2 L33.8 41.5 L44 30.5"
              fill="none"
              stroke="#E6F2EE"
              strokeWidth="3.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="60"
              strokeDashoffset="60"
              style={{
                animation: 'cfStrokeDraw 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards'
              }}
            />
          </svg>
        </div>
      </div>

      <div
        style={{
          fontSize: '18px',
          fontWeight: 900,
          color: 'var(--aureus-green-text)',
          letterSpacing: '-0.01em',
          lineHeight: 1.25
        }}
      >
        Retirado de Lista Negra
      </div>

      <div
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: 'var(--aureus-text-secondary)',
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
          backgroundColor: 'var(--aureus-green-light)',
          border: '1px solid var(--aureus-green-border)',
          color: 'var(--aureus-green-text)',
          fontSize: '12.5px',
          fontWeight: 800,
          padding: '6px 14px',
          borderRadius: '9999px',
          lineHeight: 1.3,
          animation: 'cfPillSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) 0.22s backwards'
        }}
      >
        {detailPill || 'Restaurado a Clientes'}
      </div>
    </>
  );
}

/**
 * VARIANTE 13 — Confirmar "Restaurar Cliente" en Papelera
 * Paleta: Verde Dólar de Reactivación con arco de retorno giratorio y silueta verificada
 */
function RestaurarClienteStageContent({ clientName, detailPill }) {
  return (
    <>
      <div
        style={{
          position: 'relative',
          width: '88px',
          height: '88px',
          borderRadius: '50%',
          backgroundColor: 'var(--aureus-green-light)',
          border: '1.5px solid var(--aureus-green-border)',
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
            border: '2.5px solid rgba(57, 125, 103, 0.28)',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid var(--aureus-border-gold)',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2D6654 0%, #397D67 100%)',
            boxShadow: '0 12px 28px rgba(57, 125, 103, 0.28)',
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
            {/* Arco circular giratorio de restauración (360deg suave) */}
            <g
              style={{
                transformOrigin: '36px 36px',
                animation: 'cfRefreshSpin 0.72s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            >
              <path
                d="M21 31 A16 16 0 1 1 22 44"
                fill="none"
                stroke="#E6F2EE"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              <polyline
                points="17.5,27 20.8,32.2 26.2,30"
                fill="none"
                stroke="#E6F2EE"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>

            {/* Silueta de usuario con check central blanco */}
            <circle
              cx="36"
              cy="30"
              r="5.2"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.5"
            />
            <path
              d="M27.5 46 C27.5 40.8 31.3 38.2 36 38.2 C38 38.2 39.8 38.7 41.2 39.6"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M39 44.5 L42.2 47.5 L48.5 40.8"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="40"
              strokeDashoffset="40"
              style={{
                animation: 'cfStrokeDraw 0.44s cubic-bezier(0.16, 1, 0.3, 1) 0.24s forwards'
              }}
            />
          </svg>
        </div>
      </div>

      <div
        style={{
          fontSize: '18px',
          fontWeight: 900,
          color: 'var(--aureus-green-text)',
          letterSpacing: '-0.01em',
          lineHeight: 1.25
        }}
      >
        Cliente restaurado
      </div>

      <div
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: 'var(--aureus-text-secondary)',
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
          backgroundColor: 'var(--aureus-green-light)',
          border: '1px solid var(--aureus-green-border)',
          color: 'var(--aureus-green-text)',
          fontSize: '12.5px',
          fontWeight: 800,
          padding: '6px 14px',
          borderRadius: '9999px',
          lineHeight: 1.3,
          animation: 'cfPillSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) 0.22s backwards'
        }}
      >
        {detailPill || 'Activo nuevamente en Clientes'}
      </div>
    </>
  );
}

/**
 * VARIANTE 14 — Confirmar "Nuevo Cliente" en ClientFormModal.jsx
 * Paleta: Verde Dólar Ejecutivo con silueta UserPlus en blanco y check en #D6E7D6
 */
function NuevoClienteStageContent({ clientName, detailPill }) {
  return (
    <>
      <div
        style={{
          position: 'relative',
          width: '88px',
          height: '88px',
          borderRadius: '50%',
          backgroundColor: 'var(--aureus-green-light)',
          border: '1.5px solid var(--aureus-green-border)',
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
            border: '2.5px solid #94C2B2',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid var(--aureus-border-gold)',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2D6654 0%, #397D67 100%)',
            boxShadow: '0 12px 28px rgba(57, 125, 103, 0.28)',
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
              stroke="#94C2B2"
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

            {/* Silueta de nuevo cliente trazada en blanco */}
            <circle
              cx="32"
              cy="28"
              r="6.2"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.8"
              strokeDasharray="45"
              strokeDashoffset="45"
              style={{
                animation: 'cfStrokeDraw 0.42s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            />
            <path
              d="M21 48 C21 41.5 25.8 38.5 32 38.5 C36.2 38.5 39.2 39.8 41 42"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeDasharray="60"
              strokeDashoffset="60"
              style={{
                animation: 'cfStrokeDraw 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.08s forwards'
              }}
            />

            {/* Check de confirmación */}
            <path
              d="M40.5 41.5 L44.5 45.5 L53 36.5"
              fill="none"
              stroke="#E6F2EE"
              strokeWidth="3.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="50"
              strokeDashoffset="50"
              style={{
                animation: 'cfStrokeDraw 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.22s forwards'
              }}
            />
          </svg>
        </div>
      </div>

      <div
        style={{
          fontSize: '18px',
          fontWeight: 900,
          color: 'var(--aureus-green-text)',
          letterSpacing: '-0.01em',
          lineHeight: 1.25
        }}
      >
        Cliente registrado
      </div>

      <div
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: 'var(--aureus-text-secondary)',
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
          backgroundColor: 'var(--aureus-green-light)',
          border: '1px solid var(--aureus-green-border)',
          color: 'var(--aureus-green-text)',
          fontSize: '12.5px',
          fontWeight: 800,
          padding: '6px 14px',
          borderRadius: '9999px',
          lineHeight: 1.3,
          animation: 'cfPillSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) 0.22s backwards'
        }}
      >
        {detailPill || 'Agregado a tu lista de clientes'}
      </div>
    </>
  );
}

/**
 * VARIANTE 15 — Confirmar Renovación de Préstamo
 * Paleta: Azul / Índigo Ejecutivo con dos flechas circulares girando y check blanco
 */
function RenovarPrestamoStageContent({ clientName, detailPill }) {
  return (
    <>
      <div
        style={{
          position: 'relative',
          width: '88px',
          height: '88px',
          borderRadius: '50%',
          backgroundColor: 'var(--aureus-gold-light)',
          border: '1.5px solid var(--aureus-border-gold)',
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
            border: '2.5px solid #D5C295',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid #F7F2E4',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #9E8342 0%, #B69A55 100%)',
            boxShadow: '0 12px 28px rgba(182, 154, 85, 0.28)',
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
            {/* Dos flechas circulares de renovación girando con fluidez */}
            <g
              style={{
                transformOrigin: '36px 36px',
                animation: 'cfRefreshSpin 0.72s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            >
              <path
                d="M21 33 A15 15 0 0 1 48.5 27.5"
                fill="none"
                stroke="#F7F2E4"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              <polyline
                points="44,28.5 49.5,28 49,22.5"
                fill="none"
                stroke="#F7F2E4"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M51 39 A15 15 0 0 1 23.5 44.5"
                fill="none"
                stroke="#F7F2E4"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              <polyline
                points="28,43.5 22.5,44 23,49.5"
                fill="none"
                stroke="#F7F2E4"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>

            {/* Check central en blanco */}
            <path
              d="M28.5 36.2 L33.8 41.5 L44 30.5"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="60"
              strokeDashoffset="60"
              style={{
                animation: 'cfStrokeDraw 0.48s cubic-bezier(0.16, 1, 0.3, 1) 0.22s forwards'
              }}
            />
          </svg>
        </div>
      </div>

      <div
        style={{
          fontSize: '18px',
          fontWeight: 900,
          color: 'var(--aureus-text-primary)',
          letterSpacing: '-0.01em',
          lineHeight: 1.25
        }}
      >
        Préstamo renovado
      </div>

      <div
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: 'var(--aureus-text-secondary)',
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
          backgroundColor: 'var(--aureus-gold-light)',
          border: '1px solid var(--aureus-border-gold)',
          color: 'var(--aureus-gold-text)',
          fontSize: '12.5px',
          fontWeight: 800,
          padding: '6px 14px',
          borderRadius: '9999px',
          lineHeight: 1.3,
          animation: 'cfPillSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) 0.22s backwards'
        }}
      >
        {detailPill || 'Nuevas cuotas programadas'}
      </div>
    </>
  );
}

/**
 * VARIANTE 16 — Confirmar Arreglo de Pago
 * Paleta: Ámbar / Dorado Ejecutivo con calendario CalendarCheck verificado en blanco
 */
function ArregloPagoStageContent({ clientName, detailPill }) {
  return (
    <>
      <div
        style={{
          position: 'relative',
          width: '88px',
          height: '88px',
          borderRadius: '50%',
          backgroundColor: 'var(--aureus-gold-light)',
          border: '1.5px solid var(--aureus-border-gold)',
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
            border: '2.5px solid #D5C295',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid #F7F2E4',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #9E8342 0%, #B69A55 100%)',
            boxShadow: '0 12px 28px rgba(182, 154, 85, 0.28)',
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
              stroke="#F7F2E4"
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

            {/* Calendario de acuerdo en blanco */}
            <rect
              x="21"
              y="24"
              width="30"
              height="26"
              rx="5"
              fill="rgba(255, 255, 255, 0.14)"
              stroke="#FFFFFF"
              strokeWidth="2.6"
            />
            <line x1="21" y1="32" x2="51" y2="32" stroke="#FFFFFF" strokeWidth="2.4" />
            <line x1="29" y1="20" x2="29" y2="26" stroke="#F7F2E4" strokeWidth="2.8" strokeLinecap="round" />
            <line x1="43" y1="20" x2="43" y2="26" stroke="#F7F2E4" strokeWidth="2.8" strokeLinecap="round" />

            {/* Check progresivo dentro del calendario */}
            <path
              d="M29.5 41 L34 45.2 L43 36.2"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="50"
              strokeDashoffset="50"
              style={{
                animation: 'cfStrokeDraw 0.48s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards'
              }}
            />
          </svg>
        </div>
      </div>

      <div
        style={{
          fontSize: '18px',
          fontWeight: 900,
          color: 'var(--aureus-text-primary)',
          letterSpacing: '-0.01em',
          lineHeight: 1.25
        }}
      >
        Arreglo registrado
      </div>

      <div
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: 'var(--aureus-text-secondary)',
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
          backgroundColor: 'var(--aureus-gold-light)',
          border: '1px solid var(--aureus-border-gold)',
          color: 'var(--aureus-gold-text)',
          fontSize: '12.5px',
          fontWeight: 800,
          padding: '6px 14px',
          borderRadius: '9999px',
          lineHeight: 1.3,
          animation: 'cfPillSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) 0.22s backwards'
        }}
      >
        {detailPill || 'Cuota especial aplicada'}
      </div>
    </>
  );
}

/**
 * VARIANTE 17 — Confirmar "Restaurar préstamo" desde Papelera
 * Paleta: Verde Dólar Ejecutivo (#397D67 / gradiente #2D6654 -> #397D67)
 */
function RestaurarPrestamoStageContent({ clientName, detailPill, isPlural }) {
  return (
    <>
      <div
        style={{
          position: 'relative',
          width: '88px',
          height: '88px',
          borderRadius: '50%',
          backgroundColor: 'var(--aureus-green-light)',
          border: '1.5px solid var(--aureus-green-border)',
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
            border: '2.5px solid rgba(57, 125, 103, 0.28)',
            animation: 'cfPulseRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: '-12px',
            borderRadius: '50%',
            border: '1.5px solid var(--aureus-border-gold)',
            animation: 'cfPulseRing 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.12s forwards'
          }}
        />

        <div
          style={{
            position: 'relative',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2D6654 0%, #397D67 100%)',
            boxShadow: '0 12px 28px rgba(57, 125, 103, 0.28)',
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
            <g
              style={{
                transformOrigin: '36px 36px',
                animation: 'cfRefreshSpin 0.72s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              }}
            >
              <path
                d="M21 31 A16 16 0 1 1 22 44"
                fill="none"
                stroke="#E6F2EE"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              <polyline
                points="17.5,27 20.8,32.2 26.2,30"
                fill="none"
                stroke="#E6F2EE"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>

            <rect
              x="27"
              y="26"
              width="18"
              height="20"
              rx="3.5"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.5"
            />
            <path
              d="M32 36.5 L35.2 39.5 L41.5 32.8"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="40"
              strokeDashoffset="40"
              style={{
                animation: 'cfStrokeDraw 0.44s cubic-bezier(0.16, 1, 0.3, 1) 0.24s forwards'
              }}
            />
          </svg>
        </div>
      </div>

      <div
        style={{
          fontSize: '18px',
          fontWeight: 900,
          color: 'var(--aureus-green-text)',
          letterSpacing: '-0.01em',
          lineHeight: 1.25
        }}
      >
        {isPlural ? 'Préstamos restaurados' : 'Préstamo restaurado'}
      </div>

      <div
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: 'var(--aureus-text-secondary)',
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
          backgroundColor: 'var(--aureus-green-light)',
          border: '1px solid var(--aureus-green-border)',
          color: 'var(--aureus-green-text)',
          fontSize: '12.5px',
          fontWeight: 800,
          padding: '6px 14px',
          borderRadius: '9999px',
          lineHeight: 1.3,
          animation: 'cfPillSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) 0.22s backwards'
        }}
      >
        {detailPill || 'Activo nuevamente en Préstamos'}
      </div>
    </>
  );
}

export default ConfirmActionStage;
