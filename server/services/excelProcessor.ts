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
    // Mapeos para fechaAlmacen - múltiples variaciones posibles
    // IMPORTANTE: Streamlit usa 'Fecha almacén' (sin "REAL entrada en")
    'Fecha almacén': 'fechaAlmacen', // Versión corta - PRIMARIA
    'Fecha almacen': 'fechaAlmacen', // Sin tilde
    'Fecha REAL entrada en almacén': 'fechaAlmacen', // Versión completa
    'Fecha REAL entrada en almacen': 'fechaAlmacen', // Sin tilde
    'Fecha Real Entrada en Almacén': 'fechaAlmacen', // Variación de mayúsculas
    'Fecha Real Entrada en Almacen': 'fechaAlmacen', // Sin tilde y variación mayúsculas
    'Fecha real entrada en almacén': 'fechaAlmacen', // Todo minúsculas
    'Fecha real entrada en almacen': 'fechaAlmacen', // Todo minúsculas sin tilde
    'FECHA REAL ENTRADA EN ALMACÉN': 'fechaAlmacen', // Todo mayúsculas
    'FECHA REAL ENTRADA EN ALMACEN': 'fechaAlmacen', // Todo mayúsculas sin tilde
    'FECHA ALMACÉN': 'fechaAlmacen', // Todo mayúsculas corta
    'FECHA ALMACEN': 'fechaAlmacen', // Todo mayúsculas corta sin tilde
    'Fecha REAL entrada en Almacén': 'fechaAlmacen', // Mezcla
    'Fecha REAL entrada en Almacen': 'fechaAlmacen', // Mezcla sin tilde
    'Talla': 'talla',
    'Descripción Color': 'color',
    'Temporada': 'temporada',
    'Familia': 'familia', // Note: Familia might not be in Compra sheet, but adding for compatibility
    'Tema': 'tema', // Tema_temporada from Excel
    'Tema_temporada': 'tema', // Alternative name
    'Tema Temporada': 'tema', // Alternative name
  },
  traspasos: {
    'ACT': 'act',
    'Artículo': 'codigoUnico',
    'Enviado': 'enviado',
    'NombreTpvDestino': 'tienda', // Destination store name
    'Fecha Documento': 'fechaEnviado',
    'Talla': 'talla', // Talla del producto traspasado
  },
};

// Note: Online stores are now identified dynamically by checking if 'ONLINE' is in the store name
// This matches Streamlit's logic: df_ventas['Es_Online'] = df_ventas['Tienda'].str.contains('ONLINE', case=False, na=False)

const TIENDAS_A_ELIMINAR = [
  'COMODIN',
  'R998- PILOTO',
  'ECI ONLINE GESTION',
  'W001 DEVOLUCIONES WEB (NO ENVIAR TRASP)',
];

