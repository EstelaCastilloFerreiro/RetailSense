import { BarChart3, TrendingUp, MessageSquare, Upload, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const menuItems = [
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
    description: "Visualizaciones y KPIs",
  },
  {
    title: "Forecasting",
    url: "/forecasting",
    icon: TrendingUp,
    description: "Predicción de demanda",
  },
  {
    title: "Sentiment Analysis",
    url: "/sentiment",
    icon: MessageSquare,
    description: "Análisis de sentimiento",
  },
];

const utilityItems = [
  {
    title: "Cargar Datos",
    url: "/upload",
    icon: Upload,
  },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("klob_authenticated");
    setLocation("/");
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-3">
          <img 
            src="/klob-logo.svg" 
            alt="KLOB Logo" 
            className="h-8 w-auto"
          />
          <div>
            <h2 className="font-semibold text-sm">KLOB Analytics</h2>
            <p className="text-xs text-muted-foreground">Retail Intelligence</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Módulos Principales</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => setLocation(item.url)}
                    isActive={location === item.url}
                    data-testid={`nav-${item.url.slice(1)}`}
                  >
                    <item.icon className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{item.title}</span>
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Utilidades</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {utilityItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => setLocation(item.url)}
                    isActive={location === item.url}
                    data-testid={`nav-${item.url.slice(1)}`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start"
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar Sesión
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
