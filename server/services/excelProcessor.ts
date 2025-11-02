import * as XLSX from 'xlsx';
import type { VentasData, ProductosData, TraspasosData } from '@shared/schema';
import { ventasSchema, productosSchema, traspasosSchema } from '@shared/schema';

// Column mapping for Spanish Excel headers to our schema
// Updated to match actual Excel file structure from TRUCCO data
const COLUMN_MAPPINGS = {
  ventas: {
    'ACT': 'act',
    'Artículo': 'codigoUnico', // "Artículo" is the unique product code
    'Cantidad': 'cantidad',
    'P.V.P.': 'pvp',
    'Subtotal': 'subtotal',
    'Fecha Documento': 'fechaVenta', // "Fecha Documento" is the sale date
    'NombreTPV': 'tienda', // "NombreTPV" is the store name
    'TPV': 'codigoTienda', // "TPV" is the store code
    'Temporada': 'temporada',
    'Familia': 'familia',
    'Descripción Familia': 'descripcionFamilia',
    'Talla': 'talla',
    'Descripción Color': 'color', // Use "Descripción Color" for color
    'url_image': 'urlImage',
    'url_thumbnail': 'urlThumbnail',
    'Precio Coste': 'precioCoste',
  },
  productos: {
    'ACT': 'act',
    'Artículo': 'codigoUnico',
    'Cantidad Pedida': 'cantidadPedida',
    'P.V.P.': 'pvp',
    'Precio Coste': 'precioCoste',
    'Talla': 'talla',
    'Descripción Color': 'color',
    'Temporada': 'temporada',
    'Familia': 'familia', // Note: Familia might not be in Compra sheet, but adding for compatibility
  },
  traspasos: {
    'ACT': 'act',
    'Artículo': 'codigoUnico',
    'Enviado': 'enviado',
    'NombreTpvDestino': 'tienda', // Destination store name
    'Fecha Documento': 'fechaEnviado',
  },
};

const TIENDAS_ONLINE = [
  'ECI NAELLE ONLINE',
  'ECI ONLINE GESTION',
  'ET0N ECI ONLINE',
  'NAELLE ONLINE B2C',
  'OUTLET TRUCCO ONLINE B2O',
  'TRUCCO ONLINE B2C',
];

const TIENDAS_A_ELIMINAR = [
  'COMODIN',
  'R998- PILOTO',
  'ECI ONLINE GESTION',
  'W001 DEVOLUCIONES WEB (NO ENVIAR TRASP)',
];

function mapRow(row: any, mapping: Record<string, string>): any {
  const mapped: any = {};
  for (const [excelCol, schemaCol] of Object.entries(mapping)) {
    if (row[excelCol] !== undefined && row[excelCol] !== null && row[excelCol] !== '') {
      // Convert to string for string fields, but preserve other types
      let value = row[excelCol];
      
      // If it's a number but we're mapping to a string field, convert it
      // But don't convert if it's a date field (we'll handle that separately)
      if (typeof value === 'number' && !schemaCol.includes('fecha')) {
        value = String(value);
      }
      
      mapped[schemaCol] = value;
    }
  }
  return mapped;
}

function cleanNumericValue(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  
  try {
    let cleaned: string | number = value;
    
    if (typeof cleaned === 'string') {
      // Remove spaces and replace comma with dot for European number format
      cleaned = cleaned.trim().replace(/\s/g, '').replace(',', '.');
      // Remove currency symbols and other non-numeric characters except dots and minus
      cleaned = cleaned.replace(/[^\d.-]/g, '');
    }
    
    const num = typeof cleaned === 'string' ? parseFloat(cleaned) : Number(cleaned);
    return isNaN(num) ? undefined : num;
  } catch (error) {
    return undefined;
  }
}

