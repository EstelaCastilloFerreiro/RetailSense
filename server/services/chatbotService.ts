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

// Función para calcular respuestas directamente de los datos
function calculateDirectResponse(
  message: string,
  ventas: VentasData[],
  productos: ProductosData[],
  traspasos: TraspasosData[]
): string | null {
  const lowerMessage = message.toLowerCase().trim();
  
  // Debug: Log el mensaje para ver qué está recibiendo
  console.log(`🔍 Chatbot recibió: "${message}"`);
  
  // Calcular KPIs básicos
  const totalVentas = ventas.reduce((sum, v) => sum + (v.cantidad || 0), 0);
  const totalBeneficio = ventas.reduce((sum, v) => sum + (v.subtotal || 0), 0);
  const devoluciones = ventas.filter(v => (v.cantidad || 0) < 0).reduce((sum, v) => sum + Math.abs(v.cantidad || 0), 0);
  const ventasPositivas = ventas.filter(v => (v.cantidad || 0) > 0);
  const ventasNetas = ventasPositivas.reduce((sum, v) => sum + (v.subtotal || 0), 0);
  const tiendasUnicas = new Set(ventas.map(v => v.tienda)).size;
  const familiasUnicas = new Set(ventas.map(v => v.descripcionFamilia || v.familia).filter(Boolean)).size;
  const temporadasUnicas = new Set(ventas.map(v => v.temporada).filter(Boolean)).size;
  
  // Calcular tiendas por tipo
  const tiendasPorNombre = new Set(ventas.map(v => v.tienda));
  const tiendasOnline = ventas.filter(v => v.esOnline).map(v => v.tienda);
  const tiendasFisicas = ventas.filter(v => !v.esOnline).map(v => v.tienda);
  const tiendasOnlineUnicas = new Set(tiendasOnline).size;
  const tiendasFisicasUnicas = new Set(tiendasFisicas).size;
  
  // Calcular ventas por tipo de tienda
  const ventasOnline = ventas.filter(v => v.esOnline).reduce((sum, v) => sum + (v.subtotal || 0), 0);
  const ventasFisicas = ventas.filter(v => !v.esOnline).reduce((sum, v) => sum + (v.subtotal || 0), 0);
  
  // Calcular tasa de devolución
  const tasaDevolucion = totalVentas > 0 ? ((devoluciones / totalVentas) * 100).toFixed(1) : '0.0';
  
  // PRIORIDAD 1: Consultas filtradas por temporada/año (debe ir PRIMERO para capturar consultas específicas)
  const añoMatch = lowerMessage.match(/(?:en\s+|del\s+)?(?:año\s+)?(\d{2,4})/);
  if (añoMatch) {
    const añoEncontrado = añoMatch[1];
    let año = añoEncontrado;
    // Si es de 2 dígitos, asumir 2000s
    if (añoEncontrado.length === 2) {
      año = `20${añoEncontrado}`;
    }
    
    console.log(`🔍 Detectado año en consulta: ${año} (original: ${añoEncontrado})`);
    
    // Filtrar ventas por temporada que contenga el año O por fecha de venta
    const ventasFiltradas = ventas.filter(v => {
      const temporada = v.temporada ? String(v.temporada).toLowerCase() : '';
      if (temporada.includes(año) || temporada.includes(añoEncontrado)) {
        return true;
      }
      // También filtrar por fecha de venta si está disponible
      if (v.fechaVenta) {
        try {
          const fecha = new Date(v.fechaVenta);
          if (!isNaN(fecha.getTime())) {
            const añoVenta = fecha.getFullYear().toString();
            return añoVenta === año || añoVenta.includes(añoEncontrado);
          }
        } catch (e) {
          // Ignorar errores de fecha
        }
      }
      return false;
    });
    
    console.log(`🔍 Ventas filtradas por año ${año}: ${ventasFiltradas.length} de ${ventas.length}`);
    
    if (ventasFiltradas.length > 0) {
      // Si pregunta sobre talla de una familia específica - buscar "pantalón", "pantalones", etc.
      // Buscar en TODO el mensaje, no solo al inicio
      const familiaKeywords = ['pantalón', 'pantalones', 'jersey', 'jerseys', 'vestido', 'vestidos', 
                               'camiseta', 'camisetas', 'top', 'tops', 'falda', 'faldas', 
                               'blusa', 'blusas', 'abrigo', 'abrigos', 'chaqueta', 'chaquetas'];
      
      // Buscar familia con más flexibilidad - buscar palabras completas
      let familiaNombre: string | undefined;
      for (const keyword of familiaKeywords) {
        // Buscar palabra completa (con límites de palabra)
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(lowerMessage)) {
          familiaNombre = keyword;
          break;
        }
        // También buscar como substring si no hay match completo
        if (lowerMessage.includes(keyword)) {
          familiaNombre = keyword;
          break;
        }
      }
      
      console.log(`🔍 Familia detectada: ${familiaNombre || 'ninguna'}`);
      
      if (familiaNombre) {
        // Buscar familia por nombre similar (más flexible)
        const familiasMap = new Map<string, string>();
        ventas.forEach(v => {
          if (v.descripcionFamilia) {
            familiasMap.set(v.familia || '', v.descripcionFamilia);
          }
        });
        
        // Mapeo de nombres comunes a nombres de familias
        const mapeoFamilias: Record<string, string[]> = {
          'pantalón': ['pantalon', 'pantalones', 'pant'],
          'pantalones': ['pantalon', 'pantalones', 'pant'],
          'jersey': ['jersey', 'jerseys', 'jersei'],
          'jerseys': ['jersey', 'jerseys', 'jersei'],
          'vestido': ['vestido', 'vestidos'],
          'vestidos': ['vestido', 'vestidos'],
          'camiseta': ['camiseta', 'camisetas', 'tshirt'],
          'camisetas': ['camiseta', 'camisetas', 'tshirt'],
          'top': ['top', 'tops'],
          'tops': ['top', 'tops'],
          'falda': ['falda', 'faldas'],
          'faldas': ['falda', 'faldas'],
          'blusa': ['blusa', 'blusas'],
          'blusas': ['blusa', 'blusas'],
          'abrigo': ['abrigo', 'abrigos'],
          'abrigos': ['abrigo', 'abrigos'],
        };
        
        const variaciones = mapeoFamilias[familiaNombre] || [familiaNombre];
        
        // Buscar familia con más flexibilidad - también buscar parcialmente
        let familiaEncontrada = Array.from(familiasMap.entries()).find(([codigo, nombre]) => {
          const nombreLower = nombre.toLowerCase();
          return variaciones.some(v => nombreLower.includes(v));
        });
        
        // Si no encuentra exacta, buscar cualquier familia que contenga la palabra
        if (!familiaEncontrada) {
          const palabraBase = familiaNombre.replace(/es$/, '').replace(/ón$/, 'on');
          familiaEncontrada = Array.from(familiasMap.entries()).find(([codigo, nombre]) => {
            const nombreLower = nombre.toLowerCase();
            return nombreLower.includes(palabraBase) || nombreLower.includes(familiaNombre!.toLowerCase());
          });
        }
        
        console.log(`🔍 Familia encontrada: ${familiaEncontrada ? familiaEncontrada[1] : 'ninguna'}`);
        console.log(`🔍 Todas las familias disponibles: ${Array.from(familiasMap.values()).slice(0, 10).join(', ')}`);
        
        if (familiaEncontrada) {
          const ventasFamilia = ventasFiltradas.filter(v => 
            (v.familia === familiaEncontrada![0] || v.descripcionFamilia === familiaEncontrada![1]) &&
            (v.cantidad || 0) > 0
          );
          
          console.log(`🔍 Ventas de familia ${familiaEncontrada[1]} en ${año}: ${ventasFamilia.length}`);
          
          if (ventasFamilia.length > 0) {
            const tallasMap = new Map<string, number>();
            ventasFamilia.forEach(v => {
              const talla = v.talla ? String(v.talla).trim() : 'Sin Talla';
              tallasMap.set(talla, (tallasMap.get(talla) || 0) + (v.cantidad || 0));
            });
            
            const topTallas = Array.from(tallasMap.entries())
              .map(([talla, cantidad]) => ({ talla, cantidad }))
              .sort((a, b) => b.cantidad - a.cantidad);
            
            if (topTallas.length > 0) {
              const totalUnidades = topTallas.reduce((sum, t) => sum + t.cantidad, 0);
              console.log(`✅ Respuesta generada para talla de ${familiaEncontrada[1]} en ${año}: ${topTallas[0].talla}`);
              return `En ${año}, la talla más vendida de ${familiaEncontrada[1]} fue ${topTallas[0].talla} con ${topTallas[0].cantidad.toLocaleString()} unidades vendidas (de un total de ${totalUnidades.toLocaleString()} unidades de ${familiaEncontrada[1]}).`;
            }
          } else {
            return `No encontré ventas de ${familiaNombre} en ${año}.`;
          }
        } else {
          // Si no encontró la familia exacta, buscar todas las familias disponibles
          const familiasDisponibles = Array.from(new Set(ventasFiltradas.map(v => v.descripcionFamilia).filter(Boolean))).slice(0, 10);
          return `No encontré una familia exacta llamada "${familiaNombre}". Familias disponibles en ${año}: ${familiasDisponibles.join(', ')}.`;
        }
      } else if (lowerMessage.includes('talla') && (lowerMessage.includes('más') || lowerMessage.includes('mas') || lowerMessage.includes('máxima') || lowerMessage.includes('maxima'))) {
        // Pregunta sobre talla más vendida en general para ese año
        const tallasMap = new Map<string, number>();
        ventasFiltradas.filter(v => (v.cantidad || 0) > 0).forEach(v => {
          const talla = v.talla ? String(v.talla).trim() : 'Sin Talla';
          tallasMap.set(talla, (tallasMap.get(talla) || 0) + (v.cantidad || 0));
        });
        
        const topTallas = Array.from(tallasMap.entries())
          .map(([talla, cantidad]) => ({ talla, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad)
          .slice(0, 5);
        
        if (topTallas.length > 0) {
          return `En ${año}, las tallas más vendidas fueron:\n${topTallas.map((t, i) => `${i + 1}. ${t.talla}: ${t.cantidad.toLocaleString()} unidades`).join('\n')}`;
        }
      } else {
        // Pregunta general sobre el año
        const totalVentasAño = ventasFiltradas.reduce((sum, v) => sum + (v.cantidad || 0), 0);
        const totalBeneficioAño = ventasFiltradas.reduce((sum, v) => sum + (v.subtotal || 0), 0);
        return `En ${año}: ${totalVentasAño.toLocaleString()} unidades vendidas, €${totalBeneficioAño.toLocaleString()} de beneficio total.`;
      }
    } else {
      // Año encontrado pero sin datos
      const temporadasDisponibles = Array.from(new Set(ventas.map(v => v.temporada).filter(Boolean))).slice(0, 10);
      return `No encontré datos para el año ${año}. Las temporadas disponibles son: ${temporadasDisponibles.join(', ')}.`;
    }
  }
  
  // 1. Consultas sobre cantidad de tiendas
  if (lowerMessage.includes('cuántas') || lowerMessage.includes('cuantas')) {
    if (lowerMessage.includes('tienda')) {
      if (lowerMessage.includes('trucco')) {
        const tiendasTrucco = Array.from(tiendasPorNombre).filter(t => 
          t && t.toLowerCase().includes('trucco')
        );
        return `Hay ${tiendasTrucco.length} tienda(s) que contienen "trucco" en su nombre: ${tiendasTrucco.join(', ')}.`;
      }
      if (lowerMessage.includes('online')) {
        return `Hay ${tiendasOnlineUnicas} tienda(s) online.`;
      }
      if (lowerMessage.includes('física') || lowerMessage.includes('fisica')) {
        return `Hay ${tiendasFisicasUnicas} tienda(s) físicas.`;
      }
      return `Hay ${tiendasUnicas} tienda(s) únicas en total.`;
    }
    if (lowerMessage.includes('familia') || lowerMessage.includes('familias')) {
      return `Hay ${familiasUnicas} familia(s) de productos únicas.`;
    }
    if (lowerMessage.includes('temporada') || lowerMessage.includes('temporadas')) {
      return `Hay ${temporadasUnicas} temporada(s) únicas.`;
    }
    if (lowerMessage.includes('producto') || lowerMessage.includes('productos')) {
      return `Hay ${productos.length} productos únicos registrados.`;
    }
  }
  
  // 2. Consultas sobre ventas totales
  if (lowerMessage.includes('ventas') || lowerMessage.includes('venta')) {
    if (lowerMessage.includes('total') || lowerMessage.includes('cuánto') || lowerMessage.includes('cuanto')) {
      return `Las ventas totales son ${totalVentas.toLocaleString()} unidades, con un beneficio total de €${totalBeneficio.toLocaleString()}.`;
    }
    if (lowerMessage.includes('bruta') || lowerMessage.includes('brutas')) {
      return `Las ventas brutas son ${totalVentas.toLocaleString()} unidades, con un beneficio de €${totalBeneficio.toLocaleString()}.`;
    }
    if (lowerMessage.includes('neta') || lowerMessage.includes('netas')) {
      return `Las ventas netas son ${totalVentas.toLocaleString()} unidades, con un beneficio de €${ventasNetas.toLocaleString()}.`;
    }
    if (lowerMessage.includes('online')) {
      const unidadesOnline = ventas.filter(v => v.esOnline).reduce((sum, v) => sum + (v.cantidad || 0), 0);
      return `Las ventas online son ${unidadesOnline.toLocaleString()} unidades, con un beneficio de €${ventasOnline.toLocaleString()}.`;
    }
    if (lowerMessage.includes('física') || lowerMessage.includes('fisica')) {
      const unidadesFisicas = ventas.filter(v => !v.esOnline).reduce((sum, v) => sum + (v.cantidad || 0), 0);
      return `Las ventas físicas son ${unidadesFisicas.toLocaleString()} unidades, con un beneficio de €${ventasFisicas.toLocaleString()}.`;
    }
  }
  
  // 3. Consultas sobre devoluciones
  if (lowerMessage.includes('devolución') || lowerMessage.includes('devoluciones') || lowerMessage.includes('devolucion')) {
    if (lowerMessage.includes('total') || lowerMessage.includes('cuánto') || lowerMessage.includes('cuanto')) {
      return `Las devoluciones totales son ${devoluciones.toLocaleString()} unidades. La tasa de devolución es del ${tasaDevolucion}%.`;
    }
    if (lowerMessage.includes('tasa') || lowerMessage.includes('porcentaje')) {
      return `La tasa de devolución es del ${tasaDevolucion}%.`;
    }
  }
  
  // 4. Consultas sobre top/mejor/peor
  if (lowerMessage.includes('mejor') || lowerMessage.includes('top') || lowerMessage.includes('más') || lowerMessage.includes('mas')) {
    if (lowerMessage.includes('tienda')) {
      const tiendasMap = new Map<string, { cantidad: number; beneficio: number }>();
      ventas.forEach(v => {
        const tienda = v.tienda || '';
        if (!tiendasMap.has(tienda)) {
          tiendasMap.set(tienda, { cantidad: 0, beneficio: 0 });
        }
        const data = tiendasMap.get(tienda)!;
        data.cantidad += v.cantidad || 0;
        data.beneficio += v.subtotal || 0;
      });
      const topTiendas = Array.from(tiendasMap.entries())
        .map(([tienda, data]) => ({ tienda, ...data }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);
      
      if (lowerMessage.includes('beneficio') || lowerMessage.includes('venta')) {
        const topPorBeneficio = topTiendas.sort((a, b) => b.beneficio - a.beneficio).slice(0, 3);
        return `Las ${topPorBeneficio.length} tiendas con más beneficio son: ${topPorBeneficio.map(t => `${t.tienda} (€${t.beneficio.toLocaleString()})`).join(', ')}.`;
      }
      return `Las ${topTiendas.length} tiendas con más ventas son: ${topTiendas.map(t => `${t.tienda} (${t.cantidad.toLocaleString()} unidades)`).join(', ')}.`;
    }
    if (lowerMessage.includes('familia') || lowerMessage.includes('familias')) {
      const familiasMap = new Map<string, { cantidad: number; beneficio: number }>();
      ventas.forEach(v => {
        const familia = v.descripcionFamilia || v.familia || '';
        if (!familiasMap.has(familia)) {
          familiasMap.set(familia, { cantidad: 0, beneficio: 0 });
        }
        const data = familiasMap.get(familia)!;
        data.cantidad += v.cantidad || 0;
        data.beneficio += v.subtotal || 0;
      });
      const topFamilias = Array.from(familiasMap.entries())
        .map(([familia, data]) => ({ familia, ...data }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);
      return `Las ${topFamilias.length} familias con más ventas son: ${topFamilias.map(f => `${f.familia} (${f.cantidad.toLocaleString()} unidades)`).join(', ')}.`;
    }
    if (lowerMessage.includes('producto') || lowerMessage.includes('productos')) {
      const productosMap = new Map<string, { cantidad: number; beneficio: number }>();
      ventas.forEach(v => {
        const producto = v.codigoUnico || v.act || '';
        if (!productosMap.has(producto)) {
          productosMap.set(producto, { cantidad: 0, beneficio: 0 });
        }
        const data = productosMap.get(producto)!;
        data.cantidad += v.cantidad || 0;
        data.beneficio += v.subtotal || 0;
      });
      const topProductos = Array.from(productosMap.entries())
        .map(([producto, data]) => ({ producto, ...data }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);
      return `Los ${topProductos.length} productos con más ventas son: ${topProductos.map(p => `${p.producto} (${p.cantidad.toLocaleString()} unidades)`).join(', ')}.`;
    }
  }
  
  // 5. Consultas sobre peor/menor
  if (lowerMessage.includes('peor') || lowerMessage.includes('menor') || lowerMessage.includes('menos')) {
    if (lowerMessage.includes('tienda')) {
      const tiendasMap = new Map<string, { cantidad: number; beneficio: number }>();
      ventas.forEach(v => {
        const tienda = v.tienda || '';
        if (!tiendasMap.has(tienda)) {
          tiendasMap.set(tienda, { cantidad: 0, beneficio: 0 });
        }
        const data = tiendasMap.get(tienda)!;
        data.cantidad += v.cantidad || 0;
        data.beneficio += v.subtotal || 0;
      });
      const peoresTiendas = Array.from(tiendasMap.entries())
        .map(([tienda, data]) => ({ tienda, ...data }))
        .sort((a, b) => a.cantidad - b.cantidad)
        .slice(0, 3);
      return `Las ${peoresTiendas.length} tiendas con menos ventas son: ${peoresTiendas.map(t => `${t.tienda} (${t.cantidad.toLocaleString()} unidades)`).join(', ')}.`;
    }
  }
  
  // 6. Consultas sobre promedio
  if (lowerMessage.includes('promedio') || lowerMessage.includes('media')) {
    if (lowerMessage.includes('venta') || lowerMessage.includes('tienda')) {
      const promedioPorTienda = tiendasUnicas > 0 ? (totalVentas / tiendasUnicas).toFixed(0) : '0';
      return `El promedio de ventas por tienda es de ${promedioPorTienda} unidades.`;
    }
  }
  
  // 7. Consultas sobre comparaciones
  if (lowerMessage.includes('comparar') || lowerMessage.includes('vs') || lowerMessage.includes('versus')) {
    if (lowerMessage.includes('online') && lowerMessage.includes('física')) {
      const porcentajeOnline = totalVentas > 0 ? ((ventasOnline / totalVentas) * 100).toFixed(1) : '0';
      const porcentajeFisica = totalVentas > 0 ? ((ventasFisicas / totalVentas) * 100).toFixed(1) : '0';
      return `Comparación de ventas: Online ${porcentajeOnline}% (€${ventasOnline.toLocaleString()}) vs Física ${porcentajeFisica}% (€${ventasFisicas.toLocaleString()}).`;
    }
  }
  
  // 8. Consultas específicas sobre tiendas
  const tiendaMatch = lowerMessage.match(/tienda[s]?\s+(?:que\s+)?(?:contiene[n]?|tiene[n]?|tienen|tiene)\s+["']?([^"']+)["']?/i);
  if (tiendaMatch) {
    const busqueda = tiendaMatch[1]?.toLowerCase();
    if (busqueda) {
      const tiendasEncontradas = Array.from(tiendasPorNombre).filter(t => 
        t && t.toLowerCase().includes(busqueda)
      );
      if (tiendasEncontradas.length > 0) {
        return `Encontré ${tiendasEncontradas.length} tienda(s) que contienen "${busqueda}": ${tiendasEncontradas.join(', ')}.`;
      }
      return `No encontré ninguna tienda que contenga "${busqueda}".`;
    }
  }
  
  // 9. Consultas sobre ventas de una tienda específica
  const ventasTiendaMatch = lowerMessage.match(/ventas?\s+(?:de\s+)?(?:la\s+)?tienda\s+["']?([^"']+)["']?/i);
  if (ventasTiendaMatch) {
    const nombreTienda = ventasTiendaMatch[1]?.toLowerCase();
    if (nombreTienda) {
      const tiendasCoincidentes = Array.from(tiendasPorNombre).filter(t => 
        t && t.toLowerCase().includes(nombreTienda)
      );
      if (tiendasCoincidentes.length > 0) {
        const respuestas = tiendasCoincidentes.map(tienda => {
          const ventasTienda = ventas.filter(v => v.tienda === tienda);
          const unidades = ventasTienda.reduce((sum, v) => sum + (v.cantidad || 0), 0);
          const beneficio = ventasTienda.reduce((sum, v) => sum + (v.subtotal || 0), 0);
          return `${tienda}: ${unidades.toLocaleString()} unidades, €${beneficio.toLocaleString()}`;
        });
        return `Ventas de las tiendas encontradas:\n${respuestas.join('\n')}`;
      }
    }
  }
  
  // 10. Consultas sobre ventas de una familia específica
  const ventasFamiliaMatch = lowerMessage.match(/ventas?\s+(?:de\s+)?(?:la\s+)?familia\s+["']?([^"']+)["']?/i);
  if (ventasFamiliaMatch) {
    const nombreFamilia = ventasFamiliaMatch[1]?.toLowerCase();
    if (nombreFamilia) {
      const familiasCoincidentes = Array.from(new Set(ventas.map(v => v.descripcionFamilia || v.familia).filter(Boolean))).filter(f => 
        f && f.toLowerCase().includes(nombreFamilia)
      );
      if (familiasCoincidentes.length > 0) {
        const respuestas = familiasCoincidentes.map(familia => {
          const ventasFamilia = ventas.filter(v => (v.descripcionFamilia || v.familia) === familia);
          const unidades = ventasFamilia.reduce((sum, v) => sum + (v.cantidad || 0), 0);
          const beneficio = ventasFamilia.reduce((sum, v) => sum + (v.subtotal || 0), 0);
          return `${familia}: ${unidades.toLocaleString()} unidades, €${beneficio.toLocaleString()}`;
        });
        return `Ventas de las familias encontradas:\n${respuestas.join('\n')}`;
      }
    }
  }
  
  // 11. Consultas generales sobre información disponible
  if (lowerMessage.includes('qué') || lowerMessage.includes('que')) {
    if (lowerMessage.includes('puedo') || lowerMessage.includes('puedes') || lowerMessage.includes('ayuda')) {
      return `Puedo ayudarte con:
- Información sobre tiendas (cantidad, ventas por tienda, comparaciones)
- Información sobre familias de productos (ventas, top familias)
- Información sobre temporadas (ventas por temporada)
- Información sobre ventas (totales, online vs física, devoluciones)
- Información sobre productos (top productos, ventas por producto)
- Comparaciones y análisis de rendimiento
- Crear visualizaciones (gráficos de barras, líneas, pastel, tablas)
- Cualquier otra pregunta sobre tus datos de retail`;
    }
  }
  
  // 12. Consultas sobre resumen general
  if (lowerMessage.includes('resumen') || lowerMessage.includes('resume') || lowerMessage.includes('dame un resumen')) {
    return `RESUMEN GENERAL DE TUS DATOS:
📊 Ventas: ${totalVentas.toLocaleString()} unidades vendidas, €${totalBeneficio.toLocaleString()} de beneficio total
📦 Devoluciones: ${devoluciones.toLocaleString()} unidades (${tasaDevolucion}% de tasa)
🏪 Tiendas: ${tiendasUnicas} tiendas únicas (${tiendasOnlineUnicas} online, ${tiendasFisicasUnicas} físicas)
👔 Familias: ${familiasUnicas} familias de productos únicas
📅 Temporadas: ${temporadasUnicas} temporadas diferentes
📈 Promedio: ${tiendasUnicas > 0 ? (totalVentas / tiendasUnicas).toFixed(0) : '0'} unidades por tienda`;
  }
  
  // 13. Consultas sobre tallas más vendidas por familia
  const tallaFamiliaMatch = lowerMessage.match(/(?:talla|tallas?)\s+(?:de\s+)?(?:la\s+)?(\w+)\s+(?:más|mas|máxima|maxima)\s+venta/i);
  const familiaTallaMatch = lowerMessage.match(/(?:qué|que)\s+talla\s+(?:de\s+)?(?:la\s+)?(\w+)\s+(?:ha\s+)?(?:sido|fue|es)\s+(?:la\s+)?(?:más|mas|máxima|maxima)\s+venta/i);
  
  if (tallaFamiliaMatch || familiaTallaMatch) {
    const familiaNombre = (tallaFamiliaMatch?.[1] || familiaTallaMatch?.[1])?.toLowerCase();
    if (familiaNombre) {
      // Buscar familia por nombre o código
      const familiasCoincidentes = Array.from(new Set(ventas.map(v => ({
        codigo: v.familia,
        nombre: v.descripcionFamilia
      })))).filter(f => 
        f.nombre && f.nombre.toLowerCase().includes(familiaNombre) ||
        f.codigo && f.codigo.toLowerCase().includes(familiaNombre)
      );
      
      if (familiasCoincidentes.length > 0) {
        const respuestas = familiasCoincidentes.map(familia => {
          const ventasFamilia = ventas.filter(v => 
            (v.descripcionFamilia === familia.nombre || v.familia === familia.codigo) &&
            (v.cantidad || 0) > 0
          );
          
          // Agrupar por talla
          const tallasMap = new Map<string, number>();
          ventasFamilia.forEach(v => {
            const talla = v.talla ? String(v.talla).trim() : 'Sin Talla';
            tallasMap.set(talla, (tallasMap.get(talla) || 0) + (v.cantidad || 0));
          });
          
          const topTallas = Array.from(tallasMap.entries())
            .map(([talla, cantidad]) => ({ talla, cantidad }))
            .sort((a, b) => b.cantidad - a.cantidad)
            .slice(0, 5);
          
          if (topTallas.length > 0) {
            const familiaNombreMostrar = familia.nombre || familia.codigo || 'Desconocida';
            return `${familiaNombreMostrar}: ${topTallas.map(t => `${t.talla} (${t.cantidad.toLocaleString()} unidades)`).join(', ')}`;
          }
          return null;
        }).filter(Boolean);
        
        if (respuestas.length > 0) {
          return `Tallas más vendidas:\n${respuestas.join('\n')}`;
        }
      }
    }
  }
  
  // 14. Consultas sobre tallas más vendidas en general
  if (lowerMessage.includes('talla') && (lowerMessage.includes('más') || lowerMessage.includes('mas') || lowerMessage.includes('máxima') || lowerMessage.includes('maxima'))) {
    if (lowerMessage.includes('venta') || lowerMessage.includes('vendida')) {
      const tallasMap = new Map<string, number>();
      ventas.filter(v => (v.cantidad || 0) > 0).forEach(v => {
        const talla = v.talla ? String(v.talla).trim() : 'Sin Talla';
        tallasMap.set(talla, (tallasMap.get(talla) || 0) + (v.cantidad || 0));
      });
      
      const topTallas = Array.from(tallasMap.entries())
        .map(([talla, cantidad]) => ({ talla, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 10);
      
      if (topTallas.length > 0) {
        return `Las ${topTallas.length} tallas más vendidas son:\n${topTallas.map((t, i) => `${i + 1}. ${t.talla}: ${t.cantidad.toLocaleString()} unidades`).join('\n')}`;
      }
    }
  }
  
  // 14. Consultas sobre tallas más vendidas en general (solo si NO hay año en la consulta)
  if (lowerMessage.includes('talla') && (lowerMessage.includes('más') || lowerMessage.includes('mas') || lowerMessage.includes('máxima') || lowerMessage.includes('maxima'))) {
    if (lowerMessage.includes('venta') || lowerMessage.includes('vendida')) {
      const tallasMap = new Map<string, number>();
      ventas.filter(v => (v.cantidad || 0) > 0).forEach(v => {
        const talla = v.talla ? String(v.talla).trim() : 'Sin Talla';
        tallasMap.set(talla, (tallasMap.get(talla) || 0) + (v.cantidad || 0));
      });
      
      const topTallas = Array.from(tallasMap.entries())
        .map(([talla, cantidad]) => ({ talla, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 10);
      
      if (topTallas.length > 0) {
        return `Las ${topTallas.length} tallas más vendidas son:\n${topTallas.map((t, i) => `${i + 1}. ${t.talla}: ${t.cantidad.toLocaleString()} unidades`).join('\n')}`;
      }
    }
  }
  
  return null;
}

// Función para calcular estadísticas detalladas para contexto de OpenAI
function calculateDetailedStats(
  ventas: VentasData[],
  productos: ProductosData[],
  traspasos: TraspasosData[]
) {
  // KPIs básicos
  const totalVentas = ventas.reduce((sum, v) => sum + (v.cantidad || 0), 0);
  const totalBeneficio = ventas.reduce((sum, v) => sum + (v.subtotal || 0), 0);
  const devoluciones = ventas.filter(v => (v.cantidad || 0) < 0).reduce((sum, v) => sum + Math.abs(v.cantidad || 0), 0);
  const ventasPositivas = ventas.filter(v => (v.cantidad || 0) > 0);
  const ventasNetas = ventasPositivas.reduce((sum, v) => sum + (v.subtotal || 0), 0);
  
  // Conteos únicos
  const tiendasUnicas = new Set(ventas.map(v => v.tienda)).size;
  const familiasUnicas = new Set(ventas.map(v => v.descripcionFamilia || v.familia).filter(Boolean)).size;
  const temporadasUnicas = new Set(ventas.map(v => v.temporada).filter(Boolean)).size;
  const tallasUnicas = new Set(ventas.map(v => v.talla).filter(Boolean)).size;
  const coloresUnicos = new Set(ventas.map(v => v.color).filter(Boolean)).size;
  
  // Ventas por tipo de tienda
  const ventasOnline = ventas.filter(v => v.esOnline).reduce((sum, v) => sum + (v.subtotal || 0), 0);
  const unidadesOnline = ventas.filter(v => v.esOnline).reduce((sum, v) => sum + (v.cantidad || 0), 0);
  const ventasFisicas = ventas.filter(v => !v.esOnline).reduce((sum, v) => sum + (v.subtotal || 0), 0);
  const unidadesFisicas = ventas.filter(v => !v.esOnline).reduce((sum, v) => sum + (v.cantidad || 0), 0);
  const tiendasOnlineUnicas = new Set(ventas.filter(v => v.esOnline).map(v => v.tienda)).size;
  const tiendasFisicasUnicas = new Set(ventas.filter(v => !v.esOnline).map(v => v.tienda)).size;
  
  // Tasa de devolución
  const tasaDevolucion = totalVentas > 0 ? ((devoluciones / totalVentas) * 100).toFixed(1) : '0.0';
  
  // Top tiendas
  const tiendasMap = new Map<string, { cantidad: number; beneficio: number; transacciones: number }>();
  ventas.forEach(v => {
    const tienda = v.tienda || '';
    if (!tiendasMap.has(tienda)) {
      tiendasMap.set(tienda, { cantidad: 0, beneficio: 0, transacciones: 0 });
    }
    const data = tiendasMap.get(tienda)!;
    data.cantidad += v.cantidad || 0;
    data.beneficio += v.subtotal || 0;
    data.transacciones += 1;
  });
  const topTiendas = Array.from(tiendasMap.entries())
    .map(([tienda, data]) => ({ tienda, ...data }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 10);
  const peoresTiendas = Array.from(tiendasMap.entries())
    .map(([tienda, data]) => ({ tienda, ...data }))
    .sort((a, b) => a.cantidad - b.cantidad)
    .slice(0, 5);
  
  // Top familias
  const familiasMap = new Map<string, { cantidad: number; beneficio: number }>();
  ventas.forEach(v => {
    const familia = v.descripcionFamilia || v.familia || '';
    if (!familiasMap.has(familia)) {
      familiasMap.set(familia, { cantidad: 0, beneficio: 0 });
    }
    const data = familiasMap.get(familia)!;
    data.cantidad += v.cantidad || 0;
    data.beneficio += v.subtotal || 0;
  });
  const topFamilias = Array.from(familiasMap.entries())
    .map(([familia, data]) => ({ familia, ...data }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 10);
  
  // Top temporadas
  const temporadasMap = new Map<string, { cantidad: number; beneficio: number }>();
  ventas.forEach(v => {
    const temporada = v.temporada || '';
    if (!temporadasMap.has(temporada)) {
      temporadasMap.set(temporada, { cantidad: 0, beneficio: 0 });
    }
    const data = temporadasMap.get(temporada)!;
    data.cantidad += v.cantidad || 0;
    data.beneficio += v.subtotal || 0;
  });
  const topTemporadas = Array.from(temporadasMap.entries())
    .map(([temporada, data]) => ({ temporada, ...data }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 10);
  
  // Top tallas
  const tallasMap = new Map<string, { cantidad: number; beneficio: number }>();
  ventas.forEach(v => {
    const talla = v.talla || '';
    if (!tallasMap.has(talla)) {
      tallasMap.set(talla, { cantidad: 0, beneficio: 0 });
    }
    const data = tallasMap.get(talla)!;
    data.cantidad += v.cantidad || 0;
    data.beneficio += v.subtotal || 0;
  });
  const topTallas = Array.from(tallasMap.entries())
    .map(([talla, data]) => ({ talla, ...data }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 10);
  
  // Top productos
  const productosMap = new Map<string, { cantidad: number; beneficio: number }>();
  ventas.forEach(v => {
    const producto = v.codigoUnico || v.act || '';
    if (!productosMap.has(producto)) {
      productosMap.set(producto, { cantidad: 0, beneficio: 0 });
    }
    const data = productosMap.get(producto)!;
    data.cantidad += v.cantidad || 0;
    data.beneficio += v.subtotal || 0;
  });
  const topProductos = Array.from(productosMap.entries())
    .map(([producto, data]) => ({ producto, ...data }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 10);
  
  // Estadísticas de productos
  const totalProductosPedidos = productos.reduce((sum, p) => sum + (p.cantidadPedida || 0), 0);
  const productosConPrecio = productos.filter(p => p.precioCoste && p.precioCoste > 0);
  const precioPromedioCosto = productosConPrecio.length > 0 
    ? (productosConPrecio.reduce((sum, p) => sum + (p.precioCoste || 0), 0) / productosConPrecio.length).toFixed(2)
    : '0.00';
  
  // Estadísticas de traspasos
  const totalTraspasos = traspasos.reduce((sum, t) => sum + (t.enviado || 0), 0);
  const tiendasConTraspasos = new Set(traspasos.map(t => t.tienda).filter(Boolean)).size;
  
  // Promedios
  const promedioPorTienda = tiendasUnicas > 0 ? (totalVentas / tiendasUnicas).toFixed(0) : '0';
  const promedioBeneficioPorTienda = tiendasUnicas > 0 ? (totalBeneficio / tiendasUnicas).toFixed(2) : '0.00';
  
  // Lista de tiendas
  const todasTiendas = Array.from(new Set(ventas.map(v => v.tienda))).sort();
  const tiendasTrucco = todasTiendas.filter(t => t && t.toLowerCase().includes('trucco'));
  const familiasList = Array.from(new Set(ventas.map(v => v.descripcionFamilia || v.familia).filter(Boolean))).sort();
  
  return {
    totalVentas,
    totalBeneficio,
    devoluciones,
    ventasNetas,
    tiendasUnicas,
    familiasUnicas,
    temporadasUnicas,
    tallasUnicas,
    coloresUnicos,
    ventasOnline,
    unidadesOnline,
    ventasFisicas,
    unidadesFisicas,
    tiendasOnlineUnicas,
    tiendasFisicasUnicas,
    tasaDevolucion,
    topTiendas,
    peoresTiendas,
    topFamilias,
    topTemporadas,
    topTallas,
    topProductos,
    totalProductosPedidos,
    precioPromedioCosto,
    totalTraspasos,
    tiendasConTraspasos,
    promedioPorTienda,
    promedioBeneficioPorTienda,
    todasTiendas,
    tiendasTrucco,
    familiasList
  };
}

// Función para obtener respuesta conversacional de OpenAI
async function getConversationalResponse(
  message: string,
  ventas: VentasData[],
  productos: ProductosData[],
  traspasos: TraspasosData[]
): Promise<string | null> {
  if (!openai) {
    console.log(`⚠️ OpenAI no está disponible`);
    return null;
  }

  try {
    console.log(`📊 Calculando estadísticas detalladas para contexto de OpenAI...`);
    // Calcular estadísticas detalladas
    const stats = calculateDetailedStats(ventas, productos, traspasos);

    const systemPrompt = `Eres un asistente experto en análisis de datos de retail para la aplicación RetailSense. 
Tu función es ayudar a los usuarios a entender sus datos de ventas, productos y traspasos, respondiendo CUALQUIER tipo de pregunta o consulta sobre los datos disponibles.

Datos disponibles en el sistema:
📊 RESUMEN GENERAL:
- Total de registros de ventas: ${ventas.length}
- Total de productos: ${productos.length}
- Total de traspasos: ${traspasos.length}
- Total unidades vendidas: ${stats.totalVentas.toLocaleString()}
- Total beneficio: €${stats.totalBeneficio.toLocaleString()}
- Ventas netas: €${stats.ventasNetas.toLocaleString()}
- Devoluciones: ${stats.devoluciones.toLocaleString()} unidades
- Tasa de devolución: ${stats.tasaDevolucion}%
- Promedio de ventas por tienda: ${stats.promedioPorTienda} unidades
- Promedio de beneficio por tienda: €${stats.promedioBeneficioPorTienda}

🏪 TIENDAS:
- Número de tiendas únicas: ${stats.tiendasUnicas}
- Tiendas online: ${stats.tiendasOnlineUnicas}
- Tiendas físicas: ${stats.tiendasFisicasUnicas}
- Ventas online: ${stats.unidadesOnline.toLocaleString()} unidades (€${stats.ventasOnline.toLocaleString()})
- Ventas físicas: ${stats.unidadesFisicas.toLocaleString()} unidades (€${stats.ventasFisicas.toLocaleString()})
${stats.tiendasTrucco.length > 0 ? `- Tiendas que contienen "trucco": ${stats.tiendasTrucco.length} (${stats.tiendasTrucco.slice(0, 10).join(', ')})` : ''}

Top 10 tiendas por ventas:
${stats.topTiendas.map((t, i) => `${i + 1}. ${t.tienda}: ${t.cantidad.toLocaleString()} unidades, €${t.beneficio.toLocaleString()} (${t.transacciones} transacciones)`).join('\n')}

Top 5 tiendas con menos ventas:
${stats.peoresTiendas.map((t, i) => `${i + 1}. ${t.tienda}: ${t.cantidad.toLocaleString()} unidades, €${t.beneficio.toLocaleString()}`).join('\n')}

👔 FAMILIAS Y PRODUCTOS:
- Número de familias únicas: ${stats.familiasUnicas}
- Número de tallas únicas: ${stats.tallasUnicas}
- Número de colores únicos: ${stats.coloresUnicos}
- Total productos pedidos: ${stats.totalProductosPedidos.toLocaleString()}
- Precio promedio de coste: €${stats.precioPromedioCosto}

Top 10 familias por ventas:
${stats.topFamilias.map((f, i) => `${i + 1}. ${f.familia}: ${f.cantidad.toLocaleString()} unidades, €${f.beneficio.toLocaleString()}`).join('\n')}

Top 10 productos por ventas:
${stats.topProductos.map((p, i) => `${i + 1}. ${p.producto}: ${p.cantidad.toLocaleString()} unidades, €${p.beneficio.toLocaleString()}`).join('\n')}

Top 10 tallas por ventas:
${stats.topTallas.map((t, i) => `${i + 1}. ${t.talla}: ${t.cantidad.toLocaleString()} unidades, €${t.beneficio.toLocaleString()}`).join('\n')}

📅 TEMPORADAS:
- Número de temporadas únicas: ${stats.temporadasUnicas}

Top 10 temporadas por ventas:
${stats.topTemporadas.map((t, i) => `${i + 1}. ${t.temporada}: ${t.cantidad.toLocaleString()} unidades, €${t.beneficio.toLocaleString()}`).join('\n')}

📦 TRASPASOS:
- Total unidades traspasadas: ${stats.totalTraspasos.toLocaleString()}
- Tiendas con traspasos: ${stats.tiendasConTraspasos}

Campos disponibles en ventas:
- temporada, familia, descripcionFamilia, tienda, talla, fechaVenta, cantidad, subtotal, pvp, precioCoste
- tipoTienda (Física/Online mediante campo esOnline)
- color, codigoUnico, act

Campos disponibles en productos:
- codigoUnico, act, cantidadPedida, precioCoste, pvp, fechaAlmacen, familia, talla, color

Campos disponibles en traspasos:
- codigoUnico, act, enviado, tienda, fechaEnviado

INSTRUCCIONES IMPORTANTES:
1. Responde CUALQUIER tipo de pregunta o consulta sobre los datos disponibles
2. Puedes responder preguntas sobre:
   - KPIs y métricas generales
   - Comparaciones (tiendas, familias, temporadas, etc.)
   - Análisis de rendimiento
   - Preguntas específicas sobre tiendas, productos, familias, temporadas
   - Estadísticas y promedios
   - Tendencias y patrones
   - Recomendaciones basadas en los datos
   - Preguntas filtradas por año/temporada (ej: "qué talla de pantalón fue la más vendida en 2023")
   - Preguntas sobre tallas más vendidas por familia
   - Cualquier otra consulta relacionada con los datos de retail
3. Usa los datos calculados arriba para responder preguntas específicas
4. Si el usuario pregunta sobre algo específico (ej: "ventas de la tienda X", "talla más vendida de pantalones en 2023"), calcula y proporciona la información exacta basándote en los datos disponibles
5. Para preguntas con filtros temporales (años), busca en el campo "temporada" y en "fechaVenta" si está disponible
6. Para preguntas sobre familias de productos, busca coincidencias flexibles en "descripcionFamilia" (ej: "pantalón" puede encontrarse en "PANTALONES")
7. Responde de manera natural, conversacional y útil en español
8. NO uses formato JSON ni estructuras de código. Solo texto conversacional
9. Sé amigable, profesional y útil
10. Si no tienes suficiente información para responder completamente, indica lo que SÍ puedes proporcionar basándote en los datos disponibles
11. Si el usuario hace una pregunta muy general, proporciona un resumen útil de los datos más relevantes
12. SIEMPRE intenta responder la pregunta, incluso si requiere calcular datos específicos que no están en el resumen
13. Si el usuario pregunta sobre algo específico (ej: "qué talla de pantalón fue la más vendida en 2023"), usa los datos proporcionados para calcular y dar una respuesta precisa y exacta
14. Combina tu conocimiento general sobre retail y análisis de datos con los datos específicos del Excel para dar respuestas completas y útiles`;

    console.log(`🚀 Enviando solicitud a OpenAI...`);
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      console.log(`✅ Respuesta recibida de OpenAI: ${content.substring(0, 100)}...`);
      return content;
    }
    
    console.log(`⚠️ OpenAI no devolvió contenido`);
    return null;
  } catch (error: any) {
    console.error("❌ Error en respuesta conversacional de OpenAI:", error);
    console.error("Error details:", {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
      response: error.response?.data
    });
    
    // Si falla OpenAI, retornar null para que se use el fallback
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

  console.log(`🤖 Procesando solicitud del chatbot: "${message}"`);

  // PRIORIDAD 1: Si OpenAI está disponible, usarlo primero para combinar conocimiento con datos
  if (openai) {
    try {
      console.log(`✅ Usando OpenAI para procesar la consulta...`);
      const conversationalResponse = await getConversationalResponse(message, ventas, productos, traspasos);
      
      if (conversationalResponse) {
        // Si el usuario quiere una visualización específica, intentar generarla también
        if (wantsVisualization(message)) {
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
      console.error("❌ Error en processChatbotRequest con OpenAI:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.status,
        code: error.code,
        type: error.type
      });
      
      // Continuar con fallback si OpenAI falla
      console.log(`⚠️ OpenAI falló, usando fallback con cálculo directo...`);
    }
  } else {
    console.log(`⚠️ OpenAI no está configurado, usando cálculo directo...`);
  }

  // FALLBACK: Si OpenAI no está disponible o falló, intentar respuesta directa
  console.log(`🔍 Intentando calcular respuesta directa...`);
  const directResponse = calculateDirectResponse(message, ventas, productos, traspasos);
  if (directResponse) {
    console.log(`✅ Respuesta directa encontrada`);
    // Si también quiere una visualización, intentar generarla
    if (wantsVisualization(message)) {
      try {
        const availableData = {
          ventas: ventas.length,
          productos: productos.length,
          traspasos: traspasos.length,
        };

        let analysis = openai ? await analyzeRequestWithAI(message, availableData) : null;
        if (!analysis) {
          analysis = analyzeRequest(message);
        }

        const data = generateVisualizationData(
          analysis.type,
          analysis.config,
          ventas,
          productos,
          traspasos
        );

        if (data.length > 0) {
          return {
            message: directResponse,
            visualization: {
              type: analysis.type,
              config: analysis.config,
              data,
            },
          };
        }
      } catch (vizError: any) {
        console.error("Error generando visualización:", vizError);
      }
    }
    
    return {
      message: directResponse,
    };
  }

  // Fallback: Intentar generar visualización si la pide
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

  // Si llegamos aquí y tenemos datos, proporcionar un resumen útil
  const stats = calculateDetailedStats(ventas, productos, traspasos);
  return {
    message: `Hola! Puedo ayudarte a entender tus datos. Tienes ${stats.tiendasUnicas} tiendas, ${stats.familiasUnicas} familias de productos, y ${stats.totalVentas.toLocaleString()} unidades vendidas en total. ¿Qué te gustaría saber específicamente? Puedo responder preguntas sobre ventas, tiendas, productos, familias, temporadas, devoluciones, o cualquier otra métrica relacionada con tus datos.`,
  };
}
