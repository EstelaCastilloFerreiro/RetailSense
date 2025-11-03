import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Calendar, Package, DollarSign, Brain } from "lucide-react";
import Chatbot from "@/components/Chatbot";
import { useData } from "@/contexts/DataContext";

export default function Forecasting() {
  const [selectedModel, setSelectedModel] = useState("catboost");
  const { fileId } = useData();

  return (
    <div className="flex h-full bg-background">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Forecasting</h1>
            <p className="text-muted-foreground">
              Predicción de demanda y optimización de precios con Machine Learning
            </p>
          </div>

          {!fileId ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center space-y-4">
                  <Package className="h-16 w-16 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold">No hay datos cargados</h3>
                    <p className="text-sm text-muted-foreground">
                      Por favor, carga un archivo de ventas para comenzar con las predicciones
                    </p>
                  </div>
                  <Button onClick={() => window.location.href = "/upload"} data-testid="button-upload-data">
                    Cargar Datos
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Demanda Futura</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">Próximos meses</div>
                    <p className="text-xs text-muted-foreground">
                      Predicción por producto y tienda
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Optimización</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">Precios óptimos</div>
                    <p className="text-xs text-muted-foreground">
                      Maximizar ventas y márgenes
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Inventario</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">Balance óptimo</div>
                    <p className="text-xs text-muted-foreground">
                      Evitar sobre/sub stock
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Configuración del Modelo
                  </CardTitle>
                  <CardDescription>
                    Selecciona el modelo de machine learning para las predicciones
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Modelo de Predicción</label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger data-testid="select-model">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="catboost">CatBoost</SelectItem>
                        <SelectItem value="xgboost">XGBoost</SelectItem>
                        <SelectItem value="prophet">Prophet</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {selectedModel === "catboost" && "Mejor para datos categóricos y alta precisión"}
                      {selectedModel === "xgboost" && "Rendimiento balanceado y velocidad"}
                      {selectedModel === "prophet" && "Especializado en series temporales"}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1" data-testid="button-run-forecast">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Ejecutar Predicción
                    </Button>
                    <Button variant="outline" data-testid="button-advanced-settings">
                      Configuración Avanzada
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Variables de Predicción</CardTitle>
                  <CardDescription>
                    El modelo analiza estos factores históricos para predecir la demanda futura
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Datos Históricos</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Ventas por producto, tienda y periodo</li>
                        <li>• Precios y descuentos aplicados</li>
                        <li>• Rotación de inventario</li>
                        <li>• Transferencias entre tiendas</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Variables de Contexto</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Temporada y estacionalidad</li>
                        <li>• Familia y categoría de producto</li>
                        <li>• Ubicación de tienda (zona/región)</li>
                        <li>• Tendencias históricas</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resultados de Predicción</CardTitle>
                  <CardDescription>
                    Los resultados aparecerán aquí una vez que ejecutes el modelo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Ejecuta una predicción para ver los resultados</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <Chatbot />
    </div>
  );
}
