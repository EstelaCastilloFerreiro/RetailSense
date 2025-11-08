import type { VentasData, ProductosData } from "../../shared/schema";
import {
  SeasonType,
  ProductForecast,
  ForecastResult,
  forecastWeightedMovingAverage,
  forecastLinearRegressionValidated,
  forecastHoltWinters,
  forecastProphetLike,
  temporalCrossValidation,
  calculateAccuracyMetrics,
  extractProductFeatures,
  calculatePriceElasticity,
  detectLatestSeason,
  filterBySeasonType,
  aggregateByProduct,
} from "./advancedForecasting";

// =====================================================================
// ENSEMBLE INTELIGENTE CON PONDERACIÓN ADAPTATIVA
// =====================================================================

interface ModelPrediction {
  prediction: number;
  confidence: number;
  method: string;
  validation: {
    mape: number;
    mae: number;
    rmse: number;
  };
  weight: number;
}

/**
 * Evalúa todos los modelos con validación temporal y retorna predicciones ponderadas
 */
function evaluateAllModels(
  salesByYear: Map<number, number>
): ModelPrediction[] {
  const years = Array.from(salesByYear.keys()).sort();
  
  // Modelo 1: Weighted Moving Average
  const wmaResult = forecastWeightedMovingAverage(salesByYear);
  const wmaValidation = temporalCrossValidation(salesByYear, (data) => 
    forecastWeightedMovingAverage(data)
  );
  
  // Modelo 2: Linear Regression
  const lrResult = forecastLinearRegressionValidated(salesByYear);
  const lrValidation = temporalCrossValidation(salesByYear, (data) => 
    forecastLinearRegressionValidated(data)
  );
  
  // Modelo 3: Holt-Winters
  const hwResult = forecastHoltWinters(salesByYear);
  const hwValidation = temporalCrossValidation(salesByYear, (data) => 
    forecastHoltWinters(data)
  );
  
  // Modelo 4: Prophet-like
  const prophetResult = forecastProphetLike(salesByYear);
  const prophetValidation = temporalCrossValidation(salesByYear, (data) => 
    forecastProphetLike(data)
  );
  
  const models: ModelPrediction[] = [
    {
      prediction: wmaResult.prediction,
      confidence: wmaResult.confidence,
      method: 'weighted_moving_average',
      validation: wmaValidation,
      weight: 0,
    },
    {
      prediction: lrResult.prediction,
      confidence: lrResult.confidence,
      method: 'linear_regression',
      validation: lrValidation,
      weight: 0,
    },
    {
      prediction: hwResult.prediction,
      confidence: hwResult.confidence,
      method: 'holt_winters',
      validation: hwValidation,
      weight: 0,
    },
    {
      prediction: prophetResult.prediction,
      confidence: prophetResult.confidence,
      method: 'prophet_decomposition',
      validation: prophetValidation,
      weight: 0,
    },
  ];
  
  // Calcular pesos basados en precisión histórica (1/MAPE)
  const totalInverseMAPE = models.reduce((sum, m) => {
    const inverseMAPE = m.validation.mape > 0 ? 1 / m.validation.mape : 0;
    return sum + inverseMAPE;
  }, 0);
  
  // Asignar pesos normalizados
  models.forEach(m => {
    if (totalInverseMAPE > 0) {
      const inverseMAPE = m.validation.mape > 0 ? 1 / m.validation.mape : 0;
      m.weight = inverseMAPE / totalInverseMAPE;
    } else {
      // Fallback: pesos iguales
      m.weight = 1 / models.length;
    }
  });
  
  return models;
}

/**
 * Ensemble ponderado: combina predicciones de múltiples modelos
 */
