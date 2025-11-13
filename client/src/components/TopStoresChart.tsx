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

interface TopStoresChartProps {
  fileId: string;
  filters?: {
    temporada?: string;
    familia?: string;
    tiendas?: string[];
  };
  showBottom?: boolean;
  isExpanded?: boolean;
}

export default function TopStoresChart({ fileId, filters, showBottom = false, isExpanded = false }: TopStoresChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/charts/top-stores', fileId, filters],
    enabled: !!fileId,
  });

  const title = showBottom ? "Top 15 tiendas con menos ventas" : "Top 15 tiendas con más ventas";

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-[400px]">
          <p className="text-muted-foreground">Cargando datos...</p>
        </div>
      </Card>
    );
  }

  const chartData = showBottom ? data?.bottomStores : data?.topStores;

  if (!chartData || chartData.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">{title}</h3>
        <div className="flex items-center justify-center h-[400px]">
          <p className="text-muted-foreground">No hay datos disponibles</p>
        </div>
      </Card>
    );
  }

  return (
    <ExpandableChart title={title} renderChart={(expanded) => {
      const height = expanded ? 800 : 400;
      const font = expanded ? 14 : 10;
      const xHeight = expanded ? 200 : 120;
      
      return (
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">{title}</h3>
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData} layout={expanded ? "vertical" : "horizontal"}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" strokeOpacity={0.5} />
              {expanded ? (
                <>
                  <XAxis 
                    type="number"
                    stroke="#78716c"
                    strokeWidth={1}
                    tick={{ fill: '#57534e', fontSize: 14 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                  />
                  <YAxis 
                    type="category"
                    dataKey="tienda"
                    width={250}
                    stroke="#78716c"
                    strokeWidth={1}
                    tick={{ fill: '#57534e', fontSize: 14 }}
                    interval={0}
                  />
                </>
              ) : (
                <>
                  <XAxis
                    dataKey="tienda"
                    angle={-45}
                    textAnchor="end"
                    height={xHeight}
                    interval={0}
                    stroke="#78716c"
                    strokeWidth={1}
                    tick={{ fill: '#57534e', fontSize: font }}
                  />
                  <YAxis 
                    stroke="#78716c"
                    strokeWidth={1}
                    tick={{ fill: '#57534e', fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                  />
                </>
              )}
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #d6d3d1',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'beneficio') return [`${value.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€`, 'Beneficio'];
                  if (name === 'unidades') return [value.toLocaleString('es-ES'), 'Unidades'];
                  return [value, name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#57534e' }} />
              <Bar 
                dataKey="beneficio" 
                fill={getColorByIndex(0)} 
                opacity={0.8}
                name="Beneficio"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      );
    }} />
  );
}
