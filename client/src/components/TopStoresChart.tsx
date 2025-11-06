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

interface TopStoresChartProps {
  fileId: string;
  filters?: {
    temporada?: string;
    familia?: string;
    tiendas?: string[];
  };
  showBottom?: boolean;
}

export default function TopStoresChart({ fileId, filters, showBottom = false }: TopStoresChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/charts/top-stores', fileId, filters],
    enabled: !!fileId,
  });

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
        <h3 className="text-lg font-medium mb-4">
          {showBottom ? "Top 30 tiendas con menos ventas" : "Top 30 tiendas con más ventas"}
        </h3>
        <div className="flex items-center justify-center h-[400px]">
          <p className="text-muted-foreground">No hay datos disponibles</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">
        {showBottom ? "Top 30 tiendas con menos ventas" : "Top 30 tiendas con más ventas"}
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
          <XAxis
            dataKey="tienda"
            angle={-45}
            textAnchor="end"
            height={120}
            interval={0}
            tick={{ fontSize: 10 }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
            }}
            formatter={(value: number, name: string) => {
              if (name === 'beneficio') return [`${value.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€`, 'Beneficio'];
              if (name === 'unidades') return [value.toLocaleString('es-ES'), 'Unidades'];
              return [value, name];
            }}
          />
          <Legend />
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
}