function formatDate(excelDate: any): string {
  if (!excelDate) return new Date().toISOString();
  
  try {
    // If it's already a string in DD/MM/YYYY or DD-MM-YYYY format
    if (typeof excelDate === 'string') {
      // Try DD/MM/YYYY format
      const parts = excelDate.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts.map(p => p.trim());
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
      
      // Try DD-MM-YYYY format
      const parts2 = excelDate.split('-');
      if (parts2.length === 3) {
        const [day, month, year] = parts2.map(p => p.trim());
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
      
      // Try YYYY-MM-DD format
      const date = new Date(excelDate);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    
    // If it's an Excel serial number
    if (typeof excelDate === 'number') {
      try {
        const date = XLSX.SSF.parse_date_code(excelDate);
        if (date && date.y && date.m && date.d) {
          return new Date(date.y, date.m - 1, date.d).toISOString();
        }
      } catch (e) {
        // If parsing fails, try direct conversion
      }
    }
    
    // Try direct Date conversion
    const date = new Date(excelDate);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    
    throw new Error('Formato de fecha no reconocido');
  } catch (error: any) {
    console.warn(`Error formateando fecha: ${excelDate}`, error.message);
    return new Date().toISOString();
  }
}

export function processExcelFile(buffer: Buffer): {
  ventas: VentasData[];
  productos: ProductosData[];
  traspasos: TraspasosData[];
  sheets: string[];
} {
  if (!buffer || buffer.length === 0) {
    throw new Error('El archivo está vacío o no es válido');
  }

  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  } catch (error: any) {
    throw new Error(`Error al leer el archivo Excel: ${error.message || 'Formato de archivo no válido'}`);
  }

  if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('El archivo Excel no contiene hojas o está vacío');
  }

  const sheets = workbook.SheetNames;

  let ventas: VentasData[] = [];
  let productos: ProductosData[] = [];
  let traspasos: TraspasosData[] = [];

  // Process Ventas sheet
  try {
    const ventasSheetName = sheets.find(s => s.toLowerCase().includes('ventas')) || sheets[0];
    if (ventasSheetName) {
      const ventasSheet = workbook.Sheets[ventasSheetName];
      if (!ventasSheet) {
        throw new Error(`No se encontró la hoja "${ventasSheetName}"`);
      }
      
      const ventasRaw = XLSX.utils.sheet_to_json(ventasSheet, { defval: null });
      
      ventas = ventasRaw
        .map((row: any, index: number) => {
          try {
            const mapped = mapRow(row, COLUMN_MAPPINGS.ventas);
            
            // Clean and convert numeric fields - ensure they're numbers or undefined
            mapped.cantidad = cleanNumericValue(mapped.cantidad) ?? 0;
            mapped.subtotal = cleanNumericValue(mapped.subtotal) ?? 0;
            
            // Optional numeric fields should be undefined if not present, not 0
            if (mapped.pvp !== undefined) {
              mapped.pvp = cleanNumericValue(mapped.pvp);
            }
            if (mapped.precioCoste !== undefined) {
              mapped.precioCoste = cleanNumericValue(mapped.precioCoste);
            }
            
            // Ensure required fields are present
            if (!mapped.tienda || typeof mapped.tienda !== 'string') {
              mapped.tienda = '';
            }
            
            // Format date - ensure it's always a valid ISO string
            if (mapped.fechaVenta) {
              try {
                const formattedDate = formatDate(mapped.fechaVenta);
                // Validate the ISO string format
                if (formattedDate && typeof formattedDate === 'string' && formattedDate.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
                  mapped.fechaVenta = formattedDate;
                } else {
                  mapped.fechaVenta = new Date().toISOString();
                }
              } catch (e) {
                console.warn(`Fecha inválida en fila ${index + 2}: ${mapped.fechaVenta}`);
                mapped.fechaVenta = new Date().toISOString();
              }
            } else {
              // If fechaVenta is missing, set a default
              mapped.fechaVenta = new Date().toISOString();
            }
            
            // Add computed fields
            if (mapped.fechaVenta) {
              try {
                const date = new Date(mapped.fechaVenta);
                if (!isNaN(date.getTime())) {
                  mapped.mes = date.toLocaleString('es-ES', { month: 'short', year: 'numeric' });
                }
              } catch (e) {
                // Ignore date formatting errors
              }
            }
            
            mapped.esOnline = mapped.tienda ? Boolean(TIENDAS_ONLINE.includes(mapped.tienda)) : false;
            
            // NORMALIZE ALL FIELDS - Convert all to proper types BEFORE validation
            // Required string fields
            mapped.tienda = mapped.tienda ? String(mapped.tienda).trim() : '';
            mapped.fechaVenta = mapped.fechaVenta || new Date().toISOString();
            
            // Optional string fields - convert to string or remove if invalid
            if (mapped.act !== undefined && mapped.act !== null && mapped.act !== '') {
              mapped.act = String(mapped.act).trim();
            } else {
              delete mapped.act;
            }
            if (mapped.codigoUnico !== undefined && mapped.codigoUnico !== null && mapped.codigoUnico !== '') {
              mapped.codigoUnico = String(mapped.codigoUnico).trim();
            } else {
              delete mapped.codigoUnico;
            }
            if (mapped.codigoTienda !== undefined && mapped.codigoTienda !== null && mapped.codigoTienda !== '') {
              mapped.codigoTienda = String(mapped.codigoTienda).trim();
            } else {
              delete mapped.codigoTienda;
            }
            if (mapped.temporada !== undefined && mapped.temporada !== null && mapped.temporada !== '') {
              mapped.temporada = String(mapped.temporada).trim();
            } else {
              delete mapped.temporada;
            }
            if (mapped.familia !== undefined && mapped.familia !== null && mapped.familia !== '') {
              mapped.familia = String(mapped.familia).trim();
            } else {
              delete mapped.familia;
            }
            if (mapped.descripcionFamilia !== undefined && mapped.descripcionFamilia !== null && mapped.descripcionFamilia !== '') {
              mapped.descripcionFamilia = String(mapped.descripcionFamilia).trim();
            } else {
              delete mapped.descripcionFamilia;
            }
            if (mapped.talla !== undefined && mapped.talla !== null && mapped.talla !== '') {
              mapped.talla = String(mapped.talla).trim();
            } else {
              delete mapped.talla;
            }
            if (mapped.color !== undefined && mapped.color !== null && mapped.color !== '') {
              mapped.color = String(mapped.color).trim();
            } else {
              delete mapped.color;
            }
            if (mapped.urlImage !== undefined && mapped.urlImage !== null && mapped.urlImage !== '') {
              mapped.urlImage = String(mapped.urlImage).trim();
            } else {
              delete mapped.urlImage;
            }
            if (mapped.urlThumbnail !== undefined && mapped.urlThumbnail !== null && mapped.urlThumbnail !== '') {
              mapped.urlThumbnail = String(mapped.urlThumbnail).trim();
            } else {
              delete mapped.urlThumbnail;
            }
            if (mapped.mes !== undefined && mapped.mes !== null && mapped.mes !== '') {
              mapped.mes = String(mapped.mes).trim();
            } else {
              delete mapped.mes;
            }
            
            // Ensure numeric fields are proper numbers
            mapped.cantidad = typeof mapped.cantidad === 'number' && !isNaN(mapped.cantidad) ? mapped.cantidad : 0;
            mapped.subtotal = typeof mapped.subtotal === 'number' && !isNaN(mapped.subtotal) ? mapped.subtotal : 0;
            
            // Optional numeric fields - only include if they have valid values
            if (mapped.pvp !== undefined && mapped.pvp !== null) {
              const pvpNum = cleanNumericValue(mapped.pvp);
              if (pvpNum !== undefined && !isNaN(pvpNum)) {
                mapped.pvp = pvpNum;
              } else {
                delete mapped.pvp;
              }
            }
            if (mapped.precioCoste !== undefined && mapped.precioCoste !== null) {
              const costNum = cleanNumericValue(mapped.precioCoste);
              if (costNum !== undefined && !isNaN(costNum)) {
                mapped.precioCoste = costNum;
              } else {
                delete mapped.precioCoste;
              }
            }
            
            // Ensure boolean is boolean
            if (mapped.esOnline !== undefined) {
              mapped.esOnline = Boolean(mapped.esOnline);
            }
            
            // Validate with Zod schema - Zod will now transform types automatically
            const validation = ventasSchema.safeParse(mapped);
            if (!validation.success) {
              // Log error but don't throw - just skip this row
              const firstError = validation.error.errors[0];
              const errorPath = firstError.path.join('.') || 'unknown';
              console.warn(`⚠️  Fila ${index + 2} omitida: Error en campo "${errorPath}": ${firstError.message}`);
              console.warn(`   Valor: ${JSON.stringify(mapped[errorPath])}, Tipo: ${typeof mapped[errorPath]}`);
              return null;
            }
            
            return validation.data;
          } catch (error: any) {
            console.warn(`Error procesando fila ${index + 2} en hoja Ventas:`, error.message);
            return null;
          }
        })
        .filter((v: VentasData | null): v is VentasData => {
          // Filter out nulls, empty rows and excluded stores
          if (!v) return false;
          return v.cantidad !== 0 && 
                 v.tienda && 
                 !TIENDAS_A_ELIMINAR.includes(v.tienda);
        });
    }
  } catch (error: any) {
    console.error('Error procesando hoja Ventas:', error);
    // Continue processing other sheets even if Ventas fails
    if (ventas.length === 0) {
      throw new Error(`Error procesando hoja de Ventas: ${error.message}`);
    }
  }

  // Process Productos/Compra sheet
  try {
    const productosSheetName = sheets.find(s => s.toLowerCase().includes('compra')) || 
                              sheets.find(s => s.toLowerCase().includes('productos')) ||
                              sheets[1];
    if (productosSheetName && workbook.Sheets[productosSheetName]) {
      const productosSheet = workbook.Sheets[productosSheetName];
      const productosRaw = XLSX.utils.sheet_to_json(productosSheet, { defval: null });
      
      productos = productosRaw
        .map((row: any, index: number) => {
          try {
            const mapped = mapRow(row, COLUMN_MAPPINGS.productos);
            
            // codigoUnico is REQUIRED - skip if missing
            if (!mapped.codigoUnico || mapped.codigoUnico === null || mapped.codigoUnico === '') {
              return null;
            }
            
            // NORMALIZE ALL FIELDS
            mapped.codigoUnico = String(mapped.codigoUnico).trim();
            
            // Optional string fields
            if (mapped.act !== undefined && mapped.act !== null && mapped.act !== '') {
              mapped.act = String(mapped.act).trim();
            } else {
              delete mapped.act;
            }
            if (mapped.familia !== undefined && mapped.familia !== null && mapped.familia !== '') {
              mapped.familia = String(mapped.familia).trim();
            } else {
              delete mapped.familia;
            }
            if (mapped.talla !== undefined && mapped.talla !== null && mapped.talla !== '') {
              mapped.talla = String(mapped.talla).trim();
            } else {
              delete mapped.talla;
            }
            if (mapped.color !== undefined && mapped.color !== null && mapped.color !== '') {
              mapped.color = String(mapped.color).trim();
            } else {
              delete mapped.color;
            }
            if (mapped.temporada !== undefined && mapped.temporada !== null && mapped.temporada !== '') {
              mapped.temporada = String(mapped.temporada).trim();
            } else {
              delete mapped.temporada;
            }
            if (mapped.urlImage !== undefined && mapped.urlImage !== null && mapped.urlImage !== '') {
              mapped.urlImage = String(mapped.urlImage).trim();
            } else {
              delete mapped.urlImage;
            }
            
            // Numeric fields
            if (mapped.cantidadPedida !== undefined && mapped.cantidadPedida !== null) {
              const qty = cleanNumericValue(mapped.cantidadPedida);
              if (qty !== undefined && !isNaN(qty)) {
                mapped.cantidadPedida = qty;
              } else {
                delete mapped.cantidadPedida;
              }
            }
            if (mapped.pvp !== undefined && mapped.pvp !== null) {
              const pvpNum = cleanNumericValue(mapped.pvp);
              if (pvpNum !== undefined && !isNaN(pvpNum)) {
                mapped.pvp = pvpNum;
              } else {
                delete mapped.pvp;
              }
            }
            if (mapped.precioCoste !== undefined && mapped.precioCoste !== null) {
              const costNum = cleanNumericValue(mapped.precioCoste);
              if (costNum !== undefined && !isNaN(costNum)) {
                mapped.precioCoste = costNum;
              } else {
                delete mapped.precioCoste;
              }
            }
            
            // Validate with Zod schema
            const validation = productosSchema.safeParse(mapped);
            if (!validation.success) {
              const firstError = validation.error.errors[0];
              console.warn(`⚠️  Fila ${index + 2} de Productos omitida: ${firstError.message}`);
              return null;
            }
            
            return validation.data;
          } catch (error: any) {
            console.warn(`Error procesando fila ${index + 2} en hoja Productos:`, error.message);
            return null;
          }
        })
        .filter((p: ProductosData | null): p is ProductosData => p !== null && !!p.codigoUnico);
    }
  } catch (error: any) {
    console.warn('Error procesando hoja Productos/Compra:', error.message);
    // Continue even if productos sheet fails
  }

  // Process Traspasos sheet
  try {
    const traspasosSheetName = sheets.find(s => s.toLowerCase().includes('traspasos')) || sheets[2];
    if (traspasosSheetName && workbook.Sheets[traspasosSheetName]) {
      const traspasosSheet = workbook.Sheets[traspasosSheetName];
      const traspasosRaw = XLSX.utils.sheet_to_json(traspasosSheet, { defval: null });
      
      traspasos = traspasosRaw
        .map((row: any, index: number) => {
          try {
            const mapped = mapRow(row, COLUMN_MAPPINGS.traspasos);
            
            // Clean and convert numeric fields
            mapped.enviado = cleanNumericValue(mapped.enviado);
            
            // Format date - ensure it's always a valid ISO string if provided
            if (mapped.fechaEnviado) {
              try {
                const formattedDate = formatDate(mapped.fechaEnviado);
                // Validate the ISO string format
                if (formattedDate && typeof formattedDate === 'string' && formattedDate.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
                  mapped.fechaEnviado = formattedDate;
                } else {
                  // Invalid date, remove it
                  delete mapped.fechaEnviado;
                }
              } catch (e) {
                console.warn(`Fecha inválida en fila ${index + 2}: ${mapped.fechaEnviado}`);
                delete mapped.fechaEnviado;
              }
            }
            
            // NORMALIZE ALL FIELDS
            // Optional string fields
            if (mapped.act !== undefined && mapped.act !== null && mapped.act !== '') {
              mapped.act = String(mapped.act).trim();
            } else {
              delete mapped.act;
            }
            if (mapped.codigoUnico !== undefined && mapped.codigoUnico !== null && mapped.codigoUnico !== '') {
              mapped.codigoUnico = String(mapped.codigoUnico).trim();
            } else {
              delete mapped.codigoUnico;
            }
            if (mapped.tienda !== undefined && mapped.tienda !== null && mapped.tienda !== '') {
              mapped.tienda = String(mapped.tienda).trim();
            } else {
              delete mapped.tienda;
            }
            if (mapped.urlImage !== undefined && mapped.urlImage !== null && mapped.urlImage !== '') {
              mapped.urlImage = String(mapped.urlImage).trim();
            } else {
              delete mapped.urlImage;
            }
            
            // Numeric field
            if (mapped.enviado !== undefined && mapped.enviado !== null) {
              const enviadoNum = cleanNumericValue(mapped.enviado);
              if (enviadoNum !== undefined && !isNaN(enviadoNum)) {
                mapped.enviado = enviadoNum;
              } else {
                delete mapped.enviado;
              }
            }
            
            // Validate with Zod schema
            const validation = traspasosSchema.safeParse(mapped);
            if (!validation.success) {
              const firstError = validation.error.errors[0];
              console.warn(`⚠️  Fila ${index + 2} de Traspasos omitida: ${firstError.message}`);
              return null;
            }
            
            return validation.data;
          } catch (error: any) {
            console.warn(`Error procesando fila ${index + 2} en hoja Traspasos:`, error.message);
            return null;
          }
        })
        .filter((t: TraspasosData | null): t is TraspasosData => 
          t !== null && t.tienda && !TIENDAS_A_ELIMINAR.includes(t.tienda)
        );
    }
  } catch (error: any) {
    console.warn('Error procesando hoja Traspasos:', error.message);
    // Continue even if traspasos sheet fails
  }

  if (ventas.length === 0 && productos.length === 0 && traspasos.length === 0) {
    throw new Error('No se encontraron datos válidos en el archivo. Verifique que el archivo contenga hojas con datos de Ventas, Compra o Traspasos.');
  }

  return { ventas, productos, traspasos, sheets };
}

// Helper to detect column structure and create client-specific mapping
export function detectColumnStructure(buffer: Buffer): {
  detectedColumns: Record<string, string[]>;
  suggestedMappings: Record<string, Record<string, string>>;
} {
  const workbook = XLSX.read(buffer, { type: 'buffer', sheetRows: 1 });
  const detectedColumns: Record<string, string[]> = {};
  const suggestedMappings: Record<string, Record<string, string>> = {};

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] as string[];
    detectedColumns[sheetName] = headers;
    
    // Auto-detect which mapping to use
    let mapping = {};
    if (sheetName.toLowerCase().includes('ventas')) {
      mapping = COLUMN_MAPPINGS.ventas;
    } else if (sheetName.toLowerCase().includes('compra')) {
      mapping = COLUMN_MAPPINGS.productos;
    } else if (sheetName.toLowerCase().includes('traspasos')) {
      mapping = COLUMN_MAPPINGS.traspasos;
    }
    
    suggestedMappings[sheetName] = mapping;
  }

  return { detectedColumns, suggestedMappings };
}
