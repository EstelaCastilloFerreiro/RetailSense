import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
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
import { getColorByIndex } from "@/lib/colors";
import { ExpandableChart } from "@/components/ui/expandable-chart";

interface SalesVsTransfersChartProps {
  fileId: string;
  filters?: {
    temporada?: string;
    familia?: string;
    tiendas?: string[];
  };
  isExpanded?: boolean;
}

interface SalesVsTransfersData {
  data: Array<{
    tienda: string;
    temporada: string;
    tipo: 'Ventas' | 'Traspasos';
    cantidad: number;
  }>;
  topStores: string[];
}

export default function SalesVsTransfersChart({ fileId, filters, isExpanded = false }: SalesVsTransfersChartProps) {
  const { data, isLoading } = useQuery<SalesVsTransfersData>({
    queryKey: ['/api/charts/sales-vs-transfers', fileId, filters],
    enabled: !!fileId,
  });

  const title = "Ventas vs Traspasos por Tienda";

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-[400px]">
          <p className="text-muted-foreground">Cargando datos...</p>
        </div>
      </Card>
    );
  }

  if (!data?.data || data.data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">{title}</h3>
        <div className="flex items-center justify-center h-[400px]">
          <p className="text-muted-foreground">No hay datos disponibles</p>
        </div>
      </Card>
    );
  }

  // Get unique temporadas and sort them
  const temporadas = Array.from(new Set(data.data.map(item => item.temporada))).sort();
  
  // Create color mapping for temporadas (cycling through colors)
  const temporadaColors: Record<string, string> = {};
  temporadas.forEach((temp, idx) => {
    temporadaColors[temp] = getColorByIndex(idx);
  });
  
  // Transform data for stacked bars by temporada
  const tiendaMap = new Map<string, any>();
  
  data.data.forEach((item) => {
    if (!tiendaMap.has(item.tienda)) {
      tiendaMap.set(item.tienda, { tienda: item.tienda });
    }
    
    const tiendaData = tiendaMap.get(item.tienda);
    const key = `${item.tipo}_${item.temporada}`;
    tiendaData[key] = (tiendaData[key] || 0) + item.cantidad;
  });

  const chartData = Array.from(tiendaMap.values())
    .map(tienda => {
      const totalVentas = temporadas.reduce((sum, temp) => {
        return sum + (tienda[`Ventas_${temp}`] || 0);
      }, 0);
      return { ...tienda, _totalVentas: totalVentas };
    })
    .sort((a, b) => b._totalVentas - a._totalVentas)
    .slice(0, 50);

  return (
    <ExpandableChart title={title} renderChart={(expanded) => {
      const height = expanded ? 900 : 500;
      const font = expanded ? 14 : 9;
      const xHeight = expanded ? 250 : 150;
      
      return (
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">{title}</h3>
          <div className="mb-2 text-sm text-muted-foreground">
            Top 50 tiendas por ventas totales. Barras apiladas por temporada.
          </div>
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis
                dataKey="tienda"
                angle={-45}
                textAnchor="end"
                height={xHeight}
                interval={0}
                tick={{ fontSize: font }}
              />
              <YAxis 
                tickFormatter={(value) => value.toLocaleString('es-ES')}
                tick={{ fontSize: expanded ? 14 : 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
                formatter={(value: number) => value.toLocaleString('es-ES')}
              />
              <Legend wrapperStyle={{ fontSize: expanded ? '14px' : '12px' }} />
              
              {/* Ventas bars stacked by temporada */}
              {temporadas.map((temp, idx) => (
                <Bar
                  key={`ventas-${temp}`}
                  dataKey={`Ventas_${temp}`}
                  stackId="ventas"
                  fill={temporadaColors[temp]}
                  opacity={0.9}
                  name={`Ventas ${temp}`}
                />
              ))}
              
              {/* Traspasos bars stacked by temporada */}
              {temporadas.map((temp, idx) => (
                <Bar
                  key={`traspasos-${temp}`}
                  dataKey={`Traspasos_${temp}`}
                  stackId="traspasos"
                  fill={temporadaColors[temp]}
                  opacity={0.6}
                  name={`Traspasos ${temp}`}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>
      );
    }} />
  );
}
