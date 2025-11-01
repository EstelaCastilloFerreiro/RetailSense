import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

interface Product {
  rank: number;
  name: string;
  category: string;
  units: number;
  revenue: number;
  margin: number;
}

export default function TopProductsList() {
  const products: Product[] = [
    { rank: 1, name: "Classic White T-Shirt", category: "Apparel", units: 1245, revenue: 37350, margin: 45.2 },
    { rank: 2, name: "Slim Fit Jeans", category: "Apparel", units: 892, revenue: 71360, margin: 42.8 },
    { rank: 3, name: "Running Sneakers Pro", category: "Footwear", units: 678, revenue: 60930, margin: 38.5 },
    { rank: 4, name: "Leather Messenger Bag", category: "Accessories", units: 543, revenue: 32580, margin: 52.1 },
    { rank: 5, name: "Winter Jacket Premium", category: "Apparel", units: 421, revenue: 63150, margin: 41.3 },
    { rank: 6, name: "Canvas Sneakers", category: "Footwear", units: 398, revenue: 23880, margin: 44.7 },
    { rank: 7, name: "Denim Jacket", category: "Apparel", units: 367, revenue: 36700, margin: 39.2 },
    { rank: 8, name: "Crossbody Bag", category: "Accessories", units: 312, revenue: 18720, margin: 48.9 },
    { rank: 9, name: "Sports Watch", category: "Accessories", units: 289, revenue: 28900, margin: 55.3 },
    { rank: 10, name: "Polo Shirt", category: "Apparel", units: 267, revenue: 13350, margin: 46.1 },
  ];

  const getRankBadgeVariant = (rank: number) => {
    if (rank === 1) return "default";
    if (rank <= 3) return "secondary";
    return "outline";
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-medium">Top 10 Products</h3>
      </div>
      <div className="space-y-3">
        {products.map((product) => (
          <div
            key={product.rank}
            className="flex items-center gap-4 p-3 rounded-lg hover-elevate border"
            data-testid={`product-${product.rank}`}
          >
            <Badge
              variant={getRankBadgeVariant(product.rank)}
              className="w-8 h-8 flex items-center justify-center rounded-full font-bold"
            >
              {product.rank}
            </Badge>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{product.name}</p>
              <p className="text-sm text-muted-foreground">{product.category}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-medium">
                {product.units.toLocaleString()} units
              </p>
              <p className="text-xs text-muted-foreground">
                €{product.revenue.toLocaleString()}
              </p>
            </div>
            <div className="text-right min-w-[60px]">
              <p
                className={`text-sm font-medium ${
                  product.margin > 45
                    ? "text-green-600 dark:text-green-500"
                    : "text-muted-foreground"
                }`}
              >
                {product.margin}%
              </p>
              <p className="text-xs text-muted-foreground">margin</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
