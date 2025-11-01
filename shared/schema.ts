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
  fechaVenta: z.string(),
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
  codigoUnico: z.string(),
  cantidadPedida: z.number().optional(),
  pvp: z.number().optional(),
  precioCoste: z.number().optional(),
  urlImage: z.string().optional(),
  familia: z.string().optional(),
  talla: z.string().optional(),
  color: z.string().optional(),
  temporada: z.string().optional(),
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

// Insert schemas
export const insertUploadedFileSchema = uploadedFileSchema.omit({ id: true });
export const insertClientConfigSchema = clientConfigSchema;

export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;
export type InsertClientConfig = z.infer<typeof insertClientConfigSchema>;
