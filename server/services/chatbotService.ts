import OpenAI from "openai";
import type { VentasData, ProductosData, TraspasosData } from "../../shared/schema";

interface VisualizationRequest {
  message: string;
}

interface VisualizationResponse {
  message: string;
  visualization?: {
    type: string;
    config: any;
    data: any;
  };
}

// Inicializar cliente de OpenAI (puede ser undefined si no hay API key)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Log del estado de OpenAI al iniciar
if (openai) {
  console.log("✅ OpenAI configurado correctamente");
} else {
  console.log("ℹ️ OpenAI no configurado - el chatbot usará análisis por reglas");
}

// Función para analizar la solicitud con OpenAI y generar estructura de visualización
async function analyzeRequestWithAI(
  message: string,
  availableData: {
    ventas: number;
    productos: number;
    traspasos: number;
  }
): Promise<{
  type: string;
  config: any;
  description: string;
} | null> {
  if (!openai) {
    return null; // Fallback a análisis por reglas si no hay API key
  }

  try {
    const systemPrompt = `Eres un asistente experto en análisis de datos y visualizaciones para una aplicación de retail analytics.

Tu tarea es analizar solicitudes de usuarios que piden crear visualizaciones y determinar qué tipo de visualización crear basándote en los datos disponibles.

Tipos de visualizaciones disponibles:
- "bar": Gráfico de barras (para comparar categorías como temporadas, familias, tiendas, tallas)
- "line": Gráfico de líneas (para tendencias temporales como evolución mensual)
- "pie": Gráfico de pastel (para distribución/proporciones)
- "table": Tabla de datos (para listados detallados)

Datos disponibles:
- Ventas: ${availableData.ventas} registros
- Productos: ${availableData.productos} registros
- Traspasos: ${availableData.traspasos} registros

Campos disponibles en ventas:
- temporada, familia, tienda, talla, fechaVenta, cantidad, subtotal, descripcionFamilia

Debes responder con un objeto JSON válido en este formato:
{
  "type": "bar|line|pie|table",
  "config": {
    "xAxis": "campo para eje X (si aplica)",
    "dataKey": "campo para datos (si aplica)",
    "dataKeys": ["campo1", "campo2"] (para gráficos de línea),
    "nameKey": "campo para nombres (si aplica)",
    "columns": ["col1", "col2"] (para tablas),
    "maxRows": 20 (para tablas)
  },
  "description": "Descripción breve de la visualización"
}

Ejemplos:
- "muéstrame ventas por temporada" -> {"type": "bar", "config": {"xAxis": "temporada", "dataKey": "cantidad"}, "description": "Gráfico de barras de ventas por temporada"}
- "evolución mensual" -> {"type": "line", "config": {"xAxis": "mes", "dataKeys": ["cantidad", "beneficio"]}, "description": "Evolución temporal de ventas"}
- "distribución por familia" -> {"type": "pie", "config": {"dataKey": "cantidad", "nameKey": "familia"}, "description": "Distribución de ventas por familia"}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analiza esta solicitud y determina qué visualización crear: "${message}"` },
      ],
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return null;
    }

    // Intentar extraer JSON del contenido
    let cleanedContent = content.trim();
    
    // Remover markdown code blocks si existen
    if (cleanedContent.includes('```json')) {
      const jsonMatch = cleanedContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        cleanedContent = jsonMatch[1].trim();
      }
    } else if (cleanedContent.includes('```')) {
      const jsonMatch = cleanedContent.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        cleanedContent = jsonMatch[1].trim();
      }
    }
    
    // Buscar JSON entre llaves
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedContent = jsonMatch[0];
    }

    try {
      const parsed = JSON.parse(cleanedContent);
      
      // Validar que tenga la estructura esperada
      if (!parsed.type || !parsed.config || !parsed.description) {
        console.log("⚠️ JSON de OpenAI no tiene la estructura esperada:", parsed);
        return null;
      }
      
      return parsed;
    } catch (parseError) {
      console.error("Error parseando JSON de OpenAI:", parseError);
      console.error("Contenido recibido:", content);
      return null;
    }
  } catch (error: any) {
    console.error("Error en análisis con OpenAI:", error);
    return null; // Fallback a análisis por reglas
  }
}