function ensembleForecast(
  salesByYear: Map<number, number>,
  ventas: VentasData[],
  productos: ProductosData[],
  codigoUnico: string
): {
  prediction: number;
  confidence: number;
  method: string;
  validation: { mape: number; mae: number; rmse: number };
  features: any;
  bestModel: string;
} {
  const years = Array.from(salesByYear.keys()).sort();
  
  // Si hay muy pocos datos, usar promedio simple
  if (years.length < 2) {
    const avg = years.length > 0 ? salesByYear.get(years[0])! : 0;
    return {
      prediction: Math.round(avg),
      confidence: 30,
      method: 'simple_average',
      validation: { mape: 100, mae: 0, rmse: 0 },
      features: {},
      bestModel: 'simple_average',
    };
  }
  
  // Evaluar todos los modelos
  const modelPredictions = evaluateAllModels(salesByYear);
  
  // Ensemble ponderado
  let weightedPrediction = 0;
  let weightedConfidence = 0;
  let weightedMAPE = 0;
  let weightedMAE = 0;
  let weightedRMSE = 0;
  
  modelPredictions.forEach(m => {
    weightedPrediction += m.prediction * m.weight;
    weightedConfidence += m.confidence * m.weight;
    weightedMAPE += m.validation.mape * m.weight;
    weightedMAE += m.validation.mae * m.weight;
    weightedRMSE += m.validation.rmse * m.weight;
  });
  
  // Seleccionar mejor modelo individual (menor MAPE)
  const bestModel = modelPredictions.reduce((best, current) => 
    current.validation.mape < best.validation.mape ? current : best
  );
  
  // Extraer features del producto
  const features = extractProductFeatures(ventas, productos, codigoUnico);
  
  // Calcular elasticidad precio si hay datos de precio
  const salesWithPrice = new Map<number, { quantity: number; avgPrice: number }>();
  years.forEach(year => {
    const yearVentas = ventas.filter(v => {
      const match = v.temporada?.match(/^(\d{2})(PV|OI)$/);
      if (!match) return false;
      const y = parseInt(`20${match[1]}`);
      return y === year && v.codigoUnico === codigoUnico;
    });
    
    const totalQty = yearVentas.reduce((sum, v) => sum + (v.cantidad || 0), 0);
    const totalRev = yearVentas.reduce((sum, v) => sum + (v.pvp || 0) * (v.cantidad || 0), 0);
    const avgPrice = totalQty > 0 ? totalRev / totalQty : 0;
    
    if (totalQty > 0) {
      salesWithPrice.set(year, { quantity: totalQty, avgPrice });
    }
  });
  
  const priceElasticity = calculatePriceElasticity(salesWithPrice);
  
  // Estrategia de selección final:
  // Si hay suficientes datos (3+ años) y el ensemble tiene buena precisión, usar ensemble
  // Si no, usar el mejor modelo individual
  const useEnsemble = years.length >= 3 && weightedMAPE < 50;
  
  return {
    prediction: Math.max(0, Math.round(useEnsemble ? weightedPrediction : bestModel.prediction)),
    confidence: Math.round(useEnsemble ? weightedConfidence : bestModel.confidence),
    method: useEnsemble ? 'ensemble_weighted' : bestModel.method,
    validation: {
      mape: Math.round((useEnsemble ? weightedMAPE : bestModel.validation.mape) * 10) / 10,
      mae: Math.round((useEnsemble ? weightedMAE : bestModel.validation.mae) * 10) / 10,
      rmse: Math.round((useEnsemble ? weightedRMSE : bestModel.validation.rmse) * 10) / 10,
    },
    features: {
      avgPrice: features.avgPrice,
      priceElasticity,
      trendScore: bestModel.method === 'linear_regression' ? (bestModel as any).r2 : undefined,
    },
    bestModel: bestModel.method,
  };
}

/**
 * Función principal mejorada: Genera forecast con ensemble inteligente
 */
