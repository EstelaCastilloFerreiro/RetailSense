// Extended KPI calculations for complete dashboard functionality
import type { VentasData, ProductosData, TraspasosData } from "../../shared/schema";
import { applyFilters, type FilterOptions } from "./kpiCalculator";

export interface ExtendedDashboardData {
  // Alcance del análisis
  alcance: {
    totalFamilias: number;
    totalTiendas: number;
    totalTemporadas: number;
    totalTransacciones: number;
  };
  
  // KPIs Generales (sin GR.ART.FICTICIO)
  kpisGenerales: {
    ventasBrutas: number;
    devoluciones: number;
    totalNeto: number;
    tasaDevolucion: number;
  };
  
  // KPIs GR.ART.FICTICIO
  kpisFicticio: {
    ventasBrutas: number;
    devoluciones: number;
    totalNeto: number;
    tasaDevolucion: number;
  };
  
  // KPIs por tipo de tienda
  kpisTienda: {
    tiendasFisicas: number;
    ventasFisicas: number;
    tiendasOnline: number;
    ventasOnline: number;
  };
  
  // Ventas mensuales
  ventasMensuales: Array<{
    mes: string;
    tipo: 'Física' | 'Online';
    cantidad: number;
    beneficio: number;
  }>;
  
  // Rankings
  topTiendas: Array<{
    tienda: string;
    ranking: number;
    unidades: number;
    beneficio: number;
  }>;
  
  bottomTiendas: Array<{
    tienda: string;
    ranking: number;
    unidades: number;
    beneficio: number;
  }>;
  
  // Ventas por talla
  ventasPorTalla: Array<{
    talla: string;
    cantidad: number;
    temporada?: string;
  }>;
  
  // Ventas por talla con desglose por temporada (para gráfico apilado)
  ventasPorTallaConTemporada?: Array<Record<string, string | number>>;
  
  // Entradas almacén por tema/temporada
  entradasAlmacenPorTema?: Array<{
    tema: string;
    temporada: string;
    mes: string;
    talla: string;
    cantidadEntrada: number;
    cantidadTraspasada?: number;
    cantidadVendida?: number;
  }>;
  
  // Comparación Enviado vs Ventas por tema
  comparacionEnviadoVsVentasPorTema?: Array<{
    tema: string;
    temporada: string;
    talla: string;
    cantidadEnviado: number;
    cantidadVentas: number;
  }>;
  
  // Análisis Temporal: Entrada → Envío → Primera Venta
  analisisTemporal?: {
    datos: Array<{
      codigoUnico: string;
      tema: string;
      talla: string;
      tiendaEnvio: string;
      fechaEntradaAlmacen: string;
      fechaEnviado: string;
      fechaPrimeraVenta: string | null;
      diasEntradaEnvio: number;
      diasEnvioPrimeraVenta: number | null;
    }>;
    promedioDiasEntradaEnvio: number;
    promedioDiasEnvioPrimeraVenta: number | null;
    totalProductos: number;
  };
  
  // KPIs de Rotación de Stock (opcional, solo si hay fechaAlmacen en productos)
  kpisRotacion?: {
    tiendaMayorRotacion: string;
    tiendaMayorRotacionDias: number;
    tiendaMenorRotacion: string;
    tiendaMenorRotacionDias: number;
    productoMayorRotacion: string;
    productoMayorRotacionDias: number;
    productoMenorRotacion: string;
    productoMenorRotacionDias: number;
    promedioGlobal: number;
    medianaGlobal: number;
    desviacionEstandar: number;
    totalProductos: number;
  };
  
  // Entradas almacén y traspasos por tema/temporada
  entradasAlmacen?: Array<{
    tema: string;
    temporada: string;
    mes: string;
    talla: string;
    cantidadEntrada: number;
    cantidadTraspasada?: number;
    cantidadVendida?: number;
  }>;
  
  // Cantidad pedida por mes y talla
  cantidadPedidaPorMesTalla?: Array<{
    mes: string;
    talla: string;
    cantidad: number;
  }>;
  
  // Ventas vs Traspasos por Tienda
  ventasVsTraspasosPorTienda?: Array<{
    tienda: string;
    temporada: string;
    ventas: number;
    traspasos: number;
  }>;
  
  // Resumen de Ventas vs Traspasos por Temporada
  resumenVentasVsTraspasosTemporada?: Array<{
    temporada: string;
    ventas: number;
    traspasos: number;
    diferencia: number;
    eficiencia: number;
  }>;
  
  // Totales por Tienda
  totalesPorTienda?: Array<{
    tienda: string;
    ventas: number;
    traspasos: number;
    diferencia: number;
    devoluciones: number;
    eficiencia: number;
    ratioDevolucion: number;
    detallePorTemporada?: Array<{
      temporada: string;
      ventas: number;
      traspasos: number;
    }>;
  }>;
}

// Note: Online stores are now identified dynamically by checking if 'ONLINE' is in the store name
// This matches Streamlit's logic: df_ventas['Es_Online'] = df_ventas['Tienda'].str.contains('ONLINE', case=False, na=False)

