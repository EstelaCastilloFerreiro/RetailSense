import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, TrendingUp, TrendingDown, Minus, MessageSquare } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface SentimentSummary {
  globalSentiment: number;
  socialMediaSentiment: number;
  reviewsSentiment: number;
  totalComments: number;
}

interface ChartsData {
  sentimentDistribution: {
    positivo: number;
    neutro: number;
    negativo: number;
  };
  byChannel: {
    instagram: {
      positivo: number;
      neutro: number;
      negativo: number;
    };
    google_reviews: {
      positivo: number;
      neutro: number;
      negativo: number;
    };
  };
  timeSeries: Array<{
    fecha: string;
    positivoPercent: number;
    negativoPercent: number;
  }>;
  byTopic: Array<{
    tema: string;
    positivo: number;
    negativo: number;
    neutro: number;
  }>;
}

interface Comment {
  id: string;
  fecha: string;
  canal: string;
  tipoFuente: string;
  tema?: string;
  sentiment: string;
  texto: string;
  origenDetalle?: string;
}

const COLORS = {
  positivo: "#10b981", // Emerald-500 (green for positive)
  neutro: "#d6d3d1", // Stone-300 (neutral)
  negativo: "#ef4444", // Red-500 (red for negative)
};

export default function SentimentAnalysis() {
  const { toast } = useToast();
  const clientId = "demo-client";
  
  const [canalFilter, setCanalFilter] = useState<string>("todos");
  const [temaFilter, setTemaFilter] = useState<string>("todos");

  const queryParams = {
    canal: canalFilter === "todos" ? undefined : canalFilter,
    tema: temaFilter === "todos" ? undefined : temaFilter,
  };

  const { data: summary, isLoading: loadingSummary } = useQuery<SentimentSummary>({
    queryKey: ["/api/sentiment/summary", clientId, queryParams],
    enabled: true,
  });

  const { data: charts, isLoading: loadingCharts } = useQuery<ChartsData>({
    queryKey: ["/api/sentiment/charts", clientId, queryParams],
    enabled: true,
  });

  const { data: comments = [], isLoading: loadingComments } = useQuery<Comment[]>({
    queryKey: ["/api/sentiment/comments", clientId, queryParams],
    enabled: true,
  });

  const fetchMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/sentiment/fetch", {
        method: "POST",
        body: JSON.stringify({ clientId }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      toast({
        title: "Datos actualizados",
        description: "Los comentarios se han analizado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sentiment/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sentiment/charts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sentiment/comments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al obtener los datos",
        variant: "destructive",
      });
    },
  });

  const formatSentimentPercent = (score: number) => {
    return `${Math.round(score * 100)}%`;
  };

  const getSentimentIcon = (score: number) => {
    if (score >= 0.7) return <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />;
    if (score >= 0.5) return <Minus className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
    return <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />;
  };

  const getSentimentColor = (score: number) => {
    if (score >= 0.7) return "text-green-600 dark:text-green-400";
    if (score >= 0.5) return "text-gray-600 dark:text-gray-400";
    return "text-red-600 dark:text-red-400";
  };

  const pieData = charts
    ? [
        { name: "Positivo", value: charts.sentimentDistribution.positivo, color: COLORS.positivo },
        { name: "Neutro", value: charts.sentimentDistribution.neutro, color: COLORS.neutro },
        { name: "Negativo", value: charts.sentimentDistribution.negativo, color: COLORS.negativo },
      ]
    : [];

  const channelData = charts
    ? [
        {
          name: "Instagram",
          positivo: charts.byChannel.instagram.positivo,
          neutro: charts.byChannel.instagram.neutro,
          negativo: charts.byChannel.instagram.negativo,
        },
        {
          name: "Google Reviews",
          positivo: charts.byChannel.google_reviews.positivo,
          neutro: charts.byChannel.google_reviews.neutro,
          negativo: charts.byChannel.google_reviews.negativo,
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50/30 via-white to-purple-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-950 p-6" data-testid="page-sentiment">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-stone-600 bg-clip-text text-transparent tracking-tight" data-testid="text-title">
              Sentiment Analysis
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2" data-testid="text-subtitle">
              Analiza cómo hablan tus clientes sobre tu marca en redes y reseñas
            </p>
          </div>
          <Button
            onClick={() => fetchMutation.mutate()}
            disabled={fetchMutation.isPending}
            data-testid="button-fetch"
            className="bg-purple-600 hover:bg-purple-700"
          >
            {fetchMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualizar Datos
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6 bg-white dark:bg-gray-800" data-testid="card-global">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Sentimiento Global</p>
                <p className={`text-3xl font-bold mt-2 ${getSentimentColor(summary?.globalSentiment || 0)}`} data-testid="text-global-sentiment">
                  {loadingSummary ? "..." : formatSentimentPercent(summary?.globalSentiment || 0)}
                </p>
              </div>
              {getSentimentIcon(summary?.globalSentiment || 0)}
            </div>
          </Card>

          <Card className="p-6 bg-white dark:bg-gray-800" data-testid="card-social">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Social Media</p>
                <p className={`text-3xl font-bold mt-2 ${getSentimentColor(summary?.socialMediaSentiment || 0)}`} data-testid="text-social-sentiment">
                  {loadingSummary ? "..." : formatSentimentPercent(summary?.socialMediaSentiment || 0)}
                </p>
              </div>
              {getSentimentIcon(summary?.socialMediaSentiment || 0)}
            </div>
          </Card>

          <Card className="p-6 bg-white dark:bg-gray-800" data-testid="card-reviews">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Reseñas (Google)</p>
                <p className={`text-3xl font-bold mt-2 ${getSentimentColor(summary?.reviewsSentiment || 0)}`} data-testid="text-reviews-sentiment">
                  {loadingSummary ? "..." : formatSentimentPercent(summary?.reviewsSentiment || 0)}
                </p>
              </div>
              {getSentimentIcon(summary?.reviewsSentiment || 0)}
            </div>
          </Card>

          <Card className="p-6 bg-white dark:bg-gray-800" data-testid="card-total">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Comentarios Analizados</p>
                <p className="text-3xl font-bold mt-2 text-purple-600 dark:text-purple-400" data-testid="text-total-comments">
                  {loadingSummary ? "..." : (summary?.totalComments || 0).toLocaleString()}
                </p>
              </div>
              <MessageSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </Card>
        </div>

        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Fuente:</label>
            <Select value={canalFilter} onValueChange={setCanalFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-canal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="instagram">Solo Social Media</SelectItem>
                <SelectItem value="google_reviews">Solo Reseñas (Google)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Tema:</label>
            <Select value={temaFilter} onValueChange={setTemaFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-tema">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="producto">Producto</SelectItem>
                <SelectItem value="talla">Talla</SelectItem>
                <SelectItem value="calidad">Calidad</SelectItem>
                <SelectItem value="precio">Precio</SelectItem>
                <SelectItem value="envio">Envío</SelectItem>
                <SelectItem value="tienda">Tienda</SelectItem>
                <SelectItem value="web">Web</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="charts" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="charts" data-testid="tab-charts">Visualizaciones</TabsTrigger>
            <TabsTrigger value="comments" data-testid="tab-comments">Comentarios</TabsTrigger>
          </TabsList>

          <TabsContent value="charts" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 bg-white dark:bg-gray-800" data-testid="card-donut">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Distribución del Sentimiento
                </h3>
                {loadingCharts ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        stroke="#ffffff"
                        strokeWidth={2}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #d6d3d1', 
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <Card className="p-6 bg-white dark:bg-gray-800" data-testid="card-by-channel">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Comparativa entre Canales
                </h3>
                {loadingCharts ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={channelData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" strokeOpacity={0.5} />
                      <XAxis dataKey="name" stroke="#78716c" strokeWidth={1} tick={{ fill: '#57534e', fontSize: 12 }} />
                      <YAxis stroke="#78716c" strokeWidth={1} tick={{ fill: '#57534e', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #d6d3d1', 
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }} 
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', color: '#57534e' }} />
                      <Bar dataKey="positivo" stackId="a" fill={COLORS.positivo} radius={[0, 0, 4, 4]} />
                      <Bar dataKey="neutro" stackId="a" fill={COLORS.neutro} />
                      <Bar dataKey="negativo" stackId="a" fill={COLORS.negativo} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>

            <Card className="p-6 bg-white dark:bg-gray-800" data-testid="card-time-series">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Evolución del Sentimiento
              </h3>
              {loadingCharts ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={charts?.timeSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" strokeOpacity={0.5} />
                    <XAxis dataKey="fecha" stroke="#78716c" strokeWidth={1} tick={{ fill: '#57534e', fontSize: 12 }} />
                    <YAxis stroke="#78716c" strokeWidth={1} tick={{ fill: '#57534e', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #d6d3d1', 
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', color: '#57534e' }} />
                    <Line type="monotone" dataKey="positivoPercent" stroke={COLORS.positivo} strokeWidth={2} name="% Positivo" dot={{ fill: COLORS.positivo, r: 4 }} />
                    <Line type="monotone" dataKey="negativoPercent" stroke={COLORS.negativo} strokeWidth={2} name="% Negativo" dot={{ fill: COLORS.negativo, r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-6 bg-white dark:bg-gray-800" data-testid="card-by-topic">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Principales Temas de Conversación
              </h3>
              {loadingCharts ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={charts?.byTopic} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" strokeOpacity={0.5} />
                    <XAxis type="number" stroke="#78716c" strokeWidth={1} tick={{ fill: '#57534e', fontSize: 12 }} />
                    <YAxis dataKey="tema" type="category" stroke="#78716c" strokeWidth={1} tick={{ fill: '#57534e', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #d6d3d1', 
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', color: '#57534e' }} />
                    <Bar dataKey="positivo" fill={COLORS.positivo} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="negativo" fill={COLORS.negativo} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="comments" className="mt-6">
            <Card className="p-6 bg-white dark:bg-gray-800">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Lista de Comentarios
              </h3>
              {loadingComments ? (
                <div className="h-[400px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">
                    No hay comentarios disponibles. Haz clic en "Actualizar Datos" para obtenerlos.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0"
                      data-testid={`comment-${comment.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                comment.sentiment === "positivo"
                                  ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                                  : comment.sentiment === "negativo"
                                  ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                              }`}
                            >
                              {comment.sentiment}
                            </span>
                            {comment.tema && (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                {comment.tema}
                              </span>
                            )}
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {comment.canal === "instagram" ? "Instagram" : "Google Reviews"}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{comment.fecha}</span>
                          </div>
                          <p className="text-gray-900 dark:text-gray-100">{comment.texto}</p>
                          {comment.origenDetalle && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {comment.origenDetalle}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
