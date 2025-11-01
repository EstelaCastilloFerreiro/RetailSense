import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface InventoryItem {
  product: string;
  sku: string;
  currentStock: number;
  projectedDemand: number;
  variance: number;
  status: "overstock" | "optimal" | "understock";
  recommendedOrder: number;
}

export default function InventoryTable() {
  const [sortKey, setSortKey] = useState<keyof InventoryItem | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const data: InventoryItem[] = [
    { product: "Classic White T-Shirt", sku: "APP-001", currentStock: 450, projectedDemand: 620, variance: -27, status: "understock", recommendedOrder: 200 },
    { product: "Slim Fit Jeans", sku: "APP-002", currentStock: 320, projectedDemand: 280, variance: 14, status: "optimal", recommendedOrder: 0 },
    { product: "Running Sneakers Pro", sku: "FOOT-003", currentStock: 180, projectedDemand: 270, variance: -33, status: "understock", recommendedOrder: 120 },
    { product: "Leather Messenger Bag", sku: "ACC-004", currentStock: 95, projectedDemand: 85, variance: 12, status: "optimal", recommendedOrder: 0 },
    { product: "Winter Jacket Premium", sku: "APP-005", currentStock: 240, projectedDemand: 165, variance: 45, status: "overstock", recommendedOrder: 0 },
    { product: "Canvas Sneakers", sku: "FOOT-006", currentStock: 155, projectedDemand: 158, variance: -2, status: "optimal", recommendedOrder: 0 },
    { product: "Denim Jacket", sku: "APP-007", currentStock: 190, projectedDemand: 145, variance: 31, status: "overstock", recommendedOrder: 0 },
    { product: "Crossbody Bag", sku: "ACC-008", currentStock: 88, projectedDemand: 124, variance: -29, status: "understock", recommendedOrder: 50 },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "overstock":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-500 border-red-500/20">Overstock</Badge>;
      case "understock":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20">Understock</Badge>;
      default:
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-500 border-green-500/20">Optimal</Badge>;
    }
  };

  const handleSort = (key: keyof InventoryItem) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
    console.log(`Sorting by ${key} in ${sortOrder === "asc" ? "desc" : "asc"} order`);
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">Inventory vs Projected Demand</h3>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Product</TableHead>
              <TableHead className="font-semibold">SKU</TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("currentStock")}
                  className="h-8 font-semibold"
                  data-testid="button-sort-stock"
                >
                  Current Stock
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("projectedDemand")}
                  className="h-8 font-semibold"
                  data-testid="button-sort-demand"
                >
                  Projected Demand
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("variance")}
                  className="h-8 font-semibold"
                  data-testid="button-sort-variance"
                >
                  Variance
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Recommended Order</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => (
              <TableRow key={item.sku} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                <TableCell className="font-medium">{item.product}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">{item.sku}</TableCell>
                <TableCell className="text-right font-mono">{item.currentStock.toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono">{item.projectedDemand.toLocaleString()}</TableCell>
                <TableCell className={`text-right font-mono font-medium ${
                  item.variance > 0 ? "text-red-600 dark:text-red-500" : "text-yellow-600 dark:text-yellow-500"
                }`}>
                  {item.variance > 0 ? "+" : ""}{item.variance}%
                </TableCell>
                <TableCell>{getStatusBadge(item.status)}</TableCell>
                <TableCell className="text-right font-mono font-medium">
                  {item.recommendedOrder > 0 ? item.recommendedOrder.toLocaleString() : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
