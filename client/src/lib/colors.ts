/**
 * Centralized color palette for all visualizations
 * These colors are designed to work well together and maintain consistency
 * across all charts and maps
 * 
 * @module colors
 */

export const CHART_COLORS = {
  // Primary color palette (purple - KLOB brand)
  primary: '#9333ea', // Purple-600
  primaryLight: '#a855f7', // Purple-500
  primaryDark: '#7e22ce', // Purple-700
  
  // Secondary colors (stone/beige - KLOB brand)
  secondary: '#d6d3d1', // Stone-300
  secondaryLight: '#e7e5e4', // Stone-200
  secondaryDark: '#a8a29e', // Stone-400
  
  // Accent colors
  accent: '#78716c', // Stone-600
  accentLight: '#a8a29e', // Stone-400
  accentDark: '#57534e', // Stone-700
  
  // Semantic colors
  // Green for positive values
  success: '#10b981', // Emerald-500
  successLight: '#34d399', // Emerald-400
  successDark: '#059669', // Emerald-600
  
  // Red for negative values
  danger: '#ef4444', // Red-500
  dangerLight: '#f87171', // Red-400
  dangerDark: '#dc2626', // Red-600
  
  warning: '#f59e0b', // Amber-500
  warningLight: '#fbbf24', // Amber-400
  warningDark: '#d97706', // Amber-600
  
  // Additional palette colors (purple and stone tones)
  beige: '#e7e5e4', // Stone-200
  beigeLight: '#f5f5f4', // Stone-100
  beigeDark: '#d6d3d1', // Stone-300
  
  brown: '#78716c', // Stone-600
  brownLight: '#a8a29e', // Stone-400
  brownDark: '#57534e', // Stone-700
  
  // Chart series colors (purple and stone tones)
  series: [
    '#9333ea', // Purple-600
    '#d6d3d1', // Stone-300
    '#a855f7', // Purple-500
    '#78716c', // Stone-600
    '#7e22ce', // Purple-700
    '#a8a29e', // Stone-400
    '#c084fc', // Purple-400
    '#57534e', // Stone-700
    '#e7e5e4', // Stone-200
    '#8b5cf6', // Purple-500 alternative
  ],
  
  // Map colors (for geographic visualizations)
  // Purple for high values, stone for low values
  map: {
    espana: {
      high: '#9333ea', // Purple-600 (valores altos)
      mediumHigh: '#a855f7', // Purple-500
      medium: '#d6d3d1', // Stone-300 (medio)
      mediumLow: '#a8a29e', // Stone-400 (medio-bajo)
      low: '#78716c', // Stone-600 (valores bajos)
    },
    italia: {
      high: '#9333ea', // Purple-600 (valores altos)
      mediumHigh: '#a855f7', // Purple-500
      medium: '#d6d3d1', // Stone-300 (medio)
      mediumLow: '#a8a29e', // Stone-400 (medio-bajo)
      low: '#78716c', // Stone-600 (valores bajos)
    },
  },
  
  // Gradient stops for continuous scales
  gradients: {
    positive: ['#78716c', '#d6d3d1', '#9333ea'], // Stone -> Stone-light -> Purple
    negative: ['#ef4444', '#f87171', '#fca5a5'], // Red escalado
    neutral: ['#d6d3d1', '#a8a29e', '#78716c'], // Tonos stone
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
 * Get color based on value range (low = stone, high = purple)
 * Solo el valor más alto es purple, el más bajo es stone oscuro, el resto stone claro
 */
export function getValueColor(value: number, min: number, max: number): string {
  if (max === min) return CHART_COLORS.secondary; // Stone claro si todos son iguales
  
  // Solo el valor más alto es purple
  if (value === max) return CHART_COLORS.primary; // Purple
  
  // Solo el valor más bajo es stone oscuro
  if (value === min) return CHART_COLORS.accent; // Stone oscuro
  
  // Todo lo demás es stone claro
  return CHART_COLORS.secondary; // Stone claro
}

// Default export for compatibility
export default CHART_COLORS;
