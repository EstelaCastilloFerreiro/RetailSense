import { useData } from "@/contexts/DataContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import KPICard from "./KPICard";

interface VentasPorTienda {
  tienda: string;
  cantidad: number;
  beneficio: number;
}

interface GeographicData {
  ventasPorTienda: VentasPorTienda[];
  mejorTienda: {
    nombre: string;
    cantidad: number;
    beneficio: number;
  };
  peorTienda: {
    nombre: string;
    cantidad: number;
    beneficio: number;
  };
  totalTiendas: number;
}

export default function GeographicSection() {
  const { fileId, filters } = useData();

  const buildQueryUrl = () => {
    if (!fileId) return '';
    const params = new URLSearchParams();
    if (filters.temporada) params.append('temporada', filters.temporada);
    if (filters.familia) params.append('familia', filters.familia);
    if (filters.fechaInicio) params.append('fechaInicio', filters.fechaInicio);
    if (filters.fechaFin) params.append('fechaFin', filters.fechaFin);
    if (filters.tiendas && filters.tiendas.length > 0) {
      filters.tiendas.forEach(t => params.append('tiendas', t));
    }
    const queryString = params.toString();
    return `/api/geographic/${fileId}${queryString ? `?${queryString}` : ''}`;
  };

  const { data, isLoading, error } = useQuery<GeographicData>({
    queryKey: [buildQueryUrl(), filters],
    enabled: !!fileId,
  });

  if (!fileId) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Sube un archivo para ver análisis geográfico</p>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Error al cargar datos geográficos</p>
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No hay datos disponibles</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          label="Total Tiendas"
          value={data.totalTiendas}
          format="number"
          data-testid="kpi-total-tiendas"
        />
        <KPICard
          label={`Mejor Tienda: ${data.mejorTienda.nombre}`}
          value={data.mejorTienda.cantidad}
          format="number"
          data-testid="kpi-mejor-tienda"
        />
        <KPICard
          label={`Peor Tienda: ${data.peorTienda.nombre}`}
          value={data.peorTienda.cantidad}
          format="number"
          trend="down"
          data-testid="kpi-peor-tienda"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ventas por Tienda (Top 20)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-ventas-por-tienda">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Tienda</th>
                  <th className="text-right p-2">Cantidad</th>
                  <th className="text-right p-2">Beneficio</th>
                </tr>
              </thead>
              <tbody>
                {data.ventasPorTienda.slice(0, 20).map((tienda, index) => (
                  <tr key={index} className="border-b hover-elevate">
                    <td className="p-2">{tienda.tienda}</td>
                    <td className="text-right p-2 font-mono">{tienda.cantidad.toLocaleString('es-ES')}</td>
                    <td className="text-right p-2 font-mono">€{tienda.beneficio.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
