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
  columnMappings: z.record(z.record(z.string())), // Maps sheet names to column mappings
  lastUpdated: z.string(),
});

export type ClientConfig = z.infer<typeof clientConfigSchema>;

// Schema for Ventas (Sales) data
export const ventasSchema = z.object({
  act: z.union([z.string(), z.number()]).transform(val => val != null ? String(val) : undefined).optional(),
  codigoUnico: z.union([z.string(), z.number()]).transform(val => val != null ? String(val) : undefined).optional(),
  cantidad: z.union([z.number(), z.string()]).transform(val => {
    const num = typeof val === 'string' ? parseFloat(val) : Number(val);
    return isNaN(num) ? 0 : num;
  }),
  pvp: z.union([z.number(), z.string()]).transform(val => {
    if (val == null || val === '') return undefined;
    const num = typeof val === 'string' ? parseFloat(val) : Number(val);
    return isNaN(num) ? undefined : num;
  }).optional(),
  subtotal: z.union([z.number(), z.string()]).transform(val => {
    const num = typeof val === 'string' ? parseFloat(val) : Number(val);
    return isNaN(num) ? 0 : num;
  }),
  fechaVenta: z.union([z.string(), z.date(), z.number()]).transform(val => {
    if (!val) return new Date().toISOString();
    if (val instanceof Date) return val.toISOString();
    if (typeof val === 'number') return new Date(val).toISOString();
    return String(val);
  }),
  tienda: z.union([z.string(), z.number()]).transform(val => val != null ? String(val) : ''),
  codigoTienda: z.union([z.string(), z.number()]).transform(val => val != null ? String(val) : undefined).optional(),
  temporada: z.union([z.string(), z.number()]).transform(val => val != null ? String(val) : undefined).optional(),
  familia: z.union([z.string(), z.number()]).transform(val => val != null ? String(val) : undefined).optional(),
  descripcionFamilia: z.union([z.string(), z.number()]).transform(val => val != null ? String(val) : undefined).optional(),
  talla: z.union([z.string(), z.number()]).transform(val => val != null ? String(val) : undefined).optional(),
  color: z.union([z.string(), z.number()]).transform(val => val != null ? String(val) : undefined).optional(),
  urlImage: z.union([z.string(), z.number()]).transform(val => val != null ? String(val) : undefined).optional(),
  urlThumbnail: z.union([z.string(), z.number()]).transform(val => val != null ? String(val) : undefined).optional(),
  precioCoste: z.union([z.number(), z.string()]).transform(val => {
    if (val == null || val === '') return undefined;
    const num = typeof val === 'string' ? parseFloat(val) : Number(val);
    return isNaN(num) ? undefined : num;
  }).optional(),
  mes: z.union([z.string(), z.number()]).transform(val => val != null ? String(val) : undefined).optional(),
  esOnline: z.union([z.boolean(), z.string(), z.number()]).transform(val => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.toLowerCase() === 'true';
    return Boolean(val);
  }).optional(),
}).passthrough(); // Allow extra fields

export type VentasData = z.infer<typeof ventasSchema>;

// Schema for Productos (Products/Purchase) data
export const productosSchema = z.object({
  act: z.union([z.string(), z.number()]).transform(val => val != null ? String(val) : undefined).optional(),
  codigoUnico: z.union([z.string(), z.number()]).transform(val => val != null ? String(val) : ''),
  cantidadPedida: z.union([z.number(), z.string()]).transform(val => {
    if (val == null || val === '') return undefined;
    const num = typeof val === 'string' ? parseFloat(val) : Number(val);
    return isNaN(num) ? undefined : num;
  }).optional(),
  pvp: z.union([z.number(), z.string()]).transform(val => {
    if (val == null || val === '') return undefined;
    const num = typeof val === 'string' ? parseFloat(val) : Number(val);
    return isNaN(num) ? undefined : num;
  }).optional(),
  precioCoste: z.union([z.number(), z.string()]).transform(val => {
    if (val == null || val === '') return undefined;
    const num = typeof val === 'string' ? parseFloat(val) : Number(val);
    return isNaN(num) ? undefined : num;
  }).optional(),
  urlImage: z.union([z.string(), z.number()]).transform(val => val != null ? String(val) : undefined).optional(),
  familia: z.union([z.string(), z.number()]).transform(val => val != null ? String(val) : undefined).optional(),
  talla: z.union([z.string(), z.number()]).transform(val => val != null ? String(val) : undefined).optional(),
  color: z.union([z.string(), z.number()]).transform(val => val != null ? String(val) : undefined).optional(),
  temporada: z.union([z.string(), z.number()]).transform(val => val != null ? String(val) : undefined).optional(),
}).passthrough();

export type ProductosData = z.infer<typeof productosSchema>;

// Schema for Traspasos (Transfers) data
export const traspasosSchema = z.object({
  act: z.union([z.string(), z.number()]).transform(val => val != null ? String(val) : undefined).optional(),
  codigoUnico: z.union([z.string(), z.number()]).transform(val => val != null ? String(val) : undefined).optional(),
  enviado: z.union([z.number(), z.string()]).transform(val => {
    if (val == null || val === '') return undefined;
    const num = typeof val === 'string' ? parseFloat(val) : Number(val);
    return isNaN(num) ? undefined : num;
  }).optional(),
  tienda: z.union([z.string(), z.number()]).transform(val => val != null ? String(val) : undefined).optional(),
  fechaEnviado: z.union([z.string(), z.date(), z.number()]).transform(val => {
    if (!val) return undefined;
    if (val instanceof Date) return val.toISOString();
    if (typeof val === 'number') return new Date(val).toISOString();
    return String(val);
  }).optional(),
  urlImage: z.union([z.string(), z.number()]).transform(val => val != null ? String(val) : undefined).optional(),
}).passthrough();

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