// Función para analizar la solicitud del usuario (fallback si no hay OpenAI)
function analyzeRequest(message: string): {
  type: string;
  config: any;
  description: string;
} {
  const lowerMessage = message.toLowerCase();

  // Detectar tipo de gráfico
  if (
    lowerMessage.includes("barras") ||
    lowerMessage.includes("bar chart") ||
    lowerMessage.includes("barra")
  ) {
    // Detectar qué mostrar
    if (lowerMessage.includes("temporada") || lowerMessage.includes("temporadas")) {
      return {
        type: "bar",
        config: {
          xAxis: "temporada",
          dataKey: "cantidad",
        },
        description: "Gráfico de barras de ventas por temporada",
      };
    }
    if (lowerMessage.includes("familia") || lowerMessage.includes("familias")) {
      return {
        type: "bar",
        config: {
          xAxis: "familia",
          dataKey: "cantidad",
        },
        description: "Gráfico de barras de ventas por familia",
      };
    }
    if (lowerMessage.includes("tienda") || lowerMessage.includes("tiendas")) {
      return {
        type: "bar",
        config: {
          xAxis: "tienda",
          dataKey: "cantidad",
        },
        description: "Gráfico de barras de ventas por tienda",
      };
    }
    if (lowerMessage.includes("talla") || lowerMessage.includes("tallas")) {
      return {
        type: "bar",
        config: {
          xAxis: "talla",
          dataKey: "cantidad",
        },
        description: "Gráfico de barras de ventas por talla",
      };
    }
    if (lowerMessage.includes("mes") || lowerMessage.includes("mensual")) {
      return {
        type: "bar",
        config: {
          xAxis: "mes",
          dataKey: "cantidad",
        },
        description: "Gráfico de barras de ventas mensuales",
      };
    }
  }

  if (
    lowerMessage.includes("línea") ||
    lowerMessage.includes("line chart") ||
    lowerMessage.includes("evolución") ||
    lowerMessage.includes("tendencia")
  ) {
    return {
      type: "line",
      config: {
        xAxis: "mes",
        dataKeys: ["cantidad", "beneficio"],
      },
      description: "Gráfico de líneas de evolución temporal",
    };
  }

  if (
    lowerMessage.includes("pastel") ||
    lowerMessage.includes("pie chart") ||
    lowerMessage.includes("proporción") ||
    lowerMessage.includes("distribución")
  ) {
    if (lowerMessage.includes("familia") || lowerMessage.includes("familias")) {
      return {
        type: "pie",
        config: {
          dataKey: "cantidad",
          nameKey: "familia",
        },
        description: "Gráfico de pastel de distribución por familia",
      };
    }
    if (lowerMessage.includes("tienda") || lowerMessage.includes("tiendas")) {
      return {
        type: "pie",
        config: {
          dataKey: "cantidad",
          nameKey: "tienda",
        },
        description: "Gráfico de pastel de distribución por tienda",
      };
    }
  }

  if (
    lowerMessage.includes("tabla") ||
    lowerMessage.includes("table") ||
    lowerMessage.includes("listado")
  ) {
    return {
      type: "table",
      config: {
        columns: ["tienda", "cantidad", "beneficio"],
        maxRows: 20,
      },
      description: "Tabla de datos",
    };
  }

  // Por defecto, intentar crear un gráfico de barras general
  return {
    type: "bar",
    config: {
      xAxis: "tienda",
      dataKey: "cantidad",
    },
    description: "Gráfico de barras de ventas por tienda",
  };
}

