import { useQuery } from "@tanstack/react-query";
import { useData } from "@/contexts/DataContext";
import KPICard from "./KPICard";
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
} from "recharts";

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
}

export default function ExtendedOverview() {
  const { fileId, filters } = useData();

  // Build query URL with filters
  const buildQueryUrl = () => {
    if (!fileId) return '';
    const params = new URLSearchParams();
    if (filters.temporada) params.append('temporada', filters.temporada);
    if (filters.familia) params.append('familia', filters.familia);
    if (filters.fechaInicio) params.append('fechaInicio', filters.fechaInicio);
    if (filters.fechaFin) params.append('fechaFin', filters.fechaFin);
    if (filters.tiendas && filters.tiendas.length > 0) {
      params.append('tiendas', filters.tiendas.join(','));
    }
    const queryString = params.toString();
    return `/api/dashboard-extended/${fileId}${queryString ? `?${queryString}` : ''}`;
  };

  const { data, isLoading, error } = useQuery<ExtendedDashboardData>({
    queryKey: [buildQueryUrl(), filters],
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
    <div className="space-y-6">
      {/* Alcance del Análisis */}
      <Card className="p-6">
        <h3 className="text-base font-semibold mb-4 pb-2 border-b text-muted-foreground">
          Alcance del Análisis (Excluyendo GR.ART.FICTICIO)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 border rounded-md bg-card">
            <p className="text-sm text-muted-foreground mb-1">Total Familias</p>
            <p className="text-2xl font-bold font-mono" data-testid="text-total-familias">
              {data.alcance.totalFamilias}
            </p>
          </div>
          <div className="text-center p-4 border rounded-md bg-card">
            <p className="text-sm text-muted-foreground mb-1">Total Tiendas</p>
            <p className="text-2xl font-bold font-mono" data-testid="text-total-tiendas">
              {data.alcance.totalTiendas}
            </p>
          </div>
          <div className="text-center p-4 border rounded-md bg-card">
            <p className="text-sm text-muted-foreground mb-1">Total Temporadas</p>
            <p className="text-2xl font-bold font-mono" data-testid="text-total-temporadas">
              {data.alcance.totalTemporadas}
            </p>
          </div>
          <div className="text-center p-4 border rounded-md bg-card">
            <p className="text-sm text-muted-foreground mb-1">Total Transacciones</p>
            <p className="text-sm text-xs text-muted-foreground">(Sin excluir GR.ART.FICTICIO)</p>
            <p className="text-2xl font-bold font-mono" data-testid="text-total-transacciones">
              {data.alcance.totalTransacciones.toLocaleString()}
            </p>
          </div>
        </div>
      </Card>

      {/* KPIs Generales */}
      <Card className="p-6">
        <h3 className="text-base font-semibold mb-4 pb-2 border-b text-muted-foreground">
          KPIs Generales (Excluyendo GR.ART.FICTICIO)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 border rounded-md bg-card">
            <p className="text-sm text-muted-foreground mb-1">Total Ventas Brutas</p>
            <p className="text-2xl font-bold font-mono" data-testid="text-ventas-brutas">
              {data.kpisGenerales.ventasBrutas.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
            </p>
          </div>
          <div className="text-center p-4 border rounded-md bg-card">
            <p className="text-sm text-muted-foreground mb-1">Devoluciones Reales</p>
            <p className="text-2xl font-bold font-mono text-destructive" data-testid="text-devoluciones">
              {data.kpisGenerales.devoluciones.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
            </p>
          </div>
          <div className="text-center p-4 border rounded-md bg-card">
            <p className="text-sm text-muted-foreground mb-1">Total Neto</p>
            <p className="text-2xl font-bold font-mono text-green-600 dark:text-green-400" data-testid="text-total-neto">
              {data.kpisGenerales.totalNeto.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
            </p>
          </div>
          <div className="text-center p-4 border rounded-md bg-card">
            <p className="text-sm text-muted-foreground mb-1">Tasa Devolución</p>
            <p className="text-2xl font-bold font-mono text-destructive" data-testid="text-tasa-devolucion">
              {data.kpisGenerales.tasaDevolucion.toFixed(1)}%
            </p>
          </div>
        </div>
      </Card>

      {/* KPIs GR.ART.FICTICIO */}
      <Card className="p-6">
        <h3 className="text-base font-semibold mb-4 pb-2 border-b text-muted-foreground">
          KPIs GR.ART.FICTICIO
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 border rounded-md bg-card">
            <p className="text-sm text-muted-foreground mb-1">Total Ventas Brutas</p>
            <p className="text-2xl font-bold font-mono" data-testid="text-ficticio-ventas-brutas">
              {data.kpisFicticio.ventasBrutas.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
            </p>
          </div>
          <div className="text-center p-4 border rounded-md bg-card">
            <p className="text-sm text-muted-foreground mb-1">Devoluciones</p>
            <p className="text-2xl font-bold font-mono text-destructive" data-testid="text-ficticio-devoluciones">
              {data.kpisFicticio.devoluciones.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
            </p>
          </div>
          <div className="text-center p-4 border rounded-md bg-card">
            <p className="text-sm text-muted-foreground mb-1">Total Neto</p>
            <p className="text-2xl font-bold font-mono text-green-600 dark:text-green-400" data-testid="text-ficticio-total-neto">
              {data.kpisFicticio.totalNeto.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
            </p>
          </div>
          <div className="text-center p-4 border rounded-md bg-card">
            <p className="text-sm text-muted-foreground mb-1">Tasa Devolución</p>
            <p className="text-2xl font-bold font-mono text-destructive" data-testid="text-ficticio-tasa-devolucion">
              {data.kpisFicticio.tasaDevolucion.toFixed(1)}%
            </p>
          </div>
        </div>
      </Card>

      {/* KPIs por Tipo de Tienda */}
      <Card className="p-6">
        <h3 className="text-base font-semibold mb-4 pb-2 border-b text-muted-foreground">
          KPIs por Tipo de Tienda (Excluyendo GR.ART.FICTICIO)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 border rounded-md bg-card">
            <p className="text-sm text-muted-foreground mb-1">Tiendas Físicas</p>
            <p className="text-2xl font-bold font-mono" data-testid="text-tiendas-fisicas">
              {data.kpisTienda.tiendasFisicas}
            </p>
          </div>
          <div className="text-center p-4 border rounded-md bg-card">
            <p className="text-sm text-muted-foreground mb-1">Ventas Netas Físicas</p>
            <p className="text-2xl font-bold font-mono" data-testid="text-ventas-fisicas">
              {data.kpisTienda.ventasFisicas.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
            </p>
          </div>
          <div className="text-center p-4 border rounded-md bg-card">
            <p className="text-sm text-muted-foreground mb-1">Tiendas Online</p>
            <p className="text-2xl font-bold font-mono" data-testid="text-tiendas-online">
              {data.kpisTienda.tiendasOnline}
            </p>
          </div>
          <div className="text-center p-4 border rounded-md bg-card">
            <p className="text-sm text-muted-foreground mb-1">Ventas Netas Online</p>
            <p className="text-2xl font-bold font-mono" data-testid="text-ventas-online">
              {data.kpisTienda.ventasOnline.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
            </p>
          </div>
        </div>
      </Card>

      {/* Ventas Mensuales Chart */}
      {ventasPorMes.length > 0 && (
        <Card className="p-6">
          <h3 className="text-base font-semibold mb-4">Ventas Mensuales por Tipo de Tienda</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={ventasPorMes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => value.toLocaleString()}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Legend />
              <Bar dataKey="fisica" name="Física" fill="hsl(var(--primary))" opacity={0.8} />
              <Bar dataKey="online" name="Online" fill="hsl(var(--chart-1))" opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Top 30 Tiendas */}
      {data.topTiendas.length > 0 && (
        <Card className="p-6">
          <h3 className="text-base font-semibold mb-4">Top 30 Tiendas con Más Ventas</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-sm font-medium text-muted-foreground">Ranking</th>
                  <th className="text-left p-2 text-sm font-medium text-muted-foreground">Tienda</th>
                  <th className="text-right p-2 text-sm font-medium text-muted-foreground">Unidades</th>
                  <th className="text-right p-2 text-sm font-medium text-muted-foreground">Beneficio</th>
                </tr>
              </thead>
              <tbody>
                {data.topTiendas.map((tienda) => (
                  <tr key={tienda.tienda} className="border-b hover-elevate" data-testid={`top-tienda-${tienda.ranking}`}>
                    <td className="p-2 text-sm">{tienda.ranking}</td>
                    <td className="p-2 text-sm font-medium">{tienda.tienda}</td>
                    <td className="p-2 text-sm text-right font-mono">{tienda.unidades.toLocaleString()}</td>
                    <td className="p-2 text-sm text-right font-mono">
                      {tienda.beneficio.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Bottom 30 Tiendas */}
      {data.bottomTiendas.length > 0 && (
        <Card className="p-6">
          <h3 className="text-base font-semibold mb-4">Top 30 Tiendas con Menos Ventas</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-sm font-medium text-muted-foreground">Ranking</th>
                  <th className="text-left p-2 text-sm font-medium text-muted-foreground">Tienda</th>
                  <th className="text-right p-2 text-sm font-medium text-muted-foreground">Unidades</th>
                  <th className="text-right p-2 text-sm font-medium text-muted-foreground">Beneficio</th>
                </tr>
              </thead>
              <tbody>
                {data.bottomTiendas.map((tienda) => (
                  <tr key={tienda.tienda} className="border-b hover-elevate" data-testid={`bottom-tienda-${tienda.ranking}`}>
                    <td className="p-2 text-sm">{tienda.ranking}</td>
                    <td className="p-2 text-sm font-medium">{tienda.tienda}</td>
                    <td className="p-2 text-sm text-right font-mono">{tienda.unidades.toLocaleString()}</td>
                    <td className="p-2 text-sm text-right font-mono">
                      {tienda.beneficio.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Ventas por Talla */}
      {data.ventasPorTalla.length > 0 && (
        <Card className="p-6">
          <h3 className="text-base font-semibold mb-4">Unidades Vendidas por Talla</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.ventasPorTalla.slice(0, 20)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="talla" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => value.toLocaleString()}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Bar dataKey="cantidad" name="Unidades" fill="hsl(var(--primary))" opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
