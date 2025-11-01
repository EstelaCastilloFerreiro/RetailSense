import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardData from "./DashboardData";

export default function DashboardTabs() {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0">
        <TabsTrigger
          value="overview"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          data-testid="tab-overview"
        >
          Resumen General
        </TabsTrigger>
        <TabsTrigger
          value="stores"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          data-testid="tab-stores"
        >
          Geográfico y Tiendas
        </TabsTrigger>
        <TabsTrigger
          value="products"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          data-testid="tab-products"
        >
          Productos y Campañas
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        <DashboardData />
      </TabsContent>

      <TabsContent value="stores" className="mt-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SalesRegionChart />
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Store Performance</h3>
            <div className="space-y-3">
              {[
                { name: "Madrid Central", sales: 142500, inventory: 92, status: "optimal" },
                { name: "Barcelona Norte", sales: 114000, inventory: 78, status: "understock" },
                { name: "Valencia Sur", sales: 89600, inventory: 85, status: "optimal" },
                { name: "Sevilla Este", sales: 61100, inventory: 95, status: "overstock" },
              ].map((store, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                  data-testid={`store-${index}`}
                >
                  <div>
                    <p className="font-medium">{store.name}</p>
                    <p className="text-sm text-muted-foreground">€{store.sales.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono">{store.inventory}% fill</p>
                    <Badge
                      variant="outline"
                      className={
                        store.status === "optimal"
                          ? "bg-green-500/10 text-green-600 dark:text-green-500 border-green-500/20"
                          : store.status === "understock"
                          ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20"
                          : "bg-red-500/10 text-red-600 dark:text-red-500 border-red-500/20"
                      }
                    >
                      {store.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="products" className="mt-6 space-y-6">
        <TopProductsList />
        <CampaignComparison />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PriceOptimizationChart />
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Returns Analysis</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm">Return Rate</span>
                <span className="font-bold font-mono">8.2%</span>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm">Top Return Reason</span>
                <Badge>Size Issues</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm">Cost of Returns</span>
                <span className="font-bold font-mono text-red-600 dark:text-red-500">€12,450</span>
              </div>
            </div>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="inventory" className="mt-6 space-y-6">
        <InventoryTable />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DemandChart />
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Recommended Actions</h3>
            <div className="space-y-3">
              {[
                { action: "Order Classic White T-Shirt", quantity: 200, priority: "high", reason: "High demand forecast" },
                { action: "Order Running Sneakers Pro", quantity: 120, priority: "high", reason: "Stock below threshold" },
                { action: "Reduce Winter Jacket Premium", quantity: -75, priority: "medium", reason: "Overstock detected" },
                { action: "Order Crossbody Bag", quantity: 50, priority: "medium", reason: "Projected shortage" },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 border rounded-lg hover-elevate"
                  data-testid={`action-${index}`}
                >
                  <Badge variant={item.priority === "high" ? "default" : "secondary"}>
                    {item.priority}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium">{item.action}</p>
                    <p className="text-sm text-muted-foreground">{item.reason}</p>
                  </div>
                  <span className={`font-mono font-bold ${
                    item.quantity > 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
                  }`}>
                    {item.quantity > 0 ? "+" : ""}{item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