// Función para calcular métricas de rotación de stock (igual que Streamlit)
function calculateRotationMetrics(
  productos: ProductosData[],
  ventas: VentasData[]
): ExtendedDashboardData['kpisRotacion'] | undefined {
  // Filtrar productos con fechaAlmacen válida
  const productosConFecha = productos.filter(p => p.fechaAlmacen);
  
  if (productosConFecha.length === 0) {
    return undefined;
  }
  
  // Parsear fechas de almacén
  const productosRotacion = productosConFecha.map(p => {
    let fechaAlmacenDate: Date | null = null;
    
    if (p.fechaAlmacen) {
      // Intentar múltiples formatos de fecha
      const fechaStr = p.fechaAlmacen.toString();
      fechaAlmacenDate = parseDate(fechaStr);
    }
    
    return {
      codigoUnico: p.codigoUnico || '',
      talla: p.talla || '',
      fechaAlmacen: fechaAlmacenDate,
    };
  }).filter(p => p.fechaAlmacen !== null && p.codigoUnico);
  
  // Preparar ventas con fecha válida
  const ventasRotacion = ventas
    .filter(v => v.fechaVenta && v.codigoUnico && (v.cantidad || 0) > 0)
    .map(v => {
      const fechaVentaDate = v.fechaVenta ? parseDate(v.fechaVenta.toString()) : null;
      // Normalizar codigoUnico a 10 dígitos (como productos) - slice ACT a Generico
      const codigoUnicoNormalizado = (v.codigoUnico || '').trim().toUpperCase().slice(0, 10);
      return {
        codigoUnico: codigoUnicoNormalizado,
        talla: v.talla || '',
        tienda: v.tienda || '',
        fechaVenta: fechaVentaDate,
        familia: v.familia || '',
      };
    })
    .filter(v => v.fechaVenta !== null);
  
  if (productosRotacion.length === 0 || ventasRotacion.length === 0) {
    return undefined;
  }
  
  // Tiendas excluidas (como Streamlit líneas 41-46)
  const TIENDAS_EXCLUIDAS = [
    'COMODIN',
    'R998- PILOTO',
    'ECI ONLINE GESTION',
    'W001 DEVOLUCIONES WEB (NO ENVIAR TRASP)'
  ];
  
  // Crear mapa de productos por código único (normalizado a 10 dígitos)
  const productosMap = new Map<string, typeof productosRotacion[0]>();
  productosRotacion.forEach(p => {
    // Normalizar codigoUnico a 10 dígitos (uppercase + trim + slice) como en ventas
    const codigoUnicoNormalizado = p.codigoUnico.trim().toUpperCase().slice(0, 10);
    productosMap.set(codigoUnicoNormalizado, p);
  });
  
  // Merge ventas con productos (por código único)
  const ventasConEntrada: Array<{
    codigoUnico: string;
    talla: string;
    tienda: string;
    fechaVenta: Date;
    fechaAlmacen: Date;
    familia: string;
    diasRotacion: number;
  }> = [];
  
  ventasRotacion.forEach(v => {
    // Filtrar tiendas excluidas (como Streamlit filtra antes de calcular estadísticas)
    if (v.tienda && TIENDAS_EXCLUIDAS.includes(v.tienda.trim())) {
      return; // Excluir esta venta
    }
    
    const producto = productosMap.get(v.codigoUnico);
    if (producto && producto.fechaAlmacen && v.fechaVenta) {
      const diasRotacion = Math.floor(
        (v.fechaVenta.getTime() - producto.fechaAlmacen.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Filtrar rotación válida (0-365 días y fecha venta >= fecha almacén)
      if (diasRotacion >= 0 && diasRotacion <= 365 && v.fechaVenta >= producto.fechaAlmacen) {
        ventasConEntrada.push({
          codigoUnico: v.codigoUnico,
          talla: v.talla,
          tienda: v.tienda,
          fechaVenta: v.fechaVenta,
          fechaAlmacen: producto.fechaAlmacen,
          familia: v.familia,
          diasRotacion,
        });
      }
    }
  });
  
  // Necesitamos al menos 10 datos válidos
  if (ventasConEntrada.length < 10) {
    console.log(`⚠️  Solo ${ventasConEntrada.length} ventas con rotación válida, se requieren al menos 10`);
    return undefined;
  }
  
  console.log(`📊 Rotación de Stock - Procesando ${ventasConEntrada.length} ventas con rotación válida`);
  
  // Calcular rotación por tienda
  const rotacionPorTienda = new Map<string, number[]>();
  ventasConEntrada.forEach(v => {
    if (!rotacionPorTienda.has(v.tienda)) {
      rotacionPorTienda.set(v.tienda, []);
    }
    rotacionPorTienda.get(v.tienda)!.push(v.diasRotacion);
  });
  
  // Calcular rotación por producto (familia) - usar código de familia como en Streamlit
  // IMPORTANTE: Streamlit agrupa por ['Código único', 'Familia'], no solo por Familia
  // Pero luego usa solo 'Familia' para el resultado final, así que agrupamos por clave compuesta
  const rotacionPorProducto = new Map<string, number[]>();
  ventasConEntrada.forEach(v => {
    // Crear clave compuesta: codigoUnico + familia (como Streamlit groupby(['Código único', 'Familia']))
    const familia = v.familia || 'Sin Familia';
    const claveProducto = `${v.codigoUnico}|${familia}`;
    if (!rotacionPorProducto.has(claveProducto)) {
      rotacionPorProducto.set(claveProducto, []);
    }
    rotacionPorProducto.get(claveProducto)!.push(v.diasRotacion);
  });
  
  // Calcular estadísticas globales
  const diasRotacionGlobal = ventasConEntrada.map(v => v.diasRotacion);
  const promedioGlobal = diasRotacionGlobal.reduce((a, b) => a + b, 0) / diasRotacionGlobal.length;
  const medianaGlobal = calculateMedian(diasRotacionGlobal);
  const desviacionEstandar = calculateStdDev(diasRotacionGlobal);
  
  // Calcular KPIs por tienda
  let tiendaMayorRotacion = 'Sin datos';
  let tiendaMayorRotacionDias = 0;
  let tiendaMenorRotacion = 'Sin datos';
  let tiendaMenorRotacionDias = 0;
  
  const tiendasConfiables = Array.from(rotacionPorTienda.entries())
    .filter(([_, dias]) => dias.length >= 3)
    .map(([tienda, dias]) => ({
      tienda,
      mediana: calculateMedian(dias),
      dias,
    }));
  
  if (tiendasConfiables.length > 0) {
    // Tienda con mayor rotación (menor mediana)
    const tiendaMayor = tiendasConfiables.reduce((min, curr) => 
      curr.mediana < min.mediana ? curr : min
    );
    tiendaMayorRotacion = tiendaMayor.tienda;
    tiendaMayorRotacionDias = tiendaMayor.mediana;
    
    // Tienda con menor rotación (mayor mediana)
    const tiendaMenor = tiendasConfiables.reduce((max, curr) => 
      curr.mediana > max.mediana ? curr : max
    );
    tiendaMenorRotacion = tiendaMenor.tienda;
    tiendaMenorRotacionDias = tiendaMenor.mediana;
    
    console.log(`📊 Rotación por Tienda:`);
    console.log(`   Mayor Rotación: ${tiendaMayorRotacion} - ${tiendaMayorRotacionDias.toFixed(1)} días`);
    console.log(`   Menor Rotación: ${tiendaMenorRotacion} - ${tiendaMenorRotacionDias.toFixed(1)} días`);
  }
  
  // Calcular KPIs por producto (familia)
  // IMPORTANTE: Streamlit agrupa por ['Código único', 'Familia'] y compara productos individuales
  // Luego extrae la familia del producto con menor/mayor mediana
  let productoMayorRotacion = 'Sin datos';
  let productoMayorRotacionDias = 0;
  let productoMenorRotacion = 'Sin datos';
  let productoMenorRotacionDias = 0;
  
  // Filtrar productos con mínimo 2 ventas (como Streamlit: Ventas_Con_Rotacion >= 2)
  const productosConfiables = Array.from(rotacionPorProducto.entries())
    .filter(([_, dias]) => dias.length >= 2)
    .map(([claveProducto, dias]) => {
      const familia = claveProducto.split('|')[1] || 'Sin Familia';
      return {
        claveProducto,
        familia,
        mediana: calculateMedian(dias),
        diasCount: dias.length,
      };
    });
  
  if (productosConfiables.length > 0) {
    // Producto con mayor rotación (menor mediana) - comparar productos individuales
    const productoMayor = productosConfiables.reduce((min, curr) => 
      curr.mediana < min.mediana ? curr : min
    );
    productoMayorRotacion = productoMayor.familia;
    productoMayorRotacionDias = productoMayor.mediana;
    
    // Producto con menor rotación (mayor mediana) - comparar productos individuales
    const productoMenor = productosConfiables.reduce((max, curr) => 
      curr.mediana > max.mediana ? curr : max
    );
    productoMenorRotacion = productoMenor.familia;
    productoMenorRotacionDias = productoMenor.mediana;
    
    console.log(`📊 Rotación por Producto (Familia):`);
    console.log(`   Mayor Rotación: ${productoMayorRotacion} - ${productoMayorRotacionDias.toFixed(1)} días`);
    console.log(`   Menor Rotación: ${productoMenorRotacion} - ${productoMenorRotacionDias.toFixed(1)} días`);
  }
  
  console.log(`📊 Estadísticas Globales:`);
  console.log(`   Promedio: ${promedioGlobal.toFixed(1)} días`);
  console.log(`   Mediana: ${medianaGlobal.toFixed(1)} días`);
  console.log(`   Desv. Estándar: ${desviacionEstandar.toFixed(1)} días`);
  console.log(`   Total Productos: ${ventasConEntrada.length}`);
  
  return {
    tiendaMayorRotacion,
    tiendaMayorRotacionDias,
    tiendaMenorRotacion,
    tiendaMenorRotacionDias,
    productoMayorRotacion,
    productoMayorRotacionDias,
    productoMenorRotacion,
    productoMenorRotacionDias,
    promedioGlobal,
    medianaGlobal,
    desviacionEstandar,
    totalProductos: ventasConEntrada.length,
  };
}

// Función auxiliar para parsear fechas
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Intentar múltiples formatos
  const formats = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0]) {
        // DD/MM/YYYY
        const [, day, month, year] = match;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        // YYYY-MM-DD
        const [, year, month, day] = match;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
    }
  }
  
  // Fallback: intentar parseo directo
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Función auxiliar para calcular mediana
function calculateMedian(numbers: number[]): number {
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// Función auxiliar para calcular desviación estándar
function calculateStdDev(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  const squareDiffs = numbers.map(value => Math.pow(value - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / numbers.length;
  return Math.sqrt(avgSquareDiff);
}

export function calculateExtendedDashboardData(
  ventas: VentasData[],
  productos: ProductosData[],
  traspasos: TraspasosData[],
  filters?: FilterOptions
): ExtendedDashboardData {
  // Apply filters first if provided
  const filteredVentas = filters ? applyFilters(ventas, filters) : ventas;
  
  // Filtrar ventas reales (sin GR.ART.FICTICIO)
  const ventasReales = filteredVentas.filter(v => v.descripcionFamilia !== 'GR.ART.FICTICIO');
  const ventasFicticio = filteredVentas.filter(v => v.descripcionFamilia === 'GR.ART.FICTICIO');
  
  // Alcance del análisis
  const alcance = {
    totalFamilias: new Set(ventasReales.map(v => v.descripcionFamilia).filter(Boolean)).size,
    totalTiendas: new Set(ventasReales.map(v => v.tienda).filter(Boolean)).size,
    totalTemporadas: new Set(ventasReales.map(v => v.temporada).filter(Boolean)).size,
    totalTransacciones: ventas.length,
  };
  
  // Calcular KPIs generales (sin ficticio) - separar ventas positivas de devoluciones
  const ventasPositivasReales = ventasReales
    .filter(v => (v.cantidad || 0) > 0)
    .reduce((sum, v) => sum + Math.abs(v.subtotal || 0), 0);
  
  const devolucionesReales = ventasReales
    .filter(v => (v.cantidad || 0) < 0)
    .reduce((sum, v) => sum + Math.abs(v.subtotal || 0), 0);
  
  const kpisGenerales = {
    ventasBrutas: ventasPositivasReales,
    devoluciones: devolucionesReales,
    totalNeto: ventasPositivasReales - devolucionesReales,
    tasaDevolucion: ventasPositivasReales > 0 ? (devolucionesReales / ventasPositivasReales) * 100 : 0,
  };
  
  // Calcular KPIs ficticio - separar ventas positivas de devoluciones
  const ventasPositivasFicticio = ventasFicticio
    .filter(v => (v.cantidad || 0) > 0)
    .reduce((sum, v) => sum + Math.abs(v.subtotal || 0), 0);
  
  const devolucionesFicticio = ventasFicticio
    .filter(v => (v.cantidad || 0) < 0)
    .reduce((sum, v) => sum + Math.abs(v.subtotal || 0), 0);
  
  // CRITICAL: Match Streamlit logic exactly
  // Ventas Brutas = Ventas Positivas + Devoluciones (abs)
  // Total Neto = Ventas Positivas (sin restar devoluciones)
  const kpisFicticio = {
    ventasBrutas: ventasPositivasFicticio + devolucionesFicticio,
    devoluciones: devolucionesFicticio,
    totalNeto: ventasPositivasFicticio,
    tasaDevolucion: ventasPositivasFicticio > 0 ? (devolucionesFicticio / ventasPositivasFicticio) * 100 : 0,
  };
  
  console.log('📊 KPIs GR.ART.FICTICIO Debug:');
  console.log(`   Total ventas ficticio: ${ventasFicticio.length} registros`);
  console.log(`   Ventas positivas ficticio: ${ventasFicticio.filter(v => (v.cantidad || 0) > 0).length} registros`);
  console.log(`   Ventas negativas ficticio: ${ventasFicticio.filter(v => (v.cantidad || 0) < 0).length} registros`);
  console.log(`   Ventas Positivas: ${ventasPositivasFicticio.toFixed(2)}€`);
  console.log(`   Devoluciones: ${devolucionesFicticio.toFixed(2)}€`);
  console.log(`   Ventas Brutas (Positivas + Devoluciones): ${kpisFicticio.ventasBrutas.toFixed(2)}€ (esperado: 2,968,127€)`);
  console.log(`   Total Neto (solo Positivas): ${kpisFicticio.totalNeto.toFixed(2)}€`);
  console.log(`   Tasa Devolución: ${kpisFicticio.tasaDevolucion.toFixed(1)}%`);
  
  // Calcular KPIs por tipo de tienda - Match Streamlit logic
  const ventasAnalisis = ventasReales.filter(v => (v.cantidad || 0) > 0);
  const ventasOnline = ventasAnalisis.filter(v => v.tienda && v.tienda.toUpperCase().includes('ONLINE'));
  const ventasFisicas = ventasAnalisis.filter(v => v.tienda && !v.tienda.toUpperCase().includes('ONLINE'));
  
  const kpisTienda = {
    tiendasFisicas: new Set(ventasFisicas.map(v => v.codigoTienda).filter(Boolean)).size,
    ventasFisicas: ventasFisicas.reduce((sum, v) => sum + (v.subtotal || 0), 0),
    tiendasOnline: new Set(ventasOnline.map(v => v.codigoTienda).filter(Boolean)).size,
    ventasOnline: ventasOnline.reduce((sum, v) => sum + (v.subtotal || 0), 0),
  };
  
  // Ventas mensuales por tipo - solo contar ventas positivas
  const ventasMensualesMap = new Map<string, { fisica: { cantidad: number; beneficio: number }, online: { cantidad: number; beneficio: number } }>();
  
  filteredVentas.forEach(v => {
    // Solo contar ventas positivas para las gráficas mensuales
    if (!v.mes || (v.cantidad || 0) <= 0) return;
    
    if (!ventasMensualesMap.has(v.mes)) {
      ventasMensualesMap.set(v.mes, {
        fisica: { cantidad: 0, beneficio: 0 },
        online: { cantidad: 0, beneficio: 0 }
      });
    }
    
    const data = ventasMensualesMap.get(v.mes)!;
    // Match Streamlit logic: check if 'ONLINE' is in store name
    const isOnline = v.tienda && v.tienda.toUpperCase().includes('ONLINE');
    
    if (isOnline) {
      data.online.cantidad += v.cantidad || 0;
      data.online.beneficio += v.subtotal || 0;
    } else {
      data.fisica.cantidad += v.cantidad || 0;
      data.fisica.beneficio += v.subtotal || 0;
    }
  });
  
  const ventasMensuales: Array<any> = [];
  ventasMensualesMap.forEach((data, mes) => {
    ventasMensuales.push({
      mes,
      tipo: 'Física' as const,
      cantidad: data.fisica.cantidad,
      beneficio: data.fisica.beneficio,
    });
    ventasMensuales.push({
      mes,
      tipo: 'Online' as const,
      cantidad: data.online.cantidad,
      beneficio: data.online.beneficio,
    });
  });
  
  // Ranking de tiendas - solo ventas positivas
  const tiendasMap = new Map<string, { unidades: number; beneficio: number }>();
  filteredVentas.forEach(v => {
    if (!v.tienda || (v.cantidad || 0) <= 0) return;
    
    if (!tiendasMap.has(v.tienda)) {
      tiendasMap.set(v.tienda, { unidades: 0, beneficio: 0 });
    }
    
    const data = tiendasMap.get(v.tienda)!;
    data.unidades += v.cantidad || 0;
    data.beneficio += v.subtotal || 0;
  });
  
  const tiendas = Array.from(tiendasMap.entries())
    .map(([tienda, data]) => ({
      tienda,
      unidades: data.unidades,
      beneficio: data.beneficio,
    }))
    .sort((a, b) => b.beneficio - a.beneficio);
  
  // Top 15 con rankings correctos (1-15)
  const topTiendas = tiendas.slice(0, 15).map((item, index) => ({
    ...item,
    ranking: index + 1,
  }));
  
  // Bottom 15 con rankings correctos (1-15, siendo 1 el peor)
  const bottomTiendas = tiendas.slice(-15).reverse().map((item, index) => ({
    ...item,
    ranking: index + 1,
  }));
  
  // Ventas por talla - solo ventas positivas
  const tallasMap = new Map<string, number>();
  filteredVentas.forEach(v => {
    if (!v.talla || (v.cantidad || 0) <= 0) return;
    tallasMap.set(v.talla, (tallasMap.get(v.talla) || 0) + (v.cantidad || 0));
  });
  
  const ventasPorTalla = Array.from(tallasMap.entries())
    .map(([talla, cantidad]) => ({ talla, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
  
  // Ventas por talla y temporada (para gráfico apilado)
  const tallasPorTemporadaMap = new Map<string, Map<string, number>>();
  filteredVentas.forEach(v => {
    if (!v.talla || !v.temporada || (v.cantidad || 0) <= 0) return;
    if (!tallasPorTemporadaMap.has(v.talla)) {
      tallasPorTemporadaMap.set(v.talla, new Map());
    }
    const temporadasMap = tallasPorTemporadaMap.get(v.talla)!;
    temporadasMap.set(v.temporada, (temporadasMap.get(v.temporada) || 0) + (v.cantidad || 0));
  });
  
  const ventasPorTallaConTemporada = Array.from(tallasPorTemporadaMap.entries())
    .map(([talla, temporadasMap]) => {
      const data: any = { talla };
      temporadasMap.forEach((cantidad, temporada) => {
        data[temporada] = cantidad;
      });
      return data;
    })
    .sort((a, b) => {
      // Ordenar por total de todas las temporadas
      const totalA = Object.values(a).filter((v: any) => typeof v === 'number').reduce((sum: number, v: any) => sum + v, 0);
      const totalB = Object.values(b).filter((v: any) => typeof v === 'number').reduce((sum: number, v: any) => sum + v, 0);
      return totalB - totalA;
    });
  
  // Calcular KPIs de Rotación de Stock (igual que Streamlit)
  let kpisRotacion: ExtendedDashboardData['kpisRotacion'] | undefined;
  
  // Verificar si tenemos fechaAlmacen en productos
  const productosConFechaAlmacen = productos.filter(p => p.fechaAlmacen);
  
  console.log(`📊 Rotación: ${productosConFechaAlmacen.length} productos con fechaAlmacen de ${productos.length} total`);
  
  if (productosConFechaAlmacen.length > 0 && ventasReales.length > 0) {
    kpisRotacion = calculateRotationMetrics(
      productosConFechaAlmacen,
      ventasReales
    );
    
    if (kpisRotacion) {
      console.log(`✅ KPIs de Rotación calculados:`, {
        tiendaMayor: kpisRotacion.tiendaMayorRotacion,
        productoMayor: kpisRotacion.productoMayorRotacion,
        totalProductos: kpisRotacion.totalProductos
      });
    } else {
      console.log(`⚠️ No se pudieron calcular KPIs de Rotación (insuficientes datos válidos)`);
    }
  } else {
    console.log(`⚠️ No se pueden calcular KPIs de Rotación: productos con fecha=${productosConFechaAlmacen.length}, ventas=${ventasReales.length}`);
  }
  
  // Calcular Cantidad Pedida por Mes y Talla
  let cantidadPedidaPorMesTalla: ExtendedDashboardData['cantidadPedidaPorMesTalla'] | undefined;
  const productosConFecha = productos.filter(p => p.fechaAlmacen && p.cantidadPedida);
  if (productosConFecha.length > 0) {
    // Obtener último mes de ventas para filtrar si es necesario
    const mesesVentas = filteredVentas
      .filter(v => v.fechaVenta)
      .map(v => {
        const fecha = parseDate(v.fechaVenta!.toString());
        return fecha ? `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}` : null;
      })
      .filter(Boolean) as string[];
    
    const ultimoMesVentas = mesesVentas.length > 0 ? mesesVentas.sort().pop()! : null;
    
    // Obtener todos los meses únicos de productos
    const mesesProductos = Array.from(new Set(productosConFecha.map(p => {
      if (!p.fechaAlmacen) return null;
      const fecha = parseDate(p.fechaAlmacen.toString());
      return fecha ? `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}` : null;
    }).filter(Boolean))) as string[];
    
    // Obtener todas las tallas únicas
    const tallasProductos = Array.from(new Set(productosConFecha.map(p => p.talla).filter(Boolean))) as string[];
    
    // Crear mapa con todas las combinaciones
    const pedidaMap = new Map<string, number>();
    productosConFecha.forEach(p => {
      if (!p.fechaAlmacen || !p.talla || !p.cantidadPedida) return;
      
      const fecha = parseDate(p.fechaAlmacen.toString());
      if (!fecha) return;
      
      const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      
      // Filtrar por último mes de ventas si existe
      if (ultimoMesVentas && mes > ultimoMesVentas) return;
      
      const key = `${mes}|${p.talla}`;
      pedidaMap.set(key, (pedidaMap.get(key) || 0) + (p.cantidadPedida || 0));
    });
    
    // Crear array completo con todas las combinaciones (incluyendo 0)
    cantidadPedidaPorMesTalla = [];
    mesesProductos.forEach(mes => {
      if (ultimoMesVentas && mes > ultimoMesVentas) return;
      
      tallasProductos.forEach(talla => {
        const key = `${mes}|${talla}`;
        cantidadPedidaPorMesTalla!.push({
          mes,
          talla,
          cantidad: pedidaMap.get(key) || 0,
        });
      });
    });
    
    cantidadPedidaPorMesTalla.sort((a, b) => a.mes.localeCompare(b.mes) || a.talla.localeCompare(b.talla));
  }
  
  // Calcular Ventas vs Traspasos por Tienda
  let ventasVsTraspasosPorTienda: ExtendedDashboardData['ventasVsTraspasosPorTienda'] | undefined;
  let resumenVentasVsTraspasosTemporada: ExtendedDashboardData['resumenVentasVsTraspasosTemporada'] | undefined;
  let totalesPorTienda: ExtendedDashboardData['totalesPorTienda'] | undefined;
  
  if (traspasos.length > 0 && filteredVentas.length > 0) {
    // Obtener códigos únicos de ventas
    const codigosUnicosVentas = new Set(filteredVentas.map(v => v.codigoUnico).filter(Boolean));
    
    // Filtrar traspasos que tienen códigos únicos en ventas
    const traspasosFiltrados = traspasos.filter(t => 
      t.codigoUnico && codigosUnicosVentas.has(t.codigoUnico)
    );
    
    // Obtener último mes de ventas para filtrar traspasos
    const mesesVentas = filteredVentas
      .filter(v => v.fechaVenta)
      .map(v => {
        const fecha = parseDate(v.fechaVenta!.toString());
        return fecha ? `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}` : null;
      })
      .filter(Boolean) as string[];
    
    const ultimoMesVentas = mesesVentas.length > 0 ? mesesVentas.sort().pop()! : null;
    
    // Agrupar ventas por tienda y temporada (solo positivas)
    const ventasPorTiendaTemp = new Map<string, number>();
    filteredVentas
      .filter(v => (v.cantidad || 0) > 0 && v.tienda && v.temporada)
      .forEach(v => {
        const key = `${v.tienda}|${v.temporada}`;
        ventasPorTiendaTemp.set(key, (ventasPorTiendaTemp.get(key) || 0) + (v.cantidad || 0));
      });
    
    // Agrupar traspasos por tienda y temporada
    const traspasosPorTiendaTemp = new Map<string, number>();
    traspasosFiltrados
      .filter(t => {
        if (!t.tienda || !t.enviado) return false;
        
        // Filtrar por último mes si hay fecha
        if (ultimoMesVentas && t.fechaEnviado) {
          const fecha = parseDate(t.fechaEnviado.toString());
          if (fecha) {
            const mesTraspaso = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
            if (mesTraspaso > ultimoMesVentas) return false;
          }
        }
        
        return true;
      })
      .forEach(t => {
        // Obtener temporada del producto relacionado con ventas
        const productoVenta = filteredVentas.find(v => v.codigoUnico === t.codigoUnico);
        const temporada = productoVenta?.temporada || 'Sin Temporada';
        const key = `${t.tienda}|${temporada}`;
        traspasosPorTiendaTemp.set(key, (traspasosPorTiendaTemp.get(key) || 0) + (t.enviado || 0));
      });
    
    // Combinar datos de ventas vs traspasos por tienda
    const ventasVsTraspasosSet = new Set([
      ...Array.from(ventasPorTiendaTemp.keys()),
      ...Array.from(traspasosPorTiendaTemp.keys())
    ]);
    
    ventasVsTraspasosPorTienda = Array.from(ventasVsTraspasosSet)
      .map(key => {
        const [tienda, temporada] = key.split('|');
        return {
          tienda,
          temporada,
          ventas: ventasPorTiendaTemp.get(key) || 0,
          traspasos: traspasosPorTiendaTemp.get(key) || 0,
        };
      })
      .filter(item => item.ventas > 0 || item.traspasos > 0);
    
    // Calcular resumen por temporada
    const resumenPorTemporada = new Map<string, { ventas: number; traspasos: number }>();
    ventasVsTraspasosPorTienda.forEach(item => {
      if (!resumenPorTemporada.has(item.temporada)) {
        resumenPorTemporada.set(item.temporada, { ventas: 0, traspasos: 0 });
      }
      const resumen = resumenPorTemporada.get(item.temporada)!;
      resumen.ventas += item.ventas;
      resumen.traspasos += item.traspasos;
    });
    
    resumenVentasVsTraspasosTemporada = Array.from(resumenPorTemporada.entries())
      .map(([temporada, datos]) => ({
        temporada,
        ventas: datos.ventas,
        traspasos: datos.traspasos,
        diferencia: datos.ventas - datos.traspasos,
        eficiencia: datos.traspasos > 0 ? (datos.ventas / datos.traspasos) * 100 : 0,
      }))
      .sort((a, b) => a.temporada.localeCompare(b.temporada));
    
    // Calcular totales por tienda (top 50 tiendas por ventas)
    const ventasTotalesPorTienda = new Map<string, number>();
    filteredVentas
      .filter(v => (v.cantidad || 0) > 0 && v.tienda)
      .forEach(v => {
        ventasTotalesPorTienda.set(v.tienda!, (ventasTotalesPorTienda.get(v.tienda!) || 0) + (v.cantidad || 0));
      });
    
    const top50Tiendas = Array.from(ventasTotalesPorTienda.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([tienda]) => tienda);
    
    const devolucionesPorTienda = new Map<string, number>();
    filteredVentas
      .filter(v => (v.cantidad || 0) < 0 && v.tienda)
      .forEach(v => {
        devolucionesPorTienda.set(v.tienda!, (devolucionesPorTienda.get(v.tienda!) || 0) + Math.abs(v.cantidad || 0));
      });
    
    const traspasosTotalesPorTienda = new Map<string, number>();
    traspasosFiltrados
      .filter(t => top50Tiendas.includes(t.tienda || ''))
      .forEach(t => {
        traspasosTotalesPorTienda.set(t.tienda!, (traspasosTotalesPorTienda.get(t.tienda!) || 0) + (t.enviado || 0));
      });
    
    // Detalle por temporada para cada tienda
    const detallePorTiendaTemporada = new Map<string, Map<string, { ventas: number; traspasos: number }>>();
    ventasVsTraspasosPorTienda.forEach(item => {
      if (!top50Tiendas.includes(item.tienda)) return;
      
      if (!detallePorTiendaTemporada.has(item.tienda)) {
        detallePorTiendaTemporada.set(item.tienda, new Map());
      }
      const detalle = detallePorTiendaTemporada.get(item.tienda)!;
      
      if (!detalle.has(item.temporada)) {
        detalle.set(item.temporada, { ventas: 0, traspasos: 0 });
      }
      const datos = detalle.get(item.temporada)!;
      datos.ventas += item.ventas;
      datos.traspasos += item.traspasos;
    });
    
    totalesPorTienda = top50Tiendas.map(tienda => {
      const ventas = ventasTotalesPorTienda.get(tienda) || 0;
      const traspasos = traspasosTotalesPorTienda.get(tienda) || 0;
      const devoluciones = devolucionesPorTienda.get(tienda) || 0;
      const diferencia = ventas - traspasos;
      const eficiencia = traspasos > 0 ? (ventas / traspasos) * 100 : 0;
      const ratioDevolucion = ventas > 0 ? (devoluciones / ventas) * 100 : 0;
      
      const detalle = detallePorTiendaTemporada.get(tienda);
      const detallePorTemporada = detalle ? Array.from(detalle.entries())
        .map(([temporada, datos]) => ({
          temporada,
          ventas: datos.ventas,
          traspasos: datos.traspasos,
        }))
        .sort((a, b) => a.temporada.localeCompare(b.temporada)) : undefined;
      
      return {
        tienda,
        ventas,
        traspasos,
        diferencia,
        devoluciones,
        eficiencia,
        ratioDevolucion,
        detallePorTemporada,
      };
    })
    .sort((a, b) => b.ventas - a.ventas);
  }
  
  // Calcular Entradas almacén por tema/temporada
  // Primero necesitamos obtener la familia más común de ventas filtradas
  const familiaActual = ventasReales.length > 0 
    ? ventasReales.reduce((acc, v) => {
        const familia = v.familia || v.descripcionFamilia || '';
        acc.set(familia, (acc.get(familia) || 0) + 1);
        return acc;
      }, new Map<string, number>())
    : new Map<string, number>();
  
  const familiaMasComun = familiaActual.size > 0
    ? Array.from(familiaActual.entries()).sort((a, b) => b[1] - a[1])[0][0]
    : null;
  
  // Filtrar productos por familia y que tengan tema y fechaAlmacen
  // Primero obtener todos los productos con tema válido (no "Sin Tema")
  const productosConTemaValido = productos.filter(p => {
    const tieneFecha = p.fechaAlmacen && 
                       String(p.fechaAlmacen).trim() !== '' && 
                       String(p.fechaAlmacen).trim() !== 'null' &&
                       String(p.fechaAlmacen).trim() !== 'undefined';
    const temaValido = p.tema && 
                       String(p.tema).trim() !== '' && 
                       String(p.tema).trim().toLowerCase() !== 'sin tema' &&
                       String(p.tema).trim().toLowerCase() !== 'nan' &&
                       String(p.tema).trim().toLowerCase() !== 'none';
    return tieneFecha && temaValido;
  });
  
  console.log(`📦 Productos con tema válido: ${productosConTemaValido.length} de ${productos.length} total`);
  if (productosConTemaValido.length > 0) {
    const temasUnicos = Array.from(new Set(productosConTemaValido.map(p => p.tema).filter(Boolean)));
    console.log(`📦 Temas únicos encontrados: ${temasUnicos.join(', ')}`);
  }
  
  // Filtrar por familia si hay familia más común
  const productosConTema = productosConTemaValido.filter(p => {
    if (familiaMasComun) {
      // Intentar obtener familia del producto comparando con ventas
      const productoVenta = ventasReales.find(v => v.codigoUnico === p.codigoUnico);
      const familiaProducto = productoVenta?.familia || productoVenta?.descripcionFamilia || p.familia || '';
      return familiaProducto === familiaMasComun;
    }
    return true;
  });
  
  console.log(`📦 Productos con tema después de filtrar por familia: ${productosConTema.length}`);
  
  let entradasAlmacenPorTema: ExtendedDashboardData['entradasAlmacenPorTema'] | undefined;
  if (productosConTema.length > 0) {
    console.log(`📦 Calculando entradas almacén por tema para ${productosConTema.length} productos`);
    const entradasMap = new Map<string, {
      tema: string;
      temporada: string;
      mes: string;
      talla: string;
      cantidadEntrada: number;
    }>();
    
    productosConTema.forEach(p => {
      if (!p.fechaAlmacen || !p.tema || !p.talla || !p.cantidadPedida) return;
      
      const fecha = parseDate(p.fechaAlmacen.toString());
      if (!fecha) return;
      
      const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      
      // Obtener temporada del tema (si el tema es "T_OI25" -> temporada "O2025")
      let temporada = '';
      if (p.tema.startsWith('T_') && p.tema.length === 6) {
        const seasonCode = p.tema.substring(2, 4); // 'OI' or 'PV'
        const yearCode = p.tema.substring(4); // '23', '24', '25'
        temporada = `${seasonCode[0]}20${yearCode}`;
      } else {
        // Intentar obtener temporada de ventas relacionadas
        const productoVenta = ventasReales.find(v => v.codigoUnico === p.codigoUnico);
        temporada = productoVenta?.temporada || p.temporada || '';
      }
      
      const key = `${p.tema}|${temporada}|${mes}|${p.talla}`;
      const existing = entradasMap.get(key);
      if (existing) {
        existing.cantidadEntrada += p.cantidadPedida || 0;
      } else {
        entradasMap.set(key, {
          tema: p.tema,
          temporada,
          mes,
          talla: p.talla,
          cantidadEntrada: p.cantidadPedida || 0,
        });
      }
    });
    
    entradasAlmacenPorTema = Array.from(entradasMap.values())
      .sort((a, b) => a.mes.localeCompare(b.mes) || a.talla.localeCompare(b.talla));
    
    console.log(`✅ Entradas almacén por tema calculadas: ${entradasAlmacenPorTema.length} registros`);
    const temasEncontrados = Array.from(new Set(entradasAlmacenPorTema.map(e => e.tema)));
    console.log(`📦 Temas encontrados en entradas: ${temasEncontrados.join(', ')}`);
  } else {
    console.log(`⚠️ No hay productos con tema válido para calcular entradas almacén por tema`);
  }
  
  // Calcular Comparación Enviado vs Ventas por tema
  // Usar productosConTemaValido en lugar de productosConTema para no filtrar por familia
  let comparacionEnviadoVsVentasPorTema: ExtendedDashboardData['comparacionEnviadoVsVentasPorTema'] | undefined;
  if (productosConTemaValido.length > 0 && ventasReales.length > 0) {
    console.log(`📦 Calculando comparación Enviado vs Ventas por tema`);
    const comparacionMap = new Map<string, {
      tema: string;
      temporada: string;
      talla: string;
      cantidadEnviado: number;
      cantidadVentas: number;
    }>();
    
    productosConTemaValido.forEach(p => {
      if (!p.tema || !p.talla || !p.cantidadPedida) return;
      
      // Obtener temporada del tema
      let temporada = '';
      if (p.tema.startsWith('T_') && p.tema.length === 6) {
        const seasonCode = p.tema.substring(2, 4);
        const yearCode = p.tema.substring(4);
        temporada = `${seasonCode[0]}20${yearCode}`;
      } else {
        const productoVenta = ventasReales.find(v => v.codigoUnico === p.codigoUnico);
        temporada = productoVenta?.temporada || p.temporada || '';
      }
      
      const key = `${p.tema}|${temporada}|${p.talla}`;
      const existing = comparacionMap.get(key);
      if (existing) {
        existing.cantidadEnviado += p.cantidadPedida || 0;
      } else {
        // Buscar ventas para este tema y temporada
        const ventasTema = ventasReales.filter(v => {
          if (v.temporada !== temporada) return false;
          // Verificar si el código único está en productos con este tema
          return productosConTemaValido.some(prod => 
            prod.codigoUnico === v.codigoUnico && 
            prod.tema === p.tema &&
            prod.talla === p.talla &&
            v.talla === p.talla
          );
        });
        
        const cantidadVentas = ventasTema
          .filter(v => (v.cantidad || 0) > 0)
          .reduce((sum, v) => sum + (v.cantidad || 0), 0);
        
        comparacionMap.set(key, {
          tema: p.tema,
          temporada,
          talla: p.talla,
          cantidadEnviado: p.cantidadPedida || 0,
          cantidadVentas,
        });
      }
    });
    
    // También agregar ventas que no tienen entrada en almacén
    ventasReales.forEach(v => {
      if (!v.temporada || !v.talla || (v.cantidad || 0) <= 0) return;
      
      // Buscar si hay un producto con tema para este código único
      const producto = productosConTemaValido.find(p => 
        p.codigoUnico === v.codigoUnico && 
        p.talla === v.talla
      );
      
      if (producto && producto.tema) {
        const key = `${producto.tema}|${v.temporada}|${v.talla}`;
        const existing = comparacionMap.get(key);
        if (existing) {
          existing.cantidadVentas += v.cantidad || 0;
        } else {
          comparacionMap.set(key, {
            tema: producto.tema,
            temporada: v.temporada,
            talla: v.talla,
            cantidadEnviado: 0,
            cantidadVentas: v.cantidad || 0,
          });
        }
      }
    });
    
    comparacionEnviadoVsVentasPorTema = Array.from(comparacionMap.values())
      .sort((a, b) => a.tema.localeCompare(b.tema) || a.talla.localeCompare(b.talla));
    
    console.log(`✅ Comparación Enviado vs Ventas por tema calculada: ${comparacionEnviadoVsVentasPorTema.length} registros`);
  } else {
    console.log(`⚠️ No hay datos suficientes para calcular comparación Enviado vs Ventas (productos con tema válido: ${productosConTemaValido.length}, ventas: ${ventasReales.length})`);
  }
  
  // Calcular Análisis Temporal: Entrada → Envío → Primera Venta
  // Solo si hay productos con fechaAlmacen y traspasos
  let analisisTemporal: ExtendedDashboardData['analisisTemporal'] | undefined;
  console.log(`📦 Datos para análisis temporal: productos con fecha=${productosConFechaAlmacen.length}, traspasos=${traspasos.length}, ventas=${filteredVentas.length}`);
  
  if (productosConFechaAlmacen.length > 0 && traspasos.length > 0 && filteredVentas.length > 0) {
    console.log(`📦 Calculando análisis temporal...`);
    // Obtener códigos únicos de productos con fecha
    const codigosUnicosProductos = new Set(productosConFechaAlmacen.map(p => p.codigoUnico).filter(Boolean));
    
    // Filtrar traspasos que tienen códigos únicos en productos
    const traspasosRelevantes = traspasos.filter(t => 
      t.codigoUnico && codigosUnicosProductos.has(t.codigoUnico) && t.tienda && t.fechaEnviado && t.enviado
    );
    
    if (traspasosRelevantes.length > 0) {
      // Agrupar por código único, talla y tienda - solo el primer envío
      const primerEnvio = new Map<string, TraspasosData & { fechaEnviadoDate: Date }>();
      
      traspasosRelevantes.forEach(t => {
        const fechaEnviado = t.fechaEnviado ? parseDate(t.fechaEnviado.toString()) : null;
        if (!fechaEnviado || !t.codigoUnico || !t.tienda) return;
        
        // Obtener talla del producto relacionado o del traspaso si está disponible
        let tallaTraspaso = t.talla ? String(t.talla).trim() : null;
        
        // Si no hay talla en el traspaso, buscar en productos
        if (!tallaTraspaso) {
          const producto = productosConFechaAlmacen.find(p => p.codigoUnico === t.codigoUnico);
          if (producto && producto.talla) {
            tallaTraspaso = String(producto.talla).trim();
          }
        }
        
        if (!tallaTraspaso) return;
        
        const key = `${t.codigoUnico}|${tallaTraspaso}|${t.tienda}`;
        const existing = primerEnvio.get(key);
        if (!existing || fechaEnviado < existing.fechaEnviadoDate) {
          primerEnvio.set(key, { ...t, fechaEnviadoDate: fechaEnviado, talla: tallaTraspaso });
        }
      });
      
      const timelineData: ExtendedDashboardData['analisisTemporal']['datos'] = [];
      
      primerEnvio.forEach((traspaso, key) => {
        const [codigoUnico, talla, tiendaEnvio] = key.split('|');
        const producto = productosConFechaAlmacen.find(p => p.codigoUnico === codigoUnico && p.talla === talla);
        if (!producto || !producto.fechaAlmacen) return;
        
        const fechaEntrada = parseDate(producto.fechaAlmacen.toString());
        if (!fechaEntrada || traspaso.fechaEnviadoDate < fechaEntrada) return;
        
        const diasEntradaEnvio = Math.floor((traspaso.fechaEnviadoDate.getTime() - fechaEntrada.getTime()) / (1000 * 60 * 60 * 24));
        
        // Buscar primera venta en esa tienda para ese producto/talla
        const ventasProducto = filteredVentas.filter(v =>
          v.codigoUnico === codigoUnico &&
          v.talla === talla &&
          v.tienda === tiendaEnvio &&
          (v.cantidad || 0) > 0
        );
        
        let fechaPrimeraVenta: Date | null = null;
        let diasEnvioPrimeraVenta: number | null = null;
        
        if (ventasProducto.length > 0) {
          const ventasConFecha = ventasProducto
            .map(v => ({
              venta: v,
              fecha: v.fechaVenta ? parseDate(v.fechaVenta.toString()) : null
            }))
            .filter(v => v.fecha !== null && v.fecha >= fechaEntrada)
            .sort((a, b) => a.fecha!.getTime() - b.fecha!.getTime());
          
          if (ventasConFecha.length > 0) {
            fechaPrimeraVenta = ventasConFecha[0].fecha!;
            diasEnvioPrimeraVenta = Math.floor((fechaPrimeraVenta.getTime() - traspaso.fechaEnviadoDate.getTime()) / (1000 * 60 * 60 * 24));
          }
        }
        
        timelineData.push({
          codigoUnico,
          tema: producto.tema || '',
          talla,
          tiendaEnvio,
          fechaEntradaAlmacen: fechaEntrada.toISOString().split('T')[0],
          fechaEnviado: traspaso.fechaEnviadoDate.toISOString().split('T')[0],
          fechaPrimeraVenta: fechaPrimeraVenta ? fechaPrimeraVenta.toISOString().split('T')[0] : null,
          diasEntradaEnvio,
          diasEnvioPrimeraVenta,
        });
      });
      
      if (timelineData.length > 0) {
        const diasEntradaEnvio = timelineData.map(d => d.diasEntradaEnvio);
        const diasEnvioPrimeraVenta = timelineData
          .map(d => d.diasEnvioPrimeraVenta)
          .filter((d): d is number => d !== null);
        
        analisisTemporal = {
          datos: timelineData.sort((a, b) => 
            new Date(b.fechaEntradaAlmacen).getTime() - new Date(a.fechaEntradaAlmacen).getTime()
          ),
          promedioDiasEntradaEnvio: diasEntradaEnvio.reduce((sum, d) => sum + d, 0) / diasEntradaEnvio.length,
          promedioDiasEnvioPrimeraVenta: diasEnvioPrimeraVenta.length > 0 
            ? diasEnvioPrimeraVenta.reduce((sum, d) => sum + d, 0) / diasEnvioPrimeraVenta.length
            : null,
          totalProductos: timelineData.length,
        };
        
        console.log(`✅ Análisis temporal calculado: ${analisisTemporal.datos.length} productos`);
      } else {
        console.log(`⚠️ No se encontraron datos de timeline para análisis temporal`);
      }
    } else {
      console.log(`⚠️ No hay traspasos relevantes para análisis temporal`);
    }
  } else {
    console.log(`⚠️ No hay datos suficientes para análisis temporal (productos con fecha: ${productosConFechaAlmacen.length}, traspasos: ${traspasos.length}, ventas: ${filteredVentas.length})`);
  }
  
  return {
    alcance,
    kpisGenerales,
    kpisFicticio,
    kpisTienda,
    ventasMensuales,
    topTiendas,
    bottomTiendas,
    ventasPorTalla,
    ventasPorTallaConTemporada,
    kpisRotacion,
    cantidadPedidaPorMesTalla,
    ventasVsTraspasosPorTienda,
    resumenVentasVsTraspasosTemporada,
    totalesPorTienda,
    entradasAlmacenPorTema,
    comparacionEnviadoVsVentasPorTema,
    analisisTemporal,
  };
}

// ============================================
// GEOGRAPHIC METRICS
// ============================================

export interface GeographicMetrics {
  kpisPorZona: Array<{
    zona: string;
    mejorTienda: string;
    mejorCantidad: number;
    mejorBeneficio: number;
    peorTienda: string;
    peorCantidad: number;
    peorBeneficio: number;
    mediaBeneficio: number;
  }>;
  ventasPorZona: Array<{
    zona: string;
    cantidad: number;
    beneficio: number;
  }>;
  tiendasPorZona: Array<{
    zona: string;
    numTiendas: number;
  }>;
  evolucionMensualPorZona: Array<{
    mes: string;
    zona: string;
    cantidad: number;
  }>;
  mapaEspana: Array<{
    tienda: string;
    lat: number;
    lon: number;
    cantidad: number;
    beneficio: number;
  }>;
  mapaItalia: Array<{
    ciudad: string;
    lat: number;
    lon: number;
    cantidad: number;
    beneficio: number;
  }>;
}

// Coordenadas España (del Streamlit líneas 2292-2493)
const TIENDA_COORDS_ESPANA: Record<string, [number, number]> = {
  // --- EN ---
  'EN02- VALENCIA ECI PINTOR SOROLLA': [39.4702, -0.3768],
  'EN03- SANCHINARRO ECI': [40.4940, -3.6620],
  'EN04- VITORIA ECI': [42.8467, -2.6716],
  'EN05-ZARAGOZA': [41.6488, -0.8891],
  'EN07- GOYA ECI': [40.4240, -3.6800],
  'EN08- BILBAO ECI': [43.2630, -2.9350],
  'EN09- LAS PALMAS MESA Y LOPEZ ECI': [28.1297, -15.4457],
  'EN11- LEON ECI': [42.5987, -5.5671],
  'EN13- CASTELLON ECI': [39.9864, -0.0513],
  'EN14- CORUÑA ECI': [43.3623, -8.4115],
  'EN15- VALLADOLID ECI': [41.6523, -4.7245],
  'EN16- GIJON ECI': [43.5322, -5.6611],
  'EN19- SANTANDER': [43.4623, -3.8099],
  'EN24- 7 PALMAS -GRAN CANARIA EC': [28.1081, -15.4565],
  'EN25- MALLORCA ECI NAELLE': [39.5712, 2.6490],
  'EN26- VALENCIA AVDA.FRANCIA ECI NAELLE': [39.4615, -0.3400],
  'EN27- VAGUADA ECI NAELLE': [40.4786, -3.7114],
  'EN28- GRANADA GENIL ECI NAELLE': [37.1765, -3.5979],
  'EN29- VIGO ECI NAELLE': [42.2406, -8.7207],
  'EN30- PRINCESA ECI NAELLE': [40.4254, -3.7171],
  'EN33- ALICANTE ECI NAELLE': [38.3452, -0.4810],
  'EN34- PRECIADOS ECI NAELLE': [40.4180, -3.7040],
  'EN35- VALLADOLID ZORRILLA ECI NAELLE': [41.6360, -4.7280],
  'EN36- SEVILLA DUQUE ECI NAELLE': [37.3908, -5.9955],
  'EN37- CORDOBA RONDA ECI NAELLE': [37.8882, -4.7794],
  'EN38- CORDOBA TEJARES ECI NAELLE': [37.8882, -4.7794],
  'EN39- ALBACETE ECI NAELLE': [38.9943, -1.8585],
  'EN41- ECI DIAGONAL B ECI NAELLE': [41.3917, 2.1600],
  'EN42- ECI MARBELLA ECI NAELLE': [36.5120, -4.8839],
  'EN46- GRANADA ARABIAL ECI NAELLE': [37.1765, -3.5979],
  'EN48- MENDEZ ALVARO NAELLE ECI': [40.3965, -3.6780],
  'EN54- BADAJOZ CONQUISTADORES': [38.8786, -6.9703],
  'EN62- ECI NAELLE BAHIA DE CADIZ': [36.5297, -6.2927],
  'EN63- ECI NAELLE ALCALÁ DE HENARES': [40.4820, -3.3640],
  // --- ET ---
  'ET01- SANCHINARRO ECI TRUCCO': [40.4940, -3.6620],
  'ET02- SEVILLA NERVION ECI TRUCCO': [37.3831, -5.9719],
  'ET03- VIGO ECI TRUCCO': [42.2406, -8.7207],
  'ET04- MALAGA ECI TRUCCO': [36.7213, -4.4214],
  'ET05- CAMPO NACIONES MADRID ECI TRUCCO': [40.4517, -3.6167],
  'ET06- VALENCIA-AVDA.FRANCIA ECI TRUCCO': [39.4615, -0.3400],
  'ET07- ALCALA HENARES ECI TRUCCO': [40.4820, -3.3640],
  'ET08-(0001) PRECIADOS ECI TRUCCO': [40.4180, -3.7040],
  'ET09- LAS PALMAS ECI TRUCCO': [28.1297, -15.4457],
  'ET11- MURCIA ECI TRUCCO': [37.9847, -1.1286],
  'ET12- PRINCESA ECI TRUCCO': [40.4254, -3.7171],
  'ET13- TENERIFE ECI TRUCCO': [28.4682, -16.2546],
  'ET14- SAN JOSE DE VALDERAS CORTE INGLES': [40.3440, -3.7730],
  'ET15- ARROYOMOLINOS XANADU ECI TRUCCO': [40.2740, -3.9170],
  'ET16- EL BERCIAL ECI TRUCCO': [40.3175, -3.7317],
  'ET17- SEVILLA DUQUE ECI TRUCCO': [37.3908, -5.9955],
  'ET18- SEVILLA SAN JUAN ECI TRUCCO': [37.2830, -6.0090],
  'ET19- GIJON ECI TRUCCO': [43.5322, -5.6611],
  'ET20- SALAMANCA ECI TRUCCO': [40.9701, -5.6635],
  'ET21- CARTAGENA ECI TRUCCO': [37.6257, -0.9966],
  'ET24- GRANADA GENIL ECI TRUCCO': [37.1765, -3.5979],
  'ET26- LEON ECI TRUCCO': [42.5987, -5.5671],
  'ET29- CASTELLANA ECI TRUCCO': [40.4411, -3.6907],
  'ET30- SOROLLA VALENCIA ECI TRUCCO': [39.4702, -0.3768],
  'ET31- NUEVO CENTRO VALENCIA ECI TRUCCO': [39.4789, -0.3925],
  'ET32- VITORIA ECI TRUCCO': [42.8467, -2.6716],
  'ET33- ECI COSTA LUZ ECI TRUCCO': [36.5297, -6.2927],
  'ET34- VALLADOLID ZORRILLA ECI TRUCCO': [41.6360, -4.7280],
  'ET35- VALLADOLID CONSTITUCION ECI TRUCC': [41.6523, -4.7245],
  'ET37- SANTIAGO ECI TRUCCO': [42.8804, -8.5456],
  'ET38- GERONA-GIROCENTRE ECI TRUCCO': [41.9810, 2.8249],
  'ET39- PUERTO VENECIA ECI TRUCCO': [41.6041, -0.8760],
  'ET41- JAEN ECI TRUCCO': [37.7796, -3.7849],
  'ET42- MALAGA BAHIA ECI TRUCCO': [36.7213, -4.4214],
  'ET43- SANTANDER ECI TRUCCO': [43.4623, -3.8099],
  'ET44- TARRAGONA ECI TRUCCO': [41.1189, 1.2445],
  'ET45- SABADELL ECI TRUCCO': [41.5463, 2.1086],
  'ET46- BADAJOZ CONQUISTADORES ECI TRUCCO': [38.8786, -6.9703],
  'ET47- CAN DRAGO ECI TRUCCO': [41.4410, 2.1835],
  'ET48- MENDEZ ALVARO ECI TRUCCO': [40.3965, -3.6780],
  'ET49- ALBACETE ECI TRUCCO': [38.9943, -1.8585],
  'ET50- JEREZ ECI TRUCCO': [36.6864, -6.1361],
  'ET51- PARQUESUR ECI TRUCCO': [40.3394, -3.7632],
  'ET52- VAGUADA ECI TRUCCO': [40.4786, -3.7114],
  'ET53- CORDOBA ECI TRUCCO': [37.8882, -4.7794],
  'ET54- CADIZ ECI TRUCCO': [36.5297, -6.2927],
  'ET55- GRANADA ARABIAL ECI TRUCCO': [37.1765, -3.5979],
  'ET56- PAMPLONA ECI TRUCCO': [42.8125, -1.6458],
  'ET57- CASTELLÓN ECI TRUCCO': [39.9864, -0.0513],
  'ET58- A CORUÑA-RAMON Y CAJAL ECI TRUCCO': [43.3623, -8.4115],
  'ET61- BAHIA DE ALGECIRAS ECI TRUCCO': [36.1333, -5.4500],
  'ET62- 7 PALMAS ECI TRUCCO': [28.1081, -15.4565],
  'ET64- POZUELO ECI TRUCCO': [40.4361, -3.8136],
  'ET66- CORDOBA TEJARES ECI TRUCCO': [37.8882, -4.7794],
  'ET68- AVILES ECI TRUCCO': [43.5560, -5.9247],
  'ET75- EL EJIDO TRUCCO ECI': [36.7763, -2.8146],
  // --- F / P / R ---
  'F087 CHAVES': [41.7403, -7.4689],
  'F095  CIUDAD REAL': [38.9863, -3.9291],
  'F097 BADAJOZ': [38.8786, -6.9703],
  'P030 PAMPLONA': [42.8125, -1.6458],
  'P032 FUENCARRAL': [40.4297, -3.7036],
  'R010 ARTURO': [40.4483, -3.6900],
  'R013 BILBAO': [43.2630, -2.9350],
  'R018 PALACIO DE HIELO': [40.4631, -3.6370],
  'R025 CASTELLANA': [40.4411, -3.6907],
  'R026 JORGE JUAN': [40.4246, -3.6820],
  'R028 PRINCESA': [40.4254, -3.7171],
};

// Coordenadas Italia
const COORDENADAS_ITALIA: Record<string, [number, number]> = {
  'BERGAMO': [45.6983, 9.6773],
  'VARESE': [45.8206, 8.8256],
  'BARICASAMASSIMA': [40.9634, 16.7514],
  'MILANO5GIORNATE': [45.4642, 9.1900],
  'ROMACINECITTA': [41.9028, 12.4964],
  'GENOVA': [44.4056, 8.9463],
  'SASSARI': [40.7259, 8.5557],
  'CATANIA': [37.5079, 15.0830],
  'CAGLIARI': [39.2238, 9.1217],
  'LECCE': [40.3519, 18.1720],
  'MILANOCANTORE': [45.4642, 9.1900],
  'MESTRE': [45.4903, 12.2424],
  'PADOVA': [45.4064, 11.8768],
  'FIRENZE': [43.7696, 11.2558],
  'ROMASANGIOVANNI': [41.9028, 12.4964],
  'MILANO': [45.4642, 9.1900],
  'ONLINE': [41.9028, 12.4964],
};

function asignarZonaGeografica(tienda: string): string {
  const t = tienda.toUpperCase();
  
  // Norte
  if (t.includes('BILBAO') || t.includes('VITORIA') || t.includes('SANTANDER') || 
      t.includes('GIJON') || t.includes('AVILES') || t.includes('LEON') || 
      t.includes('CORUÑA') || t.includes('VIGO') || t.includes('SANTIAGO') || 
      t.includes('PAMPLONA')) {
    return 'Norte';
  }
  
  // Madrid
  if (t.includes('MADRID') || t.includes('SANCHINARRO') || t.includes('GOYA') || 
      t.includes('VAGUADA') || t.includes('PRINCESA') || t.includes('CAMPO NACIONES') || 
      t.includes('PRECIADOS') || t.includes('VALDERAS') || t.includes('ARROYOMOLINOS') || 
      t.includes('BERCIAL') || t.includes('MENDEZ ALVARO') || t.includes('PARQUESUR') || 
      t.includes('CASTELLANA') || t.includes('JORGE JUAN') || t.includes('ARTURO') || 
      t.includes('PALACIO DE HIELO') || t.includes('POZUELO') || t.includes('FUENCARRAL')) {
    return 'Madrid';
  }
  
  // Levante
  if (t.includes('VALENCIA') || t.includes('ALICANTE') || t.includes('MURCIA') || 
      t.includes('CASTELLON') || t.includes('CARTAGENA') || t.includes('SOROLLA')) {
    return 'Levante';
  }
  
  // Sur
  if (t.includes('SEVILLA') || t.includes('GRANADA') || t.includes('MALAGA') || 
      t.includes('CORDOBA') || t.includes('CADIZ') || t.includes('MARBELLA') || 
      t.includes('JEREZ') || t.includes('ALGECIRAS') || t.includes('BADAJOZ') || 
      t.includes('JAEN')) {
    return 'Sur';
  }
  
  // Centro
  if (t.includes('ZARAGOZA') || t.includes('VALLADOLID') || t.includes('SALAMANCA') || 
      t.includes('ALBACETE') || t.includes('CIUDAD REAL')) {
    return 'Centro';
  }
  
  // Cataluña
  if (t.includes('BARCELONA') || t.includes('DIAGONAL') || t.includes('SABADELL') || 
      t.includes('GERONA') || t.includes('TARRAGONA') || t.includes('CAN DRAGO')) {
    return 'Cataluña';
  }
  
  // Islas
  if (t.includes('PALMAS') || t.includes('CANARIA') || t.includes('TENERIFE') || 
      t.includes('MALLORCA')) {
    return 'Islas';
  }
  
  return 'Otros';
}

function extractCiudadItalia(tienda: string): string {
  const t = tienda.toUpperCase();
  
  if (t.includes('BERGAMO')) return 'BERGAMO';
  if (t.includes('VARESE')) return 'VARESE';
  if (t.includes('BARICASAMASSIMA')) return 'BARICASAMASSIMA';
  if (t.includes('MILANO5GIORNATE')) return 'MILANO5GIORNATE';
  if (t.includes('ROMACINECITTA')) return 'ROMACINECITTA';
  if (t.includes('GENOVA')) return 'GENOVA';
  if (t.includes('SASSARI')) return 'SASSARI';
  if (t.includes('CATANIA')) return 'CATANIA';
  if (t.includes('CAGLIARI')) return 'CAGLIARI';
  if (t.includes('LECCE')) return 'LECCE';
  if (t.includes('MILANOCANTORE')) return 'MILANOCANTORE';
  if (t.includes('MESTRE')) return 'MESTRE';
  if (t.includes('PADOVA')) return 'PADOVA';
  if (t.includes('FIRENZE')) return 'FIRENZE';
  if (t.includes('ROMASANGIOVANNI')) return 'ROMASANGIOVANNI';
  if (t.includes('MILANO')) return 'MILANO';
  if (t.includes('ONLINE')) return 'ONLINE';
  
  return 'OTROS';
}

export function calculateGeographicMetrics(
  ventas: VentasData[],
  filters?: FilterOptions
): GeographicMetrics {
  // Apply filters and exclude GR.ART.FICTICIO
  let filteredVentas = filters ? applyFilters(ventas, filters) : ventas;
  filteredVentas = filteredVentas.filter(v => 
    v.descripcionFamilia !== 'GR.ART.FICTICIO' && (v.cantidad || 0) > 0
  );
  
  // Asignar zona geográfica a cada venta
  const ventasConZona = filteredVentas.map(v => ({
    ...v,
    zona: v.tienda ? asignarZonaGeografica(v.tienda) : 'Otros'
  }));
  
  // KPIs por zona
  const zonaMap = new Map<string, Map<string, { cantidad: number; beneficio: number }>>();
  
  ventasConZona.forEach(v => {
    if (!v.tienda || !v.zona) return;
    
    if (!zonaMap.has(v.zona)) {
      zonaMap.set(v.zona, new Map());
    }
    
    const tiendasZona = zonaMap.get(v.zona)!;
    if (!tiendasZona.has(v.tienda)) {
      tiendasZona.set(v.tienda, { cantidad: 0, beneficio: 0 });
    }
    
    const tiendaData = tiendasZona.get(v.tienda)!;
    tiendaData.cantidad += v.cantidad || 0;
    tiendaData.beneficio += v.subtotal || 0;
  });
  
  const kpisPorZona = Array.from(zonaMap.entries()).map(([zona, tiendasMap]) => {
    // Limpiar nombres de tiendas problemáticos (como Streamlit)
    const tiendas = Array.from(tiendasMap.entries())
      .map(([tienda, data]) => {
        let tiendaLimpia = tienda;
        if (!tienda || tienda === 'COMODIN' || tienda === 'nan' || tienda === 'None' || tienda === '') {
          tiendaLimpia = 'Sin Asignar';
        }
        return { tienda: tiendaLimpia, ...data };
      });
    
    // Calcular media de Cantidad por zona (como Streamlit)
    const mediaZona = tiendas.reduce((sum, t) => sum + t.cantidad, 0) / (tiendas.length || 1);
    
    // Encontrar mejor tienda por CANTIDAD (no beneficio) - como Streamlit línea 2165
    const tiendasOrdenadas = [...tiendas].sort((a, b) => b.cantidad - a.cantidad);
    const mejor = tiendasOrdenadas[0] || { tienda: 'N/A', cantidad: 0, beneficio: 0 };
    
    // Encontrar peor tienda por CANTIDAD (no beneficio) - como Streamlit línea 2173
    const peor = tiendasOrdenadas[tiendasOrdenadas.length - 1] || { tienda: 'N/A', cantidad: 0, beneficio: 0 };
    
    // Calcular %_vs_Media para la peor tienda (como Streamlit líneas 2148-2154)
    const porcentajeVsMedia = mediaZona > 0 
      ? Number((((peor.cantidad - mediaZona) / mediaZona) * 100).toFixed(1))
      : 0;
    
    return {
      zona,
      mejorTienda: mejor.tienda,
      mejorCantidad: mejor.cantidad,
      mejorBeneficio: mejor.beneficio,
      peorTienda: peor.tienda,
      peorCantidad: peor.cantidad,
      peorBeneficio: peor.beneficio,
      porcentajeVsMedia,
      mediaZona,
    };
  });
  
  // Ventas por zona
  const ventasZonaMap = new Map<string, { cantidad: number; beneficio: number }>();
  ventasConZona.forEach(v => {
    if (!v.zona) return;
    if (!ventasZonaMap.has(v.zona)) {
      ventasZonaMap.set(v.zona, { cantidad: 0, beneficio: 0 });
    }
    const data = ventasZonaMap.get(v.zona)!;
    data.cantidad += v.cantidad || 0;
    data.beneficio += v.subtotal || 0;
  });
  
  const ventasPorZona = Array.from(ventasZonaMap.entries())
    .map(([zona, data]) => ({ zona, ...data }))
    .sort((a, b) => b.beneficio - a.beneficio);
  
  // Tiendas por zona
  const tiendasZonaMap = new Map<string, Set<string>>();
  ventasConZona.forEach(v => {
    if (!v.zona || !v.tienda) return;
    if (!tiendasZonaMap.has(v.zona)) {
      tiendasZonaMap.set(v.zona, new Set());
    }
    tiendasZonaMap.get(v.zona)!.add(v.tienda);
  });
  
  const tiendasPorZona = Array.from(tiendasZonaMap.entries())
    .map(([zona, tiendas]) => ({ zona, numTiendas: tiendas.size }));
  
  // Evolución mensual por zona
  const evolucionMap = new Map<string, Map<string, number>>();
  ventasConZona.forEach(v => {
    if (!v.mes || !v.zona) return;
    if (!evolucionMap.has(v.mes)) {
      evolucionMap.set(v.mes, new Map());
    }
    const mesData = evolucionMap.get(v.mes)!;
    mesData.set(v.zona, (mesData.get(v.zona) || 0) + (v.cantidad || 0));
  });
  
  const evolucionMensualPorZona: Array<any> = [];
  evolucionMap.forEach((zonasData, mes) => {
    zonasData.forEach((cantidad, zona) => {
      evolucionMensualPorZona.push({ mes, zona, cantidad });
    });
  });
  
  // Mapa España
  const espanaMap = new Map<string, { lat: number; lon: number; cantidad: number; beneficio: number }>();
  const tiendasItalia = filteredVentas.filter(v => v.tienda && v.tienda.includes('COIN'));
  const ventasEspana = filteredVentas.filter(v => !tiendasItalia.some(t => t.tienda === v.tienda));
  
  ventasEspana.forEach(v => {
    if (!v.tienda) return;
    const coords = TIENDA_COORDS_ESPANA[v.tienda];
    if (!coords) return;
    
    if (!espanaMap.has(v.tienda)) {
      espanaMap.set(v.tienda, { lat: coords[0], lon: coords[1], cantidad: 0, beneficio: 0 });
    }
    
    const data = espanaMap.get(v.tienda)!;
    data.cantidad += v.cantidad || 0;
    data.beneficio += v.subtotal || 0;
  });
  
  const mapaEspana = Array.from(espanaMap.entries())
    .map(([tienda, data]) => ({ tienda, ...data }))
    .filter(item => item.cantidad > 0);
  
  // Mapa Italia
  const italiaMap = new Map<string, { lat: number; lon: number; cantidad: number; beneficio: number }>();
  tiendasItalia.forEach(v => {
    if (!v.tienda) return;
    const ciudad = extractCiudadItalia(v.tienda);
    const coords = COORDENADAS_ITALIA[ciudad];
    if (!coords) return;
    
    if (!italiaMap.has(ciudad)) {
      italiaMap.set(ciudad, { lat: coords[0], lon: coords[1], cantidad: 0, beneficio: 0 });
    }
    
    const data = italiaMap.get(ciudad)!;
    data.cantidad += v.cantidad || 0;
    data.beneficio += v.subtotal || 0;
  });
  
  const mapaItalia = Array.from(italiaMap.entries())
    .map(([ciudad, data]) => ({ ciudad, ...data }))
    .filter(item => item.cantidad > 0);
  
  return {
    kpisPorZona,
    ventasPorZona,
    tiendasPorZona,
    evolucionMensualPorZona,
    mapaEspana,
    mapaItalia,
  };
}

// ============================================
// PRODUCT PROFITABILITY METRICS
// ============================================

export interface ProductProfitabilityMetrics {
  kpisDevoluciones: {
    tiendaMasDevoluciones: string;
    tiendaRatioDevolucion: number;
    tallaMasDevuelta: string;
    tallaMasDevueltaUnidades: number;
    familiaMasDevuelta: string;
    familiaMasDevueltaUnidades: number;
  };
  kpisRebajas: {
    rebajas1Valor: number;
    rebajas1Porcentaje: number;
    rebajas2Valor: number;
    rebajas2Porcentaje: number;
  };
  kpisMargen: {
    margenUnitarioPromedio: number;
    margenPorcentualPromedio: number;
  };
  ventasVsDevolucionesPorFamilia: Array<{
    familia: string;
    ventas: number;
    devoluciones: number;
  }>;
  tallasPorFamilia: Array<{
    familia: string;
    talla: string;
    cantidad: number;
  }>;
  tallasPorFamiliaDetallado: Array<{
    familia: string;
    masDevueltas: Array<{ talla: string; cantidad: number }>;
    menosDevueltas: Array<{ talla: string; cantidad: number }>;
  }>;
  ventasPorTemporada: Array<{
    temporada: string;
    enTemporada: number;
    fueraTemporada: number;
    total: number;
    porcentajeEnTemporada: number;
    porcentajeFueraTemporada: number;
  }>;
  productosMargenNegativo: Array<{
    codigoUnico: string;
    familia: string;
    temporada: string;
    fechaVenta: string;
    precioVenta: number;
    precioCoste: number;
    margenUnitario: number;
    margenPorcentaje: number;
  }>;
  productosBajoMargen: Array<{
    codigoUnico: string;
    familia: string;
    temporada: string;
    fechaVenta: string;
    precioVenta: number;
    precioCoste: number;
    margenPorcentaje: number;
    cantidad: number;
  }>;
}

function getTemporadaActual(fechaVenta: string): string {
  const date = new Date(fechaVenta);
  const mes = date.getMonth() + 1;
  const año = date.getFullYear();
  
  if (mes >= 3 && mes <= 8) {
    return `V${año}`;
  } else {
    if (mes === 1 || mes === 2) {
      return `I${año}`;
    } else {
      return `I${año + 1}`;
    }
  }
}

export function calculateProductProfitabilityMetrics(
  ventas: VentasData[],
  productos: ProductosData[],
  filters?: FilterOptions
): ProductProfitabilityMetrics {
  let filteredVentas = filters ? applyFilters(ventas, filters) : ventas;
  
  // Excluir GR.ART.FICTICIO de todos los cálculos
  filteredVentas = filteredVentas.filter(v => {
    const familiaNombre = (v.descripcionFamilia || v.familia || '').trim();
    const familiaCodigo = (v.familia || '').trim();
    
    // Normalizar: eliminar espacios múltiples y convertir a mayúsculas
    const nombreNormalizado = familiaNombre.replace(/\s+/g, ' ').trim().toUpperCase();
    const codigoNormalizado = familiaCodigo.replace(/\s+/g, ' ').trim().toUpperCase();
    
    // Verificar múltiples variaciones posibles
    const esFicticio = 
      nombreNormalizado.includes('GR.ART.FICTICIO') || 
      nombreNormalizado.includes('GR ART FICTICIO') ||
      nombreNormalizado.includes('GR-ART-FICTICIO') ||
      nombreNormalizado.includes('FICTICIO') ||
      nombreNormalizado === 'GR.ART.FICTICIO' ||
      codigoNormalizado.includes('GR.ART.FICTICIO') ||
      codigoNormalizado.includes('GR ART FICTICIO') ||
      codigoNormalizado.includes('GR-ART-FICTICIO') ||
      codigoNormalizado.includes('FICTICIO') ||
      codigoNormalizado === 'GR.ART.FICTICIO';
    
    return !esFicticio;
  });
  
  // Debug: verificar que el filtro funciona
  const devolucionesDebug = filteredVentas.filter(v => (v.cantidad || 0) < 0);
  const familiasEnDevoluciones = new Set(devolucionesDebug.map(v => (v.descripcionFamilia || v.familia || '').trim()));
  const tieneFicticio = Array.from(familiasEnDevoluciones).some(f => 
    f.toUpperCase().includes('FICTICIO') || f.toUpperCase().includes('GR.ART.FICTICIO')
  );
  if (tieneFicticio) {
    const familiasFicticio = Array.from(familiasEnDevoluciones).filter(f => {
      const fUpper = f.toUpperCase();
      return fUpper.includes('FICTICIO') || fUpper.includes('GR.ART.FICTICIO');
    });
    console.log('⚠️ WARNING: Se encontraron familias FICTICIO en devoluciones después del filtro:', familiasFicticio);
    console.log('⚠️ Detalle de las familias encontradas:', familiasFicticio.map(f => `"${f}"`));
  }
  
  // Log adicional: mostrar todas las familias en devoluciones para debug
  const todasLasFamilias = Array.from(familiasEnDevoluciones).sort();
  const familiasConFicticio = todasLasFamilias.filter(f => f.toUpperCase().includes('FICTICIO'));
  if (familiasConFicticio.length > 0) {
    console.log('⚠️ DEBUG: Familias con FICTICIO encontradas:', familiasConFicticio);
  }
  
  // Merge con productos para obtener precio coste
  const productosMap = new Map(productos.map(p => [p.codigoUnico, p]));
  const ventasConPrecio = filteredVentas.map(v => ({
    ...v,
    precioCoste: v.precioCoste || productosMap.get(v.codigoUnico || '')?.precioCoste || 0,
  }));
  
  // KPIs Devoluciones (ya excluye GR.ART.FICTICIO)
  const devoluciones = ventasConPrecio.filter(v => (v.cantidad || 0) < 0);
  const ventasPositivas = ventasConPrecio.filter(v => (v.cantidad || 0) > 0);
  
  // Tienda con más devoluciones
  const devolucionesPorTienda = new Map<string, { cantidad: number; devueltas: number }>();
  devoluciones.forEach(v => {
    if (!v.tienda) return;
    if (!devolucionesPorTienda.has(v.tienda)) {
      devolucionesPorTienda.set(v.tienda, { cantidad: 0, devueltas: 0 });
    }
    const data = devolucionesPorTienda.get(v.tienda)!;
    data.devueltas += Math.abs(v.cantidad || 0);
  });
  
  ventasPositivas.forEach(v => {
    if (!v.tienda) return;
    if (!devolucionesPorTienda.has(v.tienda)) {
      devolucionesPorTienda.set(v.tienda, { cantidad: 0, devueltas: 0 });
    }
    const data = devolucionesPorTienda.get(v.tienda)!;
    data.cantidad += v.cantidad || 0;
  });
  
  let tiendaMasDevoluciones = 'N/A';
  let tiendaRatioDevolucion = 0;
  let maxDevoluciones = 0;
  
  devolucionesPorTienda.forEach((data, tienda) => {
    const total = data.cantidad + data.devueltas;
    const ratio = total > 0 ? (data.devueltas / total) * 100 : 0;
    if (data.devueltas > maxDevoluciones) {
      maxDevoluciones = data.devueltas;
      tiendaMasDevoluciones = tienda;
      tiendaRatioDevolucion = ratio;
    }
  });
  
  // Talla más devuelta
  const tallaDevolucionesMap = new Map<string, number>();
  devoluciones.forEach(v => {
    if (!v.talla) return;
    tallaDevolucionesMap.set(v.talla, (tallaDevolucionesMap.get(v.talla) || 0) + Math.abs(v.cantidad || 0));
  });
  
  let tallaMasDevuelta = 'N/A';
  let tallaMasDevueltaUnidades = 0;
  tallaDevolucionesMap.forEach((cantidad, talla) => {
    if (cantidad > tallaMasDevueltaUnidades) {
      tallaMasDevuelta = talla;
      tallaMasDevueltaUnidades = cantidad;
    }
  });
  
  // Familia más devuelta - usar código de familia como en Streamlit
  // Streamlit: devoluciones.groupby('Familia')['Cantidad'].sum().abs().sort_values(ascending=False).head(1)
  // GR.ART.FICTICIO ya está excluido en filteredVentas
  const familiaDevolucionesMap = new Map<string, number>();
  devoluciones.forEach(v => {
    const familiaCodigo = (v.familia || '').trim();
    
    // Verificación adicional: excluir GR.ART.FICTICIO si aún aparece
    const codigoNormalizado = familiaCodigo.replace(/\s+/g, ' ').trim().toUpperCase();
    const esFicticio = 
      codigoNormalizado.includes('GR.ART.FICTICIO') ||
      codigoNormalizado.includes('GR ART FICTICIO') ||
      codigoNormalizado.includes('GR-ART-FICTICIO') ||
      codigoNormalizado.includes('FICTICIO') ||
      codigoNormalizado === 'GR.ART.FICTICIO';
    
    if (familiaCodigo && !esFicticio) {
      // Sumar cantidades (unidades) como en Streamlit
      familiaDevolucionesMap.set(familiaCodigo, (familiaDevolucionesMap.get(familiaCodigo) || 0) + Math.abs(v.cantidad || 0));
    }
  });
  
  let familiaMasDevuelta = 'N/A';
  let familiaMasDevueltaUnidades = 0;
  
  // Solo calcular si hay familias válidas (excluyendo GR.ART.FICTICIO)
  if (familiaDevolucionesMap.size > 0) {
    familiaDevolucionesMap.forEach((cantidad, familiaCodigo) => {
      // Verificación final: asegurar que no es FICTICIO
      const codigoNormalizado = familiaCodigo.replace(/\s+/g, ' ').trim().toUpperCase();
      const esFicticio = 
        codigoNormalizado.includes('FICTICIO') || 
        codigoNormalizado.includes('GR.ART.FICTICIO') ||
        codigoNormalizado.includes('GR ART FICTICIO') ||
        codigoNormalizado.includes('GR-ART-FICTICIO');
      
      if (!esFicticio && cantidad > familiaMasDevueltaUnidades) {
        familiaMasDevuelta = familiaCodigo;
        familiaMasDevueltaUnidades = cantidad;
      }
    });
  }
  
  // Log para debug
  const familiaMasDevueltaNormalizada = familiaMasDevuelta.replace(/\s+/g, ' ').trim().toUpperCase();
  if (familiaMasDevueltaNormalizada.includes('FICTICIO') || familiaMasDevueltaNormalizada.includes('GR.ART.FICTICIO')) {
    console.log('⚠️ ERROR: La familia más devuelta es FICTICIO:', familiaMasDevuelta);
    familiaMasDevuelta = 'N/A';
    familiaMasDevueltaUnidades = 0;
  }
  
  // Log final: mostrar qué familia se retorna
  console.log('📊 Familia más devuelta calculada:', familiaMasDevuelta, '(', familiaMasDevueltaUnidades, 'unidades)');
  
  // KPIs Rebajas (solo ventas positivas)
  const ventasConRebajas = ventasPositivas.map(v => {
    const mes = v.fechaVenta ? new Date(v.fechaVenta).getMonth() + 1 : 0;
    const precioRealUnitario = (v.cantidad || 0) > 0 ? (v.subtotal || 0) / (v.cantidad || 1) : 0;
    const descuentoReal = (v.pvp || 0) > 0 && precioRealUnitario > 0
      ? ((v.pvp - precioRealUnitario) / v.pvp) * 100
      : 0;
    
    const temporadaActual = v.fechaVenta ? getTemporadaActual(v.fechaVenta) : '';
    const fueraTemporada = v.temporada !== temporadaActual;
    const esRebaja = descuentoReal > 0 || fueraTemporada;
    
    return { ...v, mes, esRebaja };
  });
  
  const totalVentas = ventasConRebajas.reduce((sum, v) => sum + (v.subtotal || 0), 0);
  const rebajas1 = ventasConRebajas.filter(v => v.esRebaja && (v.mes === 1 || v.mes === 6));
  const rebajas2 = ventasConRebajas.filter(v => v.esRebaja && (v.mes === 2 || v.mes === 7 || v.mes === 8));
  
  const rebajas1Valor = rebajas1.reduce((sum, v) => sum + (v.subtotal || 0), 0);
  const rebajas2Valor = rebajas2.reduce((sum, v) => sum + (v.subtotal || 0), 0);
  const rebajas1Porcentaje = totalVentas > 0 ? (rebajas1Valor / totalVentas) * 100 : 0;
  const rebajas2Porcentaje = totalVentas > 0 ? (rebajas2Valor / totalVentas) * 100 : 0;
  
  // KPIs Margen
  // Streamlit: solo ventas positivas con precio de coste
  // precio_real_unitario = Beneficio / Cantidad
  // margen_unitario = precio_real_unitario - Precio Coste
  // margen_% = (margen_unitario / precio_real_unitario) * 100
  // Mostrar solo promedio de valores positivos como en Streamlit
  const ventasConMargen = ventasPositivas.filter(v => (v.cantidad || 0) > 0 && v.precioCoste && v.precioCoste > 0);
  
  let sumaMargenUnitario = 0;
  let sumaMargenPorcentual = 0;
  let countMargen = 0;
  
  let sumaMargenUnitarioPositivo = 0;
  let sumaMargenPorcentualPositivo = 0;
  let countMargenPositivo = 0;
  
  ventasConMargen.forEach(v => {
    const precioRealUnitario = (v.subtotal || 0) / (v.cantidad || 1);
    const margenUnitario = precioRealUnitario - (v.precioCoste || 0);
    const margenPorcentaje = precioRealUnitario > 0 ? (margenUnitario / precioRealUnitario) * 100 : 0;
    
    // Promedio de todos
    sumaMargenUnitario += margenUnitario;
    sumaMargenPorcentual += margenPorcentaje;
    countMargen++;
    
    // Promedio solo de positivos (como Streamlit muestra)
    if (margenUnitario > 0) {
      sumaMargenUnitarioPositivo += margenUnitario;
      sumaMargenPorcentualPositivo += margenPorcentaje;
      countMargenPositivo++;
    }
  });
  
  // Usar solo valores positivos como Streamlit muestra
  const margenUnitarioPromedio = countMargenPositivo > 0 ? sumaMargenUnitarioPositivo / countMargenPositivo : 0;
  const margenPorcentualPromedio = countMargenPositivo > 0 ? sumaMargenPorcentualPositivo / countMargenPositivo : 0;
  
  // Ventas vs Devoluciones por Familia
  // Streamlit: ventas.groupby('Familia')['Cantidad'].sum() y devoluciones.groupby('Familia')['Cantidad'].sum()
  // Usar código de familia ('Familia') como en Streamlit, no descripcionFamilia
  // Usar cantidad (unidades) en lugar de subtotal (beneficio) para coincidir con Streamlit
  const familiaVentasMap = new Map<string, { ventas: number; devoluciones: number }>();
  
  ventasPositivas.forEach(v => {
    const familiaCodigo = (v.familia || '').trim();
    if (familiaCodigo) {
      if (!familiaVentasMap.has(familiaCodigo)) {
        familiaVentasMap.set(familiaCodigo, { ventas: 0, devoluciones: 0 });
      }
      // Usar cantidad (unidades) en lugar de subtotal para coincidir con Streamlit
      familiaVentasMap.get(familiaCodigo)!.ventas += Math.abs(v.cantidad || 0);
    }
  });
  
  // devoluciones ya está filtrado sin GR.ART.FICTICIO
  devoluciones.forEach(v => {
    const familiaCodigo = (v.familia || '').trim();
    if (familiaCodigo) {
      if (!familiaVentasMap.has(familiaCodigo)) {
        familiaVentasMap.set(familiaCodigo, { ventas: 0, devoluciones: 0 });
      }
      // Usar cantidad (unidades) en lugar de subtotal para coincidir con Streamlit
      familiaVentasMap.get(familiaCodigo)!.devoluciones += Math.abs(v.cantidad || 0);
    }
  });
  
  const ventasVsDevolucionesPorFamilia = Array.from(familiaVentasMap.entries())
    .map(([familia, data]) => ({ familia, ...data }))
    .sort((a, b) => b.ventas - a.ventas);
  
  // Tallas por Familia - usar descripcionFamilia (nombre) en lugar de familia (código)
  // Primero crear un mapa de códigos de familia a nombres
  const familiaCodigoANombre = new Map<string, string>();
  ventasPositivas.forEach(v => {
    if (v.familia && v.descripcionFamilia) {
      familiaCodigoANombre.set(v.familia, v.descripcionFamilia);
    }
  });
  
  const tallasFamiliaMap = new Map<string, Map<string, number>>();
  ventasPositivas.forEach(v => {
    // Priorizar descripcionFamilia (nombre) sobre familia (código)
    // Si no hay descripcionFamilia pero hay código, buscar el nombre en el mapa
    let familiaNombre = v.descripcionFamilia;
    if (!familiaNombre && v.familia) {
      familiaNombre = familiaCodigoANombre.get(v.familia) || v.familia;
    }
    familiaNombre = familiaNombre || 'Sin Familia';
    
    if (!v.talla) return;
    if (!tallasFamiliaMap.has(familiaNombre)) {
      tallasFamiliaMap.set(familiaNombre, new Map());
    }
    const tallasMap = tallasFamiliaMap.get(familiaNombre)!;
    tallasMap.set(v.talla, (tallasMap.get(v.talla) || 0) + (v.cantidad || 0));
  });
  
  const tallasPorFamilia: Array<any> = [];
  tallasFamiliaMap.forEach((tallasMap, familia) => {
    tallasMap.forEach((cantidad, talla) => {
      tallasPorFamilia.push({ familia, talla, cantidad });
    });
  });
  
  // Productos con margen negativo - usar descripcionFamilia (nombre) en lugar de familia (código)
  const productosMargenNegativo: Array<{
    codigoUnico: string;
    familia: string;
    temporada: string;
    fechaVenta: string;
    precioVenta: number;
    precioCoste: number;
    margenUnitario: number;
    margenPorcentaje: number;
  }> = [];
  
  ventasConMargen.forEach(v => {
    if (!v.codigoUnico || !v.fechaVenta) return;
    const precioRealUnitario = (v.subtotal || 0) / (v.cantidad || 1);
    const margenUnitario = precioRealUnitario - (v.precioCoste || 0);
    const margenPorcentaje = precioRealUnitario > 0 ? (margenUnitario / precioRealUnitario) * 100 : 0;
    
    if (margenUnitario < 0) {
      const familiaNombre = v.descripcionFamilia || v.familia || 'N/A';
      productosMargenNegativo.push({
        codigoUnico: v.codigoUnico,
        familia: familiaNombre,
        temporada: v.temporada || 'N/A',
        fechaVenta: v.fechaVenta,
        precioVenta: precioRealUnitario,
        precioCoste: v.precioCoste || 0,
        margenUnitario,
        margenPorcentaje,
      });
    }
  });
  
  // Análisis detallado de tallas por familia (top 3 más/menos devueltas)
  const tallasPorFamiliaDetallado: Array<{
    familia: string;
    masDevueltas: Array<{ talla: string; cantidad: number }>;
    menosDevueltas: Array<{ talla: string; cantidad: number }>;
  }> = [];
  
  const tallasPorFamiliaDevolucionesMap = new Map<string, Map<string, number>>();
  devoluciones.forEach(v => {
    const familiaNombre = v.descripcionFamilia || v.familia || 'Sin Familia';
    if (!familiaNombre || !v.talla) return;
    if (!tallasPorFamiliaDevolucionesMap.has(familiaNombre)) {
      tallasPorFamiliaDevolucionesMap.set(familiaNombre, new Map());
    }
    const tallasMap = tallasPorFamiliaDevolucionesMap.get(familiaNombre)!;
    tallasMap.set(v.talla, (tallasMap.get(v.talla) || 0) + Math.abs(v.cantidad || 0));
  });
  
  tallasPorFamiliaDevolucionesMap.forEach((tallasMap, familia) => {
    const tallasArray = Array.from(tallasMap.entries())
      .map(([talla, cantidad]) => ({ talla, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
    
    const masDevueltas = tallasArray.slice(0, 3);
    const menosDevueltas = tallasArray.slice(-3).reverse();
    
    tallasPorFamiliaDetallado.push({
      familia,
      masDevueltas,
      menosDevueltas,
    });
  });
  
  // Ventas en/fuera de temporada por campaña
  const ventasPorTemporadaMap = new Map<string, { enTemporada: number; fueraTemporada: number }>();
  
  ventasPositivas.forEach(v => {
    if (!v.temporada || !v.fechaVenta) return;
    const temporadaActual = getTemporadaActual(v.fechaVenta);
    const fueraTemporada = v.temporada !== temporadaActual;
    
    if (!ventasPorTemporadaMap.has(v.temporada)) {
      ventasPorTemporadaMap.set(v.temporada, { enTemporada: 0, fueraTemporada: 0 });
    }
    
    const data = ventasPorTemporadaMap.get(v.temporada)!;
    if (fueraTemporada) {
      data.fueraTemporada += Math.abs(v.cantidad || 0);
    } else {
      data.enTemporada += Math.abs(v.cantidad || 0);
    }
  });
  
  const ventasPorTemporada = Array.from(ventasPorTemporadaMap.entries())
    .map(([temporada, data]) => {
      const enTemporada = data.enTemporada || 0;
      const fueraTemporada = data.fueraTemporada || 0;
      const total = enTemporada + fueraTemporada;
      return {
        temporada: temporada || 'N/A',
        enTemporada,
        fueraTemporada,
        total,
        porcentajeEnTemporada: total > 0 ? (enTemporada / total) * 100 : 0,
        porcentajeFueraTemporada: total > 0 ? (fueraTemporada / total) * 100 : 0,
      };
    })
    .sort((a, b) => a.temporada.localeCompare(b.temporada));
  
  // Productos con bajo margen (se filtrará por umbral en el frontend)
  const productosBajoMargen: Array<{
    codigoUnico: string;
    familia: string;
    temporada: string;
    fechaVenta: string;
    precioVenta: number;
    precioCoste: number;
    margenPorcentaje: number;
    cantidad: number;
  }> = [];
  
  ventasConMargen.forEach(v => {
    if (!v.codigoUnico || !v.fechaVenta) return;
    const precioRealUnitario = (v.subtotal || 0) / (v.cantidad || 1);
    const margenUnitario = precioRealUnitario - (v.precioCoste || 0);
    const margenPorcentaje = precioRealUnitario > 0 ? (margenUnitario / precioRealUnitario) * 100 : 0;
    
    const familiaNombre = v.descripcionFamilia || v.familia || 'N/A';
    
    productosBajoMargen.push({
      codigoUnico: v.codigoUnico,
      familia: familiaNombre,
      temporada: v.temporada || 'N/A',
      fechaVenta: v.fechaVenta,
      precioVenta: precioRealUnitario,
      precioCoste: v.precioCoste || 0,
      margenPorcentaje,
      cantidad: v.cantidad || 0,
    });
  });
  
  return {
    kpisDevoluciones: {
      tiendaMasDevoluciones,
      tiendaRatioDevolucion,
      tallaMasDevuelta,
      tallaMasDevueltaUnidades,
      familiaMasDevuelta,
      familiaMasDevueltaUnidades,
    },
    kpisRebajas: {
      rebajas1Valor,
      rebajas1Porcentaje,
      rebajas2Valor,
      rebajas2Porcentaje,
    },
    kpisMargen: {
      margenUnitarioPromedio,
      margenPorcentualPromedio,
    },
    ventasVsDevolucionesPorFamilia,
    tallasPorFamilia,
    tallasPorFamiliaDetallado,
    ventasPorTemporada,
    productosMargenNegativo,
    productosBajoMargen,
  };
}

// ============================================
// PHOTO ANALYSIS DATA
// ============================================

export interface PhotoAnalysisData {
  topMasVendidos: Array<{
    codigoBase: string;
    familia: string;
    cantidad: number;
    urlImage: string | null;
  }>;
  topMenosVendidos: Array<{
    codigoBase: string;
    familia: string;
    cantidad: number;
    urlImage: string | null;
  }>;
}

export function calculatePhotoAnalysisData(
  ventas: VentasData[],
  filters?: FilterOptions,
  familiaFilter?: string
): PhotoAnalysisData {
  let filteredVentas = filters ? applyFilters(ventas, filters) : ventas;
  
  // Exclude GR.ART.FICTICIO and only positive sales
  filteredVentas = filteredVentas.filter(v => 
    v.descripcionFamilia !== 'GR.ART.FICTICIO' && 
    (v.cantidad || 0) > 0
  );
  
  // Apply familia filter if provided
  if (familiaFilter && familiaFilter !== 'all') {
    filteredVentas = filteredVentas.filter(v => v.familia === familiaFilter);
  }
  
  // Group by código base (unique code without last character = size)
  const codigoBaseMap = new Map<string, { cantidad: number; familia: string; urlImage: string | null }>();
  
  filteredVentas.forEach(v => {
    if (!v.codigoUnico) return;
    
    // Código base = código sin el último carácter (talla)
    const codigoBase = v.codigoUnico.slice(0, -1);
    
    if (!codigoBaseMap.has(codigoBase)) {
      codigoBaseMap.set(codigoBase, {
        cantidad: 0,
        familia: v.familia || 'N/A',
        urlImage: v.urlImage || null,
      });
    }
    
    const data = codigoBaseMap.get(codigoBase)!;
    data.cantidad += v.cantidad || 0;
    
    // Update image URL if available
    if (v.urlImage && !data.urlImage) {
      data.urlImage = v.urlImage;
    }
  });
  
  // Convert to array and sort
  const productos = Array.from(codigoBaseMap.entries())
    .map(([codigoBase, data]) => ({ codigoBase, ...data }))
    .sort((a, b) => b.cantidad - a.cantidad);
  
  // Top 20 most sold
  const topMasVendidos = productos.slice(0, 20);
  
  // Top 20 least sold
  const topMenosVendidos = productos.slice(-20).reverse();
  
  return {
    topMasVendidos,
    topMenosVendidos,
  };
}

// ============================================================================
// NEW CHART FUNCTIONS FOR ADDITIONAL VISUALIZATIONS
// ============================================================================

export interface TopStoresData {
  topStores: Array<{
    tienda: string;
    unidades: number;
    beneficio: number;
    familiaTop: string;
  }>;
  bottomStores: Array<{
    tienda: string;
    unidades: number;
    beneficio: number;
    familiaTop: string;
  }>;
}

export function calculateTopStores(
  ventas: VentasData[],
  filters?: {
    temporada?: string | null;
    familia?: string | null;
    tiendas?: string[];
  }
): TopStoresData {
  // Filter out GR.ART.FICTICIO and negative quantities
  let filteredVentas = ventas.filter(
    v => v.descripcionFamilia !== 'GR.ART.FICTICIO' && (v.cantidad || 0) > 0
  );

  // Apply filters
  if (filters?.temporada && filters.temporada !== 'all') {
    filteredVentas = filteredVentas.filter(v => v.temporada === filters.temporada);
  }
  if (filters?.familia && filters.familia !== 'all') {
    filteredVentas = filteredVentas.filter(v => v.familia === filters.familia);
  }
  if (filters?.tiendas && filters.tiendas.length > 0) {
    filteredVentas = filteredVentas.filter(v => v.tienda && filters.tiendas!.includes(v.tienda));
  }

  // Group by store
  const storeMap = new Map<string, { unidades: number; beneficio: number; familias: Map<string, number> }>();

  filteredVentas.forEach(v => {
    if (!v.tienda) return;

    if (!storeMap.has(v.tienda)) {
      storeMap.set(v.tienda, {
        unidades: 0,
        beneficio: 0,
        familias: new Map(),
      });
    }

    const data = storeMap.get(v.tienda)!;
    data.unidades += v.cantidad || 0;
    data.beneficio += v.subtotal || 0;

    // Track familia sales for top familia
    const familia = v.descripcionFamilia || 'Sin Familia';
    data.familias.set(familia, (data.familias.get(familia) || 0) + (v.subtotal || 0));
  });

  // Convert to array and sort by beneficio
  const stores = Array.from(storeMap.entries())
    .map(([tienda, data]) => {
      // Find top familia
      let topFamilia = 'Sin datos';
      let maxVentas = 0;
      data.familias.forEach((ventas, familia) => {
        if (ventas > maxVentas) {
          maxVentas = ventas;
          topFamilia = familia;
        }
      });

      return {
        tienda,
        unidades: data.unidades,
        beneficio: data.beneficio,
        familiaTop: topFamilia,
      };
    })
    .sort((a, b) => b.beneficio - a.beneficio);

  // Top 15 and Bottom 15
  const topStores = stores.slice(0, 15);
  const bottomStores = stores.length > 15 ? stores.slice(-15).reverse() : [];

  return {
    topStores,
    bottomStores,
  };
}

export interface UnitsBySizeData {
  data: Array<{
    talla: string;
    temporada: string;
    cantidad: number;
  }>;
}

export function calculateUnitsBySize(
  ventas: VentasData[],
  filters?: {
    temporada?: string | null;
    familia?: string | null;
    tiendas?: string[];
  }
): UnitsBySizeData {
  // Filter out GR.ART.FICTICIO
  let filteredVentas = ventas.filter(v => v.descripcionFamilia !== 'GR.ART.FICTICIO');

  // Apply filters
  if (filters?.temporada && filters.temporada !== 'all') {
    filteredVentas = filteredVentas.filter(v => v.temporada === filters.temporada);
  }
  if (filters?.familia && filters.familia !== 'all') {
    filteredVentas = filteredVentas.filter(v => v.familia === filters.familia);
  }
  if (filters?.tiendas && filters.tiendas.length > 0) {
    filteredVentas = filteredVentas.filter(v => v.tienda && filters.tiendas!.includes(v.tienda));
  }

  // Group by talla and temporada
  const sizeMap = new Map<string, Map<string, number>>();

  filteredVentas.forEach(v => {
    const talla = (v.talla || 'Sin Talla').toString().toUpperCase().trim();
    const temporada = v.temporada || 'Sin Temporada';

    if (!sizeMap.has(talla)) {
      sizeMap.set(talla, new Map());
    }

    const temporadaMap = sizeMap.get(talla)!;
    temporadaMap.set(temporada, (temporadaMap.get(temporada) || 0) + (v.cantidad || 0));
  });

  // Convert to array
  const data: Array<{ talla: string; temporada: string; cantidad: number }> = [];

  sizeMap.forEach((temporadaMap, talla) => {
    temporadaMap.forEach((cantidad, temporada) => {
      data.push({ talla, temporada, cantidad });
    });
  });

  return { data };
}

export interface SalesVsTransfersData {
  data: Array<{
    tienda: string;
    temporada: string;
    tipo: 'Ventas' | 'Traspasos';
    cantidad: number;
  }>;
  topStores: string[];
}

export function calculateSalesVsTransfers(
  ventas: VentasData[],
  traspasos: TraspasosData[],
  filters?: {
    temporada?: string | null;
    familia?: string | null;
    tiendas?: string[];
  }
): SalesVsTransfersData {
  // Filter ventas (exclude GR.ART.FICTICIO)
  let filteredVentas = ventas.filter(v => v.descripcionFamilia !== 'GR.ART.FICTICIO');

  // Apply filters to ventas
  if (filters?.temporada && filters.temporada !== 'all') {
    filteredVentas = filteredVentas.filter(v => v.temporada === filters.temporada);
  }
  if (filters?.familia && filters.familia !== 'all') {
    filteredVentas = filteredVentas.filter(v => v.familia === filters.familia);
  }
  if (filters?.tiendas && filters.tiendas.length > 0) {
    filteredVentas = filteredVentas.filter(v => v.tienda && filters.tiendas!.includes(v.tienda));
  }

  // Get unique códigos from ventas
  const ventasCodigosSet = new Set(filteredVentas.map(v => v.codigoUnico?.trim()).filter(Boolean));

  // Filter traspasos to only include códigos that exist in ventas
  let filteredTraspasos = traspasos.filter(t => 
    t.codigoUnico && ventasCodigosSet.has(t.codigoUnico.trim())
  );

  // Group ventas by tienda and temporada
  const ventasMap = new Map<string, Map<string, number>>();

  filteredVentas.forEach(v => {
    if (!v.tienda) return;
    const temporada = v.temporada || 'Sin Temporada';

    if (!ventasMap.has(v.tienda)) {
      ventasMap.set(v.tienda, new Map());
    }

    const tempMap = ventasMap.get(v.tienda)!;
    tempMap.set(temporada, (tempMap.get(temporada) || 0) + (v.cantidad || 0));
  });

  // Group traspasos by tienda and temporada
  const traspasosMap = new Map<string, Map<string, number>>();

  filteredTraspasos.forEach(t => {
    if (!t.tienda) return;
    // Extract first 5 chars of temporada to match ventas format (e.g., "T_PV26" from longer string)
    const temporada = (t.temporada || 'Sin Temporada').trim().substring(0, 5);

    if (!traspasosMap.has(t.tienda)) {
      traspasosMap.set(t.tienda, new Map());
    }

    const tempMap = traspasosMap.get(t.tienda)!;
    tempMap.set(temporada, (tempMap.get(temporada) || 0) + (t.cantidadEnviada || 0));
  });

  // Get top 50 stores by sales
  const storesSales = Array.from(ventasMap.entries())
    .map(([tienda, tempMap]) => {
      const total = Array.from(tempMap.values()).reduce((sum, val) => sum + val, 0);
      return { tienda, total };
    })
    .sort((a, b) => b.total - a.total);

  const topStores = storesSales.slice(0, 50).map(s => s.tienda);

  // Build combined data
  const data: Array<{ tienda: string; temporada: string; tipo: 'Ventas' | 'Traspasos'; cantidad: number }> = [];

  // Add ventas data
  ventasMap.forEach((tempMap, tienda) => {
    if (!topStores.includes(tienda)) return;

    tempMap.forEach((cantidad, temporada) => {
      data.push({ tienda, temporada, tipo: 'Ventas', cantidad });
    });
  });

  // Add traspasos data
  traspasosMap.forEach((tempMap, tienda) => {
    if (!topStores.includes(tienda)) return;

    tempMap.forEach((cantidad, temporada) => {
      data.push({ tienda, temporada, tipo: 'Traspasos', cantidad });
    });
  });

  return { data, topStores };
}

export interface WarehouseEntriesData {
  byTheme: Array<{
    tema: string;
    familia: string;
    cantidadPedida: number;
  }>;
  byTemporada: {
    [temporada: string]: {
      total: number;
      byFamily: Array<{
        familia: string;
        cantidadPedida: number;
      }>;
    };
  };
}

export function calculateWarehouseEntries(
  productos: ProductosData[],
  filters?: {
    temporada?: string | null;
    familia?: string | null;
  }
): WarehouseEntriesData {
  let filtered = productos.filter(p => p.cantidadPedida && p.cantidadPedida > 0);

  // Group by tema
  const themeMap = new Map<string, Map<string, number>>();

  filtered.forEach(p => {
    const tema = p.tema || 'Sin Tema';
    const familia = p.familia || 'Sin Familia';

    if (!themeMap.has(tema)) {
      themeMap.set(tema, new Map());
    }

    const familiaMap = themeMap.get(tema)!;
    familiaMap.set(familia, (familiaMap.get(familia) || 0) + (p.cantidadPedida || 0));
  });

  const byTheme: Array<{ tema: string; familia: string; cantidadPedida: number }> = [];

  themeMap.forEach((familiaMap, tema) => {
    familiaMap.forEach((cantidad, familia) => {
      byTheme.push({ tema, familia, cantidadPedida: cantidad });
    });
  });

  // Group by temporada (extracted from tema)
  const byTemporada: {
    [temporada: string]: {
      total: number;
      byFamily: Array<{ familia: string; cantidadPedida: number }>;
    };
  } = {};

  filtered.forEach(p => {
    if (!p.tema) return;

    // Extract temporada from tema (e.g., "T_PV26" from "T_PV26 01 PERLA MEX")
    const tempMatch = p.tema.match(/T_(OI|PV)\d{2}/);
    if (!tempMatch) return;

    const temporada = tempMatch[0];
    const familia = p.familia || 'Sin Familia';

    if (!byTemporada[temporada]) {
      byTemporada[temporada] = {
        total: 0,
        byFamily: [],
      };
    }

    byTemporada[temporada].total += p.cantidadPedida || 0;

    // Update family data
    const familyEntry = byTemporada[temporada].byFamily.find(f => f.familia === familia);
    if (familyEntry) {
      familyEntry.cantidadPedida += p.cantidadPedida || 0;
    } else {
      byTemporada[temporada].byFamily.push({
        familia,
        cantidadPedida: p.cantidadPedida || 0,
      });
    }
  });

  return {
    byTheme,
    byTemporada,
  };
}
