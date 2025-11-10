import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface SentimentAnalysisResult {
  sentiment: "positivo" | "neutro" | "negativo";
  sentimentScore: number;
  tema?: "producto" | "talla" | "calidad" | "precio" | "envio" | "tienda" | "web";
}

export class SentimentAnalysisService {
  private cleanText(text: string): string {
    let cleaned = text.toLowerCase();
    cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, "");
    cleaned = cleaned.replace(/@\w+/g, "");
    cleaned = cleaned.replace(/#\w+/g, "");
    cleaned = cleaned.replace(/[^\w\sáéíóúñ¿?¡!]/g, " ");
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    
    return cleaned;
  }

  async analyzeSentiment(text: string): Promise<SentimentAnalysisResult> {
    const cleanedText = this.cleanText(text);
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Eres un experto en análisis de sentimientos para retail de moda. 
Analiza el siguiente comentario y devuelve un JSON con:
1. "sentiment": "positivo", "neutro", o "negativo"
2. "sentimentScore": número entre 0 (muy negativo) y 1 (muy positivo)
3. "tema": el tema principal del comentario entre "producto", "talla", "calidad", "precio", "envio", "tienda", "web", o null si no aplica

Responde SOLO con el JSON, sin explicaciones adicionales.`,
          },
          {
            role: "user",
            content: cleanedText,
          },
        ],
        temperature: 0.3,
        max_tokens: 100,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      const result = JSON.parse(content);
      return {
        sentiment: result.sentiment,
        sentimentScore: result.sentimentScore,
        tema: result.tema || undefined,
      };
    } catch (error) {
      console.error("Error analyzing sentiment:", error);
      return {
        sentiment: "neutro",
        sentimentScore: 0.5,
      };
    }
  }

  async batchAnalyzeSentiments(texts: string[]): Promise<SentimentAnalysisResult[]> {
    const results: SentimentAnalysisResult[] = [];
    
    for (const text of texts) {
      const result = await this.analyzeSentiment(text);
      results.push(result);
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }
}

export const sentimentAnalysisService = new SentimentAnalysisService();
