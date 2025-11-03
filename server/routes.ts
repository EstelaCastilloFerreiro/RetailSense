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
  calculatePhotoAnalysisData
} from "./services/kpiCalculatorExtended";
import { processChatbotRequest } from "./services/chatbotService";
import { createForecastJob, getForecastJob, getLatestForecastJob } from "./services/forecastingService";
import { forecastRequestSchema } from "@shared/schema";

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

      // Save uploaded file metadata
      const uploadedFile = await storage.saveUploadedFile({
        clientId,
        fileName: req.file.originalname,
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
      
      const TIENDAS_ONLINE = [
        'ECI NAELLE ONLINE',
        'ECI ONLINE GESTION',
        'ET0N ECI ONLINE',
        'NAELLE ONLINE B2C',
        'OUTLET TRUCCO ONLINE B2O',
        'TRUCCO ONLINE B2C',
      ];

      const tiendasOnline = tiendas.filter(t => TIENDAS_ONLINE.includes(t));
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

  const httpServer = createServer(app);
  return httpServer;
}
