/**
 * Centralized color palette for all visualizations
 * These colors are designed to work well together and maintain consistency
 * across all charts and maps
 * 
 * @module colors
 */

export const CHART_COLORS = {
  // Primary color palette (beis y marrón clarito)
  primary: '#d4a574', // Beis
  primaryLight: '#e8c9a3', // Beis claro
  primaryDark: '#b8905a', // Beis oscuro
  
  // Secondary colors (marrón clarito)
  secondary: '#c19a6b', // Marrón claro
  secondaryLight: '#d4b896', // Marrón muy claro
  secondaryDark: '#a67c52', // Marrón medio
  
  // Accent colors
  accent: '#8b6f47', // Marrón medio
  accentLight: '#a6865f',
  accentDark: '#6f5638',
  
  // Semantic colors
  // Verde oscuro para valores altos
  success: '#2d5016', // Verde oscuro
  successLight: '#4a7c2a',
  successDark: '#1f370f',
  
  // Granate para valores bajos
  danger: '#800020', // Granate
  dangerLight: '#a0002a',
  dangerDark: '#600018',
  
  warning: '#b8860b', // Marrón dorado
  warningLight: '#d4af37',
  warningDark: '#996b08',
  
  // Additional palette colors (tonos tierra)
  beige: '#f5e6d3',
  beigeLight: '#faf5ed',
  beigeDark: '#e8d5b7',
  
  brown: '#8b6f47',
  brownLight: '#a6865f',
  brownDark: '#6f5638',
  
  // Chart series colors (tonos beis, marrón, verde oscuro, granate)
  series: [
    '#d4a574', // Beis
    '#c19a6b', // Marrón claro
    '#2d5016', // Verde oscuro (valores altos)
    '#800020', // Granate (valores bajos)
    '#b8905a', // Beis oscuro
    '#a67c52', // Marrón medio
    '#4a7c2a', // Verde medio
    '#a0002a', // Granate claro
    '#e8c9a3', // Beis muy claro
    '#8b6f47', // Marrón
  ],
  
  // Map colors (for geographic visualizations)
  // Verde oscuro para valores altos, granate para valores bajos
  map: {
    espana: {
      high: '#2d5016', // Verde oscuro (valores altos)
      mediumHigh: '#4a7c2a',
      medium: '#c19a6b', // Marrón claro (medio)
      mediumLow: '#d4a574', // Beis (medio-bajo)
      low: '#800020', // Granate (valores bajos)
    },
    italia: {
      high: '#2d5016', // Verde oscuro (valores altos)
      mediumHigh: '#4a7c2a',
      medium: '#c19a6b', // Marrón claro (medio)
      mediumLow: '#d4a574', // Beis (medio-bajo)
      low: '#800020', // Granate (valores bajos)
    },
  },
  
  // Gradient stops for continuous scales
  gradients: {
    positive: ['#800020', '#d4a574', '#2d5016'], // Granate -> Beis -> Verde oscuro
    negative: ['#800020', '#a0002a', '#c00034'], // Granate escalado
    neutral: ['#d4a574', '#c19a6b', '#b8905a'], // Tonos beis/marrón
  },
} as const;

/**
 * Get color from palette by index (for series)
 */
export function getColorByIndex(index: number): string {
  return CHART_COLORS.series[index % CHART_COLORS.series.length];
}

/**
 * Get color scale value for maps based on ratio (0-1)
 */
export function getMapColor(ratio: number, type: 'espana' | 'italia'): string {
  const palette = CHART_COLORS.map[type];
  if (ratio > 0.8) return palette.high;
  if (ratio > 0.6) return palette.mediumHigh;
  if (ratio > 0.4) return palette.medium;
  if (ratio > 0.2) return palette.mediumLow;
  return palette.low;
}

/**
 * Get semantic color based on value
 * Granate para valores bajos, verde oscuro para valores altos
 */
export function getSemanticColor(value: number, type: 'positive' | 'negative' | 'neutral' = 'positive'): string {
  if (type === 'positive') {
    return value > 0 ? CHART_COLORS.success : CHART_COLORS.danger;
  }
  if (type === 'negative') {
    return value < 0 ? CHART_COLORS.success : CHART_COLORS.danger;
  }
  return CHART_COLORS.secondary;
}

/**
 * Get color based on value range (low = granate, high = verde oscuro)
 * Solo el valor más alto es verde oscuro, el más bajo es granate, el resto marrón clarito
 */
export function getValueColor(value: number, min: number, max: number): string {
  if (max === min) return CHART_COLORS.secondary; // Marrón clarito si todos son iguales
  
  // Solo el valor más alto es verde oscuro
  if (value === max) return CHART_COLORS.success; // Verde oscuro
  
  // Solo el valor más bajo es granate
  if (value === min) return CHART_COLORS.danger; // Granate
  
  // Todo lo demás es marrón clarito
  return CHART_COLORS.secondary; // Marrón clarito
}

// Default export for compatibility
export default CHART_COLORS;
