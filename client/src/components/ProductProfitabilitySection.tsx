import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useData } from "@/contexts/DataContext";
import VisualizationCard from "./VisualizationCard";
import KPICard from "./KPICard";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
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
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils";

interface ProductProfitabilityMetrics {
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
  productosMargenNegativo: Array<{
    codigoUnico: string;
    familia: string;
    margenUnitario: number;
    margenPorcentaje: number;
  }>;
}

export default function ProductProfitabilitySection() {
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

  const { data, isLoading, error } = useQuery<ProductProfitabilityMetrics>({
    queryKey: ['/api/dashboard-products', fileId, stableFilters],
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

  return (
    <div className="space-y-6">
      {/* KPIs Devoluciones y Rebajas */}
      <div>
        <h2 className="text-xl font-semibold mb-4" data-testid="title-kpis-devoluciones">KPIs de Devoluciones y Rebajas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-4" data-testid="card-tienda-devoluciones">
            <p className="text-xs text-muted-foreground mb-2">Tienda con más devoluciones</p>
            <p className="font-semibold text-sm mb-1" title={data.kpisDevoluciones.tiendaMasDevoluciones}>
              {data.kpisDevoluciones.tiendaMasDevoluciones.length > 30 
                ? data.kpisDevoluciones.tiendaMasDevoluciones.slice(0, 30) + '...' 
                : data.kpisDevoluciones.tiendaMasDevoluciones}
            </p>
            <p className="text-xs text-destructive">Ratio: {formatPercentage(data.kpisDevoluciones.tiendaRatioDevolucion)}</p>
          </Card>

          <KPICard
            label="Talla más devuelta"
            value={data.kpisDevoluciones.tallaMasDevuelta}
            changeLabel={`${formatNumber(data.kpisDevoluciones.tallaMasDevueltaUnidades)} unidades`}
          />

          <KPICard
            label="Familia más devuelta"
            value={data.kpisDevoluciones.familiaMasDevuelta}
            changeLabel={`${formatNumber(data.kpisDevoluciones.familiaMasDevueltaUnidades)} unidades`}
          />

          <KPICard
            label="Rebajas 1ª (Enero/Junio)"
            value={data.kpisRebajas.rebajas1Valor}
            format="currency"
            changeLabel={`${formatPercentage(data.kpisRebajas.rebajas1Porcentaje)} del total`}
          />

          <KPICard
            label="Rebajas 2ª (Feb/Jul/Ago)"
            value={data.kpisRebajas.rebajas2Valor}
            format="currency"
            changeLabel={`${formatPercentage(data.kpisRebajas.rebajas2Porcentaje)} del total`}
          />
        </div>
      </div>

      {/* KPIs Margen */}
      <div>
        <h2 className="text-xl font-semibold mb-4" data-testid="title-kpis-margen">KPIs de Margen</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <KPICard
            label="Margen Unitario Promedio"
            value={data.kpisMargen.margenUnitarioPromedio}
            format="currency"
            trend={data.kpisMargen.margenUnitarioPromedio > 0 ? "up" : "down"}
          />

          <KPICard
            label="Margen % Promedio"
            value={data.kpisMargen.margenPorcentualPromedio}
            format="percentage"
            trend={data.kpisMargen.margenPorcentualPromedio > 0 ? "up" : "down"}
          />
        </div>
      </div>

      {/* Visualizaciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ventas vs Devoluciones por Familia */}
        <VisualizationCard title="Ventas vs Devoluciones por Familia" id="ventas-devoluciones-familia">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data.ventasVsDevolucionesPorFamilia.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="familia" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelStyle={{ color: '#000' }}
              />
              <Legend />
              <Bar dataKey="ventas" fill="#00cc00" name="Ventas" />
              <Bar dataKey="devoluciones" fill="#dc2626" name="Devoluciones" />
            </BarChart>
          </ResponsiveContainer>
        </VisualizationCard>

        {/* Tabla Tallas por Familia */}
        <VisualizationCard title="Tallas por Familia (Top 20)" id="tallas-familia">
          <div className="overflow-auto max-h-[350px]" data-testid="table-tallas-familia">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="text-left p-2 text-xs font-semibold">Familia</th>
                  <th className="text-left p-2 text-xs font-semibold">Talla</th>
                  <th className="text-right p-2 text-xs font-semibold">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {data.tallasPorFamilia
                  .sort((a, b) => b.cantidad - a.cantidad)
                  .slice(0, 20)
                  .map((item, index) => (
                    <tr key={index} className="border-b hover-elevate" data-testid={`row-talla-${index}`}>
                      <td className="p-2 text-xs">{item.familia}</td>
                      <td className="p-2 text-xs">{item.talla}</td>
                      <td className="text-right p-2 font-mono text-xs">{formatNumber(item.cantidad)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </VisualizationCard>
      </div>

      {/* Productos con Margen Negativo */}
      {data.productosMargenNegativo.length > 0 && (
        <VisualizationCard title="Productos con Margen Negativo" id="margen-negativo">
          <div className="overflow-auto max-h-[350px]" data-testid="table-margen-negativo">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="text-left p-2 text-xs font-semibold">Código</th>
                  <th className="text-left p-2 text-xs font-semibold">Familia</th>
                  <th className="text-right p-2 text-xs font-semibold">Margen €</th>
                  <th className="text-right p-2 text-xs font-semibold">Margen %</th>
                </tr>
              </thead>
              <tbody>
                {data.productosMargenNegativo
                  .sort((a, b) => a.margenUnitario - b.margenUnitario)
                  .map((item, index) => (
                    <tr key={index} className="border-b hover-elevate" data-testid={`row-margen-neg-${index}`}>
                      <td className="p-2 text-xs font-mono">{item.codigoUnico}</td>
                      <td className="p-2 text-xs">{item.familia}</td>
                      <td className="text-right p-2 font-mono text-xs text-destructive">
                        {formatCurrency(item.margenUnitario)}
                      </td>
                      <td className="text-right p-2 font-mono text-xs text-destructive">
                        {formatPercentage(item.margenPorcentaje)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </VisualizationCard>
      )}
    </div>
  );
}
