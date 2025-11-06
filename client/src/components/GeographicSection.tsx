import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useData } from "@/contexts/DataContext";
import VisualizationCard from "./VisualizationCard";
import KPICard from "./KPICard";
import SalesMap from "./SalesMap";
import TopStoresChart from "./TopStoresChart";
import SalesVsTransfersChart from "./SalesVsTransfersChart";
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
  LineChart,
  Line,
  Cell,
} from "recharts";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { CHART_COLORS, getColorByIndex, getValueColor } from "@/lib/colors";

interface GeographicMetrics {
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

export default function GeographicSection() {
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

  const { data, isLoading, error } = useQuery<GeographicMetrics>({
    queryKey: ['/api/dashboard-geographic', fileId, stableFilters],
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

  // Transform evolution data for LineChart
  const evolucionData = data.evolucionMensualPorZona.reduce((acc, item) => {
    const existing = acc.find(x => x.mes === item.mes);
    if (existing) {
      existing[item.zona] = item.cantidad;
    } else {
      acc.push({ mes: item.mes, [item.zona]: item.cantidad });
    }
    return acc;
  }, [] as any[]);

  const zonas = Array.from(new Set(data.evolucionMensualPorZona.map(e => e.zona)));
  const colors = zonas.map((_, index) => getColorByIndex(index));

  return (
    <div className="space-y-6">
      {/* KPIs por Zona */}
      <div>
        <h2 className="text-xl font-semibold mb-4" data-testid="title-kpis-zona">KPIs por Zona Geográfica</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.kpisPorZona.map((zona, index) => (
            <Card key={zona.zona} className="p-4" data-testid={`card-zona-${zona.zona.toLowerCase()}`}>
              <h3 className="font-semibold text-lg mb-3 border-b pb-2">{zona.zona}</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Mejor Tienda</p>
                  <p className="font-medium text-sm truncate" title={zona.mejorTienda}>{zona.mejorTienda}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <span className="text-xs font-mono">{formatNumber(zona.mejorCantidad)} uds</span>
                    <span className="text-xs font-mono text-muted-foreground">({formatCurrency(zona.mejorBeneficio)})</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Peor Tienda</p>
                  <p className="font-medium text-sm truncate" title={zona.peorTienda}>{zona.peorTienda}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <TrendingDown className="h-3 w-3 text-red-600" />
                    <span className="text-xs font-mono">{formatNumber(zona.peorCantidad)} uds</span>
                    <span className="text-xs font-mono text-muted-foreground">({formatCurrency(zona.peorBeneficio)})</span>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Media de la zona</p>
                  <p className="text-sm font-mono">{formatCurrency(zona.mediaBeneficio)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Visualizaciones en grilla */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ventas por Zona */}
        <VisualizationCard title="Ventas por Zona" id="ventas-zona">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.ventasPorZona} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="zona" type="category" width={80} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelStyle={{ color: '#000' }}
              />
              <Bar dataKey="beneficio" name="Beneficio">
                {data.ventasPorZona.map((entry, index) => {
                  const max = Math.max(...data.ventasPorZona.map(v => v.beneficio));
                  const min = Math.min(...data.ventasPorZona.map(v => v.beneficio));
                  return (
                    <Cell key={`cell-${index}`} fill={getValueColor(entry.beneficio, min, max)} />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </VisualizationCard>

        {/* Tiendas por Zona */}
        <VisualizationCard title="Número de Tiendas por Zona" id="tiendas-zona">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.tiendasPorZona}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="zona" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip labelStyle={{ color: '#000' }} />
              <Bar dataKey="numTiendas" name="Tiendas">
                {data.tiendasPorZona.map((entry, index) => {
                  const max = Math.max(...data.tiendasPorZona.map(t => t.numTiendas));
                  const min = Math.min(...data.tiendasPorZona.map(t => t.numTiendas));
                  return (
                    <Cell key={`cell-${index}`} fill={getValueColor(entry.numTiendas, min, max)} />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </VisualizationCard>
      </div>

      {/* Evolución Mensual por Zona */}
      <VisualizationCard title="Evolución Mensual por Zona" id="evolucion-zona">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={evolucionData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip formatter={(value: number) => formatNumber(value)} labelStyle={{ color: '#000' }} />
            <Legend />
            {zonas.map((zona, index) => (
              <Line
                key={zona}
                type="monotone"
                dataKey={zona}
                stroke={colors[index % colors.length]}
                name={zona}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </VisualizationCard>

      {/* Mapas - España e Italia */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mapa España */}
        <VisualizationCard title="Mapa de Ventas - España" id="mapa-espana">
          <SalesMap
            points={data.mapaEspana.map(p => ({
              tienda: p.tienda,
              lat: p.lat,
              lon: p.lon,
              cantidad: p.cantidad,
              beneficio: p.beneficio,
            }))}
            center={[40.4168, -3.7038]} // Madrid coordinates
            zoom={5}
            title="España - Ventas por Tienda"
            type="espana"
          />
          {/* Tabla resumen debajo del mapa */}
          {data.mapaEspana.length > 0 && (
            <div className="mt-4 overflow-auto max-h-[200px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="text-left p-2 text-xs font-semibold">Tienda</th>
                    <th className="text-right p-2 text-xs font-semibold">Cantidad</th>
                    <th className="text-right p-2 text-xs font-semibold">Beneficio</th>
                  </tr>
                </thead>
                <tbody>
                  {data.mapaEspana.slice(0, 10).map((tienda, index) => (
                    <tr key={index} className="border-b hover-elevate" data-testid={`row-espana-${index}`}>
                      <td className="p-2 text-xs">{tienda.tienda}</td>
                      <td className="text-right p-2 font-mono text-xs">{formatNumber(tienda.cantidad)}</td>
                      <td className="text-right p-2 font-mono text-xs">{formatCurrency(tienda.beneficio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </VisualizationCard>

        {/* Mapa Italia */}
        {data.mapaItalia.length > 0 ? (
          <VisualizationCard title="Mapa de Ventas - Italia" id="mapa-italia">
            <SalesMap
              points={data.mapaItalia.map(p => ({
                ciudad: p.ciudad,
                lat: p.lat,
                lon: p.lon,
                cantidad: p.cantidad,
                beneficio: p.beneficio,
              }))}
              center={[41.9028, 12.4964]} // Rome coordinates
              zoom={5}
              title="Italia - Ventas por Ciudad"
              type="italia"
            />
            {/* Tabla resumen debajo del mapa */}
            <div className="mt-4 overflow-auto max-h-[200px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="text-left p-2 text-xs font-semibold">Ciudad</th>
                    <th className="text-right p-2 text-xs font-semibold">Cantidad</th>
                    <th className="text-right p-2 text-xs font-semibold">Beneficio</th>
                  </tr>
                </thead>
                <tbody>
                  {data.mapaItalia.map((ciudad, index) => (
                    <tr key={index} className="border-b hover-elevate" data-testid={`row-italia-${index}`}>
                      <td className="p-2 text-xs">{ciudad.ciudad}</td>
                      <td className="text-right p-2 font-mono text-xs">{formatNumber(ciudad.cantidad)}</td>
                      <td className="text-right p-2 font-mono text-xs">{formatCurrency(ciudad.beneficio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </VisualizationCard>
        ) : (
          <Card className="p-6">
            <p className="text-sm text-muted-foreground text-center">No hay datos de Italia disponibles</p>
          </Card>
        )}

        {/* Top 30 Tiendas con Más Ventas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <TopStoresChart 
            fileId={fileId}
            filters={stableFilters}
            showBottom={false}
          />
          
          <TopStoresChart 
            fileId={fileId}
            filters={stableFilters}
            showBottom={true}
          />
        </div>

        {/* Ventas vs Traspasos por Tienda */}
        <div className="mt-6">
          <SalesVsTransfersChart 
            fileId={fileId}
            filters={stableFilters}
          />
        </div>
      </div>
    </div>
  );
}
