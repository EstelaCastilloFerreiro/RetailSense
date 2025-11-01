import type { VentasData, ProductosData, TraspasosData, DashboardData } from '@shared/schema';

const TIENDAS_ONLINE = [
  'ECI NAELLE ONLINE',
  'ECI ONLINE GESTION',
  'ET0N ECI ONLINE',
  'NAELLE ONLINE B2C',
  'OUTLET TRUCCO ONLINE B2O',
  'TRUCCO ONLINE B2C',
];

interface FilterOptions {
  temporada?: string;
  familia?: string;
  tiendas?: string[];
  fechaInicio?: string;
  fechaFin?: string;
}

export function applyFilters(ventas: VentasData[], filters: FilterOptions): VentasData[] {
  let filtered = [...ventas];

  if (filters.temporada && filters.temporada !== 'Todas las temporadas') {
    filtered = filtered.filter(v => v.temporada === filters.temporada);
  }

  if (filters.familia) {
    if (filters.familia === 'Todas sin GR.ART.FICTICIO') {
      filtered = filtered.filter(v => v.descripcionFamilia !== 'GR.ART.FICTICIO');
    } else if (filters.familia !== 'Todas las familias') {
      filtered = filtered.filter(v => v.descripcionFamilia === filters.familia);
    }
  }

  if (filters.tiendas && filters.tiendas.length > 0) {
    filtered = filtered.filter(v => v.tienda && filters.tiendas!.includes(v.tienda));
  }

  if (filters.fechaInicio) {
    filtered = filtered.filter(v => v.fechaVenta >= filters.fechaInicio!);
  }

  if (filters.fechaFin) {
    filtered = filtered.filter(v => v.fechaVenta <= filters.fechaFin!);
  }

  return filtered;
}

export function calculateKPIs(
  ventas: VentasData[],
  productos: ProductosData[],
  filters?: FilterOptions
): DashboardData['kpis'] {
  const filteredVentas = filters ? applyFilters(ventas, filters) : ventas;
  
  // Separate real sales from GR.ART.FICTICIO
  const ventasReales = filteredVentas.filter(v => v.descripcionFamilia !== 'GR.ART.FICTICIO');
  
  // Calculate sales metrics
  const ventasPositivas = ventasReales
    .filter(v => v.cantidad > 0)
    .reduce((sum, v) => sum + v.subtotal, 0);
  
  const devoluciones = Math.abs(
    ventasReales
      .filter(v => v.cantidad < 0)
      .reduce((sum, v) => sum + v.subtotal, 0)
  );
  
  const ventasBrutas = ventasPositivas + devoluciones;
  const ventasNetas = ventasPositivas;
  const tasaDevolucion = ventasNetas > 0 ? (devoluciones / ventasNetas) * 100 : 0;

  // Calculate by store type
  const ventasFisicas = ventasReales
    .filter(v => v.cantidad > 0 && !v.esOnline)
    .reduce((sum, v) => sum + v.subtotal, 0);
  
  const ventasOnline = ventasReales
    .filter(v => v.cantidad > 0 && v.esOnline)
    .reduce((sum, v) => sum + v.subtotal, 0);

  const tiendasFisicasCount = new Set(
    ventasReales.filter(v => !v.esOnline).map(v => v.codigoTienda || v.tienda)
  ).size;

  const tiendasOnlineCount = new Set(
    ventasReales.filter(v => v.esOnline).map(v => v.codigoTienda || v.tienda)
  ).size;

  // Count metrics
  const numFamilias = new Set(ventasReales.map(v => v.familia)).size;
  const numTiendas = new Set(ventasReales.map(v => v.tienda)).size;
  const numTemporadas = new Set(ventasReales.map(v => v.temporada)).size;
  const numTransacciones = filteredVentas.length;

  return {
    ventasBrutas,
    ventasNetas,
    devoluciones,
    tasaDevolucion,
    ventasFisicas,
    ventasOnline,
    tiendasFisicasCount,
    tiendasOnlineCount,
    numFamilias,
    numTiendas,
    numTemporadas,
    numTransacciones,
  };
}

