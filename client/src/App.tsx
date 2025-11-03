import { Switch, Route, useLocation, Redirect } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DataProvider } from "@/contexts/DataContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Login from "@/pages/Login";
import Upload from "@/pages/Upload";
import Analytics from "@/pages/Analytics";
import Forecasting from "@/pages/Forecasting";
import SentimentAnalysis from "@/pages/SentimentAnalysis";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const [, setLocation] = useLocation();
  const isAuthenticated = localStorage.getItem("klob_authenticated") === "true";

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) {
    return null;
  }

  return <Component />;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-6 border-b h-[6rem]">
            <div className="flex items-center gap-6">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="flex items-center gap-4">
                <img 
                  src="/klob-logo.svg" 
                  alt="KLOB Logo" 
                  className="h-12 w-auto"
                />
                <div>
                  <p className="text-base font-medium text-foreground leading-none">Retail Intelligence</p>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/analytics">
        {() => (
          <ProtectedRoute
            component={() => (
              <AppLayout>
                <Analytics />
              </AppLayout>
            )}
          />
        )}
      </Route>
      <Route path="/forecasting">
        {() => (
          <ProtectedRoute
            component={() => (
              <AppLayout>
                <Forecasting />
              </AppLayout>
            )}
          />
        )}
      </Route>
      <Route path="/sentiment">
        {() => (
          <ProtectedRoute
            component={() => (
              <AppLayout>
                <SentimentAnalysis />
              </AppLayout>
            )}
          />
        )}
      </Route>
      <Route path="/upload">
        {() => (
          <ProtectedRoute
            component={() => (
              <AppLayout>
                <Upload />
              </AppLayout>
            )}
          />
        )}
      </Route>
      <Route path="/dashboard">
        {() => <Redirect to="/analytics" />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DataProvider>
          <Toaster />
          <Router />
        </DataProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
