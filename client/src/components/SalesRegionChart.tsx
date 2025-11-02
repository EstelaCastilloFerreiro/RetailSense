import { Card } from "@/components/ui/card";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { CHART_COLORS, getColorByIndex } from "@/lib/colors";

export default function SalesRegionChart() {
  const data = [
    { name: "Madrid", value: 35, sales: 142500 },
    { name: "Barcelona", value: 28, sales: 114000 },
    { name: "Valencia", value: 22, sales: 89600 },
    { name: "Sevilla", value: 15, sales: 61100 },
  ];

  const COLORS = data.map((_, index) => getColorByIndex(index));

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Sales by Region</h3>
        <Button variant="ghost" size="icon" data-testid="button-info-region">
          <Info className="h-4 w-4" />
        </Button>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}%`}
            outerRadius={100}
            fill={CHART_COLORS.primary}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
            }}
            formatter={(value: number, name: string, props: any) => [
              `€${props.payload.sales.toLocaleString()}`,
              `${value}%`,
            ]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
