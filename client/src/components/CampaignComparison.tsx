import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Campaign {
  name: string;
  period: string;
  revenue: number;
  units: number;
  avgDiscount: number;
  margin: number;
  roi: number;
}

export default function CampaignComparison() {
  const campaigns: Campaign[] = [
    {
      name: "Spring Sale 2024",
      period: "Mar 1 - Mar 31",
      revenue: 184500,
      units: 3420,
      avgDiscount: 25,
      margin: 38.2,
      roi: 145,
    },
    {
      name: "Summer Clearance",
      period: "Jun 15 - Jul 15",
      revenue: 156200,
      units: 4180,
      avgDiscount: 35,
      margin: 32.8,
      roi: 128,
    },
  ];

  const comparison = {
    revenue: ((campaigns[0].revenue - campaigns[1].revenue) / campaigns[1].revenue * 100).toFixed(1),
    units: ((campaigns[0].units - campaigns[1].units) / campaigns[1].units * 100).toFixed(1),
    margin: (campaigns[0].margin - campaigns[1].margin).toFixed(1),
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">Campaign Comparison</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {campaigns.map((campaign, index) => (
          <div
            key={index}
            className="border rounded-lg p-6 space-y-4"
            data-testid={`campaign-${index}`}
          >
            <div>
              <h4 className="font-semibold text-lg">{campaign.name}</h4>
              <p className="text-sm text-muted-foreground">{campaign.period}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Revenue</p>
                <p className="text-2xl font-bold font-mono">€{campaign.revenue.toLocaleString()}</p>
                {index === 0 && (
                  <div className={`flex items-center gap-1 text-sm mt-1 ${
                    parseFloat(comparison.revenue) > 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
                  }`}>
                    {parseFloat(comparison.revenue) > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span>{Math.abs(parseFloat(comparison.revenue))}%</span>
                  </div>
                )}
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Units Sold</p>
                <p className="text-2xl font-bold font-mono">{campaign.units.toLocaleString()}</p>
                {index === 0 && (
                  <div className={`flex items-center gap-1 text-sm mt-1 ${
                    parseFloat(comparison.units) > 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
                  }`}>
                    {parseFloat(comparison.units) > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span>{Math.abs(parseFloat(comparison.units))}%</span>
                  </div>
                )}
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Discount</p>
                <p className="text-lg font-bold font-mono">{campaign.avgDiscount}%</p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Margin</p>
                <p className="text-lg font-bold font-mono">{campaign.margin}%</p>
                {index === 0 && (
                  <div className={`flex items-center gap-1 text-sm mt-1 ${
                    parseFloat(comparison.margin) > 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
                  }`}>
                    {parseFloat(comparison.margin) > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span>{Math.abs(parseFloat(comparison.margin))}pp</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">ROI</span>
                <Badge variant={campaign.roi > 130 ? "default" : "secondary"}>
                  {campaign.roi}%
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
