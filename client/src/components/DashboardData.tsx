import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useData } from "@/contexts/DataContext";
import KPICard from "./KPICard";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function DashboardData() {
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

  const { data: dashboardData, isLoading, error } = useQuery<{
    kpis: {
      ventasBrutas: number;
      ventasNetas: number;
      devoluciones: number;
      tasaDevolucion: number;
      ventasFisicas: number;
      ventasOnline: number;
      tiendasFisicasCount: number;
      tiendasOnlineCount: number;
      numFamilias: number;
      numTiendas: number;
      numTemporadas: number;
      numTransacciones: number;
    };
    filters: any;
    ventasMensuales: any[];
    topProductos: Array<{
      codigoUnico: string;
      nombre: string;
      cantidad: number;
      beneficio: number;
      familia: string;
    }>;
    ventasPorTienda: Array<{
      tienda: string;
      cantidad: number;
      beneficio: number;
    }>;
  }>({
    queryKey: ['/api/dashboard', fileId, stableFilters],
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

  const kpis = dashboardData?.kpis;

  if (!kpis) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-lg text-muted-foreground">No hay datos disponibles</p>
      </div>
    );
  }

  const kpiCards = [
    {
      label: "Ventas Brutas",
      value: kpis.ventasBrutas,
      format: "currency" as const,
    },
    {
      label: "Ventas Netas",
      value: kpis.ventasNetas,
      format: "currency" as const,
      trend: "up" as const,
    },
    {
      label: "Devoluciones",
      value: kpis.devoluciones,
      format: "currency" as const,
      trend: "down" as const,
    },
    {
      label: "Tasa Devolución",
      value: kpis.tasaDevolucion,
      format: "percentage" as const,
    },
    {
      label: "Ventas Físicas",
      value: kpis.ventasFisicas,
      format: "currency" as const,
    },
    {
      label: "Ventas Online",
      value: kpis.ventasOnline,
      format: "currency" as const,
    },
    {
      label: "Tiendas Físicas",
      value: kpis.tiendasFisicasCount,
      format: "number" as const,
    },
    {
      label: "Tiendas Online",
      value: kpis.tiendasOnlineCount,
      format: "number" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi, index) => (
          <KPICard key={index} {...kpi} />
        ))}
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Resumen de Datos</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
            <span className="text-sm text-muted-foreground">Total Familias:</span>
            <span className="font-medium">{kpis.numFamilias}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
            <span className="text-sm text-muted-foreground">Total Tiendas:</span>
            <span className="font-medium">{kpis.numTiendas}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted/50 rounded-md">
            <span className="text-sm text-muted-foreground">Transacciones:</span>
            <span className="font-medium">{kpis.numTransacciones.toLocaleString()}</span>
          </div>
        </div>
      </Card>

      {dashboardData.topProductos && dashboardData.topProductos.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top 10 Productos por Beneficio</h3>
          <div className="space-y-2">
            {dashboardData.topProductos.map((producto: any, index: number) => (
              <div 
                key={producto.codigoUnico}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-md hover-elevate"
                data-testid={`top-product-${index}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                  <div>
                    <p className="font-medium">{producto.codigoUnico}</p>
                    {producto.familia && (
                      <p className="text-xs text-muted-foreground">{producto.familia}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{producto.beneficio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
                  <p className="text-xs text-muted-foreground">{producto.cantidad} unidades</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {dashboardData.ventasPorTienda && dashboardData.ventasPorTienda.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Ventas por Tienda</h3>
          <div className="space-y-2">
            {dashboardData.ventasPorTienda.slice(0, 10).map((tienda: any, index: number) => (
              <div 
                key={tienda.tienda}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                data-testid={`store-sales-${index}`}
              >
                <p className="font-medium">{tienda.tienda}</p>
                <div className="text-right">
                  <p className="font-medium">{tienda.beneficio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
                  <p className="text-xs text-muted-foreground">{tienda.cantidad} unidades</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
