import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { KLOBLogo } from "@/components/KLOBLogo";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Campos requeridos",
        description: "Por favor, introduce usuario y contraseña",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    setTimeout(() => {
      localStorage.setItem("klob_authenticated", "true");
      localStorage.setItem("klob_user", username);
      setLocation("/app/upload");
      toast({
        title: "Acceso concedido",
        description: `Bienvenido/a ${username}`,
      });
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <header className="p-6 flex items-center justify-between border-b bg-background/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <KLOBLogo className="h-12 w-auto" />
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 space-y-6 shadow-xl border-2">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Retail Analytics</h1>
            <p className="text-muted-foreground">
              Plataforma de análisis y predicción para retail
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Usuario
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Ingresa tu usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                data-testid="input-username"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                data-testid="input-password"
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? "Iniciando sesión..." : "Entrar"}
            </Button>
          </form>

          <div className="text-center text-xs text-muted-foreground pt-4 border-t">
            <p>Acceso seguro a tus datos de retail</p>
          </div>
        </Card>
      </div>

      <footer className="p-4 text-center text-sm text-muted-foreground border-t bg-background/50 backdrop-blur-sm">
        <p>© 2025 KLOB Analytics. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