function mapRow(row: any, mapping: Record<string, string>): any {
  const mapped: any = {};
  
  // Primero aplicar mapeo exacto
  for (const [excelCol, schemaCol] of Object.entries(mapping)) {
    const value = row[excelCol];
    // Incluir valores incluso si están vacíos, pero no si son undefined
    if (value !== undefined && value !== null) {
      // Convertir a string y trim si es string
      mapped[schemaCol] = typeof value === 'string' ? value.trim() : value;
    }
  }
  
  // También buscar con normalización (case insensitive) si no se encontró en el mapeo exacto
  // Esto es especialmente útil para fechaAlmacen que puede tener variaciones
  const mappedKeys = new Set(Object.values(mapping));
  for (const [excelCol, schemaCol] of Object.entries(mapping)) {
    if (mapped[schemaCol] === undefined) {
      // Buscar en el row con normalización
      const excelColLower = excelCol.trim().toLowerCase();
      for (const [rowKey, rowValue] of Object.entries(row)) {
        if (rowKey.trim().toLowerCase() === excelColLower && rowValue !== undefined && rowValue !== null) {
          mapped[schemaCol] = typeof rowValue === 'string' ? rowValue.trim() : rowValue;
          break;
        }
      }
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
    if (!excelDate) return '';
    
    // Si es un objeto Date válido, convertir directamente
    if (excelDate instanceof Date) {
      if (isNaN(excelDate.getTime())) return '';
      return excelDate.toISOString().split('T')[0];
    }
    
    // Si es un número de Excel (serial date), convertirlo
    if (typeof excelDate === 'number') {
      // Primero intentar con XLSX.SSF si está disponible
      try {
        if (XLSX.SSF && XLSX.SSF.parse_date_code) {
      const date = XLSX.SSF.parse_date_code(excelDate);
          if (date && date.y && date.m && date.d) {
      const year = date.y;
      const month = String(date.m).padStart(2, '0');
      const day = String(date.d).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
        }
      } catch (e) {
        // Si falla, usar método alternativo
      }
      // Método alternativo: Excel serial date (número de días desde el 1 de enero de 1900)
      // Excel cuenta desde el 30 de diciembre de 1899, pero hay un bug conocido del año 1900
      const excelEpoch = new Date(1899, 11, 30); // 30 de diciembre de 1899
      const date = new Date(excelEpoch.getTime() + (excelDate - 1) * 24 * 60 * 60 * 1000);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    
    // If it's already a string
    if (typeof excelDate === 'string') {
      const trimmed = excelDate.trim();
      if (!trimmed) return '';
      
      // Handle YYYY-MM-DD format (already ISO)
      if (trimmed.match(/^\d{4}-\d{2}-\d{2}/)) {
        return trimmed.split('T')[0].split(' ')[0]; // Remove time part if present
      }
      
      // Handle DD/MM/YYYY format
      const slashParts = trimmed.split('/');
      if (slashParts.length === 3) {
        const [day, month, year] = slashParts.map(p => p.trim());
        const fullYear = year.length === 2 ? `20${year}` : year;
        const parsedDate = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString().split('T')[0];
        }
      }
      
      // Handle DD-MM-YYYY format
      const dashParts = trimmed.split('-');
      if (dashParts.length === 3 && dashParts[0].length <= 2) {
        const [day, month, year] = dashParts.map(p => p.trim());
        const fullYear = year.length === 2 ? `20${year}` : year;
        const parsedDate = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString().split('T')[0];
        }
      }
      
      // Intentar parsear como fecha estándar (último recurso)
      const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }
    
    return '';
  } catch (error) {
    console.error('Error formatting date:', error, 'Value:', excelDate, 'Type:', typeof excelDate);
    return '';
  }
}

export function processExcelFile(buffer: Buffer): {
  ventas: VentasData[];
  productos: ProductosData[];
  traspasos: TraspasosData[];
  sheets: string[];
} {
  console.log('Reading workbook...');
  // Leer con cellDates: true para convertir fechas automáticamente
  const workbook = XLSX.read(buffer, { 
    type: 'buffer', 
    cellDates: true,
    cellNF: false,
    cellText: false
  });
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
    
    const ventasWithData = ventasRaw
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
          
          // Match Streamlit logic: check if 'ONLINE' is in store name (case-insensitive)
          mapped.esOnline = mapped.tienda ? mapped.tienda.toUpperCase().includes('ONLINE') : false;
          
          return mapped as VentasData;
        } catch (error) {
          console.error(`Error processing ventas row ${index}:`, error);
          return null;
        }
      });
    
    // Count excluded stores before filtering (for performance logging)
    const excludedStoresCount = new Map<string, number>();
    let totalBeforeFilter = ventasWithData.length;
    
    ventas = ventasWithData.filter((v: VentasData | null): v is VentasData => {
        // Filter out null rows (errors), empty rows and excluded stores
        // But be more lenient - only require tienda and some data
        if (v === null) return false;
        if (!v.tienda || v.tienda.trim() === '') {
          return false;
        }
        // Match Streamlit: exclude specific stores (with trim to handle whitespace)
        const tiendaTrimmed = v.tienda.trim();
        if (TIENDAS_A_ELIMINAR.includes(tiendaTrimmed)) {
          excludedStoresCount.set(tiendaTrimmed, (excludedStoresCount.get(tiendaTrimmed) || 0) + 1);
          return false;
        }
        // Allow rows even if cantidad is 0, as long as there's a subtotal
        if (v.cantidad === 0 && (!v.subtotal || v.subtotal === 0)) return false;
        return true;
      });
    
    console.log(`✅ Processed ${ventas.length} ventas records after filtering (${totalBeforeFilter - ventas.length} excluded)`);
    if (excludedStoresCount.size > 0) {
      console.log(`📊 Excluded stores summary:`, Object.fromEntries(excludedStoresCount));
    }
  }

  // Process Productos/Compra sheet
  const productosSheetName = sheets.find(s => s.toLowerCase().includes('compra')) || sheets[1];
  if (productosSheetName) {
    const productosSheet = workbook.Sheets[productosSheetName];
    
    // Declarar fechaAlmacenColumn al inicio para que esté disponible en todo el scope
    let fechaAlmacenColumn: string | null = null;
    
    // Primero obtener las columnas del header para detectar fechaAlmacen antes de convertir
    const range = XLSX.utils.decode_range(productosSheet['!ref'] || 'A1');
    const headerRow: string[] = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: C });
      const cell = productosSheet[cellAddress];
      if (cell) {
        headerRow.push(cell.v ? String(cell.v).trim() : '');
      } else {
        headerRow.push('');
      }
    }
    
    console.log('📦 Headers originales del sheet:', headerRow);
    
    // Leer con raw: false y cellDates: true para detectar fechas automáticamente
    const productosRaw = XLSX.utils.sheet_to_json(productosSheet, { 
      defval: null,
      raw: false, // Convertir valores a strings/texto en lugar de números raw
      dateNF: 'dd/mm/yyyy', // Formato de fecha esperado
      cellDates: true, // Intentar detectar fechas automáticamente
      cellText: false // No usar valores de texto, usar valores convertidos
    });
    
    // Siempre detectar fechaAlmacenColumn basándose en los headers, incluso si no hay datos
    // Esto es crítico porque fechaAlmacenColumn se usa más adelante en el procesamiento
    let actualColumns: string[] = [];
    let firstRow: any = null;
    
    if (productosRaw.length > 0) {
      firstRow = productosRaw[0] as any;
      actualColumns = Object.keys(firstRow);
      console.log('📦 Productos sheet columns (desde JSON):', actualColumns);
      console.log('📦 Headers originales:', headerRow);
      console.log('📦 Sample productos row:', JSON.stringify(firstRow, null, 2).substring(0, 500));
    } else {
      // Si no hay datos, usar los headers como columnas disponibles
      actualColumns = headerRow.filter(h => h.trim() !== '');
      console.log('⚠️ No hay datos en productosRaw, usando headers como columnas:', actualColumns);
    }
    
    // Normalizar headers para comparación (eliminar espacios extra, convertir a minúsculas)
    const normalizedHeaders = headerRow.map(h => h.trim().toLowerCase());
    const normalizedActualColumns = actualColumns.map(c => c.trim().toLowerCase());
    
    // Buscar fechaAlmacenColumn usando múltiples estrategias (SIEMPRE ejecutar, incluso sin datos)
    if (actualColumns.length > 0 || headerRow.length > 0) {
      
      // Estrategia 1: Buscar coincidencia exacta en el mapeo (comparando normalizado)
      for (const col of actualColumns) {
        const normalizedCol = col.trim().toLowerCase();
        // Buscar en el mapeo con normalización
        for (const [mapKey, mapValue] of Object.entries(COLUMN_MAPPINGS.productos)) {
          if (mapValue === 'fechaAlmacen' && normalizedCol === mapKey.trim().toLowerCase()) {
            fechaAlmacenColumn = col;
            console.log(`✅ Encontrada columna fechaAlmacen exacta: "${col}" (mapeada desde "${mapKey}")`);
            break;
          }
        }
        if (fechaAlmacenColumn) break;
      }
      
      // Estrategia 2: Buscar por patrones en headers originales Y en columnas JSON
      // IMPORTANTE: Priorizar "Fecha almacén" (sin "REAL entrada en") como Streamlit
      if (!fechaAlmacenColumn) {
        const allPossibleColumns = [...new Set([...headerRow, ...actualColumns])];
        
        // Primero buscar la versión corta "Fecha almacén" (prioridad)
        const fechaAlmacenKeys = allPossibleColumns.filter(col => {
          const colLower = col.trim().toLowerCase();
          // Prioridad 1: Versión corta exacta "fecha almacén" o "fecha almacen"
          if (colLower === 'fecha almacén' || colLower === 'fecha almacen') {
            return true;
          }
          // Prioridad 2: Contiene "fecha" y "almacén" pero NO contiene "real" ni "entrada"
          if (colLower.includes('fecha') && (colLower.includes('almacén') || colLower.includes('almacen'))) {
            if (!colLower.includes('real') && !colLower.includes('entrada')) {
              return true;
            }
          }
          // Prioridad 3: Versión completa con "real entrada"
          return (
            (colLower.includes('fecha') && colLower.includes('real') && colLower.includes('entrada')) ||
            colLower.includes('fecha_real_entrada') ||
            colLower.includes('fecha real entrada en almacén') ||
            colLower.includes('fecha real entrada en almacen')
          );
        });
        
        console.log('📦 Columnas con "fecha" y "almacén" encontradas:', fechaAlmacenKeys);
        
        if (fechaAlmacenKeys.length > 0) {
          // Priorizar versión corta si existe
          let foundCol = fechaAlmacenKeys.find(col => {
            const colLower = col.trim().toLowerCase();
            return colLower === 'fecha almacén' || colLower === 'fecha almacen';
          });
          
          // Si no hay versión corta, buscar versión sin "real entrada"
          if (!foundCol) {
            foundCol = fechaAlmacenKeys.find(col => {
              const colLower = col.trim().toLowerCase();
              return colLower.includes('fecha') && 
                     (colLower.includes('almacén') || colLower.includes('almacen')) &&
                     !colLower.includes('real') && 
                     !colLower.includes('entrada');
            });
          }
          
          // Si aún no hay, usar la primera encontrada
          if (!foundCol) {
            foundCol = fechaAlmacenKeys[0];
          }
          
          // Usar la columna que existe en actualColumns
          const foundColInActual = actualColumns.find(c => 
            c.trim().toLowerCase() === foundCol.trim().toLowerCase()
          ) || foundCol;
          
          fechaAlmacenColumn = foundColInActual;
          console.log(`✅ Auto-mapeando "${fechaAlmacenColumn}" a fechaAlmacen`);
          // Asegurarse de que el mapeo esté configurado
          COLUMN_MAPPINGS.productos[fechaAlmacenColumn] = 'fechaAlmacen';
          // También mapear todas las variaciones posibles
          fechaAlmacenKeys.forEach(key => {
            if (!COLUMN_MAPPINGS.productos[key]) {
              COLUMN_MAPPINGS.productos[key] = 'fechaAlmacen';
            }
          });
        }
      }
      
      // Estrategia 3: Buscar cualquier columna que contenga "fecha" y "real" y "entrada"
      if (!fechaAlmacenColumn) {
        const allPossibleColumns = [...new Set([...headerRow, ...actualColumns])];
        const fechaRealKeys = allPossibleColumns.filter(col => {
          const colLower = col.trim().toLowerCase();
          return colLower.includes('fecha') && colLower.includes('real') && colLower.includes('entrada');
        });
        if (fechaRealKeys.length > 0) {
          const foundCol = actualColumns.find(c => 
            fechaRealKeys.some(key => c.trim().toLowerCase() === key.trim().toLowerCase())
          ) || fechaRealKeys[0];
          fechaAlmacenColumn = foundCol;
          console.log(`✅ Encontrada columna alternativa: "${fechaAlmacenColumn}"`);
          COLUMN_MAPPINGS.productos[fechaAlmacenColumn] = 'fechaAlmacen';
        }
      }
      
      // Estrategia 4: Buscar cualquier columna que contenga "fecha" y "almacén" o "almacen"
      if (!fechaAlmacenColumn) {
        const allPossibleColumns = [...new Set([...headerRow, ...actualColumns])];
        const fechaKeys = allPossibleColumns.filter(col => {
          const colLower = col.trim().toLowerCase();
          return colLower.includes('fecha') && (colLower.includes('almacén') || colLower.includes('almacen'));
        });
        if (fechaKeys.length > 0) {
          const foundCol = actualColumns.find(c => 
            fechaKeys.some(key => c.trim().toLowerCase() === key.trim().toLowerCase())
          ) || fechaKeys[0];
          fechaAlmacenColumn = foundCol;
          console.log(`✅ Encontrada columna con fecha y almacén: "${fechaAlmacenColumn}"`);
          COLUMN_MAPPINGS.productos[fechaAlmacenColumn] = 'fechaAlmacen';
        }
      }
      
      // Estrategia 5: Buscar en headers originales con coincidencia parcial más flexible
      if (!fechaAlmacenColumn) {
        for (let i = 0; i < headerRow.length; i++) {
          const header = headerRow[i].trim().toLowerCase();
          // Buscar patrones más flexibles
          if (
            (header.includes('fecha') && header.includes('almac')) ||
            (header.includes('entrada') && header.includes('almac')) ||
            (header.includes('fecha') && header.includes('real') && header.includes('entrada'))
          ) {
            // Mapear el header original a la columna en el JSON
            // XLSX usa el header como clave si está disponible
            const jsonCol = actualColumns.find(c => 
              c.trim().toLowerCase() === headerRow[i].trim().toLowerCase()
            ) || headerRow[i];
            fechaAlmacenColumn = jsonCol;
            console.log(`✅ Encontrada columna desde header original: "${fechaAlmacenColumn}" (header: "${headerRow[i]}")`);
            COLUMN_MAPPINGS.productos[fechaAlmacenColumn] = 'fechaAlmacen';
            break;
          }
        }
      }
      
      // Log final
      if (fechaAlmacenColumn) {
        console.log(`✅ Columna fechaAlmacen detectada y mapeada: "${fechaAlmacenColumn}"`);
        // Mostrar un ejemplo del valor solo si hay datos
        if (firstRow && firstRow[fechaAlmacenColumn]) {
          console.log(`📅 Valor de ejemplo: "${firstRow[fechaAlmacenColumn]}" (tipo: ${typeof firstRow[fechaAlmacenColumn]})`);
        }
        
        // Verificar cuántas filas tienen valores en esta columna (solo si hay datos)
        if (productosRaw.length > 0) {
          const rowsWithValue = productosRaw.filter((row: any) => {
            const value = row[fechaAlmacenColumn];
            return value !== undefined && value !== null && value !== '' && String(value).trim() !== '';
          }).length;
          console.log(`📅 Filas con valores en "${fechaAlmacenColumn}": ${rowsWithValue} de ${productosRaw.length}`);
        }
      } else {
        console.log(`⚠️ NO se encontró columna fechaAlmacen. Columnas disponibles:`, actualColumns);
        const fechaColumns = actualColumns.filter(col => col.toLowerCase().includes('fecha'));
        console.log(`📅 Columnas que contienen "fecha":`, fechaColumns);
        
        // Mostrar todas las columnas disponibles para debug
        console.log(`📋 Todas las columnas del sheet "Compra":`, actualColumns.map((col, idx) => `  ${idx + 1}. "${col}"`).join('\n'));
        
        // Intentar buscar cualquier variación de "almacén"
        const almacenColumns = actualColumns.filter(col => 
          col.toLowerCase().includes('almac') || col.toLowerCase().includes('almacen')
        );
        if (almacenColumns.length > 0) {
          console.log(`📦 Columnas que contienen "almacén":`, almacenColumns);
        }
      }
    }
    
    productos = productosRaw
      .map((row: any, index: number) => {
        try {
          const mapped = mapRow(row, COLUMN_MAPPINGS.productos);
          
          // Si fechaAlmacenColumn fue detectada pero no está en mapped, buscar directamente con múltiples estrategias
          if (fechaAlmacenColumn && !mapped.fechaAlmacen) {
            // Estrategia 1: Buscar por nombre exacto (case insensitive) en el row
            for (const [key, value] of Object.entries(row)) {
              if (key.trim().toLowerCase() === fechaAlmacenColumn.trim().toLowerCase()) {
                mapped.fechaAlmacen = value;
                console.log(`✅ Encontrado fechaAlmacen en row por clave exacta: "${key}"`);
                break;
              }
            }
            
            // Estrategia 2: Buscar en headers originales y usar índice de columna
            if (!mapped.fechaAlmacen && fechaAlmacenColumn) {
              const headerIndex = headerRow.findIndex(h => 
                h.trim().toLowerCase() === fechaAlmacenColumn.trim().toLowerCase()
              );
              if (headerIndex >= 0) {
                // XLSX puede usar índices de columna como clave alternativa
                const colLetter = String.fromCharCode(65 + headerIndex); // A, B, C...
                if (row[colLetter] !== undefined) {
                  mapped.fechaAlmacen = row[colLetter];
                  console.log(`✅ Encontrado fechaAlmacen por índice de columna: ${colLetter}`);
                }
              }
            }
            
            // Estrategia 3: Buscar en todas las claves del row con coincidencia parcial
            if (!mapped.fechaAlmacen && fechaAlmacenColumn) {
              const fechaAlmacenLower = fechaAlmacenColumn.trim().toLowerCase();
              for (const [key, value] of Object.entries(row)) {
                const keyLower = key.trim().toLowerCase();
                // Buscar coincidencia parcial con las palabras clave
                if (
                  keyLower.includes('fecha') && 
                  (keyLower.includes('almac') || keyLower.includes('entrada')) &&
                  (keyLower.includes('real') || fechaAlmacenLower.includes('real'))
                ) {
                  mapped.fechaAlmacen = value;
                  console.log(`✅ Encontrado fechaAlmacen por coincidencia parcial: "${key}"`);
                  break;
                }
              }
            }
            
            // Estrategia 4: Buscar cualquier columna que tenga "fecha" y "almacén"
            if (!mapped.fechaAlmacen && fechaAlmacenColumn) {
              for (const [key, value] of Object.entries(row)) {
                const keyLower = key.trim().toLowerCase();
                if (keyLower.includes('fecha') && (keyLower.includes('almac') || keyLower.includes('almacen'))) {
                  mapped.fechaAlmacen = value;
                  console.log(`✅ Encontrado fechaAlmacen por patrón fecha+almacén: "${key}"`);
                  break;
                }
              }
            }
            
            // Estrategia 5: Buscar directamente en el row usando el header original
            if (!mapped.fechaAlmacen && fechaAlmacenColumn) {
              // Intentar con el header exacto del headerRow
              const exactHeader = headerRow.find(h => 
                h.trim().toLowerCase() === fechaAlmacenColumn.trim().toLowerCase()
              );
              if (exactHeader && row[exactHeader] !== undefined) {
                mapped.fechaAlmacen = row[exactHeader];
                console.log(`✅ Encontrado fechaAlmacen usando header exacto: "${exactHeader}"`);
              }
            }
          }
          
          // Si aún no se encontró pero fechaAlmacenColumn está definida, intentar una última vez
          if (fechaAlmacenColumn && !mapped.fechaAlmacen && index === 0) {
            console.log(`⚠️ No se encontró fechaAlmacen en primera fila. Claves disponibles:`, Object.keys(row));
            console.log(`⚠️ Buscando columna: "${fechaAlmacenColumn}"`);
            console.log(`⚠️ Header original correspondiente:`, headerRow.find(h => h.trim().toLowerCase() === fechaAlmacenColumn.trim().toLowerCase()));
          }
          
          // Clean and convert numeric fields
          mapped.cantidadPedida = cleanNumericValue(mapped.cantidadPedida);
          mapped.pvp = cleanNumericValue(mapped.pvp);
          mapped.precioCoste = cleanNumericValue(mapped.precioCoste);
          
          // Limpiar y normalizar tema
          if (mapped.tema !== undefined && mapped.tema !== null) {
            const temaStr = String(mapped.tema).trim();
            if (temaStr === '' || temaStr.toLowerCase() === 'nan' || temaStr.toLowerCase() === 'none' || temaStr.toLowerCase() === 'sin tema') {
              mapped.tema = 'Sin Tema';
            } else {
              mapped.tema = temaStr;
            }
          } else {
            mapped.tema = 'Sin Tema';
          }
          
          // Format fechaAlmacen if present (permite strings vacíos pero procesa los que tienen valor)
          if (mapped.fechaAlmacen !== undefined && mapped.fechaAlmacen !== null) {
            // Si es string vacío, convertir a undefined para que no se incluya
            if (typeof mapped.fechaAlmacen === 'string' && mapped.fechaAlmacen.trim() === '') {
              delete mapped.fechaAlmacen;
            } else {
              // Intentar formatear la fecha
              const fechaFormateada = formatDate(mapped.fechaAlmacen);
              if (fechaFormateada && fechaFormateada.trim() !== '') {
                mapped.fechaAlmacen = fechaFormateada;
              } else {
                // Si no se pudo formatear, eliminar el campo
                // Pero solo si realmente no es una fecha válida
                // A veces puede ser un objeto Date que no se formateó bien
                if (mapped.fechaAlmacen instanceof Date && !isNaN(mapped.fechaAlmacen.getTime())) {
                  // Es un objeto Date válido, convertir a string ISO
                  mapped.fechaAlmacen = mapped.fechaAlmacen.toISOString().split('T')[0];
                } else {
                  // Realmente no es válido, eliminar
                  delete mapped.fechaAlmacen;
                }
              }
            }
          }
          
          return mapped as ProductosData;
        } catch (error) {
          console.error(`Error processing productos row ${index}:`, error);
          return null;
        }
      })
      .filter((p: ProductosData | null): p is ProductosData => {
        return p !== null && p.codigoUnico && p.codigoUnico.trim() !== '';
      });
    
    // Log productos con fechaAlmacen para debug - verificar TODOS los tipos posibles
    const productosConFecha = productos.filter(p => {
      if (!p.fechaAlmacen) return false;
      // Aceptar strings no vacíos
      if (typeof p.fechaAlmacen === 'string' && p.fechaAlmacen.trim() !== '') return true;
      // Aceptar objetos Date válidos
      if (p.fechaAlmacen instanceof Date && !isNaN(p.fechaAlmacen.getTime())) return true;
      return false;
    });
    
    console.log(`📅 Productos con fechaAlmacen válida: ${productosConFecha.length} de ${productos.length}`);
    
    if (productosConFecha.length > 0) {
      console.log(`✅ ÉXITO: Se encontraron ${productosConFecha.length} productos con fechaAlmacen válida`);
      const sampleProduct = productosConFecha[0];
      console.log(`📅 Sample fechaAlmacen: ${sampleProduct.fechaAlmacen} (tipo: ${typeof sampleProduct.fechaAlmacen})`);
      console.log(`📅 Sample producto completo:`, JSON.stringify(sampleProduct, null, 2).substring(0, 300));
      
      // Verificar que la columna está correctamente mapeada
      if (fechaAlmacenColumn) {
        console.log(`✅ Columna "${fechaAlmacenColumn}" está correctamente mapeada y funcionando`);
      }
      
      // Asegurar que todos los productos con fecha tienen el formato correcto (string ISO)
      productos.forEach(p => {
        if (p.fechaAlmacen instanceof Date && !isNaN(p.fechaAlmacen.getTime())) {
          (p as any).fechaAlmacen = p.fechaAlmacen.toISOString().split('T')[0];
        }
      });
    } else {
      console.log(`❌ ERROR: No se encontraron productos con fechaAlmacen válida.`);
      console.log(`⚠️ Total productos procesados: ${productos.length}`);
      
      // Verificar si hay productos con fechaAlmacen pero vacío
      const productosConFechaVacia = productos.filter(p => 
        p.fechaAlmacen !== undefined && 
        p.fechaAlmacen !== null && 
        (p.fechaAlmacen === '' || (typeof p.fechaAlmacen === 'string' && p.fechaAlmacen.trim() === ''))
      );
      console.log(`⚠️ Productos con fechaAlmacen vacía: ${productosConFechaVacia.length}`);
      
      // Verificar si fechaAlmacenColumn fue detectada pero no se mapeó correctamente
      if (fechaAlmacenColumn) {
        console.log(`⚠️ PROBLEMA: Se detectó la columna "${fechaAlmacenColumn}" pero no se mapeó correctamente a los productos.`);
        
        // Verificar valores en productosRaw
        const rowsWithValue = productosRaw.filter((row: any) => {
          const value = row[fechaAlmacenColumn];
          return value !== undefined && value !== null && value !== '' && String(value).trim() !== '';
        });
        console.log(`📅 Filas en productosRaw con valor en "${fechaAlmacenColumn}": ${rowsWithValue.length} de ${productosRaw.length}`);
        
        if (rowsWithValue.length > 0 && rowsWithValue.length <= 5) {
          console.log(`📅 Ejemplos de valores en productosRaw:`, rowsWithValue.map((r: any) => r[fechaAlmacenColumn]));
        }
      } else {
        console.log(`⚠️ PROBLEMA: No se detectó ninguna columna fechaAlmacen.`);
        
        // Mostrar todas las columnas que contienen "fecha" para debug
        if (productosRaw.length > 0) {
          const firstRow = productosRaw[0] as any;
          const actualColumns = Object.keys(firstRow);
          const fechaColumns = actualColumns.filter(col => col.toLowerCase().includes('fecha'));
          console.log(`📅 Columnas que contienen "fecha":`, fechaColumns);
          
          // Mostrar valores de ejemplo de columnas con "fecha"
          fechaColumns.forEach(col => {
            const sampleValue = firstRow[col];
            console.log(`📅 Columna "${col}": valor ejemplo = "${sampleValue}" (tipo: ${typeof sampleValue})`);
          });
        }
      }
      
      // Verificar si el mapeo tiene fechaAlmacen configurado
      const fechaAlmacenMapping = Object.entries(COLUMN_MAPPINGS.productos).find(([_, val]) => val === 'fechaAlmacen');
      if (fechaAlmacenMapping) {
        console.log(`✅ Mapeo configurado: "${fechaAlmacenMapping[0]}" -> fechaAlmacen`);
      } else {
        console.log(`❌ NO hay mapeo configurado para fechaAlmacen`);
      }
    }
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
        // Match Streamlit: exclude specific stores (with trim to handle whitespace)
        return t !== null && t.tienda && !TIENDAS_A_ELIMINAR.includes(t.tienda.trim());
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
