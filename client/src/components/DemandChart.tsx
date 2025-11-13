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
import { CHART_COLORS } from "@/lib/colors";

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
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" strokeOpacity={0.5} />
          <XAxis
            dataKey="month"
            stroke="#78716c"
            strokeWidth={1}
            tick={{ fill: '#57534e', fontSize: 12 }}
          />
          <YAxis
            stroke="#78716c"
            strokeWidth={1}
            tick={{ fill: '#57534e', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #d6d3d1',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', color: '#57534e' }} />
          <Area
            type="monotone"
            dataKey="upper"
            stackId="1"
            stroke="none"
            fill={CHART_COLORS.primary}
            fillOpacity={0.1}
            name="Upper Bound"
          />
          <Area
            type="monotone"
            dataKey="lower"
            stackId="1"
            stroke="none"
            fill={CHART_COLORS.secondary}
            fillOpacity={1}
            name="Lower Bound"
          />
          <Line
            type="monotone"
            dataKey="historical"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            dot={{ fill: CHART_COLORS.primary }}
            name="Historical"
          />
          <Line
            type="monotone"
            dataKey="projected"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: CHART_COLORS.primary }}
            name="Projected"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}
