import * as XLSX from 'xlsx';
import type { VentasData, ProductosData, TraspasosData } from '@shared/schema';

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
    const value = row[excelCol];
    // Only include non-empty values
    if (value !== undefined && value !== null && value !== '') {
      // Convert to string and trim if it's a string
      mapped[schemaCol] = typeof value === 'string' ? value.trim() : value;
    }
  }
  return mapped;
}

function cleanNumericValue(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : Number(value);
  return isNaN(num) ? undefined : num;
}

function formatDate(excelDate: any): string {
  try {
    if (!excelDate) return new Date().toISOString().split('T')[0];
    
    // If it's already a string in DD/MM/YYYY format
    if (typeof excelDate === 'string') {
      // Handle DD/MM/YYYY format
      const slashParts = excelDate.split('/');
      if (slashParts.length === 3) {
        const [day, month, year] = slashParts;
        const fullYear = year.length === 2 ? `20${year}` : year;
        return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      // Handle YYYY-MM-DD format (already ISO)
      if (excelDate.match(/^\d{4}-\d{2}-\d{2}/)) {
        return excelDate.split('T')[0]; // Remove time part if present
      }
    }
    
    // If it's an Excel serial number
    if (typeof excelDate === 'number') {
      const date = XLSX.SSF.parse_date_code(excelDate);
      const year = date.y;
      const month = String(date.m).padStart(2, '0');
      const day = String(date.d).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // If it's a Date object
    if (excelDate instanceof Date) {
      const year = excelDate.getFullYear();
      const month = String(excelDate.getMonth() + 1).padStart(2, '0');
      const day = String(excelDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Fallback: try to parse as date
    const parsed = new Date(excelDate);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    return new Date().toISOString().split('T')[0];
  } catch (error) {
    console.error('Error formatting date:', excelDate, error);
    return new Date().toISOString().split('T')[0];
  }
}

export function processExcelFile(buffer: Buffer): {
  ventas: VentasData[];
  productos: ProductosData[];
  traspasos: TraspasosData[];
  sheets: string[];
} {
  console.log('Reading workbook...');
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheets = workbook.SheetNames;
  console.log('Workbook read successfully, sheets:', sheets);

  let ventas: VentasData[] = [];
  let productos: ProductosData[] = [];
  let traspasos: TraspasosData[] = [];

  // Process Ventas sheet - look for sheet containing "ventas" in name
  const ventasSheetName = sheets.find(s => s.toLowerCase().includes('ventas')) || sheets[0];
  if (ventasSheetName) {
    console.log(`Processing ventas sheet: ${ventasSheetName}...`);
    const ventasSheet = workbook.Sheets[ventasSheetName];
    console.log('Converting ventas sheet to JSON...');
    const ventasRaw = XLSX.utils.sheet_to_json(ventasSheet, { defval: null });
    console.log(`Ventas raw rows: ${ventasRaw.length}`);
    
    // Log first row to see actual column names
    let effectiveMapping = COLUMN_MAPPINGS.ventas;
    if (ventasRaw.length > 0) {
      const firstRow = ventasRaw[0] as any;
      const actualColumns = Object.keys(firstRow);
      console.log('Sample row columns:', actualColumns);
      console.log('Sample row data (first 500 chars):', JSON.stringify(firstRow, null, 2).substring(0, 500));
      
      // Check if we have any matches - if not, try to auto-detect
      const mappingMatches = Object.keys(effectiveMapping).filter(key => actualColumns.includes(key));
      console.log(`Column mapping matches: ${mappingMatches.length} out of ${Object.keys(effectiveMapping).length}`);
      console.log(`Matched columns: ${mappingMatches.join(', ')}`);
      
      if (mappingMatches.length < 3 && actualColumns.length > 0) {
        console.log('Few column matches found, attempting auto-detection...');
        // Try to find columns by common patterns
        // Primero procesar columnas con "descripcion" para priorizar nombres sobre códigos
        const autoMapping: Record<string, string> = {};
        
        // Primera pasada: procesar columnas de descripción primero
        for (const col of actualColumns) {
          const colLower = col.toLowerCase().trim();
          if (colLower.includes('descripcion') && colLower.includes('familia')) {
            autoMapping[col] = 'descripcionFamilia';
          } else if (colLower.includes('descripcion') && colLower.includes('color')) {
            autoMapping[col] = 'color';
          }
        }
        
        // Segunda pasada: procesar el resto de columnas
        for (const col of actualColumns) {
          const colLower = col.toLowerCase().trim();
          if ((colLower.includes('artículo') || colLower.includes('articulo')) && !colLower.includes('modelo')) {
            autoMapping[col] = 'codigoUnico';
          } else if (colLower === 'cantidad' || (colLower.includes('cantidad') && !colLower.includes('pedida'))) {
            autoMapping[col] = 'cantidad';
          } else if (colLower.includes('p.v.p') || colLower === 'pvp' || colLower.includes('precio venta')) {
            autoMapping[col] = 'pvp';
          } else if (colLower === 'subtotal' || colLower.includes('subtotal')) {
            autoMapping[col] = 'subtotal';
          } else if ((colLower.includes('fecha') || colLower.includes('date')) && !colLower.includes('presupuesto') && !colLower.includes('tope') && !colLower.includes('entrada')) {
            autoMapping[col] = 'fechaVenta';
          } else if (colLower === 'nombretpv' || (colLower.includes('nombre') && colLower.includes('tpv'))) {
            autoMapping[col] = 'tienda';
          } else if (colLower === 'tpv' && !colLower.includes('origen') && !colLower.includes('destino')) {
            autoMapping[col] = 'codigoTienda';
          } else if (colLower === 'temporada' || colLower.includes('temporada')) {
            autoMapping[col] = 'temporada';
          } else if (colLower === 'familia' && !colLower.includes('descripcion')) {
            // Solo mapear como 'familia' si no hay otra columna que sea descripcionFamilia
            if (!Object.values(autoMapping).includes('descripcionFamilia')) {
              autoMapping[col] = 'familia';
            }
          } else if (colLower === 'talla' || colLower.includes('talla')) {
            autoMapping[col] = 'talla';
          } else if (colLower === 'color' && !colLower.includes('descripcion') && !autoMapping[col]) {
            autoMapping[col] = 'color';
          } else if (colLower.includes('precio coste') || colLower.includes('precio coste') || colLower.includes('coste')) {
            autoMapping[col] = 'precioCoste';
          } else if (colLower.includes('url_image') || colLower === 'url_image') {
            autoMapping[col] = 'urlImage';
          } else if (colLower.includes('url_thumbnail') || colLower === 'url_thumbnail') {
            autoMapping[col] = 'urlThumbnail';
          }
        }
        if (Object.keys(autoMapping).length > 0) {
          console.log('Auto-detected mappings:', autoMapping);
          effectiveMapping = { ...effectiveMapping, ...autoMapping };
        }
      }
    }
    
    ventas = ventasRaw
      .map((row: any, index: number) => {
        try {
          const mapped = mapRow(row, effectiveMapping);
          
          // Clean and convert numeric fields
          mapped.cantidad = cleanNumericValue(mapped.cantidad) || 0;
          mapped.pvp = cleanNumericValue(mapped.pvp);
          mapped.subtotal = cleanNumericValue(mapped.subtotal) || 0;
          mapped.precioCoste = cleanNumericValue(mapped.precioCoste);
          
          // Format date
          if (mapped.fechaVenta) {
            mapped.fechaVenta = formatDate(mapped.fechaVenta);
          }
          
          // Add computed fields
          if (mapped.fechaVenta) {
            try {
              const date = new Date(mapped.fechaVenta);
              if (!isNaN(date.getTime())) {
                mapped.mes = date.toLocaleString('es-ES', { month: 'short', year: 'numeric' });
              }
            } catch (error) {
              // Silently ignore mes computation errors
            }
          }
          
          mapped.esOnline = mapped.tienda ? TIENDAS_ONLINE.includes(mapped.tienda) : false;
          
          return mapped as VentasData;
        } catch (error) {
          console.error(`Error processing ventas row ${index}:`, error);
          return null;
        }
      })
      .filter((v: VentasData | null): v is VentasData => {
        // Filter out null rows (errors), empty rows and excluded stores
        // But be more lenient - only require tienda and some data
        if (v === null) return false;
        if (!v.tienda || v.tienda.trim() === '') {
          if (v.cantidad > 0 || v.subtotal > 0) {
            console.warn(`Row filtered: missing tienda but has data. cantidad=${v.cantidad}, subtotal=${v.subtotal}`);
          }
          return false;
        }
        if (TIENDAS_A_ELIMINAR.includes(v.tienda)) return false;
        // Allow rows even if cantidad is 0, as long as there's a subtotal
        if (v.cantidad === 0 && (!v.subtotal || v.subtotal === 0)) return false;
        return true;
      });
    
    console.log(`Processed ${ventas.length} ventas records after filtering`);
  }

  // Process Productos/Compra sheet
  const productosSheetName = sheets.find(s => s.toLowerCase().includes('compra')) || sheets[1];
  if (productosSheetName) {
    const productosSheet = workbook.Sheets[productosSheetName];
    const productosRaw = XLSX.utils.sheet_to_json(productosSheet, { defval: null });
    
    productos = productosRaw
      .map((row: any, index: number) => {
        try {
          const mapped = mapRow(row, COLUMN_MAPPINGS.productos);
          
          // Clean and convert numeric fields
          mapped.cantidadPedida = cleanNumericValue(mapped.cantidadPedida);
          mapped.pvp = cleanNumericValue(mapped.pvp);
          mapped.precioCoste = cleanNumericValue(mapped.precioCoste);
          
          return mapped as ProductosData;
        } catch (error) {
          console.error(`Error processing productos row ${index}:`, error);
          return null;
        }
      })
      .filter((p: ProductosData | null): p is ProductosData => {
        return p !== null && p.codigoUnico && p.codigoUnico.trim() !== '';
      });
  }

  // Process Traspasos sheet
  const traspasosSheetName = sheets.find(s => s.toLowerCase().includes('traspasos')) || sheets[2];
  if (traspasosSheetName) {
    const traspasosSheet = workbook.Sheets[traspasosSheetName];
    const traspasosRaw = XLSX.utils.sheet_to_json(traspasosSheet, { defval: null });
    
    traspasos = traspasosRaw
      .map((row: any, index: number) => {
        try {
          const mapped = mapRow(row, COLUMN_MAPPINGS.traspasos);
          
          // Clean and convert numeric fields
          mapped.enviado = cleanNumericValue(mapped.enviado);
          
          // Format date
          if (mapped.fechaEnviado) {
            mapped.fechaEnviado = formatDate(mapped.fechaEnviado);
          }
          
          return mapped as TraspasosData;
        } catch (error) {
          console.error(`Error processing traspasos row ${index}:`, error);
          return null;
        }
      })
      .filter((t: TraspasosData | null): t is TraspasosData => {
        return t !== null && t.tienda && !TIENDAS_A_ELIMINAR.includes(t.tienda);
      });
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
