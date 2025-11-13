import { Switch, Route, useLocation, Redirect } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DataProvider } from "@/contexts/DataContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LanguageProvider } from "@/i18n";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Upload from "@/pages/Upload";
import Analytics from "@/pages/Analytics";
import Forecasting from "@/pages/Forecasting";
import SentimentAnalysis from "@/pages/SentimentAnalysis";
import NotFound from "@/pages/not-found";
import { KLOBLogo } from "@/components/KLOBLogo";

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const [, setLocation] = useLocation();
  const isAuthenticated = localStorage.getItem("klob_authenticated") === "true";

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
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
      <div className="flex h-screen w-full bg-gradient-to-br from-stone-50/30 via-white to-purple-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-950">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-6 border-b h-[6rem] bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-6">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="flex items-center gap-4">
                <KLOBLogo className="h-12 w-auto" />
                <div>
                  <p className="text-base font-medium bg-gradient-to-r from-purple-600 to-stone-600 bg-clip-text text-transparent leading-none">
                    Retail Intelligence
                  </p>
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
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/app/analytics">
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
      <Route path="/app/forecasting">
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
      <Route path="/app/sentiment">
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
      <Route path="/app/upload">
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
      <Route path="/analytics">
        {() => <Redirect to="/app/analytics" />}
      </Route>
      <Route path="/dashboard">
        {() => <Redirect to="/app/analytics" />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <DataProvider>
            <Toaster />
            <Router />
          </DataProvider>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
