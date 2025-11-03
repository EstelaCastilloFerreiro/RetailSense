import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, TrendingUp, Star, AlertCircle } from "lucide-react";
import Chatbot from "@/components/Chatbot";

export default function SentimentAnalysis() {
  return (
    <div className="flex h-full bg-background">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Sentiment Analysis</h1>
            <p className="text-muted-foreground">
              Análisis de opiniones y sentimiento de clientes
            </p>
          </div>

          <Card className="border-dashed">
            <CardContent className="py-12">
              <div className="text-center space-y-6 max-w-2xl mx-auto">
                <div className="flex justify-center">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-10 w-10 text-primary" />
                  </div>
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold mb-2">Próximamente</h2>
                  <p className="text-muted-foreground">
                    El módulo de Análisis de Sentimiento está en desarrollo y estará disponible próximamente
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
                  <div className="space-y-2">
                    <Star className="h-8 w-8 mx-auto text-primary/60" />
                    <h3 className="font-semibold text-sm">Reviews de Productos</h3>
                    <p className="text-xs text-muted-foreground">
                      Análisis de opiniones de clientes sobre productos
                    </p>
                  </div>

                  <div className="space-y-2">
                    <TrendingUp className="h-8 w-8 mx-auto text-primary/60" />
                    <h3 className="font-semibold text-sm">Tendencias de Mercado</h3>
                    <p className="text-xs text-muted-foreground">
                      Detección de tendencias en redes sociales y comentarios
                    </p>
                  </div>

                  <div className="space-y-2">
                    <AlertCircle className="h-8 w-8 mx-auto text-primary/60" />
                    <h3 className="font-semibold text-sm">Alertas Tempranas</h3>
                    <p className="text-xs text-muted-foreground">
                      Identificación de problemas antes de que escalen
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Funcionalidades Planeadas</CardTitle>
              <CardDescription>
                Características que estarán disponibles en este módulo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <div>
                    <h4 className="font-medium text-sm">Análisis de Reseñas</h4>
                    <p className="text-sm text-muted-foreground">
                      Procesamiento de reseñas de productos y comentarios de clientes para extraer sentimientos positivos, negativos y neutros
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <div>
                    <h4 className="font-medium text-sm">Detección de Temas</h4>
                    <p className="text-sm text-muted-foreground">
                      Identificación automática de temas recurrentes en comentarios (calidad, precio, servicio, etc.)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <div>
                    <h4 className="font-medium text-sm">Monitoreo de Redes Sociales</h4>
                    <p className="text-sm text-muted-foreground">
                      Seguimiento de menciones de marca y productos en redes sociales
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <div>
                    <h4 className="font-medium text-sm">Dashboard de Sentimiento</h4>
                    <p className="text-sm text-muted-foreground">
                      Visualizaciones de tendencias de sentimiento a lo largo del tiempo y por categoría de producto
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Chatbot section="sentiment" />
    </div>
  );
}
