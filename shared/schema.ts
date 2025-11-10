import { z } from "zod";
import { pgTable, text, integer, real, boolean, json, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

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

// Schema for Purchase Plan (Plan de Compras) - Must be defined before forecastJobSchema
export const purchasePlanRowSchema = z.object({
  seccion: z.string(), // Categoría/Familia (ej: Faldas, Pantalón, etc.)
  pvpPorcentaje: z.number(), // % sección PVP
  contribucionPorcentaje: z.number(), // % sección CONTRI.
  uds: z.number(), // Unidades
  pvp: z.number(), // PVP total
  coste: z.number(), // COSTE total
  profit: z.number(), // Prof (Profit)
  opciones: z.number(), // Opc (Options)
  pmCte: z.number(), // PM Cte (Average Cost Price)
  pmVta: z.number(), // PM Vta (Average Selling Price)
  mk: z.number(), // Mk (Markup)
  markdownPorcentaje: z.number(), // MARK DOW %
  sobranPorcentaje: z.number(), // SOBR ANTE %
  porTienda: z.number(), // x tienda
  porTalla: z.number(), // x talla
});

export type PurchasePlanRow = z.infer<typeof purchasePlanRowSchema>;

export const purchasePlanSchema = z.object({
  rows: z.array(purchasePlanRowSchema),
  totalPrendas: purchasePlanRowSchema,
  totalComplementos: purchasePlanRowSchema.optional(),
  totalTrucco: purchasePlanRowSchema.optional(),
  modeloUtilizado: z.string(), // Modelo seleccionado automáticamente
  precisionModelo: z.number(), // Precisión del modelo
  variablesUtilizadas: z.array(z.string()), // Variables que dieron mejores resultados
  temporadaObjetivo: z.string().optional(), // Temporada que se está prediciendo (ej: "Primavera/Verano 2025")
});

export type PurchasePlan = z.infer<typeof purchasePlanSchema>;

// Schema for forecast jobs
export const forecastJobSchema = z.object({
  id: z.string(),
  fileId: z.string(),
  clientId: z.string(),
  model: z.enum(["catboost", "xgboost", "prophet", "auto"]).optional(), // "auto" means automatically selected
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
    })).optional(),
    summary: z.object({
      totalPredictions: z.number(),
      avgDemand: z.number(),
      avgPrice: z.number().optional(),
      modelAccuracy: z.number().optional(),
    }).optional(),
    purchasePlan: purchasePlanSchema.optional(),
  }).optional(),
  progress: z.number().optional(), // 0-100 percentage
  totalProducts: z.number().optional(),
  processedProducts: z.number().optional(),
  estimatedTimeRemaining: z.number().optional(), // in seconds
});

export type ForecastJob = z.infer<typeof forecastJobSchema>;

export const forecastRequestSchema = z.object({
  fileId: z.string(),
  filters: z.object({
    temporadas: z.array(z.string()).optional(),
    familias: z.array(z.string()).optional(),
    tiendas: z.array(z.string()).optional(),
  }).optional(),
  horizon: z.number().default(3), // Months to forecast
  temporadaTipo: z.enum(["PV", "OI"]).optional(), // Tipo de temporada a predecir (si no se especifica, se calcula automáticamente)
});

export type ForecastRequest = z.infer<typeof forecastRequestSchema>;

// Insert schemas
export const insertUploadedFileSchema = uploadedFileSchema.omit({ id: true });
export const insertClientConfigSchema = clientConfigSchema;
export const insertForecastJobSchema = forecastJobSchema.omit({ id: true, createdAt: true });

export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;
export type InsertClientConfig = z.infer<typeof insertClientConfigSchema>;
export type InsertForecastJob = z.infer<typeof insertForecastJobSchema>;

// Schema for sentiment analysis data
export const sentimentSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  canal: z.enum(["instagram", "google_reviews"]), // Data source
  tipoFuente: z.enum(["social_media", "reviews"]), // Source type
  texto: z.string(), // Comment text
  fecha: z.string(), // Date of comment
  origenDetalle: z.string().optional(), // post_id for Instagram or store_name for Google
  sentiment: z.enum(["positivo", "neutro", "negativo"]), // Sentiment classification
  sentimentScore: z.number(), // 0-1 numeric score
  tema: z.enum(["producto", "talla", "calidad", "precio", "envio", "tienda", "web"]).optional(), // Topic
  createdAt: z.string(),
});