export function generateAdvancedForecast(
  ventas: VentasData[],
  productos: ProductosData[],
  seasonType: SeasonType
): ForecastResult | null {
  console.log('\n🚀 Iniciando Advanced Forecasting con Ensemble Inteligente...');
  
  // 1. Detectar última temporada
  const latest = detectLatestSeason(ventas);
  if (!latest) {
    console.error("❌ No se pudo detectar ninguna temporada en los datos");
    return null;
  }
  
  console.log(`📊 Última temporada detectada: ${latest.seasonCode} (${latest.year})`);
  
  // 2. Determinar temporada a predecir
  let targetYear = latest.year;
  let targetSeasonType = seasonType;
  
  if (latest.season === seasonType) {
    targetYear = latest.year + 1;
  }
  
  const targetSeasonCode = `${targetYear.toString().slice(-2)}${targetSeasonType}`;
  console.log(`🎯 Prediciendo temporada: ${targetSeasonCode}`);
  
  // 3. Filtrar ventas históricas
  const historicalVentas = filterBySeasonType(ventas, targetSeasonType, targetYear);
  console.log(`📚 Ventas históricas filtradas: ${historicalVentas.length} registros`);
  
  if (historicalVentas.length === 0) {
    console.error("❌ No hay datos históricos suficientes");
    return null;
  }
  
  // 4. Agregar por producto
  const productData = aggregateByProduct(historicalVentas);
  console.log(`🏷️ Productos únicos: ${productData.size}`);
  
  // 5. Generar predicciones con ensemble
  const predictions: ProductForecast[] = [];
  const modelsUsed: { [key: string]: number } = {};
  let totalMAPE = 0;
  let totalMAE = 0;
  let totalRMSE = 0;
  let metricsCount = 0;
  
  console.log('\n📈 Generando predicciones con ensemble inteligente...');
  
  productData.forEach((data, codigoUnico) => {
    // Filtro: solo productos con ventas significativas
    if (data.totalSales < 5) return;
    
    const forecast = ensembleForecast(
      data.salesByYear,
      historicalVentas,
      productos,
      data.codigoUnico
    );
    
    const historicalAvg = data.totalSales / data.salesByYear.size;
    
    predictions.push({
      codigoUnico: data.codigoUnico,
      familia: data.familia,
      predictedDemand: forecast.prediction,
      confidence: forecast.confidence,
      method: forecast.method,
      historicalAverage: Math.round(historicalAvg),
      features: forecast.features,
      validation: forecast.validation,
    });
    
    // Contabilizar modelos usados
    modelsUsed[forecast.method] = (modelsUsed[forecast.method] || 0) + 1;
    
    // Acumular métricas
    totalMAPE += forecast.validation.mape;
    totalMAE += forecast.validation.mae;
    totalRMSE += forecast.validation.rmse;
    metricsCount++;
  });
  
  // 6. Calcular métricas globales
  const avgMAPE = metricsCount > 0 ? totalMAPE / metricsCount : 0;
  const avgMAE = metricsCount > 0 ? totalMAE / metricsCount : 0;
  const avgRMSE = metricsCount > 0 ? totalRMSE / metricsCount : 0;
  const coverage = (predictions.length / productData.size) * 100;
  
  console.log('\n✅ Forecasting completado!');
  console.log(`📊 Predicciones generadas: ${predictions.length}`);
  console.log(`📉 MAPE promedio: ${avgMAPE.toFixed(2)}%`);
  console.log(`📉 MAE promedio: ${avgMAE.toFixed(2)}`);
  console.log(`📉 RMSE promedio: ${avgRMSE.toFixed(2)}`);
  console.log(`📈 Cobertura: ${coverage.toFixed(2)}%`);
  console.log('\n🔧 Modelos utilizados:');
  Object.entries(modelsUsed).forEach(([method, count]) => {
    console.log(`   - ${method}: ${count} productos (${((count / predictions.length) * 100).toFixed(1)}%)`);
  });
  
  return {
    targetSeason: targetSeasonCode,
    targetYear,
    seasonType: targetSeasonType,
    predictions: predictions.sort((a, b) => b.predictedDemand - a.predictedDemand),
    accuracy: {
      mape: Math.round(avgMAPE * 10) / 10,
      mae: Math.round(avgMAE * 10) / 10,
      rmse: Math.round(avgRMSE * 10) / 10,
      coverage: Math.round(coverage * 10) / 10,
    },
    dataPoints: historicalVentas.length,
    modelsUsed,
  };
}
