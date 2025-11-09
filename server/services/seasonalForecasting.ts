import type { VentasData, ProductosData } from "../../shared/schema";
import SimpleLinearRegression from "ml-regression-simple-linear";

// Tipo de temporada
export type SeasonType = 'PV' | 'OI';

// Estructura de predicción por producto
export interface ProductForecast {
  codigoUnico: string;
  familia: string;
  predictedDemand: number;
  confidence: number;
  method: string;
  historicalAverage: number;
}

// Resultado del forecast
export interface ForecastResult {
  targetSeason: string; // Ej: "26PV"
  targetYear: number;
  seasonType: SeasonType;
  predictions: ProductForecast[];
  accuracy: {
    mape: number;
    coverage: number;
  };
  dataPoints: number;
}

/**
 * Detecta la última temporada disponible en los datos
 * Soporta dos formatos:
 * - Formato estándar: "24PV", "25OI" (año 2 dígitos + PV/OI)
 * - Formato alternativo: "V2025", "I2026" (V/I + año 4 dígitos)
 */
export function detectLatestSeason(ventas: VentasData[]): {
  year: number;
  season: SeasonType;
  seasonCode: string;
} | null {
  // Extraer todas las temporadas únicas
  const temporadas = ventas
    .map(v => v.temporada)
    .filter(t => t && t.length >= 4) // Filtrar temporadas válidas
    .filter((t, i, arr) => arr.indexOf(t) === i); // Únicas

  if (temporadas.length === 0) return null;

  // Parsear temporadas - soportar múltiples formatos
  const parsed = temporadas.map(t => {
    // Formato 1: "24PV", "25OI" (año 2 dígitos + PV/OI)
    const match1 = t!.match(/^(\d{2})(PV|OI)$/);
    if (match1) {
      return {
        year: parseInt(`20${match1[1]}`), // 24 -> 2024
        season: match1[2] as SeasonType,
        seasonCode: t!,
      };
    }
    
    // Formato 2: "V2025", "I2026" (V/I + año 4 dígitos)
    const match2 = t!.match(/^(V|I)(\d{4})$/);
    if (match2) {
      const season = match2[1] === 'V' ? 'PV' : 'OI'; // V=Verano=PV, I=Invierno=OI
      const year = parseInt(match2[2]);
      const yearShort = year.toString().slice(-2);
      return {
        year,
        season: season as SeasonType,
        seasonCode: `${yearShort}${season}`, // Normalizar a formato estándar
      };
    }
    
    return null;
  }).filter(Boolean) as Array<{ year: number; season: SeasonType; seasonCode: string }>;

  if (parsed.length === 0) return null;

  // Encontrar la más reciente (mayor año, y si empate, OI > PV)
  parsed.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    // Si mismo año, OI (otoño-invierno) es más reciente que PV
    return a.season === 'OI' ? -1 : 1;
  });

  return parsed[0];
}

/**
 * Filtra ventas por tipo de temporada (solo PV o solo OI de años históricos)
 * Soporta dos formatos:
 * - Formato estándar: "24PV", "25OI" (año 2 dígitos + PV/OI)
 * - Formato alternativo: "V2025", "I2026" (V/I + año 4 dígitos)
 */
export function filterBySeasonType(
  ventas: VentasData[],
  seasonType: SeasonType,
  excludeYear?: number
): VentasData[] {
  return ventas.filter(v => {
    if (!v.temporada) return false;
    
    // Intentar formato 1: "24PV", "25OI"
    const match1 = v.temporada.match(/^(\d{2})(PV|OI)$/);
    if (match1) {
      const year = parseInt(`20${match1[1]}`);
      const season = match1[2] as SeasonType;
      
      // Solo incluir ventas de la misma temporada
      if (season !== seasonType) return false;
      
      // Excluir el año que vamos a predecir
      if (excludeYear && year >= excludeYear) return false;
      
      return true;
    }
    
    // Intentar formato 2: "V2025", "I2026"
    const match2 = v.temporada.match(/^(V|I)(\d{4})$/);
    if (match2) {
      const season = match2[1] === 'V' ? 'PV' : 'OI'; // V=Verano=PV, I=Invierno=OI
      const year = parseInt(match2[2]);
      
      // Solo incluir ventas de la misma temporada
      if (season !== seasonType) return false;
      
      // Excluir el año que vamos a predecir
      if (excludeYear && year >= excludeYear) return false;
      
      return true;
    }
    
    return false;
  });
}

/**
 * Agrupa ventas por producto y calcula series temporales
 */
