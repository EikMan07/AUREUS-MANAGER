/**
 * Divide un texto en fragmentos con solapamiento controlado (tam = 1500, solape = 200).
 *
 * @param {string} texto
 * @param {number} [tam=1500]
 * @param {number} [solape=200]
 * @returns {string[]}
 */
export function fragmentar(texto, tam = 1500, solape = 200) {
  if (!texto || typeof texto !== 'string') return [];
  const limpio = texto
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!limpio) return [];

  const tamSeguro = Math.max(100, Number(tam) || 1500);
  const solapeSeguro = Math.max(
    0,
    Math.min(Number(solape) || 0, Math.floor(tamSeguro / 2))
  );

  const partes = [];
  let inicio = 0;

  while (inicio < limpio.length) {
    let fin = Math.min(inicio + tamSeguro, limpio.length);

    // Ajustar el corte al limite de linea o palabra mas cercano para no partir palabras
    if (fin < limpio.length) {
      const ultimoSalto = limpio.lastIndexOf('\n', fin);
      const ultimoEspacio = limpio.lastIndexOf(' ', fin);
      const limiteMinimo = inicio + Math.floor(tamSeguro * 0.65);

      if (ultimoSalto >= limiteMinimo) {
        fin = ultimoSalto;
      } else if (ultimoEspacio >= limiteMinimo) {
        fin = ultimoEspacio;
      }
    }

    const fragmento = limpio.slice(inicio, fin).trim();
    if (fragmento) {
      partes.push(fragmento);
    }

    if (fin >= limpio.length) break;

    let siguienteInicio = Math.max(fin - solapeSeguro, inicio + 1);
    if (siguienteInicio > inicio && siguienteInicio < limpio.length && !/\s/.test(limpio[siguienteInicio - 1])) {
      const siguienteEspacio = limpio.indexOf(' ', siguienteInicio);
      const siguienteSalto = limpio.indexOf('\n', siguienteInicio);
      const candidatos = [siguienteEspacio, siguienteSalto].filter(
        (idx) => idx > siguienteInicio && idx < fin
      );
      if (candidatos.length > 0) {
        siguienteInicio = Math.min(...candidatos) + 1;
      }
    }
    inicio = siguienteInicio;
  }

  return partes;
}

export default fragmentar;
