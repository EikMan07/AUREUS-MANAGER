import { useState, useEffect } from 'react';

/**
 * Hook ligero useMediaQuery basado en window.matchMedia
 * Permite a cualquier componente reaccionar a breakpoints CSS con 0 dependencias externas.
 *
 * @param {string} query - Consulta de medios CSS (ej: '(max-width: 380px)')
 * @returns {boolean} matches - true si la consulta coincide con el viewport actual
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      try {
        return window.matchMedia(query).matches;
      } catch (e) {
        return false;
      }
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    let mediaQueryList;
    try {
      mediaQueryList = window.matchMedia(query);
    } catch (e) {
      return;
    }

    const updateMatch = (event) => {
      setMatches(event.matches);
    };

    // Sincronización inicial
    setMatches(mediaQueryList.matches);

    // Compatibilidad con addEventListener y addListener legacy
    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', updateMatch);
      return () => mediaQueryList.removeEventListener('change', updateMatch);
    } else if (typeof mediaQueryList.addListener === 'function') {
      mediaQueryList.addListener(updateMatch);
      return () => mediaQueryList.removeListener(updateMatch);
    }
  }, [query]);

  return matches;
}

export default useMediaQuery;