export function aggregateByProduct(ventas: VentasData[]): Map<string, {
  codigoUnico: string;
  familia: string;
  salesByYear: Map<number, number>;
  totalSales: number;
}> {
  const productMap = new Map<string, {
    codigoUnico: string;
    familia: string;
    salesByYear: Map<number, number>;
    totalSales: number;
  }>();

  ventas.forEach(v => {
    // Excluir GR.ART.FICTICIO
    if (v.descripcionFamilia === 'GR.ART.FICTICIO') return;
    if (!v.codigoUnico || !v.temporada) return;

    // Intentar formato 1: "24PV", "25OI"
    let year: number | null = null;
    const match1 = v.temporada.match(/^(\d{2})(PV|OI)$/);
    if (match1) {
      year = parseInt(`20${match1[1]}`);
    } else {
      // Intentar formato 2: "V2025", "I2026"
      const match2 = v.temporada.match(/^(V|I)(\d{4})$/);
      if (match2) {
        year = parseInt(match2[2]);
      }
    }
    
    if (!year) return; // No se pudo parsear la temporada

    if (!productMap.has(v.codigoUnico)) {
      productMap.set(v.codigoUnico, {
        codigoUnico: v.codigoUnico,
        familia: v.descripcionFamilia || v.familia || 'Sin Familia',
        salesByYear: new Map(),
        totalSales: 0,
      });
    }

    const product = productMap.get(v.codigoUnico)!;
    const currentYearSales = product.salesByYear.get(year) || 0;
    const cantidad = v.cantidad || 0;
    
    product.salesByYear.set(year, currentYearSales + cantidad);
    product.totalSales += cantidad;
  });

  return productMap;
}

/**
 * Modelo 1: Promedio móvil estacional (Seasonal Moving Average)
 */
function forecastWithSeasonalAverage(salesByYear: Map<number, number>): {
  prediction: number;
  confidence: number;
} {
  const years = Array.from(salesByYear.keys()).sort();
  const sales = years.map(y => salesByYear.get(y)!);

  if (sales.length === 0) {
    return { prediction: 0, confidence: 0 };
  }

  // Promedio simple de los últimos años disponibles
  const windowSize = Math.min(3, sales.length); // Usar últimos 3 años o menos
  const recentSales = sales.slice(-windowSize);
  const average = recentSales.reduce((sum, val) => sum + val, 0) / windowSize;

  // Calcular desviación estándar para confidence
  const variance = recentSales.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / windowSize;
  const stdDev = Math.sqrt(variance);
  const cv = average > 0 ? (stdDev / average) : 1; // Coeficiente de variación
  const confidence = Math.max(0, Math.min(100, 100 * (1 - cv))); // 0-100%

  return {
    prediction: Math.round(average),
    confidence: Math.round(confidence),
  };
}

/**
 * Modelo 2: Tendencia lineal simple
 */
function forecastWithLinearTrend(salesByYear: Map<number, number>): {
  prediction: number;
  confidence: number;
} {
  const years = Array.from(salesByYear.keys()).sort();
  const sales = years.map(y => salesByYear.get(y)!);

  if (sales.length < 2) {
    // No hay suficientes datos para tendencia
    return forecastWithSeasonalAverage(salesByYear);
  }

  // Crear regresión lineal: ventas = a + b * tiempo
  const x = years.map((_, i) => i); // [0, 1, 2, ...]
  const y = sales;

  try {
    const regression = new SimpleLinearRegression(x, y);
    
    // Predecir para el siguiente año
    const nextX = years.length; // Siguiente punto en la serie
    const prediction = regression.predict(nextX);

    // Calcular R² para confidence
    const r2 = regression.score(x, y);
    const confidence = Math.max(0, Math.min(100, r2.r2 * 100));

    return {
      prediction: Math.max(0, Math.round(prediction)), // No permitir predicciones negativas
      confidence: Math.round(confidence),
    };
  } catch (error) {
    // Si falla la regresión, usar promedio
    return forecastWithSeasonalAverage(salesByYear);
  }
}

/**
 * Modelo 3: Exponential Smoothing simple (tipo Holt-Winters básico)
 */
function forecastWithExponentialSmoothing(salesByYear: Map<number, number>, alpha: number = 0.3): {
  prediction: number;
  confidence: number;
} {
  const years = Array.from(salesByYear.keys()).sort();
  const sales = years.map(y => salesByYear.get(y)!);

  if (sales.length === 0) {
    return { prediction: 0, confidence: 0 };
  }

  if (sales.length === 1) {
    return { prediction: sales[0], confidence: 50 };
  }

  // Exponential smoothing: S_t = α * Y_t + (1 - α) * S_{t-1}
  let smoothed = sales[0];
  for (let i = 1; i < sales.length; i++) {
    smoothed = alpha * sales[i] + (1 - alpha) * smoothed;
  }

  // La predicción es el último valor suavizado
  const prediction = smoothed;

  // Calcular error medio absoluto para confidence
  let totalError = 0;
  let s = sales[0];
  for (let i = 1; i < sales.length; i++) {
    const error = Math.abs(sales[i] - s);
    totalError += error;
    s = alpha * sales[i] + (1 - alpha) * s;
  }
  const mae = totalError / (sales.length - 1);
  const mape = prediction > 0 ? (mae / prediction) * 100 : 100;
  const confidence = Math.max(0, Math.min(100, 100 - mape));

  return {
    prediction: Math.round(prediction),
    confidence: Math.round(confidence),
  };
}