// Función para generar datos para la visualización
function generateVisualizationData(
  type: string,
  config: any,
  ventas: VentasData[],
  productos: ProductosData[],
  traspasos: TraspasosData[]
): any[] {
  switch (type) {
    case "bar":
      if (config.xAxis === "temporada") {
        const temporadasMap = new Map<string, number>();
        ventas.forEach((v) => {
          const temporada = v.temporada || "Sin Temporada";
          temporadasMap.set(temporada, (temporadasMap.get(temporada) || 0) + (v.cantidad || 0));
        });
        return Array.from(temporadasMap.entries())
          .map(([temporada, cantidad]) => ({ temporada, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad)
          .slice(0, 20);
      }

      if (config.xAxis === "familia") {
        const familiasMap = new Map<string, number>();
        ventas.forEach((v) => {
          const familia = v.descripcionFamilia || v.familia || "Sin Familia";
          familiasMap.set(familia, (familiasMap.get(familia) || 0) + (v.cantidad || 0));
        });
        return Array.from(familiasMap.entries())
          .map(([familia, cantidad]) => ({ familia, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad)
          .slice(0, 20);
      }

      if (config.xAxis === "tienda") {
        const tiendasMap = new Map<string, number>();
        ventas.forEach((v) => {
          const tienda = v.tienda || "Sin Tienda";
          tiendasMap.set(tienda, (tiendasMap.get(tienda) || 0) + (v.cantidad || 0));
        });
        return Array.from(tiendasMap.entries())
          .map(([tienda, cantidad]) => ({ tienda, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad)
          .slice(0, 20);
      }

      if (config.xAxis === "talla") {
        const tallasMap = new Map<string, number>();
        ventas.forEach((v) => {
          const talla = v.talla || "Sin Talla";
          tallasMap.set(talla, (tallasMap.get(talla) || 0) + (v.cantidad || 0));
        });
        return Array.from(tallasMap.entries())
          .map(([talla, cantidad]) => ({ talla, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad)
          .slice(0, 20);
      }

      if (config.xAxis === "mes") {
        const mesesMap = new Map<string, { cantidad: number; beneficio: number }>();
        ventas.forEach((v) => {
          if (!v.fechaVenta) return;
          const fecha = new Date(v.fechaVenta);
          const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
          if (!mesesMap.has(mes)) {
            mesesMap.set(mes, { cantidad: 0, beneficio: 0 });
          }
          const data = mesesMap.get(mes)!;
          data.cantidad += v.cantidad || 0;
          data.beneficio += v.subtotal || 0;
        });
        return Array.from(mesesMap.entries())
          .map(([mes, data]) => ({ mes, ...data }))
          .sort((a, b) => a.mes.localeCompare(b.mes));
      }

      break;

    case "line":
      // Evolución mensual
      const mesesMap = new Map<string, { cantidad: number; beneficio: number }>();
      ventas.forEach((v) => {
        if (!v.fechaVenta) return;
        const fecha = new Date(v.fechaVenta);
        const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
        if (!mesesMap.has(mes)) {
          mesesMap.set(mes, { cantidad: 0, beneficio: 0 });
        }
        const data = mesesMap.get(mes)!;
        data.cantidad += v.cantidad || 0;
        data.beneficio += v.subtotal || 0;
      });
      return Array.from(mesesMap.entries())
        .map(([mes, data]) => ({ mes, ...data }))
        .sort((a, b) => a.mes.localeCompare(b.mes));

    case "pie":
      if (config.nameKey === "familia") {
        const familiasMap = new Map<string, number>();
        ventas.forEach((v) => {
          const familia = v.descripcionFamilia || v.familia || "Sin Familia";
          familiasMap.set(familia, (familiasMap.get(familia) || 0) + (v.cantidad || 0));
        });
        return Array.from(familiasMap.entries())
          .map(([familia, cantidad]) => ({ familia, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad)
          .slice(0, 10);
      }

      if (config.nameKey === "tienda") {
        const tiendasMap = new Map<string, number>();
        ventas.forEach((v) => {
          const tienda = v.tienda || "Sin Tienda";
          tiendasMap.set(tienda, (tiendasMap.get(tienda) || 0) + (v.cantidad || 0));
        });
        return Array.from(tiendasMap.entries())
          .map(([tienda, cantidad]) => ({ tienda, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad)
          .slice(0, 10);
      }

      break;

    case "table":
      // Tabla de tiendas con ventas
      const tiendasDataMap = new Map<
        string,
        { cantidad: number; beneficio: number }
      >();
      ventas.forEach((v) => {
        const tienda = v.tienda || "Sin Tienda";
        if (!tiendasDataMap.has(tienda)) {
          tiendasDataMap.set(tienda, { cantidad: 0, beneficio: 0 });
        }
        const data = tiendasDataMap.get(tienda)!;
        data.cantidad += v.cantidad || 0;
        data.beneficio += v.subtotal || 0;
      });
      return Array.from(tiendasDataMap.entries())
        .map(([tienda, data]) => ({
          tienda,
          cantidad: data.cantidad.toLocaleString(),
          beneficio: `€${data.beneficio.toLocaleString()}`,
        }))
        .sort((a, b) => {
          const aNum = parseInt(a.cantidad.replace(/,/g, ""));
          const bNum = parseInt(b.cantidad.replace(/,/g, ""));
          return bNum - aNum;
        })
        .slice(0, config.maxRows || 20);
  }

  return [];
}

// Función para obtener respuesta conversacional de OpenAI
async function getConversationalResponse(
  message: string,
  ventas: VentasData[],
  productos: ProductosData[],
  traspasos: TraspasosData[]
): Promise<string | null> {
  if (!openai) {
    return null;
  }

  try {
    // Calcular algunos KPIs básicos para contexto
    const totalVentas = ventas.reduce((sum, v) => sum + (v.cantidad || 0), 0);
    const totalBeneficio = ventas.reduce((sum, v) => sum + (v.subtotal || 0), 0);
    const tiendasUnicas = new Set(ventas.map(v => v.tienda)).size;
    const familiasUnicas = new Set(ventas.map(v => v.familia || v.descripcionFamilia)).size;
    
    // Calcular datos específicos que pueden ser útiles
    const tiendasPorNombre: Record<string, number> = {};
    ventas.forEach(v => {
      const tienda = v.tienda || '';
      if (tienda) {
        tiendasPorNombre[tienda] = (tiendasPorNombre[tienda] || 0) + 1;
      }
    });
    
    // Buscar tiendas que contengan "trucco" (case insensitive)
    const tiendasTrucco = Object.keys(tiendasPorNombre).filter(t => 
      t.toLowerCase().includes('trucco')
    );
    
    const familiasList = Array.from(new Set(ventas.map(v => v.descripcionFamilia || v.familia).filter(Boolean)));

    // Si la pregunta es específica sobre tiendas Trucco, calcular directamente
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('trucco') && (lowerMessage.includes('cuántas') || lowerMessage.includes('cuantas'))) {
      return `Hay ${tiendasTrucco.length} tienda(s) que contienen "trucco" en su nombre: ${tiendasTrucco.join(', ')}.`;
    }

    const systemPrompt = `Eres un asistente experto en análisis de datos de retail para la aplicación RetailSense. 
Tu función es ayudar a los usuarios a entender sus datos de ventas, productos y traspasos.

Datos disponibles en el sistema:
- Total de registros de ventas: ${ventas.length}
- Total de productos: ${productos.length}
- Total de traspasos: ${traspasos.length}
- Total unidades vendidas: ${totalVentas.toLocaleString()}
- Total beneficio: €${totalBeneficio.toLocaleString()}
- Número de tiendas únicas: ${tiendasUnicas}
- Número de familias únicas: ${familiasUnicas}
${tiendasTrucco.length > 0 ? `- Tiendas que contienen "trucco": ${tiendasTrucco.length} (${tiendasTrucco.slice(0, 10).join(', ')})` : ''}

Campos disponibles en ventas:
- temporada, familia, descripcionFamilia, tienda, talla, fechaVenta, cantidad, subtotal
- tipoTienda (Física/Online)

Responde de manera natural, conversacional y útil en español. Si el usuario pregunta sobre datos específicos, proporciona la información exacta basándote en los datos disponibles.

IMPORTANTE: Responde SOLO con texto natural. NO uses formato JSON ni estructuras de código. Solo texto conversacional.

Sé amigable, profesional y útil.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    return content || null;
  } catch (error: any) {
    console.error("Error en respuesta conversacional de OpenAI:", error);
    console.error("Error details:", {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type
    });
    
    // Si el error menciona "pattern", puede ser un problema con la API key o configuración
    if (error.message?.includes("pattern")) {
      console.error("⚠️ Error de patrón detectado. Esto puede indicar un problema con la configuración de OpenAI.");
    }
    
    // Intentar responder con datos calculados si es posible
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('trucco') && (lowerMessage.includes('cuántas') || lowerMessage.includes('cuantas'))) {
      const tiendasTrucco = Array.from(new Set(ventas.map(v => v.tienda)))
        .filter(t => t && t.toLowerCase().includes('trucco'));
      return `Hay ${tiendasTrucco.length} tienda(s) que contienen "trucco" en su nombre: ${tiendasTrucco.join(', ')}.`;
    }
    
    return null;
  }
}

// Función para detectar si el usuario quiere una visualización específica
function wantsVisualization(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  const visualizationKeywords = [
    "gráfico", "grafico", "chart", "visualización", "visualizacion",
    "barras", "líneas", "lineas", "pastel", "pie", "tabla",
    "muéstrame", "muestrame", "mostrar", "crear", "generar",
    "hazme", "haz", "dame", "quiero ver"
  ];
  
  return visualizationKeywords.some(keyword => lowerMessage.includes(keyword));
}

export async function processChatbotRequest(
  request: VisualizationRequest,
  ventas: VentasData[],
  productos: ProductosData[],
  traspasos: TraspasosData[]
): Promise<VisualizationResponse> {
  const { message } = request;

  // Si OpenAI está disponible, intentar respuesta conversacional primero
  if (openai) {
    try {
      const conversationalResponse = await getConversationalResponse(message, ventas, productos, traspasos);
      
      if (conversationalResponse) {
        // Si el usuario quiere una visualización específica, intentar generarla también
        // Pero solo si la pregunta NO es una pregunta simple de información
        const isQuestion = message.toLowerCase().match(/^(cuántas?|cuántos?|cuál|quién|qué|dónde|cuando|como|como está|explica|dime|menciona)/);
        
        if (wantsVisualization(message) && !isQuestion) {
          try {
            const availableData = {
              ventas: ventas.length,
              productos: productos.length,
              traspasos: traspasos.length,
            };

            let analysis = await analyzeRequestWithAI(message, availableData);
            
            if (!analysis) {
              analysis = analyzeRequest(message);
            }

            // Generar datos para la visualización
            const data = generateVisualizationData(
              analysis.type,
              analysis.config,
              ventas,
              productos,
              traspasos
            );

            if (data.length > 0) {
              return {
                message: conversationalResponse,
                visualization: {
                  type: analysis.type,
                  config: analysis.config,
                  data,
                },
              };
            }
          } catch (vizError: any) {
            console.error("Error generando visualización, pero continuando con respuesta conversacional:", vizError);
            // Continuar solo con la respuesta conversacional si falla la visualización
          }
        }
        
        // Si solo quiere conversar o la respuesta no requiere visualización
        return {
          message: conversationalResponse,
        };
      }
    } catch (error: any) {
      console.error("Error en processChatbotRequest:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.status,
        code: error.code,
        type: error.type
      });
      
      // Si falla OpenAI pero es una pregunta simple, intentar calcular directamente
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes('trucco') && (lowerMessage.includes('cuántas') || lowerMessage.includes('cuantas'))) {
        const tiendasTrucco = Array.from(new Set(ventas.map(v => v.tienda)))
          .filter(t => t && t.toLowerCase().includes('trucco'));
        return {
          message: `Hay ${tiendasTrucco.length} tienda(s) que contienen "trucco" en su nombre: ${tiendasTrucco.join(', ')}.`,
        };
      }
      
      // Continuar con fallback si OpenAI falla
    }
  }

  // Fallback: Si no hay OpenAI o falló, intentar generar visualización si la pide
  if (wantsVisualization(message)) {
    const availableData = {
      ventas: ventas.length,
      productos: productos.length,
      traspasos: traspasos.length,
    };

    let analysis = analyzeRequest(message);

    // Generar datos
    const data = generateVisualizationData(
      analysis.type,
      analysis.config,
      ventas,
      productos,
      traspasos
    );

    if (data.length > 0) {
      return {
        message: `He creado un ${analysis.description} con los datos disponibles.`,
        visualization: {
          type: analysis.type,
          config: analysis.config,
          data,
        },
      };
    }
  }

  // Respuesta por defecto
  return {
    message: "Lo siento, no pude procesar tu solicitud. ¿Puedes ser más específico sobre qué necesitas? Puedo ayudarte a entender tus datos o crear visualizaciones específicas.",
  };
}
