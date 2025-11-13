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

interface WarehouseEntriesChartProps {
  fileId: string;
  filters?: {
    temporada?: string;
    familia?: string;
  };
}

export default function WarehouseEntriesChart({ fileId, filters }: WarehouseEntriesChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/charts/warehouse-entries', fileId, filters],
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

  if (!data?.byTemporada) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Entradas Almacén por Temporada</h3>
        <div className="flex items-center justify-center h-[400px]">
          <p className="text-muted-foreground">No hay datos disponibles</p>
        </div>
      </Card>
    );
  }

  // Transform data for display
  const chartData = Object.entries(data.byTemporada).map(([temporada, info]) => ({
    temporada,
    total: info.total,
  }));

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Entradas Almacén por Temporada</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" strokeOpacity={0.5} />
            <XAxis dataKey="temporada" stroke="#78716c" strokeWidth={1} tick={{ fill: '#57534e', fontSize: 12 }} />
            <YAxis tickFormatter={(value) => value.toLocaleString('es-ES')} stroke="#78716c" strokeWidth={1} tick={{ fill: '#57534e', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #d6d3d1',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number) => value.toLocaleString('es-ES')}
            />
            <Bar
              dataKey="total"
              fill={getColorByIndex(0)}
              radius={[4, 4, 0, 0]}
              name="Cantidad Entrada Almacén"
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Detail cards for each temporada */}
      {Object.entries(data.byTemporada).map(([temporada, info], index) => (
        <Card key={temporada} className="p-6">
          <h4 className="text-md font-medium mb-2">Entrada Almacén - {temporada}</h4>
          <p className="text-2xl font-bold text-primary mb-4">
            Total Entrada Almacén: {info.total.toLocaleString('es-ES')}
          </p>
          
          {info.byFamily && info.byFamily.length > 0 && (
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={info.byFamily.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis
                    dataKey="familia"
                    angle={-45}
                    textAnchor="end"
                    height={80}
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
                  <Bar
                    dataKey="cantidadPedida"
                    fill={getColorByIndex(index + 1)}
                    opacity={0.8}
                    name="Cantidad Pedida"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
