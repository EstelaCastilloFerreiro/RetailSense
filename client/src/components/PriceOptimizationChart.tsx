import { Card } from "@/components/ui/card";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CHART_COLORS } from "@/lib/colors";

export default function PriceOptimizationChart() {
  const data = [
    { product: "T-Shirt A", current: 29.99, optimal: 32.99, change: 10 },
    { product: "Jeans B", current: 79.99, optimal: 74.99, change: -6.3 },
    { product: "Sneakers C", current: 89.99, optimal: 94.99, change: 5.6 },
    { product: "Jacket D", current: 149.99, optimal: 139.99, change: -6.7 },
    { product: "Bag E", current: 59.99, optimal: 64.99, change: 8.3 },
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Price Optimization</h3>
        <Button variant="ghost" size="icon" data-testid="button-info-price">
          <Info className="h-4 w-4" />
        </Button>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="product"
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            label={{ value: "Price (€)", angle: -90, position: "insideLeft" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
            }}
            formatter={(value: number) => `€${value.toFixed(2)}`}
          />
          <Legend />
          <Bar dataKey="current" fill={CHART_COLORS.secondary} name="Current Price" />
          <Bar dataKey="optimal" name="Optimal Price">
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.change > 0
                    ? CHART_COLORS.success
                    : CHART_COLORS.danger
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
