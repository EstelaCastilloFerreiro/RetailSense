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

interface UnitsBySizeChartProps {
  fileId: string;
  filters?: {
    temporada?: string;
    familia?: string;
    tiendas?: string[];
  };
}

export default function UnitsBySizeChart({ fileId, filters }: UnitsBySizeChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/charts/units-by-size', fileId, filters],
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

  if (!data?.data || data.data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Unidades Vendidas por Talla</h3>
        <div className="flex items-center justify-center h-[400px]">
          <p className="text-muted-foreground">No hay datos disponibles</p>
        </div>
      </Card>
    );
  }

  // Transform data for stacked bar chart
  const tallaMap = new Map<string, any>();
  
  data.data.forEach((item) => {
    if (!tallaMap.has(item.talla)) {
      tallaMap.set(item.talla, { talla: item.talla });
    }
    const tallaData = tallaMap.get(item.talla);
    tallaData[item.temporada] = item.cantidad;
  });

  const chartData = Array.from(tallaMap.values());
  const temporadas = Array.from(new Set(data.data.map(d => d.temporada)));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">Unidades Vendidas por Talla</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
          <XAxis dataKey="talla" />
          <YAxis tickFormatter={(value) => value.toLocaleString('es-ES')} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
            }}
            formatter={(value: number) => value.toLocaleString('es-ES')}
          />
          <Legend />
          {temporadas.map((temporada, index) => (
            <Bar
              key={temporada}
              dataKey={temporada}
              stackId="a"
              fill={getColorByIndex(index)}
              opacity={0.8}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
