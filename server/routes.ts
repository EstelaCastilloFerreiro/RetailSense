import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { processExcelFile, detectColumnStructure } from "./services/excelProcessor";
import { calculateDashboardData } from "./services/kpiCalculator";
import { calculateExtendedDashboardData } from "./services/kpiCalculatorExtended";

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

      // Detect column structure
      const { detectedColumns, suggestedMappings } = detectColumnStructure(buffer);

      // Process Excel file
      const { ventas, productos, traspasos, sheets } = processExcelFile(buffer);

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
      console.error("Upload error:", error);
      res.status(500).json({ error: error.message || "Error processing file" });
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

      if (ventas.length === 0) {
        return res.status(404).json({ error: "File not found or no data available" });
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

      if (ventas.length === 0) {
        return res.status(404).json({ error: "File not found or no data available" });
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

      const ventas = await storage.getVentasData(fileId);
      if (!ventas || ventas.length === 0) {
        return res.status(404).json({ error: "No sales data found" });
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

  // Extended dashboard data endpoint
  app.get("/api/dashboard-extended/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      
      const [ventas, productos, traspasos] = await Promise.all([
        storage.getVentasData(fileId),
        storage.getProductosData(fileId),
        storage.getTraspasosData(fileId),
      ]);

      if (ventas.length === 0) {
        return res.status(404).json({ error: "File not found or no data available" });
      }

      const extendedData = calculateExtendedDashboardData(ventas, productos, traspasos);
      res.json(extendedData);
    } catch (error: any) {
      console.error("Extended dashboard data error:", error);
      res.status(500).json({ error: error.message || "Error calculating extended dashboard data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
