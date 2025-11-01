import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExtendedOverview from "./ExtendedOverview";
import GeographicSection from "./GeographicSection";
import ProductProfitabilitySection from "./ProductProfitabilitySection";
import PhotoAnalysisSection from "./PhotoAnalysisSection";

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
        <ExtendedOverview />
      </TabsContent>

      <TabsContent value="geographic" className="mt-6">
        <GeographicSection />
      </TabsContent>

      <TabsContent value="products" className="mt-6">
        <ProductProfitabilitySection />
      </TabsContent>

      <TabsContent value="photos" className="mt-6">
        <PhotoAnalysisSection />
      </TabsContent>
    </Tabs>
  );
}