/**
 * Ensemble: Selecciona el mejor modelo para cada producto
 */
function selectBestModel(salesByYear: Map<number, number>): {
  prediction: number;
  confidence: number;
  method: string;
} {
  const years = Array.from(salesByYear.keys()).sort();

  // Si no hay datos suficientes, usar solo promedio
  if (years.length < 2) {
    const result = forecastWithSeasonalAverage(salesByYear);
    return { ...result, method: 'seasonal_average' };
  }

  // Calcular predicciones con todos los modelos
  const avgResult = forecastWithSeasonalAverage(salesByYear);
  const linearResult = forecastWithLinearTrend(salesByYear);
  const expResult = forecastWithExponentialSmoothing(salesByYear);

  // Seleccionar el modelo con mayor confidence
  const models = [
    { ...avgResult, method: 'seasonal_average' },
    { ...linearResult, method: 'linear_trend' },
    { ...expResult, method: 'exponential_smoothing' },
  ];

  models.sort((a, b) => b.confidence - a.confidence);
  return models[0];
}

/**
 * Función principal: Genera forecast para la siguiente temporada
 */
export function generateSeasonalForecast(
  ventas: VentasData[],
  productos: ProductosData[],
  seasonType: SeasonType
): ForecastResult | null {
  // 1. Detectar última temporada
  const latest = detectLatestSeason(ventas);
  if (!latest) {
    console.error("No se pudo detectar ninguna temporada en los datos");
    return null;
  }

  console.log(`📊 Última temporada detectada: ${latest.seasonCode} (${latest.year})`);

  // 2. Determinar temporada a predecir
  let targetYear = latest.year;
  let targetSeasonType = seasonType;

  // Si la última temporada es la misma que queremos predecir, predecir el año siguiente
  if (latest.season === seasonType) {
    targetYear = latest.year + 1;
  }

  const targetSeasonCode = `${targetYear.toString().slice(-2)}${targetSeasonType}`;
  console.log(`🎯 Prediciendo temporada: ${targetSeasonCode}`);

  // 3. Filtrar ventas históricas de la misma temporada (excluir año a predecir)
  const historicalVentas = filterBySeasonType(ventas, targetSeasonType, targetYear);
  console.log(`📚 Ventas históricas filtradas: ${historicalVentas.length} registros`);

  if (historicalVentas.length === 0) {
    console.error("No hay datos históricos suficientes para la temporada seleccionada");
    return null;
  }

  // 4. Agregar por producto
  const productData = aggregateByProduct(historicalVentas);
  console.log(`🏷️ Productos únicos: ${productData.size}`);

  // 5. Generar predicciones para cada producto
  const predictions: ProductForecast[] = [];
  let totalMAPE = 0;
  let productCount = 0;

  productData.forEach((data, codigoUnico) => {
    // Solo predecir productos con ventas históricas relevantes (reducido para mayor cobertura)
    if (data.totalSales < 2) return; // Threshold mínimo

    const forecast = selectBestModel(data.salesByYear);
    const historicalAvg = data.totalSales / data.salesByYear.size;

    predictions.push({
      codigoUnico: data.codigoUnico,
      familia: data.familia,
      predictedDemand: forecast.prediction,
      confidence: forecast.confidence,
      method: forecast.method,
      historicalAverage: Math.round(historicalAvg),
    });

    // Calcular MAPE aproximado
    if (historicalAvg > 0) {
      const error = Math.abs(forecast.prediction - historicalAvg) / historicalAvg * 100;
      totalMAPE += error;
      productCount++;
    }
  });

  // 6. Calcular métricas de precisión
  const mape = productCount > 0 ? totalMAPE / productCount : 0;
  const coverage = (predictions.length / productData.size) * 100;

  console.log(`✅ Predicciones generadas: ${predictions.length}`);
  console.log(`📊 MAPE promedio: ${mape.toFixed(2)}%`);
  console.log(`📈 Cobertura: ${coverage.toFixed(2)}%`);

  return {
    targetSeason: targetSeasonCode,
    targetYear,
    seasonType: targetSeasonType,
    predictions: predictions.sort((a, b) => b.predictedDemand - a.predictedDemand),
    accuracy: {
      mape: Math.round(mape * 10) / 10,
      coverage: Math.round(coverage * 10) / 10,
    },
    dataPoints: historicalVentas.length,
  };
}
