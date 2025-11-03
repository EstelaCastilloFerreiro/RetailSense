import { useState } from "react";
import FilterSidebar from "@/components/FilterSidebar";
import DashboardTabs from "@/components/DashboardTabs";
import Chatbot from "@/components/Chatbot";

export default function Analytics() {
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(true);

  return (
    <div className="flex h-full bg-background">
      {filterSidebarOpen && (
        <aside className="hidden md:block">
          <FilterSidebar />
        </aside>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">
              Visualizaciones, KPIs y análisis de datos de retail
            </p>
          </div>
          <DashboardTabs />
        </main>
      </div>

      <Chatbot />
    </div>
  );
}
