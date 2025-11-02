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
  
  const kpisFicticio = {
    ventasBrutas: ventasPositivasFicticio,
    devoluciones: devolucionesFicticio,
    totalNeto: ventasPositivasFicticio - devolucionesFicticio,
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
  
  // Top 30 con rankings correctos (1-30)
  const topTiendas = tiendas.slice(0, 30).map((item, index) => ({
    ...item,
    ranking: index + 1,
  }));
  
  // Bottom 30 con rankings correctos (1-30, siendo 1 el peor)
  const bottomTiendas = tiendas.slice(-30).reverse().map((item, index) => ({
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
    const tiendas = Array.from(tiendasMap.entries())
      .map(([tienda, data]) => ({ tienda, ...data }))
      .sort((a, b) => b.beneficio - a.beneficio);
    
    const mejor = tiendas[0] || { tienda: 'N/A', cantidad: 0, beneficio: 0 };
    const peor = tiendas[tiendas.length - 1] || { tienda: 'N/A', cantidad: 0, beneficio: 0 };
    const mediaBeneficio = tiendas.reduce((sum, t) => sum + t.beneficio, 0) / tiendas.length;
    
    return {
      zona,
      mejorTienda: mejor.tienda,
      mejorCantidad: mejor.cantidad,
      mejorBeneficio: mejor.beneficio,
      peorTienda: peor.tienda,
      peorCantidad: peor.cantidad,
      peorBeneficio: peor.beneficio,
      mediaBeneficio,
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
  
  // Merge con productos para obtener precio coste
  const productosMap = new Map(productos.map(p => [p.codigoUnico, p]));
  const ventasConPrecio = filteredVentas.map(v => ({
    ...v,
    precioCoste: v.precioCoste || productosMap.get(v.codigoUnico || '')?.precioCoste || 0,
  }));
  
  // KPIs Devoluciones
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
  
  // Familia más devuelta - usar descripcionFamilia (nombre) en lugar de familia (código)
  // Excluir GR.ART.FICTICIO del cálculo
  const familiaDevolucionesMap = new Map<string, number>();
  devoluciones.forEach(v => {
    const familiaNombre = (v.descripcionFamilia || v.familia || 'Sin Familia').trim();
    // Excluir GR.ART.FICTICIO
    if (familiaNombre !== 'GR.ART.FICTICIO') {
      familiaDevolucionesMap.set(familiaNombre, (familiaDevolucionesMap.get(familiaNombre) || 0) + Math.abs(v.cantidad || 0));
    }
  });
  
  let familiaMasDevuelta = 'N/A';
  let familiaMasDevueltaUnidades = 0;
  familiaDevolucionesMap.forEach((cantidad, familia) => {
    if (cantidad > familiaMasDevueltaUnidades) {
      familiaMasDevuelta = familia;
      familiaMasDevueltaUnidades = cantidad;
    }
  });
  
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
  const ventasConMargen = ventasPositivas.filter(v => (v.cantidad || 0) > 0 && v.precioCoste);
  let sumaMargenUnitario = 0;
  let sumaMargenPorcentual = 0;
  let countMargen = 0;
  
  ventasConMargen.forEach(v => {
    const precioRealUnitario = (v.subtotal || 0) / (v.cantidad || 1);
    const margenUnitario = precioRealUnitario - (v.precioCoste || 0);
    const margenPorcentaje = precioRealUnitario > 0 ? (margenUnitario / precioRealUnitario) * 100 : 0;
    
    sumaMargenUnitario += margenUnitario;
    sumaMargenPorcentual += margenPorcentaje;
    countMargen++;
  });
  
  const margenUnitarioPromedio = countMargen > 0 ? sumaMargenUnitario / countMargen : 0;
  const margenPorcentualPromedio = countMargen > 0 ? sumaMargenPorcentual / countMargen : 0;
  
  // Ventas vs Devoluciones por Familia
  // Usar descripcionFamilia (nombre) en lugar de familia (código)
  // Usar cantidad (unidades) en lugar de subtotal (beneficio) para coincidir con Streamlit
  const familiaVentasMap = new Map<string, { ventas: number; devoluciones: number }>();
  
  ventasPositivas.forEach(v => {
    const familiaNombre = v.descripcionFamilia || v.familia || 'Sin Familia';
    if (!familiaVentasMap.has(familiaNombre)) {
      familiaVentasMap.set(familiaNombre, { ventas: 0, devoluciones: 0 });
    }
    // Usar cantidad (unidades) en lugar de subtotal para coincidir con Streamlit
    familiaVentasMap.get(familiaNombre)!.ventas += Math.abs(v.cantidad || 0);
  });
  
  devoluciones.forEach(v => {
    const familiaNombre = v.descripcionFamilia || v.familia || 'Sin Familia';
    if (!familiaVentasMap.has(familiaNombre)) {
      familiaVentasMap.set(familiaNombre, { ventas: 0, devoluciones: 0 });
    }
    // Usar cantidad (unidades) en lugar de subtotal para coincidir con Streamlit
    familiaVentasMap.get(familiaNombre)!.devoluciones += Math.abs(v.cantidad || 0);
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
