import type { VentasData, ProductosData } from "../../shared/schema";
import SimpleLinearRegression from "ml-regression-simple-linear";
import { mean, median, standardDeviation, quantile } from "simple-statistics";

export type SeasonType = 'PV' | 'OI';

export interface ProductForecast {
  codigoUnico: string;
  familia: string;
  predictedDemand: number;
  confidence: number;
  method: string;
  historicalAverage: number;
  features: {
    avgPrice?: number;
    priceElasticity?: number;
    trendScore?: number;
    seasonality?: number;
  };
  validation: {
    mape: number;
    mae: number;
    rmse: number;
  };
}

export interface ForecastResult {
  targetSeason: string;
  targetYear: number;
  seasonType: SeasonType;
  predictions: ProductForecast[];
  accuracy: {
    mape: number;
    mae: number;
    rmse: number;
    coverage: number;
  };
  dataPoints: number;
  modelsUsed: {
    [key: string]: number;
  };
}

// =====================================================================
// 1. LIMPIEZA Y VALIDACIÓN DE DATOS
// =====================================================================

/**
 * Detecta y elimina outliers usando el método IQR (Interquartile Range)
 */
export function removeOutliers(values: number[], factor: number = 1.5): number[] {
  if (values.length < 4) return values; // No suficientes datos

  const sorted = [...values].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  
  const lowerBound = q1 - factor * iqr;
  const upperBound = q3 + factor * iqr;
  
  return values.filter(v => v >= lowerBound && v <= upperBound);
}

/**
 * Normaliza datos eliminando valores extremos y estabilizando varianza
 */
export function normalizeTimeSeries(values: number[]): {
  normalized: number[];
  mean: number;
  std: number;
  cleanedCount: number;
} {
  if (values.length === 0) {
    return { normalized: [], mean: 0, std: 0, cleanedCount: 0 };
  }

  // Eliminar outliers
  const cleaned = removeOutliers(values);
  
  // Calcular estadísticas
  const avg = mean(cleaned);
  const std = cleaned.length > 1 ? standardDeviation(cleaned) : 0;
  
  // Normalizar (z-score)
  const normalized = std > 0 
    ? cleaned.map(v => (v - avg) / std)
    : cleaned.map(() => 0);
  
  return {
    normalized,
    mean: avg,
    std,
    cleanedCount: values.length - cleaned.length,
  };
}

// =====================================================================
// 2. FEATURE ENGINEERING
// =====================================================================

/**
 * Extrae características avanzadas de las ventas históricas
 */
export function extractProductFeatures(
  ventas: VentasData[],
  productos: ProductosData[],
  codigoUnico: string
): {
  avgPrice: number;
  priceVariance: number;
  avgCost: number;
  margin: number;
  salesBySize: Map<string, number>;
  dominantSize: string | null;
} {
  const productVentas = ventas.filter(v => v.codigoUnico === codigoUnico);
  const productInfo = productos.find(p => p.codigoUnico === codigoUnico);
  
  // Precio promedio ponderado por cantidad
  let totalRevenue = 0;
  let totalUnits = 0;
  const sizeMap = new Map<string, number>();
  
  productVentas.forEach(v => {
    const price = v.pvp || 0;
    const quantity = v.cantidad || 0;
    totalRevenue += price * quantity;
    totalUnits += quantity;
    
    if (v.talla) {
      sizeMap.set(v.talla, (sizeMap.get(v.talla) || 0) + quantity);
    }
  });
  
  const avgPrice = totalUnits > 0 ? totalRevenue / totalUnits : productInfo?.pvp || 0;
  const avgCost = productInfo?.precioCoste || avgPrice * 0.4; // Estimación si no hay costo
  const margin = avgPrice > 0 ? ((avgPrice - avgCost) / avgPrice) * 100 : 0;
  
  // Calcular varianza de precio
  const prices = productVentas.map(v => v.pvp || 0).filter(p => p > 0);
  const priceVariance = prices.length > 1 ? standardDeviation(prices) : 0;
  
  // Talla dominante
  let dominantSize: string | null = null;
  let maxSales = 0;
  sizeMap.forEach((sales, size) => {
    if (sales > maxSales) {
      maxSales = sales;
      dominantSize = size;
    }
  });
  
  return {
    avgPrice,
    priceVariance,
    avgCost,
    margin,
    salesBySize: sizeMap,
    dominantSize,
  };
}

