import { z } from "zod";

// Schema for uploaded file metadata
export const uploadedFileSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  fileName: z.string(),
  uploadDate: z.string(),
  sheets: z.array(z.string()),
});

export type UploadedFile = z.infer<typeof uploadedFileSchema>;

// Schema for client preprocessing configuration
export const clientConfigSchema = z.object({
  clientId: z.string(),
  columnMappings: z.record(z.string()), // Maps detected columns to standard names
  lastUpdated: z.string(),
});

export type ClientConfig = z.infer<typeof clientConfigSchema>;

// Schema for Ventas (Sales) data
export const ventasSchema = z.object({
  act: z.string().optional(),
  codigoUnico: z.string().optional(),
  cantidad: z.number(),
  pvp: z.number().optional(),
  subtotal: z.number(),
  fechaVenta: z.string().optional(), // Made optional to handle missing dates
  tienda: z.string(),
  codigoTienda: z.string().optional(),
  temporada: z.string().optional(),
  familia: z.string().optional(),
  descripcionFamilia: z.string().optional(),
  talla: z.string().optional(),
  color: z.string().optional(),
  urlImage: z.string().optional(),
  urlThumbnail: z.string().optional(),
  precioCoste: z.number().optional(),
  mes: z.string().optional(),
  esOnline: z.boolean().optional(),
});

export type VentasData = z.infer<typeof ventasSchema>;

// Schema for Productos (Products/Purchase) data
export const productosSchema = z.object({
  act: z.string().optional(),
  codigoUnico: z.string().optional(), // Made optional to handle missing data
  cantidadPedida: z.number().optional(),
  pvp: z.number().optional(),
  precioCoste: z.number().optional(),
  urlImage: z.string().optional(),
  familia: z.string().optional(),
  talla: z.string().optional(),
  color: z.string().optional(),
  temporada: z.string().optional(),
  fechaAlmacen: z.string().optional(), // Fecha REAL entrada en almacén
  tema: z.string().optional(), // Tema_temporada from Excel
});

export type ProductosData = z.infer<typeof productosSchema>;

// Schema for Traspasos (Transfers) data
export const traspasosSchema = z.object({
  act: z.string().optional(),
  codigoUnico: z.string().optional(),
  enviado: z.number().optional(),
  tienda: z.string().optional(),
  fechaEnviado: z.string().optional(),
  urlImage: z.string().optional(),
  talla: z.string().optional(), // Talla del producto traspasado
});

export type TraspasosData = z.infer<typeof traspasosSchema>;

// Schema for processed dashboard data
export const dashboardDataSchema = z.object({
  kpis: z.object({
    ventasBrutas: z.number(),
    ventasNetas: z.number(),
    devoluciones: z.number(),
    tasaDevolucion: z.number(),
    ventasFisicas: z.number(),
    ventasOnline: z.number(),
    tiendasFisicasCount: z.number(),
    tiendasOnlineCount: z.number(),
    numFamilias: z.number(),
    numTiendas: z.number(),
    numTemporadas: z.number(),
    numTransacciones: z.number(),
  }),
  filters: z.object({
    temporadas: z.array(z.string()),
    familias: z.array(z.string()),
    tiendas: z.array(z.string()),
    tiendasOnline: z.array(z.string()),
    tiendasNaelle: z.array(z.string()),
    tiendasItalia: z.array(z.string()),
  }),
  ventasMensuales: z.array(z.object({
    mes: z.string(),
    cantidad: z.number(),
    beneficio: z.number(),
    esOnline: z.boolean(),
  })),
  topProductos: z.array(z.object({
    codigoUnico: z.string(),
    nombre: z.string().optional(),
    cantidad: z.number(),
    beneficio: z.number(),
    familia: z.string().optional(),
  })),
  ventasPorTienda: z.array(z.object({
    tienda: z.string(),
    cantidad: z.number(),
    beneficio: z.number(),
  })),
});

export type DashboardData = z.infer<typeof dashboardDataSchema>;

// Schema for forecast jobs
export const forecastJobSchema = z.object({
  id: z.string(),
  fileId: z.string(),
  clientId: z.string(),
  model: z.enum(["catboost", "xgboost", "prophet"]),
  status: z.enum(["pending", "running", "completed", "failed"]),
  createdAt: z.string(),
  completedAt: z.string().optional(),
  error: z.string().optional(),
  results: z.object({
    predictions: z.array(z.object({
      producto: z.string(),
      tienda: z.string().optional(),
      familia: z.string().optional(),
      temporada: z.string().optional(),
      periodoInicio: z.string(),
      periodoFin: z.string(),
      demandaPredicha: z.number(),
      precioOptimo: z.number().optional(),
      margenEstimado: z.number().optional(),
      confianza: z.number(),
    })),
    summary: z.object({
      totalPredictions: z.number(),
      avgDemand: z.number(),
      avgPrice: z.number().optional(),
      modelAccuracy: z.number().optional(),
    }),
  }).optional(),
});

export type ForecastJob = z.infer<typeof forecastJobSchema>;

export const forecastRequestSchema = z.object({
  fileId: z.string(),
  model: z.enum(["catboost", "xgboost", "prophet"]),
  filters: z.object({
    temporadas: z.array(z.string()).optional(),
    familias: z.array(z.string()).optional(),
    tiendas: z.array(z.string()).optional(),
  }).optional(),
  horizon: z.number().default(3), // Months to forecast
});

export type ForecastRequest = z.infer<typeof forecastRequestSchema>;

// Insert schemas
export const insertUploadedFileSchema = uploadedFileSchema.omit({ id: true });
export const insertClientConfigSchema = clientConfigSchema;
export const insertForecastJobSchema = forecastJobSchema.omit({ id: true, createdAt: true });

export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;
export type InsertClientConfig = z.infer<typeof insertClientConfigSchema>;
export type InsertForecastJob = z.infer<typeof insertForecastJobSchema>;
