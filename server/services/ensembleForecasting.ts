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
  r2?: number;
  trend?: 'growing' | 'stable' | 'declining';
}

/**
 * Validación temporal limitada: valida solo los últimos años en lugar de todos
 * Esto reduce el costo computacional mientras mantiene estabilidad estadística
 * Basado en feedback arquitectónico: balance entre velocidad y precisión
 * Ahora soporta series con solo 2 años de datos usando hold-out simple
 */
function limitedTemporalValidation(
  salesByYear: Map<number, number>,
  forecastFn: (data: Map<number, number>) => { prediction: number }
): { mape: number; mae: number; rmse: number } {
  const years = Array.from(salesByYear.keys()).sort();
  
  if (years.length < 2) {
    return { mape: 100, mae: 0, rmse: 0 };
  }
  
  // Para series de exactamente 2 años, usar validación simple hold-out
  if (years.length === 2) {
    const trainData = new Map([[years[0], salesByYear.get(years[0])!]]);
    const { prediction } = forecastFn(trainData);
    const actual = salesByYear.get(years[1])!;
    
    let ape = 100;
    if (actual > 0) {
      ape = Math.abs((actual - prediction) / actual) * 100;
      ape = Math.min(ape, 200);
    }
    
    const ae = Math.abs(actual - prediction);
    const se = (actual - prediction) ** 2;
    
    return {
      mape: ape,
      mae: ae,
      rmse: Math.sqrt(se)
    };
  }
  
  // Validar solo los últimos 2-5 folds (en lugar de todos)
  // Esto reduce costo de O(n) a O(1) pero mantiene estabilidad
  const maxFolds = Math.min(5, years.length - 1);
  const startIndex = Math.max(1, years.length - maxFolds);
  
  let totalAPE = 0;
  let totalAE = 0;
  let totalSE = 0;
  let count = 0;
  
  for (let i = startIndex; i < years.length; i++) {
    const trainYears = years.slice(0, i);
    const testYear = years[i];
    
    const trainData = new Map<number, number>();
    trainYears.forEach(y => trainData.set(y, salesByYear.get(y)!));
    
    const { prediction } = forecastFn(trainData);
    const actual = salesByYear.get(testYear)!;
    
    if (actual > 0) {
      const ape = Math.abs((actual - prediction) / actual) * 100;
      totalAPE += Math.min(ape, 200);
      count++;
    }
    
    totalAE += Math.abs(actual - prediction);
    totalSE += (actual - prediction) ** 2;
  }
  
  return {
    mape: count > 0 ? totalAPE / count : 100,
    mae: count > 0 ? totalAE / count : totalAE,
    rmse: count > 0 ? Math.sqrt(totalSE / count) : 0,
  };
}

/**
 * Evalúa todos los modelos con validación temporal y retorna predicciones ponderadas
 * OPTIMIZADO: Usa validación rápida en lugar de cross-validation completa
 */