export type SentimentData = z.infer<typeof sentimentSchema>;

export const insertSentimentSchema = sentimentSchema.omit({ id: true, createdAt: true });

export type InsertSentiment = z.infer<typeof insertSentimentSchema>;

// ============================================================================
// Drizzle ORM Table Definitions for PostgreSQL
// ============================================================================

export const uploadedFiles = pgTable("uploaded_files", {
  id: varchar("id", { length: 36 }).primaryKey(),
  clientId: text("client_id").notNull(),
  fileName: text("file_name").notNull(),
  uploadDate: text("upload_date").notNull(),
  sheets: json("sheets").$type<string[]>().notNull(),
});

export const clientConfigs = pgTable("client_configs", {
  clientId: text("client_id").primaryKey(),
  columnMappings: json("column_mappings").$type<Record<string, string>>().notNull(),
  lastUpdated: text("last_updated").notNull(),
});

export const ventasData = pgTable("ventas_data", {
  id: varchar("id", { length: 36 }).primaryKey(),
  fileId: text("file_id").notNull(),
  act: text("act"),
  codigoUnico: text("codigo_unico"),
  cantidad: real("cantidad").notNull(),
  pvp: real("pvp"),
  subtotal: real("subtotal").notNull(),
  fechaVenta: text("fecha_venta"),
  tienda: text("tienda").notNull(),
  codigoTienda: text("codigo_tienda"),
  temporada: text("temporada"),
  familia: text("familia"),
  descripcionFamilia: text("descripcion_familia"),
  talla: text("talla"),
  color: text("color"),
  urlImage: text("url_image"),
  urlThumbnail: text("url_thumbnail"),
  precioCoste: real("precio_coste"),
  mes: text("mes"),
  esOnline: boolean("es_online"),
});

export const productosData = pgTable("productos_data", {
  id: varchar("id", { length: 36 }).primaryKey(),
  fileId: text("file_id").notNull(),
  act: text("act"),
  codigoUnico: text("codigo_unico"),
  cantidadPedida: real("cantidad_pedida"),
  pvp: real("pvp"),
  precioCoste: real("precio_coste"),
  urlImage: text("url_image"),
  familia: text("familia"),
  talla: text("talla"),
  color: text("color"),
  temporada: text("temporada"),
  fechaAlmacen: text("fecha_almacen"),
  tema: text("tema"),
});

export const traspasosData = pgTable("traspasos_data", {
  id: varchar("id", { length: 36 }).primaryKey(),
  fileId: text("file_id").notNull(),
  act: text("act"),
  codigoUnico: text("codigo_unico"),
  enviado: real("enviado"),
  tienda: text("tienda"),
  fechaEnviado: text("fecha_enviado"),
  urlImage: text("url_image"),
  talla: text("talla"),
});

export const forecastJobs = pgTable("forecast_jobs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  fileId: text("file_id").notNull(),
  clientId: text("client_id").notNull(),
  model: text("model"),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
  completedAt: text("completed_at"),
  error: text("error"),
  results: json("results"),
  progress: real("progress").default(0), // 0-100 percentage
  totalProducts: integer("total_products").default(0),
  processedProducts: integer("processed_products").default(0),
  estimatedTimeRemaining: integer("estimated_time_remaining"), // in seconds
});

export const sentimentsData = pgTable("sentiments_data", {
  id: varchar("id", { length: 36 }).primaryKey(),
  clientId: text("client_id").notNull(),
  canal: text("canal").notNull(), // "instagram" | "google_reviews"
  tipoFuente: text("tipo_fuente").notNull(), // "social_media" | "reviews"
  texto: text("texto").notNull(),
  fecha: text("fecha").notNull(),
  origenDetalle: text("origen_detalle"),
  sentiment: text("sentiment").notNull(), // "positivo" | "neutro" | "negativo"
  sentimentScore: real("sentiment_score").notNull(), // 0-1
  tema: text("tema"), // "producto" | "talla" | "calidad" | "precio" | "envio" | "tienda" | "web"
  createdAt: text("created_at").notNull(),
});
