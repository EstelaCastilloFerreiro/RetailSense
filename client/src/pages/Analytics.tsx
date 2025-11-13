import FilterSidebar from "@/components/FilterSidebar";
import DashboardTabs from "@/components/DashboardTabs";
import Chatbot from "@/components/Chatbot";

export default function Analytics() {
  return (
    <div className="flex h-full bg-gradient-to-br from-stone-50/30 via-white to-purple-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-950">
      <aside className="hidden md:block">
        <FilterSidebar />
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-stone-600 bg-clip-text text-transparent tracking-tight">
              Analytics
            </h1>
            <p className="text-muted-foreground mt-2 font-light">
              Visualizaciones, KPIs y análisis de datos de retail
            </p>
          </div>
          <DashboardTabs />
        </main>
      </div>

      <Chatbot section="analytics" />
    </div>
  );
}
