import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import DashboardData from "./DashboardData";
import GeographicSection from "./GeographicSection";

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
          value="geographic"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          data-testid="tab-geographic"
        >
          Geográfico y Tiendas
        </TabsTrigger>
        <TabsTrigger
          value="products"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          data-testid="tab-products"
        >
          Producto y Rentabilidad
        </TabsTrigger>
        <TabsTrigger
          value="photos"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          data-testid="tab-photos"
        >
          Análisis con Fotos
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        <DashboardData />
      </TabsContent>

      <TabsContent value="geographic" className="mt-6">
        <GeographicSection />
      </TabsContent>

      <TabsContent value="products" className="mt-6">
        <Card className="p-6">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Sección Producto, Campaña, Devoluciones y Rentabilidad - En desarrollo</p>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="photos" className="mt-6">
        <Card className="p-6">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Sección Análisis con Fotos - En desarrollo</p>
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
