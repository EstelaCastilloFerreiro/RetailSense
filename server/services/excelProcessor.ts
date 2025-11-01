import * as XLSX from 'xlsx';
import type { VentasData, ProductosData, TraspasosData } from '@shared/schema';

// Column mapping for Spanish Excel headers to our schema
const COLUMN_MAPPINGS = {
  ventas: {
    'ACT': 'act',
    'Código único': 'codigoUnico',
    'Cantidad': 'cantidad',
    'P.V.P.': 'pvp',
    'Subtotal': 'subtotal',
    'Fecha venta': 'fechaVenta',
    'Tienda': 'tienda',
    'Código Tienda': 'codigoTienda',
    'Temporada': 'temporada',
    'Familia': 'familia',
    'Descripción Familia': 'descripcionFamilia',
    'Talla': 'talla',
    'Color': 'color',
    'url_image': 'urlImage',
    'url_thumbnail': 'urlThumbnail',
    'Precio Coste': 'precioCoste',
  },
  productos: {
    'ACT': 'act',
    'Código único': 'codigoUnico',
    'Cantidad Pedida': 'cantidadPedida',
    'P.V.P.': 'pvp',
    'Precio Coste': 'precioCoste',
    'url_image': 'urlImage',
    'Familia': 'familia',
    'Talla': 'talla',
    'Color': 'color',
    'Temporada': 'temporada',
  },
  traspasos: {
    'ACT': 'act',
    'Código único': 'codigoUnico',
    'Enviado': 'enviado',
    'Tienda': 'tienda',
    'Fecha enviado': 'fechaEnviado',
    'url_image': 'urlImage',
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
      mapped[schemaCol] = row[excelCol];
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
  if (!excelDate) return new Date().toISOString();
  
  // If it's already a string in DD/MM/YYYY format
  if (typeof excelDate === 'string') {
    const parts = excelDate.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return new Date(`${year}-${month}-${day}`).toISOString();
    }
  }
  
  // If it's an Excel serial number
  if (typeof excelDate === 'number') {
    const date = XLSX.SSF.parse_date_code(excelDate);
    return new Date(date.y, date.m - 1, date.d).toISOString();
  }
  
  return new Date(excelDate).toISOString();
}

export function processExcelFile(buffer: Buffer): {
  ventas: VentasData[];
  productos: ProductosData[];
  traspasos: TraspasosData[];
  sheets: string[];
} {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheets = workbook.SheetNames;

  let ventas: VentasData[] = [];
  let productos: ProductosData[] = [];
  let traspasos: TraspasosData[] = [];

  // Process Ventas sheet
  const ventasSheetName = sheets.find(s => s.toLowerCase().includes('ventas')) || sheets[0];
  if (ventasSheetName) {
    const ventasSheet = workbook.Sheets[ventasSheetName];
    const ventasRaw = XLSX.utils.sheet_to_json(ventasSheet, { defval: null });
    
    ventas = ventasRaw
      .map((row: any) => {
        const mapped = mapRow(row, COLUMN_MAPPINGS.ventas);
        
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
          const date = new Date(mapped.fechaVenta);
          mapped.mes = date.toLocaleString('es-ES', { month: 'short', year: 'numeric' });
        }
        
        mapped.esOnline = mapped.tienda ? TIENDAS_ONLINE.includes(mapped.tienda) : false;
        
        return mapped as VentasData;
      })
      .filter((v: VentasData) => {
        // Filter out empty rows and excluded stores
        return v.cantidad !== 0 && 
               v.tienda && 
               !TIENDAS_A_ELIMINAR.includes(v.tienda);
      });
  }

  // Process Productos/Compra sheet
  const productosSheetName = sheets.find(s => s.toLowerCase().includes('compra')) || sheets[1];
  if (productosSheetName) {
    const productosSheet = workbook.Sheets[productosSheetName];
    const productosRaw = XLSX.utils.sheet_to_json(productosSheet, { defval: null });
    
    productos = productosRaw
      .map((row: any) => {
        const mapped = mapRow(row, COLUMN_MAPPINGS.productos);
        
        // Clean and convert numeric fields
        mapped.cantidadPedida = cleanNumericValue(mapped.cantidadPedida);
        mapped.pvp = cleanNumericValue(mapped.pvp);
        mapped.precioCoste = cleanNumericValue(mapped.precioCoste);
        
        return mapped as ProductosData;
      })
      .filter((p: ProductosData) => p.codigoUnico); // Filter rows without codigo unico
  }

  // Process Traspasos sheet
  const traspasosSheetName = sheets.find(s => s.toLowerCase().includes('traspasos')) || sheets[2];
  if (traspasosSheetName) {
    const traspasosSheet = workbook.Sheets[traspasosSheetName];
    const traspasosRaw = XLSX.utils.sheet_to_json(traspasosSheet, { defval: null });
    
    traspasos = traspasosRaw
      .map((row: any) => {
        const mapped = mapRow(row, COLUMN_MAPPINGS.traspasos);
        
        // Clean and convert numeric fields
        mapped.enviado = cleanNumericValue(mapped.enviado);
        
        // Format date
        if (mapped.fechaEnviado) {
          mapped.fechaEnviado = formatDate(mapped.fechaEnviado);
        }
        
        return mapped as TraspasosData;
      })
      .filter((t: TraspasosData) => t.tienda && !TIENDAS_A_ELIMINAR.includes(t.tienda));
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
