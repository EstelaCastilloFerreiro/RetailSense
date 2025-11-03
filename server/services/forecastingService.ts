import type { ForecastRequest, ForecastJob, VentasData } from "@shared/schema";
import { storage } from "../storage";

/**
 * Forecasting Service
 * 
 * This service handles ML-based demand forecasting and price optimization.
 * Currently returns mock predictions. In production, this would:
 * 1. Prepare training dataset from historical sales data
 * 2. Engineer features (seasonality, trends, product categories)
 * 3. Call ML model service (CatBoost/XGBoost/Prophet)
 * 4. Return predictions and optimal pricing recommendations
 */

export async function createForecastJob(
  request: ForecastRequest,
  clientId: string
): Promise<ForecastJob> {
  const job = await storage.saveForecastJob({
    fileId: request.fileId,
    clientId,
    model: request.model,
    status: "pending",
  });

  // Start async processing (in production, this would be a background job)
  processForecast(job.id, request).catch(console.error);

  return job;
}

async function processForecast(
  jobId: string,
  request: ForecastRequest
): Promise<void> {
  try {
    // Update status to running
    await storage.updateForecastJob(jobId, { status: "running" });

    // Get historical sales data
    const ventasData = await storage.getVentasData(request.fileId);

    // Apply filters if provided
    let filteredData = ventasData;
    if (request.filters) {
      filteredData = applyFilters(ventasData, request.filters);
    }

    // Generate mock predictions (replace with actual ML model in production)
    const predictions = await generateMockPredictions(
      filteredData,
      request.model,
      request.horizon
    );

    // Calculate summary statistics
    const summary = {
      totalPredictions: predictions.length,
      avgDemand: predictions.reduce((sum, p) => sum + p.demandaPredicha, 0) / predictions.length,
      avgPrice: predictions
        .filter(p => p.precioOptimo !== undefined)
        .reduce((sum, p) => sum + (p.precioOptimo || 0), 0) / predictions.length,
      modelAccuracy: 0.85 + Math.random() * 0.10, // Mock accuracy 85-95%
    };

    // Update job with results
    await storage.updateForecastJob(jobId, {
      status: "completed",
      completedAt: new Date().toISOString(),
      results: {
        predictions,
        summary,
      },
    });
  } catch (error) {
    await storage.updateForecastJob(jobId, {
      status: "failed",
      completedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

function applyFilters(
  data: VentasData[],
  filters: NonNullable<ForecastRequest["filters"]>
): VentasData[] {
  return data.filter((venta) => {
    if (filters.temporadas && filters.temporadas.length > 0) {
      if (!venta.temporada || !filters.temporadas.includes(venta.temporada)) {
        return false;
      }
    }
    if (filters.familias && filters.familias.length > 0) {
      if (!venta.familia || !filters.familias.includes(venta.familia)) {
        return false;
      }
    }
    if (filters.tiendas && filters.tiendas.length > 0) {
      if (!filters.tiendas.includes(venta.tienda)) {
        return false;
      }
    }
    return true;
  });
}

async function generateMockPredictions(
  ventasData: VentasData[],
  model: string,
  horizon: number
) {
  // Group by product to generate predictions
  const productMap = new Map<string, VentasData[]>();
  
  for (const venta of ventasData) {
    const codigo = venta.codigoUnico || venta.act || "UNKNOWN";
    if (!productMap.has(codigo)) {
      productMap.set(codigo, []);
    }
    productMap.get(codigo)!.push(venta);
  }

  const predictions = [];
  const today = new Date();

  // Generate predictions for each product
  for (const [codigo, ventas] of Array.from(productMap.entries())) {
    if (predictions.length >= 50) break; // Limit to top 50 products

    const avgCantidad = ventas.reduce((sum: number, v: VentasData) => sum + v.cantidad, 0) / ventas.length;
    const avgPvp = ventas.reduce((sum: number, v: VentasData) => sum + (v.pvp || 0), 0) / ventas.length;
    
    // Sample data for prediction
    const sampleVenta = ventas[0];

    for (let month = 1; month <= horizon; month++) {
      const startDate = new Date(today);
      startDate.setMonth(today.getMonth() + month);
      
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      // Add seasonal variation and trend (mock ML prediction)
      const seasonalFactor = 1 + (Math.sin(month * Math.PI / 6) * 0.2);
      const trendFactor = 1 + (month * 0.05); // 5% growth per month
      const randomFactor = 0.9 + Math.random() * 0.2;
      
      const predictedDemand = Math.round(avgCantidad * seasonalFactor * trendFactor * randomFactor);
      const optimalPrice = avgPvp * (1 + (Math.random() * 0.1 - 0.05)); // ±5% price adjustment
      const margin = (optimalPrice - (sampleVenta.precioCoste || avgPvp * 0.6)) / optimalPrice;

      predictions.push({
        producto: codigo,
        tienda: sampleVenta.tienda,
        familia: sampleVenta.familia,
        temporada: sampleVenta.temporada,
        periodoInicio: startDate.toISOString().split('T')[0],
        periodoFin: endDate.toISOString().split('T')[0],
        demandaPredicha: predictedDemand,
        precioOptimo: Math.round(optimalPrice * 100) / 100,
        margenEstimado: Math.round(margin * 100) / 100,
        confianza: 0.75 + Math.random() * 0.20, // 75-95% confidence
      });
    }
  }

  return predictions;
}

export async function getForecastJob(jobId: string): Promise<ForecastJob | undefined> {
  return storage.getForecastJob(jobId);
}

export async function getLatestForecastJob(fileId: string): Promise<ForecastJob | undefined> {
  const jobs = await storage.getForecastJobsByFileId(fileId);
  if (jobs.length === 0) return undefined;
  
  // Return most recent job
  return jobs.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
}
