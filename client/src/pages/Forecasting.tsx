import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  Calendar,
  Package,
  DollarSign,
  Brain,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Store,
  Layers,
  Filter,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Chatbot from "@/components/Chatbot";
import { useData } from "@/contexts/DataContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

export default function Forecasting() {
  const [selectedModel, setSelectedModel] = useState("catboost");
  const [horizon, setHorizon] = useState("3");
  const [selectedTemporadas, setSelectedTemporadas] = useState<string[]>([]);
  const [selectedFamilias, setSelectedFamilias] = useState<string[]>([]);
  const [selectedTiendas, setSelectedTiendas] = useState<string[]>([]);
  const { fileId } = useData();
  const { toast } = useToast();

  const { data: filters } = useQuery<{
    temporadas: string[];
    familias: string[];
    tiendas: string[];
  }>({
    queryKey: ["/api/filters", fileId],
    enabled: !!fileId,
  });

  const { data: forecastJobs, isLoading: jobsLoading } = useQuery<any[]>({
    queryKey: ["/api/forecast/jobs", fileId],
    enabled: !!fileId,
  });

  const latestJob = Array.isArray(forecastJobs) && forecastJobs.length > 0 ? forecastJobs[0] : null;

  const runForecastMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/forecast/run`, {
        method: "POST",
        body: JSON.stringify({
          fileId,
          model: selectedModel,
          horizon: parseInt(horizon),
          filters: {
            temporadas: selectedTemporadas.length > 0 ? selectedTemporadas : undefined,
            familias: selectedFamilias.length > 0 ? selectedFamilias : undefined,
            tiendas: selectedTiendas.length > 0 ? selectedTiendas : undefined,
          },
        }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to run forecast");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forecast/jobs", fileId] });
      toast({
        title: "Predicción iniciada",
        description: "El modelo está procesando los datos. Los resultados aparecerán en breve.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al ejecutar predicción",
        description: error.message || "No se pudo iniciar la predicción",
        variant: "destructive",
      });
    },
  });

  const handleRunForecast = () => {
    runForecastMutation.mutate();
  };

  const predictions = latestJob?.results?.predictions || [];
  const summary = latestJob?.results?.summary;

  const demandByProduct = predictions
    .reduce((acc: any[], pred: any) => {
      const existing = acc.find((p: any) => p.producto === pred.producto);
      if (existing) {
        existing.demanda += pred.demandaPredicha;
      } else {
        acc.push({
          producto: pred.producto,
          demanda: pred.demandaPredicha,
          precioOptimo: pred.precioOptimo || 0,
        });
      }
      return acc;
    }, [])
    .sort((a: any, b: any) => b.demanda - a.demanda)
    .slice(0, 10);

  const demandByStore = predictions
    .reduce((acc: any[], pred: any) => {
      if (!pred.tienda) return acc;
      const existing = acc.find((p: any) => p.tienda === pred.tienda);
      if (existing) {
        existing.demanda += pred.demandaPredicha;
      } else {
        acc.push({
          tienda: pred.tienda,
          demanda: pred.demandaPredicha,
        });
      }
      return acc;
    }, [])
    .sort((a: any, b: any) => b.demanda - a.demanda);

  const demandByFamily = predictions
    .reduce((acc: any[], pred: any) => {
      if (!pred.familia) return acc;
      const existing = acc.find((p: any) => p.familia === pred.familia);
      if (existing) {
        existing.demanda += pred.demandaPredicha;
      } else {
        acc.push({
          familia: pred.familia,
          demanda: pred.demandaPredicha,
        });
      }
      return acc;
    }, [])
    .sort((a: any, b: any) => b.demanda - a.demanda);

  const demandBySeason = predictions
    .reduce((acc: any[], pred: any) => {
      if (!pred.temporada) return acc;
      const existing = acc.find((p: any) => p.temporada === pred.temporada);
      if (existing) {
        existing.demanda += pred.demandaPredicha;
      } else {
        acc.push({
          temporada: pred.temporada,
          demanda: pred.demandaPredicha,
        });
      }
      return acc;
    }, [])
    .sort((a: any, b: any) => b.demanda - a.demanda);

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
                  <Button onClick={() => (window.location.href = "/upload")} data-testid="button-upload-data">
                    Cargar Datos
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Demanda Total Predicha</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-demand">
                      {summary?.avgDemand
                        ? `${(summary.avgDemand * (summary.totalPredictions || 0)).toFixed(0)} unidades`
                        : "Ejecuta predicción"}
                    </div>
                    <p className="text-xs text-muted-foreground">Próximos {horizon} meses</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Precio Promedio Óptimo</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-avg-price">
                      {summary?.avgPrice ? `$${summary.avgPrice.toFixed(2)}` : "N/A"}
                    </div>
                    <p className="text-xs text-muted-foreground">Maximizar ventas y márgenes</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Precisión del Modelo</CardTitle>
                    <Brain className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-model-accuracy">
                      {summary?.modelAccuracy ? `${(summary.modelAccuracy * 100).toFixed(1)}%` : "N/A"}
                    </div>
                    <p className="text-xs text-muted-foreground">Confianza en predicciones</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Productos Analizados</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-predictions">
                      {summary?.totalPredictions || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Con predicciones generadas</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Configuración del Modelo de Predicción
                  </CardTitle>
                  <CardDescription>
                    Configura el modelo de machine learning y los filtros para las predicciones
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="model-select">Modelo de Machine Learning</Label>
                      <Select value={selectedModel} onValueChange={setSelectedModel}>
                        <SelectTrigger id="model-select" data-testid="select-model">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="catboost">
                            CatBoost - Mejor para datos categóricos
                          </SelectItem>
                          <SelectItem value="xgboost">
                            XGBoost - Rendimiento balanceado
                          </SelectItem>
                          <SelectItem value="prophet">
                            Prophet - Series temporales
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="horizon-select">Horizonte de Predicción</Label>
                      <Select value={horizon} onValueChange={setHorizon}>
                        <SelectTrigger id="horizon-select" data-testid="select-horizon">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 mes</SelectItem>
                          <SelectItem value="3">3 meses</SelectItem>
                          <SelectItem value="6">6 meses</SelectItem>
                          <SelectItem value="12">12 meses</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <Label>Filtros Opcionales (dejar vacío para predecir todo)</Label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {filters?.temporadas && filters.temporadas.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Temporadas</Label>
                          <div className="flex flex-wrap gap-2">
                            {filters.temporadas.slice(0, 5).map((temp) => (
                              <Badge
                                key={temp}
                                variant={selectedTemporadas.includes(temp) ? "default" : "outline"}
                                className="cursor-pointer hover-elevate"
                                onClick={() => {
                                  setSelectedTemporadas((prev) =>
                                    prev.includes(temp)
                                      ? prev.filter((t) => t !== temp)
                                      : [...prev, temp]
                                  );
                                }}
                                data-testid={`badge-temporada-${temp}`}
                              >
                                {temp}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {filters?.familias && filters.familias.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Familias</Label>
                          <div className="flex flex-wrap gap-2">
                            {filters.familias.slice(0, 5).map((fam) => (
                              <Badge
                                key={fam}
                                variant={selectedFamilias.includes(fam) ? "default" : "outline"}
                                className="cursor-pointer hover-elevate"
                                onClick={() => {
                                  setSelectedFamilias((prev) =>
                                    prev.includes(fam) ? prev.filter((f) => f !== fam) : [...prev, fam]
                                  );
                                }}
                                data-testid={`badge-familia-${fam}`}
                              >
                                {fam}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {filters?.tiendas && filters.tiendas.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Tiendas</Label>
                          <div className="flex flex-wrap gap-2">
                            {filters.tiendas.slice(0, 5).map((tienda) => (
                              <Badge
                                key={tienda}
                                variant={selectedTiendas.includes(tienda) ? "default" : "outline"}
                                className="cursor-pointer hover-elevate"
                                onClick={() => {
                                  setSelectedTiendas((prev) =>
                                    prev.includes(tienda)
                                      ? prev.filter((t) => t !== tienda)
                                      : [...prev, tienda]
                                  );
                                }}
                                data-testid={`badge-tienda-${tienda}`}
                              >
                                {tienda}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      {latestJob && (
                        <div className="flex items-center gap-2">
                          {latestJob.status === "completed" && (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span>Última predicción completada</span>
                            </>
                          )}
                          {latestJob.status === "running" && (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Procesando predicción...</span>
                            </>
                          )}
                          {latestJob.status === "failed" && (
                            <>
                              <AlertCircle className="h-4 w-4 text-destructive" />
                              <span>Error en última predicción</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={handleRunForecast}
                      disabled={runForecastMutation.isPending || latestJob?.status === "running"}
                      data-testid="button-run-forecast"
                    >
                      {runForecastMutation.isPending || latestJob?.status === "running" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Ejecutar Predicción
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Variables Utilizadas por el Modelo</CardTitle>
                  <CardDescription>
                    El modelo analiza estos factores históricos para predecir la demanda futura
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Datos Históricos de Ventas
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-2 ml-6">
                        <li>• Ventas por producto, tienda y periodo</li>
                        <li>• Precios y descuentos aplicados</li>
                        <li>• Rotación de inventario</li>
                        <li>• Transferencias entre tiendas</li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Variables de Contexto
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-2 ml-6">
                        <li>• Temporada y estacionalidad</li>
                        <li>• Familia y categoría de producto</li>
                        <li>• Ubicación de tienda (zona/región)</li>
                        <li>• Tendencias históricas de crecimiento</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {predictions.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Resultados de Predicción</CardTitle>
                    <CardDescription>
                      Análisis de demanda futura y precios óptimos basados en {selectedModel.toUpperCase()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="products" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="products" data-testid="tab-products">
                          Por Producto
                        </TabsTrigger>
                        <TabsTrigger value="stores" data-testid="tab-stores">
                          Por Tienda
                        </TabsTrigger>
                        <TabsTrigger value="families" data-testid="tab-families">
                          Por Familia
                        </TabsTrigger>
                        <TabsTrigger value="seasons" data-testid="tab-seasons">
                          Por Temporada
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="products" className="space-y-4">
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium">Top 10 Productos con Mayor Demanda Predicha</h3>
                          <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={demandByProduct}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="producto"
                                angle={-45}
                                textAnchor="end"
                                height={100}
                                tick={{ fontSize: 10 }}
                              />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="demanda" fill="#8884d8" name="Demanda Predicha" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </TabsContent>

                      <TabsContent value="stores" className="space-y-4">
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium">Demanda Predicha por Tienda</h3>
                          <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={demandByStore}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="tienda" angle={-45} textAnchor="end" height={100} />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="demanda" fill="#00C49F" name="Demanda Predicha" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </TabsContent>

                      <TabsContent value="families" className="space-y-4">
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium">Distribución de Demanda por Familia</h3>
                          <ResponsiveContainer width="100%" height={400}>
                            <PieChart>
                              <Pie
                                data={demandByFamily}
                                dataKey="demanda"
                                nameKey="familia"
                                cx="50%"
                                cy="50%"
                                outerRadius={120}
                                fill="#8884d8"
                                label
                              >
                                {demandByFamily.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </TabsContent>

                      <TabsContent value="seasons" className="space-y-4">
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium">Demanda Predicha por Temporada</h3>
                          <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={demandBySeason}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="temporada" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="demanda" fill="#FFBB28" name="Demanda Predicha" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ) : (
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
              )}
            </>
          )}
        </div>
      </div>

      <Chatbot section="forecasting" />
    </div>
  );
}