function evaluateAllModels(
  salesByYear: Map<number, number>
): ModelPrediction[] {
  const years = Array.from(salesByYear.keys()).sort();
  
  // Modelo 1: Weighted Moving Average
  const wmaResult = forecastWeightedMovingAverage(salesByYear);
  const wmaValidation = limitedTemporalValidation(salesByYear, (data) => 
    forecastWeightedMovingAverage(data)
  );
  
  // Modelo 2: Linear Regression
  const lrResult = forecastLinearRegressionValidated(salesByYear);
  const lrValidation = limitedTemporalValidation(salesByYear, (data) => 
    forecastLinearRegressionValidated(data)
  );
  
  // Modelo 3: Holt-Winters (solo si hay 3+ años de datos)
  const hwResult = years.length >= 3 ? forecastHoltWinters(salesByYear) : null;
  const hwValidation = hwResult ? limitedTemporalValidation(salesByYear, (data) => 
    forecastHoltWinters(data)
  ) : null;
  
  // Modelo 4: Prophet-like (solo si hay 3+ años de datos)
  const prophetResult = years.length >= 3 ? forecastProphetLike(salesByYear) : null;
  const prophetValidation = prophetResult ? limitedTemporalValidation(salesByYear, (data) => 
    forecastProphetLike(data)
  ) : null;
  
  // Construir array de modelos solo con los que tienen datos
  const models: ModelPrediction[] = [
    {
      prediction: wmaResult.prediction,
      confidence: wmaResult.confidence,
      method: 'weighted_moving_average',
      validation: wmaValidation,
      weight: 0,
      trend: wmaResult.trend,
    },
    {
      prediction: lrResult.prediction,
      confidence: lrResult.confidence,
      method: 'linear_regression',
      validation: lrValidation,
      weight: 0,
      r2: lrResult.r2,
    },
  ];
  
  // Solo agregar modelos complejos si hay suficientes datos
  if (hwResult && hwValidation) {
    models.push({
      prediction: hwResult.prediction,
      confidence: hwResult.confidence,
      method: 'holt_winters',
      validation: hwValidation,
      weight: 0,
    });
  }
  
  if (prophetResult && prophetValidation) {
    models.push({
      prediction: prophetResult.prediction,
      confidence: prophetResult.confidence,
      method: 'prophet_decomposition',
      validation: prophetValidation,
      weight: 0,
    });
  }
  
  // Calcular pesos basados en precisión histórica (1/(MAPE + epsilon))
  // Epsilon pequeño previene división por cero para modelos perfectos (MAPE = 0)
  const EPSILON = 0.01; // 0.01% de error mínimo
  const totalInverseMAPE = models.reduce((sum, m) => {
    const adjustedMAPE = Math.max(m.validation.mape, EPSILON);
    const inverseMAPE = 1 / adjustedMAPE;
    return sum + inverseMAPE;
  }, 0);
  
  // Asignar pesos normalizados
  models.forEach(m => {
    if (totalInverseMAPE > 0) {
      const adjustedMAPE = Math.max(m.validation.mape, EPSILON);
      const inverseMAPE = 1 / adjustedMAPE;
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
  
  // Si hay muy pocos datos, usar promedio simple con MAPE estimado conservador
  if (years.length < 2) {
    const avg = years.length > 0 ? salesByYear.get(years[0])! : 0;
    return {
      prediction: Math.round(avg),
      confidence: 30,
      method: 'simple_average',
      validation: { mape: 70, mae: 0, rmse: 0 }, // MAPE conservador pero realista
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
  
  // Extraer R² del modelo de regresión lineal si está disponible
  const lrModel = modelPredictions.find(m => m.method === 'linear_regression');
  const trendScore = lrModel?.r2;
  
  // Extraer tendencia del modelo WMA si está disponible
  const wmaModel = modelPredictions.find(m => m.method === 'weighted_moving_average');
  const trend = wmaModel?.trend;
  
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
  
  // Calcular nivel de confianza basado en años de datos y precisión del ensemble
  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);
  if (years.length >= 3 && weightedMAPE < 30) {
    // Alta confianza: 3+ años y MAPE bajo
    weightedConfidence = clamp(weightedConfidence, 75, 100);
  } else if (years.length >= 2 && weightedMAPE < 50) {
    // Confianza media: 2+ años y MAPE razonable
    weightedConfidence = clamp(weightedConfidence, 50, 74);
  } else {
    // Baja confianza: pocos datos o MAPE alto
    weightedConfidence = clamp(weightedConfidence, 30, 49);
  }
  
  // Estrategia de selección final:
  // Si hay suficientes datos (2+ años) y el ensemble tiene buena precisión, usar ensemble
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
      trendScore,
      seasonality: trend,
    },
    bestModel: bestModel.method,
  };
}

/**
 * Función principal mejorada: Genera forecast con ensemble inteligente
 */
export async function generateAdvancedForecast(
  ventas: VentasData[],
  productos: ProductosData[],
  seasonType: SeasonType,
  progressCallback?: (progress: number, processed: number, total: number, estimatedTimeRemaining: number) => Promise<void>
): Promise<ForecastResult | null> {
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
  
  // 5. Calcular promedios jerárquicos para fallback (familia y tema)
  const familyAverages = new Map<string, { total: number; count: number }>();
  const temaAverages = new Map<string, { total: number; count: number }>();
  
  productData.forEach((data, _) => {
    if (data.totalSales < 1) return; // Solo considerar productos con ventas
    const avg = data.totalSales / data.salesByYear.size;
    
    // Agregar a promedio de familia
    if (data.familia) {
      const current = familyAverages.get(data.familia) || { total: 0, count: 0 };
      familyAverages.set(data.familia, {
        total: current.total + avg,
        count: current.count + 1
      });
    }
    
    // Agregar a promedio de tema (buscar en productos)
    const producto = productos.find(p => p.codigoUnico === data.codigoUnico);
    const tema = producto?.tema;
    if (tema) {
      const current = temaAverages.get(tema) || { total: 0, count: 0 };
      temaAverages.set(tema, {
        total: current.total + avg,
        count: current.count + 1
      });
    }
  });
  
  // Convertir a promedios finales
  const familyAvgMap = new Map<string, number>();
  familyAverages.forEach((val, key) => {
    familyAvgMap.set(key, val.total / val.count);
  });
  
  const temaAvgMap = new Map<string, number>();
  temaAverages.forEach((val, key) => {
    temaAvgMap.set(key, val.total / val.count);
  });
  
  console.log(`🔍 Promedios calculados: ${familyAvgMap.size} familias, ${temaAvgMap.size} temas`);
  
  // 6. Generar predicciones con ensemble
  const predictions: ProductForecast[] = [];
  const modelsUsed: { [key: string]: number } = {};
  let totalMAPE = 0;
  let totalMAE = 0;
  let totalRMSE = 0;
  let metricsCount = 0;
  
  console.log('\n📈 Generando predicciones con ensemble inteligente...');
  
  // Progress tracking
  const totalProducts = productData.size;
  let processedProducts = 0;
  const startTime = Date.now();
  
  for (const [codigoUnico, data] of Array.from(productData.entries())) {
    // Fallback jerárquico para productos con ventas muy bajas (1-2 unidades)
    if (data.totalSales >= 1 && data.totalSales < 2) {
      const producto = productos.find(p => p.codigoUnico === data.codigoUnico);
      const tema = producto?.tema;
      
      // Preferir familia si está disponible, luego tema
      let fallbackAvg: number | null = null;
      let fallbackMethod = 'family_average_fallback';
      
      if (data.familia && familyAvgMap.has(data.familia)) {
        fallbackAvg = familyAvgMap.get(data.familia)!;
        fallbackMethod = 'family_average_fallback';
      } else if (tema && temaAvgMap.has(tema)) {
        fallbackAvg = temaAvgMap.get(tema)!;
        fallbackMethod = 'tema_average_fallback';
      }
      
      if (fallbackAvg !== null) {
        // Calcular MAPE estimado para fallback: comparar promedio de familia con histórico del producto
        const historicalAvg = data.totalSales / data.salesByYear.size;
        const estimatedMAPE = historicalAvg > 0 
          ? Math.min(Math.abs(fallbackAvg - historicalAvg) / historicalAvg * 100, 80)
          : 60; // MAPE conservador para productos sin historial
        
        predictions.push({
          codigoUnico: data.codigoUnico,
          familia: data.familia,
          predictedDemand: Math.round(fallbackAvg),
          confidence: 40, // Confianza baja por ser fallback
          method: fallbackMethod,
          historicalAverage: Math.round(historicalAvg),
          features: {},
          validation: { mape: estimatedMAPE, mae: 0, rmse: 0 },
        });
        
        modelsUsed[fallbackMethod] = (modelsUsed[fallbackMethod] || 0) + 1;
        processedProducts++;
        
        if (processedProducts % 10 === 0 || processedProducts === totalProducts) {
          const progress = (processedProducts / totalProducts) * 100;
          const elapsed = (Date.now() - startTime) / 1000;
          const avgTimePerProduct = elapsed / processedProducts;
          const remainingProducts = totalProducts - processedProducts;
          const estimatedTimeRemaining = Math.ceil(remainingProducts * avgTimePerProduct);
          
          if (progressCallback) {
            await progressCallback(progress, processedProducts, totalProducts, estimatedTimeRemaining);
          }
        }
        
        continue;
      }
    }
    
    // Filtro: solo productos con ventas >= 2 unidades
    if (data.totalSales < 2) {
      processedProducts++;
      continue;
    }
    
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
    
    // Update progress every 10 products
    processedProducts++;
    if (processedProducts % 10 === 0 || processedProducts === totalProducts) {
      const progress = (processedProducts / totalProducts) * 100;
      const elapsed = (Date.now() - startTime) / 1000; // seconds
      const avgTimePerProduct = elapsed / processedProducts;
      const remainingProducts = totalProducts - processedProducts;
      const estimatedTimeRemaining = Math.ceil(remainingProducts * avgTimePerProduct);
      
      if (progressCallback) {
        await progressCallback(progress, processedProducts, totalProducts, estimatedTimeRemaining);
      }
      
      console.log(`⏳ Progreso: ${processedProducts}/${totalProducts} productos (${progress.toFixed(1)}%) - ${estimatedTimeRemaining}s restantes`);
    }
  }
  
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
