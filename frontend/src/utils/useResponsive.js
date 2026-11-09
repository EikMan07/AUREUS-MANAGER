import { useMediaQuery } from './useMediaQuery.js';

/**
 * Hook useResponsive
 * Proporciona flags booleanos y el breakpoint activo para adaptar JSX y estilos en línea
 *
 * Breakpoints soportados:
 * - isSmallMobile: <= 380px (Celulares pequeños / ultra-compactos)
 * - isMobile: < 768px (Celulares estándar y pequeños)
 * - isTablet: 768px - 1023px (Tablets y pantallas medianas)
 * - isDesktop: >= 1024px (Laptops y computadoras de escritorio)
 * - isWide: >= 1280px (Monitores grandes y ultra-wide)
 */
export function useResponsive() {
  const isSmallMobile = useMediaQuery('(max-width: 380px)');
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isWide = useMediaQuery('(min-width: 1280px)');

  const breakpoint = isSmallMobile
    ? 'xs'
    : isMobile
    ? 'sm'
    : isTablet
    ? 'md'
    : isWide
    ? 'xl'
    : 'lg';

  return {
    isSmallMobile,
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    breakpoint,
  };
}

export default useResponsive;

