import { Card } from "@/components/ui/card";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";

export default function DemandChart() {
  const data = [
    { month: "Jan", historical: 4200, projected: 4200, lower: 4000, upper: 4400 },
    { month: "Feb", historical: 3800, projected: 3800, lower: 3600, upper: 4000 },
    { month: "Mar", historical: 4500, projected: 4500, lower: 4300, upper: 4700 },
    { month: "Apr", historical: 5200, projected: 5200, lower: 5000, upper: 5400 },
    { month: "May", historical: 5800, projected: 5800, lower: 5600, upper: 6000 },
    { month: "Jun", projected: 6200, lower: 5800, upper: 6600 },
    { month: "Jul", projected: 6500, lower: 6100, upper: 6900 },
    { month: "Aug", projected: 5900, lower: 5500, upper: 6300 },
    { month: "Sep", projected: 5400, lower: 5000, upper: 5800 },
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Demand Forecast</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" data-testid="button-info-demand">
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="month"
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
            }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="upper"
            stackId="1"
            stroke="none"
            fill="hsl(var(--primary))"
            fillOpacity={0.1}
            name="Upper Bound"
          />
          <Area
            type="monotone"
            dataKey="lower"
            stackId="1"
            stroke="none"
            fill="hsl(var(--background))"
            fillOpacity={1}
            name="Lower Bound"
          />
          <Line
            type="monotone"
            dataKey="historical"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: "hsl(var(--primary))" }}
            name="Historical"
          />
          <Line
            type="monotone"
            dataKey="projected"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: "hsl(var(--primary))" }}
            name="Projected"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}
