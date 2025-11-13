import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useData } from "@/contexts/DataContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getValueColor, CHART_COLORS } from "@/lib/colors";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  visualization?: {
    type: string;
    config: any;
    data: any;
  };
}

interface ChatbotProps {
  section: "analytics" | "forecasting" | "sentiment";
}

export default function Chatbot({ section }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "¡Hola! Soy tu asistente de visualizaciones. Puedes pedirme cualquier tipo de gráfico o análisis que necesites. Por ejemplo: 'Muéstrame ventas por temporada', 'Crea un gráfico de barras de tiendas por zona', etc.",
    },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { fileId } = useData();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const response = await fetch(`/api/chatbot/${fileId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, section }),
      });

      if (!response.ok) {
        throw new Error("Error al procesar la solicitud");
      }

      return response.json();
    },
    onSuccess: (data) => {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: input,
      };

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message || "Visualización generada",
        visualization: data.visualization,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setInput("");
    },
    onError: (error) => {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: input,
      };

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Lo siento, hubo un error: ${error instanceof Error ? error.message : "Error desconocido"}`,
      };

      setMessages((prev) => [...prev, userMessage, errorMessage]);
      setInput("");
    },
  });

  const handleSend = () => {
    if (!input.trim() || !fileId) return;
    sendMessageMutation.mutate(input);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderVisualization = (visualization: Message["visualization"]) => {
    if (!visualization) return null;

    const { type, config, data } = visualization;

    if (!data || data.length === 0) {
      return <p className="text-muted-foreground text-sm">No hay datos para mostrar</p>;
    }

    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" strokeOpacity={0.5} />
              <XAxis dataKey={config.xAxis} stroke="#78716c" strokeWidth={1} tick={{ fill: '#57534e', fontSize: 12 }} />
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
              <Bar dataKey={config.dataKey} fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]}>
                {data.map((entry: any, index: number) => {
                  const values = data.map((d: any) => d[config.dataKey]);
                  const max = Math.max(...values);
                  const min = Math.min(...values);
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={getValueColor(entry[config.dataKey], min, max)}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" strokeOpacity={0.5} />
              <XAxis dataKey={config.xAxis} stroke="#78716c" strokeWidth={1} tick={{ fill: '#57534e', fontSize: 12 }} />
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
              {config.dataKeys.map((key: string, index: number) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={CHART_COLORS.series[index % CHART_COLORS.series.length]}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.series[index % CHART_COLORS.series.length], r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                dataKey={config.dataKey}
                nameKey={config.nameKey}
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
                stroke="#ffffff"
                strokeWidth={2}
              >
                {data.map((entry: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS.series[index % CHART_COLORS.series.length]}
                  />
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
              <Legend wrapperStyle={{ fontSize: '12px', color: '#57534e' }} />
            </PieChart>
          </ResponsiveContainer>
        );

      case "table":
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {config.columns.map((col: string) => (
                    <th key={col} className="text-left p-2 font-medium">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, config.maxRows || 20).map((row: any, index: number) => (
                  <tr key={index} className="border-b">
                    {config.columns.map((col: string) => (
                      <td key={col} className="p-2">
                        {row[col]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return <p className="text-muted-foreground">Tipo de visualización no soportado</p>;
    }
  };

  if (!fileId) return null;

  return (
    <>
      {/* Botón flotante */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed top-[1.5rem] right-6 h-14 w-14 rounded-full shadow-lg z-50"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Panel del chatbot */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">Asistente de Visualizaciones</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.visualization && (
                    <div className="mt-4 pt-4 border-t border-border">
                      {renderVisualization(message.visualization)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sendMessageMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu solicitud..."
              disabled={sendMessageMutation.isPending}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || sendMessageMutation.isPending}
              size="icon"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}

