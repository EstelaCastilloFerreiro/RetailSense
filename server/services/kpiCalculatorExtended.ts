// Extended KPI calculations for complete dashboard functionality
import type { VentasData, ProductosData, TraspasosData } from "../../shared/schema";

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
}

const TIENDAS_ONLINE = [
  'ECI NAELLE ONLINE',
  'ECI ONLINE GESTION',
  'ET0N ECI ONLINE',
  'NAELLE ONLINE B2C',
  'OUTLET TRUCCO ONLINE B2O',
  'TRUCCO ONLINE B2C'
];

export function calculateExtendedDashboardData(
  ventas: VentasData[],
  productos: ProductosData[],
  traspasos: TraspasosData[]
): ExtendedDashboardData {
  // Filtrar ventas reales (sin GR.ART.FICTICIO)
  const ventasReales = ventas.filter(v => v.descripcionFamilia !== 'GR.ART.FICTICIO');
  const ventasFicticio = ventas.filter(v => v.descripcionFamilia === 'GR.ART.FICTICIO');
  
  // Alcance del análisis
  const alcance = {
    totalFamilias: new Set(ventasReales.map(v => v.descripcionFamilia).filter(Boolean)).size,
    totalTiendas: new Set(ventasReales.map(v => v.tienda).filter(Boolean)).size,
    totalTemporadas: new Set(ventasReales.map(v => v.temporada).filter(Boolean)).size,
    totalTransacciones: ventas.length,
  };
  
  // Calcular KPIs generales (sin ficticio)
  const ventasPositivasReales = ventasReales
    .filter(v => (v.cantidad || 0) > 0)
    .reduce((sum, v) => sum + (v.subtotal || 0), 0);
  
  const devolucionesReales = Math.abs(
    ventasReales
      .filter(v => (v.cantidad || 0) < 0)
      .reduce((sum, v) => sum + (v.subtotal || 0), 0)
  );
  
  const kpisGenerales = {
    ventasBrutas: ventasPositivasReales + devolucionesReales,
    devoluciones: devolucionesReales,
    totalNeto: ventasPositivasReales,
    tasaDevolucion: ventasPositivasReales > 0 ? (devolucionesReales / ventasPositivasReales) * 100 : 0,
  };
  
  // Calcular KPIs ficticio
  const ventasPositivasFicticio = ventasFicticio
    .filter(v => (v.cantidad || 0) > 0)
    .reduce((sum, v) => sum + (v.subtotal || 0), 0);
  
  const devolucionesFicticio = Math.abs(
    ventasFicticio
      .filter(v => (v.cantidad || 0) < 0)
      .reduce((sum, v) => sum + (v.subtotal || 0), 0)
  );
  
  const kpisFicticio = {
    ventasBrutas: ventasPositivasFicticio + devolucionesFicticio,
    devoluciones: devolucionesFicticio,
    totalNeto: ventasPositivasFicticio,
    tasaDevolucion: ventasPositivasFicticio > 0 ? (devolucionesFicticio / ventasPositivasFicticio) * 100 : 0,
  };
  
  // Calcular KPIs por tipo de tienda
  const ventasAnalisis = ventasReales.filter(v => (v.cantidad || 0) > 0);
  const ventasOnline = ventasAnalisis.filter(v => v.tienda && TIENDAS_ONLINE.includes(v.tienda));
  const ventasFisicas = ventasAnalisis.filter(v => v.tienda && !TIENDAS_ONLINE.includes(v.tienda));
  
  const kpisTienda = {
    tiendasFisicas: new Set(ventasFisicas.map(v => v.codigoTienda).filter(Boolean)).size,
    ventasFisicas: ventasFisicas.reduce((sum, v) => sum + (v.subtotal || 0), 0),
    tiendasOnline: new Set(ventasOnline.map(v => v.codigoTienda).filter(Boolean)).size,
    ventasOnline: ventasOnline.reduce((sum, v) => sum + (v.subtotal || 0), 0),
  };
  
  // Ventas mensuales por tipo
  const ventasMensualesMap = new Map<string, { fisica: { cantidad: number; beneficio: number }, online: { cantidad: number; beneficio: number } }>();
  
  ventas.forEach(v => {
    if (!v.mes || (v.cantidad || 0) === 0) return;
    
    if (!ventasMensualesMap.has(v.mes)) {
      ventasMensualesMap.set(v.mes, {
        fisica: { cantidad: 0, beneficio: 0 },
        online: { cantidad: 0, beneficio: 0 }
      });
    }
    
    const data = ventasMensualesMap.get(v.mes)!;
    const isOnline = v.tienda && TIENDAS_ONLINE.includes(v.tienda);
    
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
  
  // Ranking de tiendas
  const tiendasMap = new Map<string, { unidades: number; beneficio: number }>();
  ventas.forEach(v => {
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
    .sort((a, b) => b.beneficio - a.beneficio)
    .map((item, index) => ({
      ...item,
      ranking: index + 1,
    }));
  
  const topTiendas = tiendas.slice(0, 30);
  const bottomTiendas = tiendas.slice(-30).reverse();
  
  // Ventas por talla
  const tallasMap = new Map<string, number>();
  ventas.forEach(v => {
    if (!v.talla || (v.cantidad || 0) <= 0) return;
    tallasMap.set(v.talla, (tallasMap.get(v.talla) || 0) + (v.cantidad || 0));
  });
  
  const ventasPorTalla = Array.from(tallasMap.entries())
    .map(([talla, cantidad]) => ({ talla, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
  
  return {
    alcance,
    kpisGenerales,
    kpisFicticio,
    kpisTienda,
    ventasMensuales,
    topTiendas,
    bottomTiendas,
    ventasPorTalla,
  };
}
