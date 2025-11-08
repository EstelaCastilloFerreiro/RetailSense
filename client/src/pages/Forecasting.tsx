import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUp,
  Calendar,
  Package,
  DollarSign,
  Brain,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  FileText,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Chatbot from "@/components/Chatbot";
import { useData } from "@/contexts/DataContext";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PurchasePlanRow } from "@shared/schema";

export default function Forecasting() {
  const { fileId } = useData();
  const { toast } = useToast();
  const [autoRun, setAutoRun] = useState(false);
  const [selectedTemporada, setSelectedTemporada] = useState<'PV' | 'OI' | null>(null);

  const { data: forecastJobs, isLoading: jobsLoading } = useQuery<any[]>({
    queryKey: ["/api/forecast/jobs", fileId],
    enabled: !!fileId,
    refetchInterval: (data) => {
      // Poll every 2 seconds if there's a running job
      const jobs = Array.isArray(data) ? data : [];
      const hasRunning = jobs.some((job: any) => job?.status === "running");
      return hasRunning ? 2000 : false;
    },
  });

  // Query para obtener temporadas disponibles
  const { data: availableSeasons } = useQuery<{
    latestAvailable: {
      seasonCode: string;
      year: number;
      type: 'PV' | 'OI';
      label: string;
    };
    availableSeasons: Array<{
      value: 'PV' | 'OI';
      label: string;
      year: number;
      type: 'PV' | 'OI';
    }>;
  }>({
    queryKey: ['/api/forecast/available-seasons', fileId],
    enabled: !!fileId,
  });

  const latestJob = Array.isArray(forecastJobs) && forecastJobs.length > 0 ? forecastJobs[0] : null;
  const purchasePlan = latestJob?.results?.purchasePlan;
  
  // Determinar temporada seleccionada desde purchasePlan si existe
  useEffect(() => {
    if (purchasePlan?.temporadaObjetivo && !selectedTemporada) {
      const tipo = purchasePlan.temporadaObjetivo.includes('Primavera') ? 'PV' : 'OI';
      setSelectedTemporada(tipo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchasePlan?.temporadaObjetivo]);

  const runForecastMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/forecast/run`, {
        method: "POST",
        body: JSON.stringify({
          fileId,
          horizon: 6, // Siempre usar 6 meses para temporada completa
          temporadaTipo: selectedTemporada || undefined, // Enviar temporada seleccionada si existe
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
        description: "El sistema está analizando los datos y generando el plan de compras automáticamente.",
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

  // Auto-run forecast when fileId is available and no job exists
  useEffect(() => {
    if (fileId && !autoRun && (!latestJob || latestJob.status === "failed")) {
      // No auto-run - esperar a que el usuario seleccione temporada
      // El auto-run se deshabilita para que el usuario siempre elija la temporada
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId, latestJob?.status]);

  const handleRunForecast = () => {
    runForecastMutation.mutate();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number, decimals: number = 0) => {
    return new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  return (
    <div className="flex h-full bg-background">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-full">
              <div>
                <h1 className="text-3xl font-bold">Forecasting</h1>
                <p className="text-muted-foreground">
                  Predicción automática de demanda y recomendaciones de compra basadas en Machine Learning
                </p>
              </div>

          {fileId && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Mostrar últimos datos disponibles */}
                  {availableSeasons?.latestAvailable && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Últimos datos disponibles: <strong className="text-foreground">{availableSeasons.latestAvailable.label}</strong>
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-[250px]">
                      <label className="text-sm font-medium mb-2 block">Seleccionar Temporada a Predecir</label>
                      <Select 
                        value={selectedTemporada || ""} 
                        onValueChange={(value) => setSelectedTemporada(value as 'PV' | 'OI' | null)}
                        data-testid="select-season"
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecciona temporada..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSeasons?.availableSeasons.map((season) => (
                            <SelectItem key={season.value} value={season.value}>
                              {season.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        El sistema entrena el modelo solo con datos históricos de la misma temporada (PV con PV, OI con OI)
                      </p>
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={handleRunForecast}
                        disabled={runForecastMutation.isPending || latestJob?.status === "running" || !selectedTemporada}
                        data-testid="button-run-forecast"
                      >
                        {runForecastMutation.isPending || latestJob?.status === "running" ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Generar Predicción
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
              {/* Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Estado del Modelo</CardTitle>
                    <Brain className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {latestJob?.status === "completed" && (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          <span className="text-sm font-medium">Completado</span>
                        </>
                      )}
                      {latestJob?.status === "running" && (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                          <span className="text-sm font-medium">Procesando...</span>
                        </>
                      )}
                      {latestJob?.status === "failed" && (
                        <>
                          <AlertCircle className="h-5 w-5 text-destructive" />
                          <span className="text-sm font-medium">Error</span>
                        </>
                      )}
                      {!latestJob && (
                        <>
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm font-medium">Pendiente</span>
                        </>
                      )}
                    </div>
                    {purchasePlan && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Modelo: {purchasePlan.modeloUtilizado.toUpperCase()}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Precisión (100-MAPE)</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {purchasePlan?.precisionModelo
                        ? `${(purchasePlan.precisionModelo * 100).toFixed(1)}%`
                        : "N/A"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {purchasePlan?.precisionModelo
                        ? purchasePlan.precisionModelo >= 0.85
                          ? "Excelente - Alta confianza"
                          : purchasePlan.precisionModelo >= 0.75
                          ? "Buena - Confianza moderada"
                          : purchasePlan.precisionModelo >= 0.65
                          ? "Aceptable - Usar con precaución"
                          : "Baja - Revisar datos"
                        : "Calculando..."}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">MAE (Error Absoluto)</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(() => {
                        const maeVar = purchasePlan?.variablesUtilizadas?.find((v: string) => v.startsWith('MAE:'));
                        if (maeVar) {
                          const mae = parseFloat(maeVar.split(':')[1]);
                          return mae.toFixed(1);
                        }
                        return "N/A";
                      })()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Unidades de error promedio
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">RMSE (Error Cuadrático)</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(() => {
                        const rmseVar = purchasePlan?.variablesUtilizadas?.find((v: string) => v.startsWith('RMSE:'));
                        if (rmseVar) {
                          const rmse = parseFloat(rmseVar.split(':')[1]);
                          return rmse.toFixed(1);
                        }
                        return "N/A";
                      })()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Penaliza errores grandes
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Unidades Totales</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {purchasePlan?.totalPrendas?.uds
                        ? formatNumber(purchasePlan.totalPrendas.uds)
                        : "0"}
                    </div>
                    <p className="text-xs text-muted-foreground">Unidades recomendadas</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Inversión Total</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {purchasePlan?.totalPrendas?.coste
                        ? formatCurrency(purchasePlan.totalPrendas.coste)
                        : "€0"}
                    </div>
                    <p className="text-xs text-muted-foreground">Coste estimado</p>
                  </CardContent>
                </Card>
              </div>

              {/* Status Card - Show when there's a job */}
              {latestJob && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      {purchasePlan?.temporadaObjetivo ? (
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Temporada Objetivo</p>
                            <p className="text-xs text-muted-foreground">
                              {purchasePlan.temporadaObjetivo} - Modelo usa solo datos históricos de temporadas similares ({purchasePlan.temporadaObjetivo.includes('Primavera') ? 'P/V' : 'O/I'})
                            </p>
                          </div>
                        </div>
                      ) : latestJob?.status === "running" ? (
                        <div className="flex items-center gap-3">
                          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                          <div>
                            <p className="text-sm font-medium">Procesando predicción...</p>
                            <p className="text-xs text-muted-foreground">El sistema está analizando los datos</p>
                          </div>
                        </div>
                      ) : latestJob?.status === "failed" ? (
                        <div className="flex items-center gap-3">
                          <AlertCircle className="h-5 w-5 text-destructive" />
                          <div>
                            <p className="text-sm font-medium">Error en la predicción</p>
                            <p className="text-xs text-muted-foreground">Hubo un problema al generar el plan</p>
                          </div>
                        </div>
                      ) : null}
                      {purchasePlan && (
                        <Button
                          onClick={handleRunForecast}
                          disabled={runForecastMutation.isPending || latestJob?.status === "running" || !selectedTemporada}
                          data-testid="button-recalculate-forecast"
                          variant="outline"
                        >
                          {runForecastMutation.isPending || latestJob?.status === "running" ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Procesando...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Recalcular
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Purchase Plan Table */}
              {purchasePlan ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Plan de Compras - Recomendaciones
                    </CardTitle>
                    <CardDescription>
                      Predicciones de demanda y recomendaciones de compra por sección
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-x-auto w-full">
                      <Table className="w-full min-w-[1200px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="font-bold">SECCIÓN</TableHead>
                            <TableHead className="text-center">% PVP</TableHead>
                            <TableHead className="text-center">% CONTRI.</TableHead>
                            <TableHead className="text-right">UDS</TableHead>
                            <TableHead className="text-right">PVP</TableHead>
                            <TableHead className="text-right">COSTE</TableHead>
                            <TableHead className="text-right">PROF</TableHead>
                            <TableHead className="text-right">OPC</TableHead>
                            <TableHead className="text-right">PM CTE</TableHead>
                            <TableHead className="text-right">PM VTA</TableHead>
                            <TableHead className="text-right">MK %</TableHead>
                            <TableHead className="text-right">MARK DOW %</TableHead>
                            <TableHead className="text-right">SOBR ANTE %</TableHead>
                            <TableHead className="text-right">x TIENDA</TableHead>
                            <TableHead className="text-right">x TALLA</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {purchasePlan.rows.map((row: PurchasePlanRow, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{row.seccion}</TableCell>
                              <TableCell className="text-center">
                                {formatNumber(row.pvpPorcentaje, 1)}%
                              </TableCell>
                              <TableCell className="text-center">
                                {formatNumber(row.contribucionPorcentaje, 1)}%
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatNumber(row.uds)}
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(row.pvp)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(row.coste)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(row.profit)}</TableCell>
                              <TableCell className="text-right">{row.opciones}</TableCell>
                              <TableCell className="text-right">{formatCurrency(row.pmCte)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(row.pmVta)}</TableCell>
                              <TableCell className="text-right">
                                {formatNumber(row.mk, 1)}%
                              </TableCell>
                              <TableCell className="text-right">
                                {formatNumber(row.markdownPorcentaje, 1)}%
                              </TableCell>
                              <TableCell className="text-right">
                                {formatNumber(row.sobranPorcentaje, 1)}%
                              </TableCell>
                              <TableCell className="text-right">{row.porTienda}</TableCell>
                              <TableCell className="text-right">{row.porTalla}</TableCell>
                            </TableRow>
                          ))}
                          {/* Total Row */}
                          {purchasePlan.totalPrendas && (
                            <TableRow className="bg-muted font-bold">
                              <TableCell>{purchasePlan.totalPrendas.seccion}</TableCell>
                              <TableCell className="text-center">
                                {formatNumber(purchasePlan.totalPrendas.pvpPorcentaje, 1)}%
                              </TableCell>
                              <TableCell className="text-center">
                                {formatNumber(purchasePlan.totalPrendas.contribucionPorcentaje, 1)}%
                              </TableCell>
                              <TableCell className="text-right">
                                {formatNumber(purchasePlan.totalPrendas.uds)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(purchasePlan.totalPrendas.pvp)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(purchasePlan.totalPrendas.coste)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(purchasePlan.totalPrendas.profit)}
                              </TableCell>
                              <TableCell className="text-right">
                                {purchasePlan.totalPrendas.opciones}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(purchasePlan.totalPrendas.pmCte)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(purchasePlan.totalPrendas.pmVta)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatNumber(purchasePlan.totalPrendas.mk, 1)}%
                              </TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right">-</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Summary Text */}
                    {purchasePlan.totalPrendas && (
                      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          <strong>Resumen:</strong> El sistema recomienda comprar{" "}
                          <strong>{formatNumber(purchasePlan.totalPrendas.uds)} unidades</strong> con una
                          inversión estimada de{" "}
                          <strong>{formatCurrency(purchasePlan.totalPrendas.coste)}</strong>. La predicción
                          se basa en análisis histórico de ventas y considera factores estacionales, tendencias
                          y rotación de inventario. Se recomienda revisar estas cifras periódicamente según
                          avance la temporada.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : latestJob?.status === "running" ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      Generando Plan de Compras
                    </CardTitle>
                    <CardDescription>
                      El sistema está analizando los datos y generando predicciones...
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Progress Bar */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progreso</span>
                          <span className="font-mono font-medium">
                            {latestJob.progress ? `${Math.round(latestJob.progress)}%` : '0%'}
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-primary h-full transition-all duration-500 ease-out"
                            style={{ width: `${latestJob.progress || 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-4 pt-2">
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold font-mono">
                            {latestJob.processedProducts || 0}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Productos procesados
                          </div>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold font-mono">
                            {latestJob.totalProducts || 0}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Total productos
                          </div>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold font-mono text-primary">
                            {latestJob.estimatedTimeRemaining 
                              ? `${latestJob.estimatedTimeRemaining}s` 
                              : '---'}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Tiempo estimado
                          </div>
                        </div>
                      </div>

                      {/* Processing Message */}
                      <div className="text-center pt-4">
                        <p className="text-sm text-muted-foreground">
                          Analizando datos históricos, calculando tendencias y optimizando predicciones...
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Plan de Compras</CardTitle>
                    <CardDescription>
                      Los resultados aparecerán aquí una vez que se complete el análisis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Ejecuta una predicción para ver el plan de compras</p>
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