/**
 * Calcula elasticidad precio-demanda (simplified)
 */
export function calculatePriceElasticity(
  salesByYear: Map<number, { quantity: number; avgPrice: number }>
): number {
  const years = Array.from(salesByYear.keys()).sort();
  
  if (years.length < 2) return 0;
  
  const quantities = years.map(y => salesByYear.get(y)!.quantity);
  const prices = years.map(y => salesByYear.get(y)!.avgPrice);
  
  // Calcular cambios porcentuales
  let totalElasticity = 0;
  let count = 0;
  
  for (let i = 1; i < years.length; i++) {
    const priceChange = ((prices[i] - prices[i-1]) / prices[i-1]) * 100;
    const quantityChange = ((quantities[i] - quantities[i-1]) / quantities[i-1]) * 100;
    
    if (Math.abs(priceChange) > 0.1) { // Evitar división por cero
      const elasticity = quantityChange / priceChange;
      totalElasticity += elasticity;
      count++;
    }
  }
  
  return count > 0 ? totalElasticity / count : 0;
}

// =====================================================================
// 3. MODELOS ML MEJORADOS
// =====================================================================

/**
 * Modelo 1: Promedio móvil ponderado con detección de tendencia
 */
export function forecastWeightedMovingAverage(
  salesByYear: Map<number, number>,
  weights?: number[]
): {
  prediction: number;
  confidence: number;
  trend: 'growing' | 'stable' | 'declining';
} {
  const years = Array.from(salesByYear.keys()).sort();
  const sales = years.map(y => salesByYear.get(y)!);
  
  if (sales.length === 0) {
    return { prediction: 0, confidence: 0, trend: 'stable' };
  }
  
  // Limpiar outliers
  const cleaned = removeOutliers(sales);
  
  // Pesos por defecto: más peso a años recientes
  const defaultWeights = cleaned.map((_, i) => Math.pow(2, i) / (Math.pow(2, cleaned.length) - 1));
  const finalWeights = weights || defaultWeights;
  
  // Promedio ponderado
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (let i = 0; i < cleaned.length; i++) {
    const weight = finalWeights[i] || defaultWeights[i];
    weightedSum += cleaned[i] * weight;
    totalWeight += weight;
  }
  
  const prediction = totalWeight > 0 ? weightedSum / totalWeight : 0;
  
  // Detectar tendencia
  let trend: 'growing' | 'stable' | 'declining' = 'stable';
  if (cleaned.length >= 2) {
    const recent = cleaned.slice(-2);
    const percentChange = ((recent[1] - recent[0]) / recent[0]) * 100;
    if (percentChange > 10) trend = 'growing';
    else if (percentChange < -10) trend = 'declining';
  }
  
  // Confidence basada en variabilidad
  const avgValue = mean(cleaned);
  const stdDev = cleaned.length > 1 ? standardDeviation(cleaned) : 0;
  const cv = avgValue > 0 ? (stdDev / avgValue) : 1;
  const confidence = Math.max(0, Math.min(100, 100 * (1 - cv)));
  
  return {
    prediction: Math.round(prediction),
    confidence: Math.round(confidence),
    trend,
  };
}

/**
 * Modelo 2: Regresión lineal con validación temporal
 */
export function forecastLinearRegressionValidated(
  salesByYear: Map<number, number>
): {
  prediction: number;
  confidence: number;
  r2: number;
  slope: number;
} {
  const years = Array.from(salesByYear.keys()).sort();
  const sales = years.map(y => salesByYear.get(y)!);
  
  if (sales.length < 2) {
    const avg = sales.length > 0 ? sales[0] : 0;
    return { prediction: avg, confidence: 50, r2: 0, slope: 0 };
  }
  
  // Limpiar outliers
  const cleaned = removeOutliers(sales);
  if (cleaned.length < 2) {
    const avg = mean(sales);
    return { prediction: Math.round(avg), confidence: 40, r2: 0, slope: 0 };
  }
  
  // Crear serie temporal normalizada
  const x = Array.from({ length: cleaned.length }, (_, i) => i);
  const y = cleaned;
  
  try {
    const regression = new SimpleLinearRegression(x, y);
    const nextX = cleaned.length;
    const prediction = regression.predict(nextX);
    
    // Validación: calcular R²
    const score = regression.score(x, y);
    const r2 = Math.max(0, Math.min(1, score.r2 || 0));
    
    // Confidence basada en R² y consistencia
    const baseConfidence = r2 * 80; // R² contribuye hasta 80%
    const variabilityPenalty = standardDeviation(y) / mean(y) * 20;
    const confidence = Math.max(0, Math.min(100, baseConfidence - variabilityPenalty));
    
    return {
      prediction: Math.max(0, Math.round(prediction)),
      confidence: Math.round(confidence),
      r2: Math.round(r2 * 100) / 100,
      slope: regression.slope,
    };
  } catch (error) {
    const avg = mean(y);
    return { prediction: Math.round(avg), confidence: 30, r2: 0, slope: 0 };
  }
}

