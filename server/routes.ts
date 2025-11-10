import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { processExcelFile, detectColumnStructure } from "./services/excelProcessor";
import { calculateDashboardData } from "./services/kpiCalculator";
import { 
  calculateExtendedDashboardData,
  calculateGeographicMetrics,
  calculateProductProfitabilityMetrics,
  calculatePhotoAnalysisData,
  calculateTopStores,
  calculateUnitsBySize,
  calculateSalesVsTransfers,
  calculateWarehouseEntries
} from "./services/kpiCalculatorExtended";
import { processChatbotRequest } from "./services/chatbotService";
import { createForecastJob, getForecastJob, getLatestForecastJob } from "./services/forecastingService";
import { detectLatestSeason } from "./services/seasonalForecasting";
import { forecastRequestSchema } from "@shared/schema";
import { executeTrainJob, executePredictJob, TrainJobPayloadSchema, PredictJobPayloadSchema } from "./services/mlJobWorker";
import { sentimentAnalysisService } from "./services/sentimentAnalysis";
import { GoogleReviewsConnector, InstagramConnector } from "./services/dataConnectors";
import type { InsertSentiment } from "@shared/schema";
import fs from "fs";
import path from "path";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'application/vnd.ms-excel', // xls
      'text/csv',
    ];
    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel and CSV files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Upload Excel file endpoint
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const clientId = req.body.clientId || "demo-client"; // In production, get from auth
      const buffer = req.file.buffer;

      console.log('Processing file:', req.file.originalname);

      // Save file to disk for ML processing (create unique filename)
      const timestamp = Date.now();
      const safeFileName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const diskFileName = `${clientId}_${timestamp}_${safeFileName}`;
      const uploadPath = path.join(process.cwd(), 'uploads', diskFileName);
      
      fs.writeFileSync(uploadPath, buffer);
      console.log('File saved to disk:', uploadPath);

      // Detect column structure
      const { detectedColumns, suggestedMappings } = detectColumnStructure(buffer);
      console.log('Detected columns:', Object.keys(detectedColumns));

      // Process Excel file
      const { ventas, productos, traspasos, sheets } = processExcelFile(buffer);
      console.log('Processed data:', {
        ventas: ventas.length,
        productos: productos.length,
        traspasos: traspasos.length,
      });

      // Warn if no data was extracted
      if (ventas.length === 0 && productos.length === 0 && traspasos.length === 0) {
        console.warn('WARNING: No data was extracted from the Excel file. This might be due to:');
        console.warn('1. Column names not matching expected format');
        console.warn('2. Sheet names not matching expected patterns (ventas, compra, traspasos)');
        console.warn('3. All rows being filtered out');
      }

      // Save uploaded file metadata (including disk file name for ML)
      const uploadedFile = await storage.saveUploadedFile({
        clientId,
        fileName: diskFileName, // Store disk filename for ML access
        uploadDate: new Date().toISOString(),
        sheets,
      });

      // Save processed data
      await Promise.all([
        storage.saveVentasData(uploadedFile.id, ventas),
        storage.saveProductosData(uploadedFile.id, productos),
        storage.saveTraspasosData(uploadedFile.id, traspasos),
      ]);

      // Save/update client config
      await storage.saveClientConfig({
        clientId,
        columnMappings: suggestedMappings,
        lastUpdated: new Date().toISOString(),
      });

      console.log('Upload successful, fileId:', uploadedFile.id);

      res.json({
        success: true,
        fileId: uploadedFile.id,
        fileName: uploadedFile.fileName,
        sheets,
        detectedColumns,
        recordCounts: {
          ventas: ventas.length,
          productos: productos.length,
          traspasos: traspasos.length,
        },
      });
    } catch (error: any) {
      console.error("Upload error details:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ 
        error: error.message || "Error processing file",
        details: error.toString()
      });
    }
  });

  // Get dashboard data with filters
  app.get("/api/dashboard/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      const {
        temporada,
        familia,
        tiendas,
        fechaInicio,
        fechaFin,
      } = req.query;

      // Get data from storage
      const [ventas, productos, traspasos] = await Promise.all([
        storage.getVentasData(fileId),
        storage.getProductosData(fileId),
        storage.getTraspasosData(fileId),
      ]);

      // Check if file exists
      const uploadedFile = await storage.getUploadedFile(fileId);
      if (!uploadedFile) {
        return res.status(404).json({ error: "File not found" });
      }
      
      if (ventas.length === 0) {
        return res.status(404).json({ 
          error: "No data available", 
          message: "The file was uploaded but no sales data could be extracted. This might be due to column name mismatches or all rows being filtered out.",
          fileId,
          fileName: uploadedFile.fileName
        });
      }

      // Build filters
      const filters: any = {};
      if (temporada) filters.temporada = temporada as string;
      if (familia) filters.familia = familia as string;
      if (tiendas) {
        filters.tiendas = typeof tiendas === 'string' 
          ? tiendas.split(',').map(t => t.trim())
          : tiendas;
      }
      if (fechaInicio) filters.fechaInicio = fechaInicio as string;
      if (fechaFin) filters.fechaFin = fechaFin as string;

      // Calculate dashboard data
      const dashboardData = calculateDashboardData(ventas, productos, traspasos, filters);

      res.json(dashboardData);
    } catch (error: any) {
      console.error("Dashboard data error:", error);
      res.status(500).json({ error: error.message || "Error calculating dashboard data" });
    }
  });

  // Get available filters
  app.get("/api/filters/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      const ventas = await storage.getVentasData(fileId);

      // Check if file exists
      const uploadedFile = await storage.getUploadedFile(fileId);
      if (!uploadedFile) {
        return res.status(404).json({ error: "File not found" });
      }
      
      if (ventas.length === 0) {
        return res.status(404).json({ 
          error: "No data available", 
          message: "The file was uploaded but no sales data could be extracted. This might be due to column name mismatches or all rows being filtered out.",
          fileId,
          fileName: uploadedFile.fileName
        });
      }

      const temporadas = Array.from(new Set(ventas.map(v => v.temporada).filter(Boolean))).sort();
      const familias = Array.from(new Set(ventas.map(v => v.descripcionFamilia).filter(Boolean))).sort();
      const tiendas = Array.from(new Set(ventas.map(v => v.tienda).filter(Boolean))).sort();
      
      // Match Streamlit logic: check if 'ONLINE' is in store name
      const tiendasOnline = tiendas.filter(t => t.toUpperCase().includes('ONLINE'));
      const tiendasNaelle = tiendas.filter(t => t.toUpperCase().includes('NAELLE'));
      const tiendasItalia = tiendas.filter(t => t.toUpperCase().includes('COIN'));

      res.json({
        temporadas,
        familias,
        tiendas,
        tiendasOnline,
        tiendasNaelle,
        tiendasItalia,
      });
    } catch (error: any) {
      console.error("Filters error:", error);
      res.status(500).json({ error: error.message || "Error getting filters" });
    }
  });

  // Get uploaded files for client
  app.get("/api/uploads", async (req, res) => {
    try {
      const clientId = req.query.clientId as string || "demo-client";
      const files = await storage.getUploadedFiles(clientId);
      res.json(files);
    } catch (error: any) {
      console.error("Get uploads error:", error);
      res.status(500).json({ error: error.message || "Error getting uploads" });
    }
  });

  // Get client configuration
  app.get("/api/config/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      const config = await storage.getClientConfig(clientId);
      
      if (!config) {
        return res.status(404).json({ error: "Client configuration not found" });
      }

      res.json(config);
    } catch (error: any) {
      console.error("Get config error:", error);
      res.status(500).json({ error: error.message || "Error getting configuration" });
    }
  });

  // Geographic data endpoint with filters
  app.get("/api/geographic/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      const { temporada, familia, tiendas, fechaInicio, fechaFin } = req.query;

      const uploadedFile = await storage.getUploadedFile(fileId);
      if (!uploadedFile) {
        return res.status(404).json({ error: "File not found" });
      }
      
      const ventas = await storage.getVentasData(fileId);
      if (!ventas || ventas.length === 0) {
        return res.status(404).json({ 
          error: "No sales data found",
          message: "The file was uploaded but no sales data could be extracted.",
          fileId,
          fileName: uploadedFile.fileName
        });
      }

      // Build filters
      const filters: any = {};
      if (temporada) filters.temporada = temporada as string;
      if (familia) filters.familia = familia as string;
      if (tiendas) {
        filters.tiendas = typeof tiendas === 'string' 
          ? tiendas.split(',').map(t => t.trim())
          : tiendas;
      }
      if (fechaInicio) filters.fechaInicio = fechaInicio as string;
      if (fechaFin) filters.fechaFin = fechaFin as string;

      const { applyFilters } = await import('./services/kpiCalculator');
      const filteredVentas = applyFilters(ventas, filters);

      // Calculate sales per store
      const ventasPorTienda = Object.values(
        filteredVentas.reduce((acc, venta) => {
          if (!venta.tienda) return acc;
          if (!acc[venta.tienda]) {
            acc[venta.tienda] = { tienda: venta.tienda, cantidad: 0, beneficio: 0 };
          }
          acc[venta.tienda].cantidad += venta.cantidad || 0;
          acc[venta.tienda].beneficio += venta.subtotal || 0;
          return acc;
        }, {} as Record<string, { tienda: string; cantidad: number; beneficio: number }>)
      ).sort((a, b) => b.cantidad - a.cantidad);

      const mejorTienda = ventasPorTienda[0] || { tienda: "N/A", cantidad: 0, beneficio: 0 };
      const peorTienda = ventasPorTienda[ventasPorTienda.length - 1] || { tienda: "N/A", cantidad: 0, beneficio: 0 };

      res.json({
        ventasPorTienda,
        mejorTienda: {
          nombre: mejorTienda.tienda,
          cantidad: mejorTienda.cantidad,
          beneficio: mejorTienda.beneficio,
        },
        peorTienda: {
          nombre: peorTienda.tienda,
          cantidad: peorTienda.cantidad,
          beneficio: peorTienda.beneficio,
        },
        totalTiendas: ventasPorTienda.length,
      });
    } catch (error: any) {
      console.error("Geographic data error:", error);
      res.status(500).json({ error: error.message || "Error fetching geographic data" });
    }
  });

  // Extended dashboard data endpoint with filters
  app.get("/api/dashboard-extended/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      const { temporada, familia, tiendas, fechaInicio, fechaFin } = req.query;
      
      const [ventas, productos, traspasos] = await Promise.all([
        storage.getVentasData(fileId),
        storage.getProductosData(fileId),
        storage.getTraspasosData(fileId),
      ]);

      // Check if file exists
      const uploadedFile = await storage.getUploadedFile(fileId);
      if (!uploadedFile) {
        return res.status(404).json({ error: "File not found" });
      }
      
      if (ventas.length === 0) {
        return res.status(404).json({ 
          error: "No data available", 
          message: "The file was uploaded but no sales data could be extracted. This might be due to column name mismatches or all rows being filtered out.",
          fileId,
          fileName: uploadedFile.fileName
        });
      }

      // Build and normalize filters
      const filters: any = {};
      
      // Normalize temporada
      if (temporada && typeof temporada === 'string') {
        filters.temporada = temporada;
      }
      
      // Normalize familia
      if (familia && typeof familia === 'string') {
        filters.familia = familia;
      }
      
      // Normalize tiendas - ensure it's always an array
      if (tiendas) {
        if (typeof tiendas === 'string') {
          // Split comma-separated string and trim
          filters.tiendas = tiendas.split(',').map((t: string) => t.trim()).filter(Boolean);
        } else if (Array.isArray(tiendas)) {
          filters.tiendas = tiendas.map(t => String(t).trim()).filter(Boolean);
        }
      }
      
      // Normalize dates - keep as strings for now (YYYY-MM-DD format)
      if (fechaInicio && typeof fechaInicio === 'string') {
        filters.fechaInicio = fechaInicio;
      }
      if (fechaFin && typeof fechaFin === 'string') {
        filters.fechaFin = fechaFin;
      }

      const extendedData = calculateExtendedDashboardData(ventas, productos, traspasos, filters);
      res.json(extendedData);
    } catch (error: any) {
      console.error("Extended dashboard data error:", error);
      res.status(500).json({ error: error.message || "Error calculating extended dashboard data" });
    }
  });

  // Dashboard Geographic endpoint (NEW)
  app.get("/api/dashboard-geographic/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      const { temporada, familia, tiendas, fechaInicio, fechaFin } = req.query;
      
      const ventas = await storage.getVentasData(fileId);
      // Check if file exists
      const uploadedFile = await storage.getUploadedFile(fileId);
      if (!uploadedFile) {
        return res.status(404).json({ error: "File not found" });
      }
      
      if (ventas.length === 0) {
        return res.status(404).json({ 
          error: "No data available", 
          message: "The file was uploaded but no sales data could be extracted. This might be due to column name mismatches or all rows being filtered out.",
          fileId,
          fileName: uploadedFile.fileName
        });
      }

      // Build filters
      const filters: any = {};
      if (temporada) filters.temporada = temporada as string;
      if (familia) filters.familia = familia as string;
      if (tiendas) {
        filters.tiendas = typeof tiendas === 'string' 
          ? tiendas.split(',').map(t => t.trim())
          : tiendas;
      }
      if (fechaInicio) filters.fechaInicio = fechaInicio as string;
      if (fechaFin) filters.fechaFin = fechaFin as string;

      const geographicData = calculateGeographicMetrics(ventas, filters);
      res.json(geographicData);
    } catch (error: any) {
      console.error("Dashboard geographic error:", error);
      res.status(500).json({ error: error.message || "Error calculating geographic data" });
    }
  });

  // Dashboard Products endpoint (NEW)
  app.get("/api/dashboard-products/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      const { temporada, familia, tiendas, fechaInicio, fechaFin } = req.query;
      
      const [ventas, productos] = await Promise.all([
        storage.getVentasData(fileId),
        storage.getProductosData(fileId),
      ]);

      // Check if file exists
      const uploadedFile = await storage.getUploadedFile(fileId);
      if (!uploadedFile) {
        return res.status(404).json({ error: "File not found" });
      }
      
      if (ventas.length === 0) {
        return res.status(404).json({ 
          error: "No data available", 
          message: "The file was uploaded but no sales data could be extracted. This might be due to column name mismatches or all rows being filtered out.",
          fileId,
          fileName: uploadedFile.fileName
        });
      }

      // Build filters
      const filters: any = {};
      if (temporada) filters.temporada = temporada as string;
      if (familia) filters.familia = familia as string;
      if (tiendas) {
        filters.tiendas = typeof tiendas === 'string' 
          ? tiendas.split(',').map(t => t.trim())
          : tiendas;
      }
      if (fechaInicio) filters.fechaInicio = fechaInicio as string;
      if (fechaFin) filters.fechaFin = fechaFin as string;

      const productsData = calculateProductProfitabilityMetrics(ventas, productos, filters);
      res.json(productsData);
    } catch (error: any) {
      console.error("Dashboard products error:", error);
      res.status(500).json({ error: error.message || "Error calculating products data" });
    }
  });

  // Dashboard Photos endpoint (NEW)
  app.get("/api/dashboard-photos/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      const { temporada, familia, tiendas, fechaInicio, fechaFin, familiaFilter } = req.query;
      
      const ventas = await storage.getVentasData(fileId);
      // Check if file exists
      const uploadedFile = await storage.getUploadedFile(fileId);
      if (!uploadedFile) {
        return res.status(404).json({ error: "File not found" });
      }
      
      if (ventas.length === 0) {
        return res.status(404).json({ 
          error: "No data available", 
          message: "The file was uploaded but no sales data could be extracted. This might be due to column name mismatches or all rows being filtered out.",
          fileId,
          fileName: uploadedFile.fileName
        });
      }

      // Build filters
      const filters: any = {};
      if (temporada) filters.temporada = temporada as string;
      if (familia) filters.familia = familia as string;
      if (tiendas) {
        filters.tiendas = typeof tiendas === 'string' 
          ? tiendas.split(',').map(t => t.trim())
          : tiendas;
      }
      if (fechaInicio) filters.fechaInicio = fechaInicio as string;
      if (fechaFin) filters.fechaFin = fechaFin as string;

      const photosData = calculatePhotoAnalysisData(
        ventas, 
        filters, 
        familiaFilter as string | undefined
      );
      res.json(photosData);
    } catch (error: any) {
      console.error("Dashboard photos error:", error);
      res.status(500).json({ error: error.message || "Error calculating photos data" });
    }
  });

  // Chatbot endpoint for dynamic visualization generation
  app.post("/api/chatbot/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      const { message } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      const [ventas, productos, traspasos] = await Promise.all([
        storage.getVentasData(fileId),
        storage.getProductosData(fileId),
        storage.getTraspasosData(fileId),
      ]);

      // Check if file exists
      const uploadedFile = await storage.getUploadedFile(fileId);
      if (!uploadedFile) {
        return res.status(404).json({ error: "File not found" });
      }

      if (ventas.length === 0) {
        return res.status(404).json({ 
          error: "No data available",
          message: "No hay datos disponibles para generar visualizaciones"
        });
      }

      const response = await processChatbotRequest(
        { message },
        ventas,
        productos,
        traspasos
      );

      res.json(response);
    } catch (error: any) {
      console.error("Chatbot error:", error);
      res.status(500).json({ 
        error: error.message || "Error processing chatbot request" 
      });
    }
  });

  // Forecast endpoints for ML-based demand prediction
  app.post("/api/forecast/run", async (req, res) => {
    try {
      const clientId = "demo-client"; // In production, get from auth
      const validatedRequest = forecastRequestSchema.parse(req.body);

      // Verify file exists
      const uploadedFile = await storage.getUploadedFile(validatedRequest.fileId);
      if (!uploadedFile) {
        return res.status(404).json({ error: "File not found" });
      }

      // Verify data exists
      const ventas = await storage.getVentasData(validatedRequest.fileId);
      if (ventas.length === 0) {
        return res.status(400).json({ 
          error: "No sales data available for forecasting" 
        });
      }

      const job = await createForecastJob(validatedRequest, clientId);
      res.json(job);
    } catch (error: any) {
      console.error("Forecast creation error:", error);
      res.status(500).json({ 
        error: error.message || "Error creating forecast job" 
      });
    }
  });

  app.get("/api/forecast/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const job = await getForecastJob(id);

      if (!job) {
        return res.status(404).json({ error: "Forecast job not found" });
      }

      res.json(job);
    } catch (error: any) {
      console.error("Forecast retrieval error:", error);
      res.status(500).json({ 
        error: error.message || "Error retrieving forecast job" 
      });
    }
  });

  app.get("/api/forecast/latest/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      const job = await getLatestForecastJob(fileId);

      if (!job) {
        return res.status(404).json({ 
          error: "No forecast jobs found for this file" 
        });
      }

      res.json(job);
    } catch (error: any) {
      console.error("Latest forecast retrieval error:", error);
      res.status(500).json({ 
        error: error.message || "Error retrieving latest forecast" 
      });
    }
  });

  app.get("/api/forecast/jobs/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      const jobs = await storage.getForecastJobsByFileId(fileId);

      res.json(jobs);
    } catch (error: any) {
      console.error("Forecast jobs retrieval error:", error);
      res.status(500).json({ 
        error: error.message || "Error retrieving forecast jobs" 
      });
    }
  });

  // Get available seasons for forecasting
  app.get("/api/forecast/available-seasons/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      
      // Optimización: Obtener solo temporadas únicas en lugar de todas las ventas
      const uniqueSeasons = await storage.getUniqueSeasons(fileId);

      if (!uniqueSeasons || uniqueSeasons.length === 0) {
        return res.status(404).json({ 
          error: "No sales data found for this file" 
        });
      }

      // Crear objetos mock de VentasData con solo el campo temporada para detectLatestSeason
      const mockVentas = uniqueSeasons.map(t => ({ temporada: t } as any));
      
      // Detectar última temporada disponible
      const latestSeason = detectLatestSeason(mockVentas);

      if (!latestSeason) {
        return res.status(404).json({ 
          error: "No valid season data found" 
        });
      }

      // Generar opciones para el siguiente año
      const nextYear = latestSeason.year + 1;
      const nextYearShort = nextYear.toString().slice(-2);

      const availableSeasons = [
        {
          value: 'PV',
          label: `${nextYearShort}PV - Primavera/Verano ${nextYear}`,
          year: nextYear,
          type: 'PV' as const,
        },
        {
          value: 'OI',
          label: `${nextYearShort}OI - Otoño/Invierno ${nextYear}`,
          year: nextYear,
          type: 'OI' as const,
        },
      ];

      res.json({
        latestAvailable: {
          seasonCode: latestSeason.seasonCode,
          year: latestSeason.year,
          type: latestSeason.season,
          label: `${latestSeason.seasonCode} - ${latestSeason.season === 'PV' ? 'Primavera/Verano' : 'Otoño/Invierno'} ${latestSeason.year}`,
        },
        availableSeasons,
      });
    } catch (error: any) {
      console.error("Available seasons retrieval error:", error);
      res.status(500).json({ 
        error: error.message || "Error retrieving available seasons" 
      });
    }
  });

  // ============================================================================
  // ML FORECASTING ENDPOINTS (Python-based AutoML)
  // ============================================================================

  // Train ML models (CatBoost/XGBoost) for PV and OI seasons
  app.post("/api/ml/train", async (req, res) => {
    try {
      const { fileId } = req.body;

      if (!fileId) {
        return res.status(400).json({ error: "fileId is required" });
      }

      // Get uploaded file metadata
      const uploadedFile = await storage.getUploadedFile(fileId);
      if (!uploadedFile) {
        return res.status(404).json({ error: "File not found" });
      }

      // Construct file path (assume uploads are stored in ./uploads/)
      const filePath = path.join(process.cwd(), 'uploads', `${uploadedFile.fileName}`);

      // Check if file exists on disk
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ 
          error: "Excel file not found on disk. Please re-upload the file." 
        });
      }

      console.log(`Starting ML training for file: ${filePath}`);

      // Execute training job asynchronously
      const result = await executeTrainJob({
        fileId,
        filePath,
      });

      if (result.status === 'error') {
        return res.status(500).json({
          error: result.error,
          logs: result.logs,
        });
      }

      res.json({
        success: true,
        message: "ML models trained successfully",
        results: result.data,
      });

    } catch (error: any) {
      console.error("ML training error:", error);
      res.status(500).json({
        error: error.message || "Error training ML models",
      });
    }
  });

  // Generate ML forecast for next PV or OI season
  app.post("/api/ml/predict", async (req, res) => {
    try {
      const { fileId, targetSeason, numTiendas } = req.body;

      if (!fileId || !targetSeason) {
        return res.status(400).json({ 
          error: "fileId and targetSeason are required" 
        });
      }

      if (!['next_PV', 'next_OI'].includes(targetSeason)) {
        return res.status(400).json({ 
          error: "targetSeason must be 'next_PV' or 'next_OI'" 
        });
      }

      // Get uploaded file metadata
      const uploadedFile = await storage.getUploadedFile(fileId);
      if (!uploadedFile) {
        return res.status(404).json({ error: "File not found" });
      }

      // Construct file path
      const filePath = path.join(process.cwd(), 'uploads', `${uploadedFile.fileName}`);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ 
          error: "Excel file not found on disk. Please re-upload the file." 
        });
      }

      console.log(`Starting ML prediction for file: ${filePath}`);
      console.log(`Target season: ${targetSeason}, Num tiendas: ${numTiendas || 10}`);

      // Execute prediction job
      const result = await executePredictJob({
        fileId,
        filePath,
        targetSeason: targetSeason as 'next_PV' | 'next_OI',
        numTiendas: numTiendas || 10,
      });

      if (result.status === 'error') {
        return res.status(500).json({
          error: result.error,
          logs: result.logs,
        });
      }

      res.json({
        success: true,
        message: "ML forecast generated successfully",
        forecast: result.data,
      });

    } catch (error: any) {
      console.error("ML prediction error:", error);
      res.status(500).json({
        error: error.message || "Error generating ML forecast",
      });
    }
  });

  // ============================================================================
  // NEW CHART ENDPOINTS
  // ============================================================================

  // Top Stores endpoint
  app.get("/api/charts/top-stores/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      const { temporada, familia, tiendas } = req.query;

      const ventas = await storage.getVentasData(fileId);
      if (!ventas || ventas.length === 0) {
        return res.status(404).json({ error: "No sales data found for this file" });
      }

      const filters = {
        temporada: temporada as string | undefined,
        familia: familia as string | undefined,
        tiendas: tiendas 
          ? (Array.isArray(tiendas) ? tiendas as string[] : (tiendas as string).split(','))
          : undefined,
      };

      const data = calculateTopStores(ventas, filters);
      res.json(data);
    } catch (error: any) {
      console.error("Top stores calculation error:", error);
      res.status(500).json({ 
        error: error.message || "Error calculating top stores" 
      });
    }
  });

  // Units by Size endpoint
  app.get("/api/charts/units-by-size/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      const { temporada, familia, tiendas } = req.query;

      const ventas = await storage.getVentasData(fileId);
      if (!ventas || ventas.length === 0) {
        return res.status(404).json({ error: "No sales data found for this file" });
      }

      const filters = {
        temporada: temporada as string | undefined,
        familia: familia as string | undefined,
        tiendas: tiendas 
          ? (Array.isArray(tiendas) ? tiendas as string[] : (tiendas as string).split(','))
          : undefined,
      };

      const data = calculateUnitsBySize(ventas, filters);
      res.json(data);
    } catch (error: any) {
      console.error("Units by size calculation error:", error);
      res.status(500).json({ 
        error: error.message || "Error calculating units by size" 
      });
    }
  });

  // Sales vs Transfers endpoint
  app.get("/api/charts/sales-vs-transfers/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      const { temporada, familia, tiendas } = req.query;

      const ventas = await storage.getVentasData(fileId);
      const traspasos = await storage.getTraspasosData(fileId);
      
      if (!ventas || ventas.length === 0) {
        return res.status(404).json({ error: "No sales data found for this file" });
      }

      const filters = {
        temporada: temporada as string | undefined,
        familia: familia as string | undefined,
        tiendas: tiendas 
          ? (Array.isArray(tiendas) ? tiendas as string[] : (tiendas as string).split(','))
          : undefined,
      };

      const data = calculateSalesVsTransfers(ventas, traspasos || [], filters);
      res.json(data);
    } catch (error: any) {
      console.error("Sales vs transfers calculation error:", error);
      res.status(500).json({ 
        error: error.message || "Error calculating sales vs transfers" 
      });
    }
  });

  // Warehouse Entries endpoint
  app.get("/api/charts/warehouse-entries/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      const { temporada, familia } = req.query;

      const productos = await storage.getProductosData(fileId);
      if (!productos || productos.length === 0) {
        return res.status(404).json({ error: "No product data found for this file" });
      }

      const filters = {
        temporada: temporada as string | null,
        familia: familia as string | null,
      };

      const data = calculateWarehouseEntries(productos, filters);
      res.json(data);
    } catch (error: any) {
      console.error("Warehouse entries calculation error:", error);
      res.status(500).json({ 
        error: error.message || "Error calculating warehouse entries" 
      });
    }
  });

  // ==================== SENTIMENT ANALYSIS ENDPOINTS ====================
  
  // Fetch and analyze comments from social media and reviews
  app.post("/api/sentiment/fetch", async (req, res) => {
    try {
      const clientId = req.body.clientId || "demo-client";
      
      // Fetch data from connectors
      const googleConnector = new GoogleReviewsConnector();
      const instagramConnector = new InstagramConnector();
      
      const [googleReviews, instagramComments] = await Promise.all([
        googleConnector.fetchReviews(),
        instagramConnector.fetchComments(),
      ]);
      
      const allComments = [
        ...googleReviews.map(r => ({ ...r, canal: "google_reviews" as const, tipoFuente: "reviews" as const })),
        ...instagramComments.map(c => ({ ...c, canal: "instagram" as const, tipoFuente: "social_media" as const })),
      ];
      
      // Analyze sentiments
      const sentimentResults = await sentimentAnalysisService.batchAnalyzeSentiments(
        allComments.map(c => c.text)
      );
      
      // Prepare data for storage
      const sentimentsToSave: InsertSentiment[] = allComments.map((comment, index) => ({
        clientId,
        canal: comment.canal,
        tipoFuente: comment.tipoFuente,
        texto: comment.text,
        fecha: comment.date,
        origenDetalle: comment.origenDetalle,
        sentiment: sentimentResults[index].sentiment,
        sentimentScore: sentimentResults[index].sentimentScore,
        tema: sentimentResults[index].tema,
      }));
      
      // Save to database
      await storage.saveSentimentData(sentimentsToSave);
      
      res.json({
        success: true,
        message: `Analyzed ${sentimentsToSave.length} comments`,
        count: sentimentsToSave.length,
      });
    } catch (error: any) {
      console.error("Error fetching and analyzing sentiments:", error);
      res.status(500).json({ error: error.message || "Error processing sentiments" });
    }
  });

  // Get sentiment summary (KPIs)
  app.get("/api/sentiment/summary/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      const { dateFrom, dateTo, canal, tema } = req.query;
      
      const sentiments = await storage.getSentimentData(clientId, {
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
        canal: canal as string | undefined,
        tema: tema as string | undefined,
      });
      
      if (sentiments.length === 0) {
        return res.json({
          globalSentiment: 0,
          socialMediaSentiment: 0,
          reviewsSentiment: 0,
          totalComments: 0,
        });
      }
      
      // Calculate global sentiment
      const totalScore = sentiments.reduce((sum, s) => sum + s.sentimentScore, 0);
      const globalSentiment = totalScore / sentiments.length;
      
      // Calculate by tipo_fuente
      const socialMedia = sentiments.filter(s => s.tipoFuente === "social_media");
      const reviews = sentiments.filter(s => s.tipoFuente === "reviews");
      
      const socialMediaSentiment = socialMedia.length > 0
        ? socialMedia.reduce((sum, s) => sum + s.sentimentScore, 0) / socialMedia.length
        : 0;
      
      const reviewsSentiment = reviews.length > 0
        ? reviews.reduce((sum, s) => sum + s.sentimentScore, 0) / reviews.length
        : 0;
      
      res.json({
        globalSentiment,
        socialMediaSentiment,
        reviewsSentiment,
        totalComments: sentiments.length,
      });
    } catch (error: any) {
      console.error("Error getting sentiment summary:", error);
      res.status(500).json({ error: error.message || "Error getting summary" });
    }
  });

  // Get charts data
  app.get("/api/sentiment/charts/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      const { dateFrom, dateTo, canal, tema } = req.query;
      
      const sentiments = await storage.getSentimentData(clientId, {
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
        canal: canal as string | undefined,
        tema: tema as string | undefined,
      });
      
      // Sentiment distribution
      const positivo = sentiments.filter(s => s.sentiment === "positivo").length;
      const neutro = sentiments.filter(s => s.sentiment === "neutro").length;
      const negativo = sentiments.filter(s => s.sentiment === "negativo").length;
      
      const sentimentDistribution = {
        positivo,
        neutro,
        negativo,
      };
      
      // By channel
      const instagramData = sentiments.filter(s => s.canal === "instagram");
      const googleData = sentiments.filter(s => s.canal === "google_reviews");
      
      const byChannel = {
        instagram: {
          positivo: instagramData.filter(s => s.sentiment === "positivo").length,
          neutro: instagramData.filter(s => s.sentiment === "neutro").length,
          negativo: instagramData.filter(s => s.sentiment === "negativo").length,
        },
        google_reviews: {
          positivo: googleData.filter(s => s.sentiment === "positivo").length,
          neutro: googleData.filter(s => s.sentiment === "neutro").length,
          negativo: googleData.filter(s => s.sentiment === "negativo").length,
        },
      };
      
      // Time series (group by date)
      const byDate: Record<string, { positivo: number; negativo: number; total: number }> = {};
      sentiments.forEach(s => {
        if (!byDate[s.fecha]) {
          byDate[s.fecha] = { positivo: 0, negativo: 0, total: 0 };
        }
        byDate[s.fecha].total++;
        if (s.sentiment === "positivo") byDate[s.fecha].positivo++;
        if (s.sentiment === "negativo") byDate[s.fecha].negativo++;
      });
      
      const timeSeries = Object.entries(byDate).map(([fecha, counts]) => ({
        fecha,
        positivoPercent: counts.total > 0 ? (counts.positivo / counts.total) * 100 : 0,
        negativoPercent: counts.total > 0 ? (counts.negativo / counts.total) * 100 : 0,
      })).sort((a, b) => a.fecha.localeCompare(b.fecha));
      
      // By topic
      const byTopic: Record<string, { positivo: number; negativo: number; neutro: number }> = {};
      sentiments.forEach(s => {
        if (!s.tema) return;
        if (!byTopic[s.tema]) {
          byTopic[s.tema] = { positivo: 0, negativo: 0, neutro: 0 };
        }
        byTopic[s.tema][s.sentiment]++;
      });
      
      const topicData = Object.entries(byTopic).map(([tema, counts]) => ({
        tema,
        ...counts,
      }));
      
      res.json({
        sentimentDistribution,
        byChannel,
        timeSeries,
        byTopic: topicData,
      });
    } catch (error: any) {
      console.error("Error getting charts data:", error);
      res.status(500).json({ error: error.message || "Error getting charts data" });
    }
  });

  // Get comments list
  app.get("/api/sentiment/comments/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      const { dateFrom, dateTo, canal, tema, limit } = req.query;
      
      let sentiments = await storage.getSentimentData(clientId, {
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
        canal: canal as string | undefined,
        tema: tema as string | undefined,
      });
      
      // Sort by date (newest first)
      sentiments.sort((a, b) => b.fecha.localeCompare(a.fecha));
      
      // Apply limit if specified
      if (limit) {
        const limitNum = parseInt(limit as string, 10);
        sentiments = sentiments.slice(0, limitNum);
      }
      
      res.json(sentiments);
    } catch (error: any) {
      console.error("Error getting comments:", error);
      res.status(500).json({ error: error.message || "Error getting comments" });
    }
  });

  // Delete all sentiment data for a client (useful for re-fetching)
  app.delete("/api/sentiment/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      await storage.deleteSentimentData(clientId);
      res.json({ success: true, message: "Sentiment data deleted" });
    } catch (error: any) {
      console.error("Error deleting sentiment data:", error);
      res.status(500).json({ error: error.message || "Error deleting data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
