import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useData } from "@/contexts/DataContext";
import VisualizationCard from "./VisualizationCard";
import KPICard from "./KPICard";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
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
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils";
import { CHART_COLORS, getValueColor } from "@/lib/colors";

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
  tallasPorFamiliaDetallado?: Array<{
    familia: string;
    masDevueltas: Array<{ talla: string; cantidad: number }>;
    menosDevueltas: Array<{ talla: string; cantidad: number }>;
  }>;
  ventasPorTemporada?: Array<{
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
  productosBajoMargen?: Array<{
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

export default function ProductProfitabilitySection() {
  const { fileId, filters } = useData();
  const [umbralMargen, setUmbralMargen] = useState([36]);

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

          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-2">Familia más devuelta <span className="text-xs text-muted-foreground italic">(excluyendo GR.ART.FICTICIO)</span></p>
            <p className="font-semibold text-sm mb-1">{data.kpisDevoluciones.familiaMasDevuelta}</p>
            <p className="text-xs text-muted-foreground">{formatNumber(data.kpisDevoluciones.familiaMasDevueltaUnidades)} unidades</p>
          </Card>

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
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            Para el cálculo del margen se incluyen únicamente los productos con información disponible sobre su precio de coste. Si el resultado es 0 en alguna familia, esto indica la ausencia de datos de coste para dicha categoría.
          </p>
        </div>
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

      {/* Análisis de Devoluciones y Temporadas */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold mb-4">Análisis de Devoluciones y Temporadas</h2>
        
        {/* Ventas vs Devoluciones por Familia */}
        {data.ventasVsDevolucionesPorFamilia && data.ventasVsDevolucionesPorFamilia.length > 0 && (
        <VisualizationCard title="Ventas vs Devoluciones por Familia" id="ventas-devoluciones-familia">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data.ventasVsDevolucionesPorFamilia.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="familia" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip
                formatter={(value: number | undefined) => formatNumber(value ?? 0)}
                labelStyle={{ color: '#000' }}
              />
              <Legend />
              <Bar dataKey="ventas" name="Ventas">
                {data.ventasVsDevolucionesPorFamilia.slice(0, 10).map((entry, index) => {
                  const values = data.ventasVsDevolucionesPorFamilia.slice(0, 10).map(v => v.ventas);
                  const max = Math.max(...values);
                  const min = Math.min(...values);
                  return (
                    <Cell key={`cell-ventas-${index}`} fill={getValueColor(entry.ventas, min, max)} />
                  );
                })}
              </Bar>
              <Bar dataKey="devoluciones" name="Devoluciones" fill={CHART_COLORS.danger} />
            </BarChart>
          </ResponsiveContainer>
        </VisualizationCard>
        )}

        {/* Análisis Detallado de Tallas por Familia */}
        {data.tallasPorFamiliaDetallado && data.tallasPorFamiliaDetallado.length > 0 && (
        <VisualizationCard title="Análisis de Tallas por Familia" id="tallas-familia-detallado">
          <div className="space-y-6">
            {data.tallasPorFamiliaDetallado.map((familiaData, index) => (
              <div key={index} className="space-y-2">
                <h4 className="font-semibold text-sm">{familiaData.familia}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Top 3 Más Devueltas */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">🔴 Top 3 Tallas Más Devueltas</p>
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-2 text-xs font-semibold">Ranking</th>
                            <th className="text-left p-2 text-xs font-semibold">Talla</th>
                            <th className="text-right p-2 text-xs font-semibold">Cantidad</th>
                          </tr>
                        </thead>
                        <tbody>
                          {familiaData.masDevueltas.map((item, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="p-2 text-xs">{idx + 1}</td>
                              <td className="p-2 text-xs">{item.talla}</td>
                              <td className="text-right p-2 font-mono text-xs">{formatNumber(item.cantidad)}</td>
                            </tr>
                          ))}
                          {familiaData.masDevueltas.length === 0 && (
                            <tr>
                              <td colSpan={3} className="p-2 text-xs text-muted-foreground text-center">
                                Sin datos
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Top 3 Menos Devueltas */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">🟢 Top 3 Tallas Menos Devueltas</p>
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-2 text-xs font-semibold">Ranking</th>
                            <th className="text-left p-2 text-xs font-semibold">Talla</th>
                            <th className="text-right p-2 text-xs font-semibold">Cantidad</th>
                          </tr>
                        </thead>
                        <tbody>
                          {familiaData.menosDevueltas.map((item, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="p-2 text-xs">{idx + 1}</td>
                              <td className="p-2 text-xs">{item.talla}</td>
                              <td className="text-right p-2 font-mono text-xs">{formatNumber(item.cantidad)}</td>
                            </tr>
                          ))}
                          {familiaData.menosDevueltas.length === 0 && (
                            <tr>
                              <td colSpan={3} className="p-2 text-xs text-muted-foreground text-center">
                                Sin datos
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                {index < data.tallasPorFamiliaDetallado.length - 1 && <div className="border-t my-4" />}
              </div>
            ))}
          </div>
        </VisualizationCard>
        )}

        {/* Ventas en/fuera de Temporada */}
        {data.ventasPorTemporada && data.ventasPorTemporada.length > 0 && (
        <VisualizationCard title="Análisis de Ventas por Temporada" id="ventas-temporada">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.ventasPorTemporada}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="temporada" />
              <YAxis />
              <Tooltip
                formatter={(value: number | undefined) => formatNumber(value ?? 0)}
                labelStyle={{ color: '#000' }}
              />
              <Legend />
              <Bar dataKey="enTemporada" name="En Temporada" stackId="a" fill={CHART_COLORS.success} />
              <Bar dataKey="fueraTemporada" name="Fuera de Temporada" stackId="a" fill={CHART_COLORS.danger} />
            </BarChart>
          </ResponsiveContainer>
          
          {/* Tabla Resumen */}
          <div className="mt-6 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="text-left p-2 text-xs font-semibold">Temporada</th>
                  <th className="text-right p-2 text-xs font-semibold">En Temporada</th>
                  <th className="text-right p-2 text-xs font-semibold">Fuera de Temporada</th>
                  <th className="text-right p-2 text-xs font-semibold">Total</th>
                  <th className="text-right p-2 text-xs font-semibold">% En Temporada</th>
                  <th className="text-right p-2 text-xs font-semibold">% Fuera de Temporada</th>
                </tr>
              </thead>
              <tbody>
                {data.ventasPorTemporada.map((item, index) => (
                  <tr key={index} className="border-b hover-elevate">
                    <td className="p-2 text-xs">{item.temporada || 'N/A'}</td>
                    <td className="text-right p-2 font-mono text-xs">{formatNumber(item.enTemporada ?? 0)}</td>
                    <td className="text-right p-2 font-mono text-xs">{formatNumber(item.fueraTemporada ?? 0)}</td>
                    <td className="text-right p-2 font-mono text-xs font-semibold">{formatNumber(item.total ?? 0)}</td>
                    <td className="text-right p-2 font-mono text-xs">{formatPercentage(item.porcentajeEnTemporada ?? 0)}</td>
                    <td className="text-right p-2 font-mono text-xs">{formatPercentage(item.porcentajeFueraTemporada ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </VisualizationCard>
        )}
      </div>

      {/* Productos con Margen Negativo */}
      {data.productosMargenNegativo.length > 0 && (
        <VisualizationCard title="Tabla de depuración: Productos con margen negativo (PVP < Precio Coste)" id="margen-negativo">
          <div className="overflow-auto max-h-[350px]" data-testid="table-margen-negativo">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="text-left p-2 text-xs font-semibold">Código único</th>
                  <th className="text-left p-2 text-xs font-semibold">Familia</th>
                  <th className="text-left p-2 text-xs font-semibold">Temporada</th>
                  <th className="text-left p-2 text-xs font-semibold">Fecha venta</th>
                  <th className="text-right p-2 text-xs font-semibold">PVP (€)</th>
                  <th className="text-right p-2 text-xs font-semibold">Precio Coste (€)</th>
                  <th className="text-right p-2 text-xs font-semibold">Margen Unitario (€)</th>
                </tr>
              </thead>
              <tbody>
                {data.productosMargenNegativo
                  .sort((a, b) => a.margenUnitario - b.margenUnitario)
                  .map((item, index) => (
                    <tr key={index} className="border-b hover-elevate" data-testid={`row-margen-neg-${index}`}>
                      <td className="p-2 text-xs font-mono">{item.codigoUnico}</td>
                      <td className="p-2 text-xs">{item.familia}</td>
                      <td className="p-2 text-xs">{item.temporada}</td>
                      <td className="p-2 text-xs">
                        {new Date(item.fechaVenta).toLocaleDateString('es-ES')}
                      </td>
                      <td className="text-right p-2 font-mono text-xs">{formatCurrency(item.precioVenta)}</td>
                      <td className="text-right p-2 font-mono text-xs">{formatCurrency(item.precioCoste)}</td>
                      <td className="text-right p-2 font-mono text-xs text-destructive">
                        {formatCurrency(item.margenUnitario)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </VisualizationCard>
      )}

      {/* Productos con Bajo Margen */}
      {data.productosBajoMargen && data.productosBajoMargen.length > 0 && (
        <VisualizationCard title="Productos con Bajo Margen" id="productos-bajo-margen">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Umbral de margen % (productos por debajo de este valor): {umbralMargen[0]}%
              </label>
              <Slider
                value={umbralMargen}
                onValueChange={setUmbralMargen}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
            
            {(() => {
              const productosFiltrados = data.productosBajoMargen.filter(
                p => p.margenPorcentaje < umbralMargen[0]
              );
              const productosPerdida = productosFiltrados.filter(p => p.margenPorcentaje < 0);
              
              return (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <Card className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Total productos</p>
                      <p className="text-lg font-semibold">{formatNumber(productosFiltrados.length)}</p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Margen promedio</p>
                      <p className="text-lg font-semibold">
                        {productosFiltrados.length > 0
                          ? formatPercentage(
                              productosFiltrados.reduce((sum, p) => sum + p.margenPorcentaje, 0) /
                                productosFiltrados.length
                            )
                          : 'N/A'}
                      </p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Con pérdida</p>
                      <p className="text-lg font-semibold text-destructive">{formatNumber(productosPerdida.length)}</p>
                    </Card>
                  </div>
                  
                  <div className="overflow-auto max-h-[400px]">
                    <p className="text-sm font-medium mb-2">
                      Productos con margen inferior al {umbralMargen[0]}% ({formatNumber(productosFiltrados.length)} productos):
                    </p>
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background">
                        <tr className="border-b">
                          <th className="text-left p-2 text-xs font-semibold">Código</th>
                          <th className="text-left p-2 text-xs font-semibold">Familia</th>
                          <th className="text-left p-2 text-xs font-semibold">Temporada</th>
                          <th className="text-left p-2 text-xs font-semibold">Fecha Venta</th>
                          <th className="text-right p-2 text-xs font-semibold">Precio Venta (€)</th>
                          <th className="text-right p-2 text-xs font-semibold">Precio Coste (€)</th>
                          <th className="text-right p-2 text-xs font-semibold">Margen %</th>
                          <th className="text-right p-2 text-xs font-semibold">Cantidad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productosFiltrados
                          .sort((a, b) => a.margenPorcentaje - b.margenPorcentaje)
                          .map((item, index) => (
                            <tr key={index} className="border-b hover-elevate">
                              <td className="p-2 text-xs font-mono">{item.codigoUnico}</td>
                              <td className="p-2 text-xs">{item.familia}</td>
                              <td className="p-2 text-xs">{item.temporada}</td>
                              <td className="p-2 text-xs">
                                {new Date(item.fechaVenta).toLocaleDateString('es-ES')}
                              </td>
                              <td className="text-right p-2 font-mono text-xs">{formatCurrency(item.precioVenta)}</td>
                              <td className="text-right p-2 font-mono text-xs">{formatCurrency(item.precioCoste)}</td>
                              <td className={`text-right p-2 font-mono text-xs ${
                                item.margenPorcentaje < 0 ? 'text-destructive' : ''
                              }`}>
                                {formatPercentage(item.margenPorcentaje)}
                              </td>
                              <td className="text-right p-2 font-mono text-xs">{formatNumber(item.cantidad)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </div>
        </VisualizationCard>
      )}
    </div>
  );
}