/**
 * Modelo 3: Holt-Winters doble suavizado exponencial
 */
export function forecastHoltWinters(
  salesByYear: Map<number, number>,
  alpha: number = 0.3,
  beta: number = 0.1
): {
  prediction: number;
  confidence: number;
  level: number;
  trend: number;
} {
  const years = Array.from(salesByYear.keys()).sort();
  const sales = years.map(y => salesByYear.get(y)!);
  
  if (sales.length === 0) {
    return { prediction: 0, confidence: 0, level: 0, trend: 0 };
  }
  
  if (sales.length === 1) {
    return { prediction: sales[0], confidence: 50, level: sales[0], trend: 0 };
  }
  
  // Limpiar outliers
  const cleaned = removeOutliers(sales);
  if (cleaned.length < 2) {
    const val = cleaned[0] || 0;
    return { prediction: val, confidence: 40, level: val, trend: 0 };
  }
  
  // Inicializar nivel y tendencia
  let level = cleaned[0];
  let trend = cleaned.length > 1 ? cleaned[1] - cleaned[0] : 0;
  
  // Doble suavizado exponencial
  for (let i = 1; i < cleaned.length; i++) {
    const prevLevel = level;
    level = alpha * cleaned[i] + (1 - alpha) * (prevLevel + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }
  
  // Predicción: nivel + tendencia
  const prediction = level + trend;
  
  // Calcular error histórico para confidence
  let totalError = 0;
  let l = cleaned[0];
  let t = cleaned.length > 1 ? cleaned[1] - cleaned[0] : 0;
  
  for (let i = 1; i < cleaned.length; i++) {
    const forecast = l + t;
    const error = Math.abs(cleaned[i] - forecast);
    totalError += error;
    
    const prevL = l;
    l = alpha * cleaned[i] + (1 - alpha) * (prevL + t);
    t = beta * (l - prevL) + (1 - beta) * t;
  }
  
  const mae = totalError / (cleaned.length - 1);
  const avgValue = mean(cleaned);
  const mape = avgValue > 0 ? (mae / avgValue) * 100 : 100;
  const confidence = Math.max(0, Math.min(100, 100 - mape));
  
  return {
    prediction: Math.max(0, Math.round(prediction)),
    confidence: Math.round(confidence),
    level: Math.round(level),
    trend: Math.round(trend * 10) / 10,
  };
}

/**
 * Modelo 4: Prophet-like decomposition con tendencia y estacionalidad
 */
export function forecastProphetLike(
  salesByYear: Map<number, number>
): {
  prediction: number;
  confidence: number;
  components: {
    trend: number;
    seasonal: number;
    residual: number;
  };
} {
  const years = Array.from(salesByYear.keys()).sort();
  const sales = years.map(y => salesByYear.get(y)!);
  
  if (sales.length < 3) {
    const avg = sales.length > 0 ? mean(sales) : 0;
    return {
      prediction: Math.round(avg),
      confidence: 30,
      components: { trend: avg, seasonal: 0, residual: 0 },
    };
  }
  
  // Limpiar outliers
  const cleaned = removeOutliers(sales);
  if (cleaned.length < 3) {
    const avg = mean(sales);
    return {
      prediction: Math.round(avg),
      confidence: 25,
      components: { trend: avg, seasonal: 0, residual: 0 },
    };
  }
  
  // 1. Extraer tendencia usando regresión lineal
  const x = Array.from({ length: cleaned.length }, (_, i) => i);
  const regression = new SimpleLinearRegression(x, cleaned);
  const trendValues = x.map(xi => regression.predict(xi));
  const nextTrend = regression.predict(cleaned.length);
  
  // 2. Detrend: sales - trend
  const detrended = cleaned.map((val, i) => val - trendValues[i]);
  
  // 3. Estacionalidad: promedio de residuos cíclicos
  const seasonal = mean(detrended);
  
  // 4. Predicción: trend + seasonal
  const prediction = nextTrend + seasonal;
  
  // 5. Calcular residuos y confidence
  const residuals = cleaned.map((val, i) => val - (trendValues[i] + seasonal));
  const residualStd = standardDeviation(residuals);
  const avgValue = mean(cleaned);
  const confidence = avgValue > 0 
    ? Math.max(0, Math.min(100, 100 - (residualStd / avgValue) * 100))
    : 0;
  
  return {
    prediction: Math.max(0, Math.round(prediction)),
    confidence: Math.round(confidence),
    components: {
      trend: Math.round(nextTrend),
      seasonal: Math.round(seasonal),
      residual: Math.round(residualStd),
    },
  };
}

// =====================================================================
// 4. VALIDACIÓN TEMPORAL Y MÉTRICAS
// =====================================================================

/**
 * Validación cruzada temporal: entrena con n-1 años y predice el último
 */
export function temporalCrossValidation(
  salesByYear: Map<number, number>,
  forecastFn: (data: Map<number, number>) => { prediction: number }
): {
  mape: number;
  mae: number;
  rmse: number;
  predictions: Array<{ actual: number; predicted: number; year: number }>;
} {
  const years = Array.from(salesByYear.keys()).sort();
  
  if (years.length < 3) {
    return { mape: 100, mae: 0, rmse: 0, predictions: [] };
  }
  
  const predictions: Array<{ actual: number; predicted: number; year: number }> = [];
  let totalAPE = 0;
  let totalAE = 0;
  let totalSE = 0;
  let count = 0;
  
  // Validación: usar 2+ años para predecir el siguiente
  for (let i = 2; i < years.length; i++) {
    const trainYears = years.slice(0, i);
    const testYear = years[i];
    
    const trainData = new Map<number, number>();
    trainYears.forEach(y => trainData.set(y, salesByYear.get(y)!));
    
    const { prediction } = forecastFn(trainData);
    const actual = salesByYear.get(testYear)!;
    
    predictions.push({ actual, predicted: prediction, year: testYear });
    
    // Calcular errores
    const ae = Math.abs(actual - prediction);
    const ape = actual > 0 ? (ae / actual) * 100 : 0;
    const se = Math.pow(actual - prediction, 2);
    
    totalAPE += ape;
    totalAE += ae;
    totalSE += se;
    count++;
  }
  
  return {
    mape: count > 0 ? totalAPE / count : 100,
    mae: count > 0 ? totalAE / count : 0,
    rmse: count > 0 ? Math.sqrt(totalSE / count) : 0,
    predictions,
  };
}

/**
 * Calcular métricas de precisión
 */
export function calculateAccuracyMetrics(
  actual: number[],
  predicted: number[]
): {
  mape: number;
  mae: number;
  rmse: number;
  r2: number;
} {
  if (actual.length !== predicted.length || actual.length === 0) {
    return { mape: 100, mae: 0, rmse: 0, r2: 0 };
  }
  
  let totalAPE = 0;
  let totalAE = 0;
  let totalSE = 0;
  
  for (let i = 0; i < actual.length; i++) {
    const a = actual[i];
    const p = predicted[i];
    
    const ae = Math.abs(a - p);
    const ape = a > 0 ? (ae / a) * 100 : 0;
    const se = Math.pow(a - p, 2);
    
    totalAPE += ape;
    totalAE += ae;
    totalSE += se;
  }
  
  const n = actual.length;
  const mape = totalAPE / n;
  const mae = totalAE / n;
  const rmse = Math.sqrt(totalSE / n);
  
  // Calcular R²
  const meanActual = mean(actual);
  const ssTot = actual.reduce((sum, a) => sum + Math.pow(a - meanActual, 2), 0);
  const ssRes = totalSE;
  const r2 = ssTot > 0 ? Math.max(0, 1 - (ssRes / ssTot)) : 0;
  
  return {
    mape: Math.round(mape * 10) / 10,
    mae: Math.round(mae * 10) / 10,
    rmse: Math.round(rmse * 10) / 10,
    r2: Math.round(r2 * 100) / 100,
  };
}

export {
  detectLatestSeason,
  filterBySeasonType,
  aggregateByProduct
} from './seasonalForecasting';