export function getAvailableFilters(ventas: VentasData[]): DashboardData['filters'] {
  const temporadas = Array.from(new Set(ventas.map(v => v.temporada).filter(Boolean))).sort() as string[];
  const familias = Array.from(new Set(ventas.map(v => v.descripcionFamilia).filter(Boolean))).sort() as string[];
  const tiendas = Array.from(new Set(ventas.map(v => v.tienda).filter(Boolean))).sort() as string[];
  
  const tiendasOnline = tiendas.filter(t => TIENDAS_ONLINE.includes(t));
  const tiendasNaelle = tiendas.filter(t => t.toUpperCase().includes('NAELLE'));
  const tiendasItalia = tiendas.filter(t => t.toUpperCase().includes('COIN'));

  return {
    temporadas,
    familias,
    tiendas,
    tiendasOnline,
    tiendasNaelle,
    tiendasItalia,
  };
}

export function calculateVentasMensuales(ventas: VentasData[], filters?: FilterOptions): DashboardData['ventasMensuales'] {
  const filteredVentas = filters ? applyFilters(ventas, filters) : ventas;
  
  const byMonth = new Map<string, { cantidad: number; beneficio: number; esOnline: boolean }>();
  
  filteredVentas.forEach(v => {
    if (!v.mes || v.cantidad <= 0) return;
    
    const key = `${v.mes}-${v.esOnline}`;
    const existing = byMonth.get(key) || { cantidad: 0, beneficio: 0, esOnline: v.esOnline || false };
    
    byMonth.set(key, {
      cantidad: existing.cantidad + v.cantidad,
      beneficio: existing.beneficio + v.subtotal,
      esOnline: v.esOnline || false,
    });
  });

  return Array.from(byMonth.entries()).map(([key, value]) => ({
    mes: key.split('-')[0],
    ...value,
  }));
}

export function calculateTopProductos(ventas: VentasData[], limit: number = 10): DashboardData['topProductos'] {
  const byProduct = new Map<string, { cantidad: number; beneficio: number; familia: string }>();
  
  ventas.forEach(v => {
    if (!v.codigoUnico || v.cantidad <= 0) return;
    
    const existing = byProduct.get(v.codigoUnico) || { cantidad: 0, beneficio: 0, familia: v.familia || '' };
    
    byProduct.set(v.codigoUnico, {
      cantidad: existing.cantidad + v.cantidad,
      beneficio: existing.beneficio + v.subtotal,
      familia: v.familia || existing.familia,
    });
  });

  return Array.from(byProduct.entries())
    .map(([codigoUnico, data]) => ({
      codigoUnico,
      nombre: codigoUnico,
      ...data,
    }))
    .sort((a, b) => b.beneficio - a.beneficio)
    .slice(0, limit);
}

export function calculateVentasPorTienda(ventas: VentasData[]): DashboardData['ventasPorTienda'] {
  const byTienda = new Map<string, { cantidad: number; beneficio: number }>();
  
  ventas.forEach(v => {
    if (!v.tienda || v.cantidad <= 0) return;
    
    const existing = byTienda.get(v.tienda) || { cantidad: 0, beneficio: 0 };
    
    byTienda.set(v.tienda, {
      cantidad: existing.cantidad + v.cantidad,
      beneficio: existing.beneficio + v.subtotal,
    });
  });

  return Array.from(byTienda.entries())
    .map(([tienda, data]) => ({
      tienda,
      ...data,
    }))
    .sort((a, b) => b.beneficio - a.beneficio);
}

export function calculateDashboardData(
  ventas: VentasData[],
  productos: ProductosData[],
  traspasos: TraspasosData[],
  filters?: FilterOptions
): DashboardData {
  const kpis = calculateKPIs(ventas, productos, filters);
  const filterOptions = getAvailableFilters(ventas);
  const ventasMensuales = calculateVentasMensuales(ventas, filters);
  const topProductos = calculateTopProductos(filters ? applyFilters(ventas, filters) : ventas);
  const ventasPorTienda = calculateVentasPorTienda(filters ? applyFilters(ventas, filters) : ventas);

  return {
    kpis,
    filters: filterOptions,
    ventasMensuales,
    topProductos,
    ventasPorTienda,
  };
}
