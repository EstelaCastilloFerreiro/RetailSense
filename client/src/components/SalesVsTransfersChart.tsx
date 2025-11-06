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

interface SalesVsTransfersChartProps {
  fileId: string;
  filters?: {
    temporada?: string;
    familia?: string;
    tiendas?: string[];
  };
}

export default function SalesVsTransfersChart({ fileId, filters }: SalesVsTransfersChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/charts/sales-vs-transfers', fileId, filters],
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
        <h3 className="text-lg font-medium mb-4">Ventas vs Traspasos por Tienda</h3>
        <div className="flex items-center justify-center h-[400px]">
          <p className="text-muted-foreground">No hay datos disponibles</p>
        </div>
      </Card>
    );
  }

  // Group data by tienda for grouped bars
  const tiendaMap = new Map<string, any>();
  
  data.data.forEach((item) => {
    const key = item.tienda;
    
    if (!tiendaMap.has(key)) {
      tiendaMap.set(key, { tienda: item.tienda });
    }
    
    const tiendaData = tiendaMap.get(key);
    
    // Sum quantities by tipo (Ventas or Traspasos)
    if (item.tipo === 'Ventas') {
      tiendaData.ventas = (tiendaData.ventas || 0) + item.cantidad;
    } else {
      tiendaData.traspasos = (tiendaData.traspasos || 0) + item.cantidad;
    }
  });

  const chartData = Array.from(tiendaMap.values())
    .sort((a, b) => (b.ventas || 0) - (a.ventas || 0))
    .slice(0, 30); // Show top 30 stores

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">Ventas vs Traspasos por Tienda</h3>
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
          <Bar
            dataKey="ventas"
            fill={getColorByIndex(0)}
            opacity={0.8}
            name="Ventas"
          />
          <Bar
            dataKey="traspasos"
            fill="#ffc107"
            opacity={0.8}
            name="Traspasos"
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
