import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import FilterSidebar from "@/components/FilterSidebar";
import DashboardTabs from "@/components/DashboardTabs";
import ThemeToggle from "@/components/ThemeToggle";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-background">
      {sidebarOpen && (
        <aside className="hidden md:block">
          <FilterSidebar />
        </aside>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-background px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:flex"
              data-testid="button-toggle-sidebar"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-primary">KLOB</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Retail Analytics</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:block">Demo Client</span>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <DashboardTabs />
        </main>
      </div>
    </div>
  );
}
