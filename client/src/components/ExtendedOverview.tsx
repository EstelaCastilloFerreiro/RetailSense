import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useData } from "@/contexts/DataContext";
import KPICard from "./KPICard";
import VisualizationCard from "./VisualizationCard";
import { Card } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { CHART_COLORS, getValueColor } from "@/lib/colors";

interface ExtendedDashboardData {
  alcance: {
    totalFamilias: number;
    totalTiendas: number;
    totalTemporadas: number;
    totalTransacciones: number;
  };
  kpisGenerales: {
    ventasBrutas: number;
    devoluciones: number;
    totalNeto: number;
    tasaDevolucion: number;
  };
  kpisFicticio: {
    ventasBrutas: number;
    devoluciones: number;
    totalNeto: number;
    tasaDevolucion: number;
  };
  kpisTienda: {
    tiendasFisicas: number;
    ventasFisicas: number;
    tiendasOnline: number;
    ventasOnline: number;
  };
  ventasMensuales: Array<{
    mes: string;
    tipo: 'Física' | 'Online';
    cantidad: number;
    beneficio: number;
  }>;
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
  ventasPorTalla: Array<{
    talla: string;
    cantidad: number;
  }>;
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
}

export default function ExtendedOverview() {
  const { fileId, filters } = useData();

  const stableFilters = useMemo(() => {
    const cleaned: Record<string, any> = {};
    
    if (filters.temporada) cleaned.temporada = filters.temporada;
    if (filters.familia) cleaned.familia = filters.familia;
    if (filters.tiendas && filters.tiendas.length > 0) cleaned.tiendas = filters.tiendas;
    if (filters.fechaInicio) cleaned.fechaInicio = filters.fechaInicio;
    if (filters.fechaFin) cleaned.fechaFin = filters.fechaFin;
    
    return cleaned;
  }, [
    filters.temporada,
    filters.familia,
    filters.tiendas?.join(','),
    filters.fechaInicio,
    filters.fechaFin,
  ]);

  const { data, isLoading, error } = useQuery<ExtendedDashboardData>({
    queryKey: ['/api/dashboard-extended', fileId, stableFilters],
    enabled: !!fileId,
  });

  if (!fileId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-lg text-muted-foreground">Sube un archivo Excel para comenzar</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-6 max-w-md">
          <p className="text-destructive font-medium mb-2">Error al cargar datos</p>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Error desconocido"}
          </p>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-lg text-muted-foreground">No hay datos disponibles</p>
      </div>
    );
  }

  // Transform monthly sales data for the chart
  const ventasPorMes = data.ventasMensuales.reduce((acc, item) => {
    const existing = acc.find(x => x.mes === item.mes);
    if (existing) {
      if (item.tipo === 'Física') {
        existing.fisica = item.cantidad;
      } else {
        existing.online = item.cantidad;
      }
    } else {
      acc.push({
        mes: item.mes,
        fisica: item.tipo === 'Física' ? item.cantidad : 0,
        online: item.tipo === 'Online' ? item.cantidad : 0,
      });
    }
    return acc;
  }, [] as Array<{ mes: string; fisica: number; online: number }>);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {/* Alcance del Análisis */}
      <VisualizationCard 
        title="Alcance del Análisis (Excluyendo GR.ART.FICTICIO)"
        id="alcance"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 border rounded-md bg-card">
            <p className="text-xs text-muted-foreground mb-1">Total Familias</p>
            <p className="text-xl font-bold font-mono" data-testid="text-total-familias">
              {data.alcance.totalFamilias}
            </p>
          </div>
          <div className="text-center p-3 border rounded-md bg-card">
            <p className="text-xs text-muted-foreground mb-1">Total Tiendas</p>
            <p className="text-xl font-bold font-mono" data-testid="text-total-tiendas">
              {data.alcance.totalTiendas}
            </p>
          </div>
          <div className="text-center p-3 border rounded-md bg-card">
            <p className="text-xs text-muted-foreground mb-1">Total Temporadas</p>
            <p className="text-xl font-bold font-mono" data-testid="text-total-temporadas">
              {data.alcance.totalTemporadas}
            </p>
          </div>
          <div className="text-center p-3 border rounded-md bg-card">
            <p className="text-xs text-muted-foreground mb-1">Transacciones</p>
            <p className="text-xl font-bold font-mono" data-testid="text-total-transacciones">
              {data.alcance.totalTransacciones.toLocaleString()}
            </p>
          </div>
        </div>
      </VisualizationCard>

      {/* KPIs Generales */}
      <VisualizationCard 
        title="KPIs Generales (Excluyendo GR.ART.FICTICIO)"
        id="kpis-generales"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 border rounded-md bg-card">
            <p className="text-xs text-muted-foreground mb-1">Ventas Brutas</p>
            <p className="text-lg font-bold font-mono" data-testid="text-ventas-brutas">
              {data.kpisGenerales.ventasBrutas.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
            </p>
          </div>
          <div className="text-center p-3 border rounded-md bg-card">
            <p className="text-xs text-muted-foreground mb-1">Devoluciones</p>
            <p className="text-lg font-bold font-mono text-destructive" data-testid="text-devoluciones">
              {data.kpisGenerales.devoluciones.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
            </p>
          </div>
          <div className="text-center p-3 border rounded-md bg-card">
            <p className="text-xs text-muted-foreground mb-1">Total Neto</p>
            <p className="text-lg font-bold font-mono text-green-600 dark:text-green-400" data-testid="text-total-neto">
              {data.kpisGenerales.totalNeto.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
            </p>
          </div>
          <div className="text-center p-3 border rounded-md bg-card">
            <p className="text-xs text-muted-foreground mb-1">Tasa Devolución</p>
            <p className="text-lg font-bold font-mono text-destructive" data-testid="text-tasa-devolucion">
              {data.kpisGenerales.tasaDevolucion.toFixed(1)}%
            </p>
          </div>
        </div>
      </VisualizationCard>

      {/* KPIs GR.ART.FICTICIO */}
      <VisualizationCard 
        title="KPIs GR.ART.FICTICIO"
        id="kpis-ficticio"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 border rounded-md bg-card">
            <p className="text-xs text-muted-foreground mb-1">Ventas Brutas</p>
            <p className="text-lg font-bold font-mono" data-testid="text-ficticio-ventas-brutas">
              {data.kpisFicticio.ventasBrutas.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
            </p>
          </div>
          <div className="text-center p-3 border rounded-md bg-card">
            <p className="text-xs text-muted-foreground mb-1">Devoluciones</p>
            <p className="text-lg font-bold font-mono text-destructive" data-testid="text-ficticio-devoluciones">
              {data.kpisFicticio.devoluciones.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
            </p>
          </div>
          <div className="text-center p-3 border rounded-md bg-card">
            <p className="text-xs text-muted-foreground mb-1">Total Neto</p>
            <p className="text-lg font-bold font-mono text-green-600 dark:text-green-400" data-testid="text-ficticio-total-neto">
              {data.kpisFicticio.totalNeto.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
            </p>
          </div>
          <div className="text-center p-3 border rounded-md bg-card">
            <p className="text-xs text-muted-foreground mb-1">Tasa Devolución</p>
            <p className="text-lg font-bold font-mono text-destructive" data-testid="text-ficticio-tasa-devolucion">
              {data.kpisFicticio.tasaDevolucion.toFixed(1)}%
            </p>
          </div>
        </div>
      </VisualizationCard>

      {/* KPIs por Tipo de Tienda */}
      <VisualizationCard 
        title="KPIs por Tipo de Tienda (Excluyendo GR.ART.FICTICIO)"
        id="kpis-tienda"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 border rounded-md bg-card">
            <p className="text-xs text-muted-foreground mb-1">Tiendas Físicas</p>
            <p className="text-xl font-bold font-mono" data-testid="text-tiendas-fisicas">
              {data.kpisTienda.tiendasFisicas}
            </p>
          </div>
          <div className="text-center p-3 border rounded-md bg-card">
            <p className="text-xs text-muted-foreground mb-1">Ventas Netas Físicas</p>
            <p className="text-lg font-bold font-mono" data-testid="text-ventas-fisicas">
              {data.kpisTienda.ventasFisicas.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
            </p>
          </div>
          <div className="text-center p-3 border rounded-md bg-card">
            <p className="text-xs text-muted-foreground mb-1">Tiendas Online</p>
            <p className="text-xl font-bold font-mono" data-testid="text-tiendas-online">
              {data.kpisTienda.tiendasOnline}
            </p>
          </div>
          <div className="text-center p-3 border rounded-md bg-card">
            <p className="text-xs text-muted-foreground mb-1">Ventas Netas Online</p>
            <p className="text-lg font-bold font-mono" data-testid="text-ventas-online">
              {data.kpisTienda.ventasOnline.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
            </p>
          </div>
        </div>
      </VisualizationCard>

      {/* Ventas Mensuales Chart */}
      {ventasPorMes.length > 0 && (
        <VisualizationCard 
          title="Ventas Mensuales por Tipo de Tienda"
          id="ventas-mensuales"
          className="xl:col-span-2"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ventasPorMes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => value.toLocaleString()}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Legend />
              <Bar dataKey="fisica" name="Física" fill={CHART_COLORS.primary} opacity={0.8} />
              <Bar dataKey="online" name="Online" fill={CHART_COLORS.accent} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </VisualizationCard>
      )}

      {/* Top 30 Tiendas */}
      {data.topTiendas.length > 0 && (
        <VisualizationCard 
          title="Top 30 Tiendas con Más Ventas"
          id="top-tiendas"
        >
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b">
                  <th className="text-left p-1.5 font-medium text-muted-foreground">#</th>
                  <th className="text-left p-1.5 font-medium text-muted-foreground">Tienda</th>
                  <th className="text-right p-1.5 font-medium text-muted-foreground">Unid.</th>
                  <th className="text-right p-1.5 font-medium text-muted-foreground">Benef.</th>
                </tr>
              </thead>
              <tbody>
                {data.topTiendas.map((tienda) => (
                  <tr key={tienda.tienda} className="border-b hover-elevate" data-testid={`top-tienda-${tienda.ranking}`}>
                    <td className="p-1.5">{tienda.ranking}</td>
                    <td className="p-1.5 font-medium">{tienda.tienda}</td>
                    <td className="p-1.5 text-right font-mono">{tienda.unidades.toLocaleString()}</td>
                    <td className="p-1.5 text-right font-mono">
                      {tienda.beneficio.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </VisualizationCard>
      )}

      {/* Bottom 30 Tiendas */}
      {data.bottomTiendas.length > 0 && (
        <VisualizationCard 
          title="Top 30 Tiendas con Menos Ventas"
          id="bottom-tiendas"
        >
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b">
                  <th className="text-left p-1.5 font-medium text-muted-foreground">#</th>
                  <th className="text-left p-1.5 font-medium text-muted-foreground">Tienda</th>
                  <th className="text-right p-1.5 font-medium text-muted-foreground">Unid.</th>
                  <th className="text-right p-1.5 font-medium text-muted-foreground">Benef.</th>
                </tr>
              </thead>
              <tbody>
                {data.bottomTiendas.map((tienda) => (
                  <tr key={tienda.tienda} className="border-b hover-elevate" data-testid={`bottom-tienda-${tienda.ranking}`}>
                    <td className="p-1.5">{tienda.ranking}</td>
                    <td className="p-1.5 font-medium">{tienda.tienda}</td>
                    <td className="p-1.5 text-right font-mono">{tienda.unidades.toLocaleString()}</td>
                    <td className="p-1.5 text-right font-mono">
                      {tienda.beneficio.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </VisualizationCard>
      )}

      {/* KPIs de Rotación de Stock */}
      {data.kpisRotacion ? (
        <VisualizationCard 
          title="KPIs de Rotación de Stock"
          id="kpis-rotacion"
          className="xl:col-span-3"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="text-center p-3 border rounded-md bg-card">
              <p className="text-xs text-muted-foreground mb-1">Tienda Mayor Rotación</p>
              <p className="text-lg font-bold font-mono">{data.kpisRotacion.tiendaMayorRotacion}</p>
              <p className="text-xs text-green-600 dark:text-green-400">{data.kpisRotacion.tiendaMayorRotacionDias.toFixed(1)} días mediana</p>
            </div>
            <div className="text-center p-3 border rounded-md bg-card">
              <p className="text-xs text-muted-foreground mb-1">Tienda Menor Rotación</p>
              <p className="text-lg font-bold font-mono">{data.kpisRotacion.tiendaMenorRotacion}</p>
              <p className="text-xs text-destructive">{data.kpisRotacion.tiendaMenorRotacionDias.toFixed(1)} días mediana</p>
            </div>
            <div className="text-center p-3 border rounded-md bg-card">
              <p className="text-xs text-muted-foreground mb-1">Producto Mayor Rotación</p>
              <p className="text-lg font-bold font-mono">{data.kpisRotacion.productoMayorRotacion}</p>
              <p className="text-xs text-green-600 dark:text-green-400">{data.kpisRotacion.productoMayorRotacionDias.toFixed(1)} días mediana</p>
            </div>
            <div className="text-center p-3 border rounded-md bg-card">
              <p className="text-xs text-muted-foreground mb-1">Producto Menor Rotación</p>
              <p className="text-lg font-bold font-mono">{data.kpisRotacion.productoMenorRotacion}</p>
              <p className="text-xs text-destructive">{data.kpisRotacion.productoMenorRotacionDias.toFixed(1)} días mediana</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t">
            <div className="text-center p-2 border rounded-md bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Promedio Global</p>
              <p className="text-base font-bold font-mono">{data.kpisRotacion.promedioGlobal.toFixed(1)} días</p>
            </div>
            <div className="text-center p-2 border rounded-md bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Mediana Global</p>
              <p className="text-base font-bold font-mono">{data.kpisRotacion.medianaGlobal.toFixed(1)} días</p>
            </div>
            <div className="text-center p-2 border rounded-md bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Desv. Estándar</p>
              <p className="text-base font-bold font-mono">{data.kpisRotacion.desviacionEstandar.toFixed(1)} días</p>
            </div>
            <div className="text-center p-2 border rounded-md bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Total Productos</p>
              <p className="text-base font-bold font-mono">{data.kpisRotacion.totalProductos.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            📊 Análisis basado en {data.kpisRotacion.totalProductos.toLocaleString()} productos con rotación calculada (filtrado de outliers: 0-365 días)
          </p>
        </VisualizationCard>
      ) : (
        <VisualizationCard 
          title="KPIs de Rotación de Stock"
          id="kpis-rotacion"
          className="xl:col-span-3"
        >
          <div className="text-center p-8 text-muted-foreground">
            <p className="text-sm">No hay datos suficientes para calcular rotación de stock.</p>
            <p className="text-xs mt-2">Se requiere la columna "Fecha REAL entrada en almacén" en la hoja de productos.</p>
          </div>
        </VisualizationCard>
      )}

      {/* Ventas por Talla */}
      {data.ventasPorTalla.length > 0 && (
        <VisualizationCard 
          title="Unidades Vendidas por Talla (Top 20)"
          id="ventas-talla"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.ventasPorTalla.slice(0, 20)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="talla" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => value.toLocaleString()}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Bar dataKey="cantidad" name="Unidades">
                {data.ventasPorTalla.slice(0, 20).map((entry, index) => {
                  const values = data.ventasPorTalla.slice(0, 20).map(v => v.cantidad);
                  const max = Math.max(...values);
                  const min = Math.min(...values);
                  return (
                    <Cell key={`cell-${index}`} fill={getValueColor(entry.cantidad, min, max)} />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </VisualizationCard>
      )}
    </div>
  );
}
