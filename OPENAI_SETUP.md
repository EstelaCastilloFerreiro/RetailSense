# Configuración de OpenAI para el Chatbot

## Variables de Entorno

Para usar OpenAI con el chatbot, necesitas configurar la variable de entorno `OPENAI_API_KEY`.

### Opción 1: Archivo .env (Recomendado para desarrollo)

Crea un archivo `.env` en la raíz del proyecto:

```env
OPENAI_API_KEY=sk-tu-api-key-aqui
```

### Opción 2: Variables de sistema

```bash
export OPENAI_API_KEY=sk-tu-api-key-aqui
```

### Opción 3: En producción (Replit, Vercel, etc.)

Configura la variable de entorno en el panel de configuración de tu plataforma.

## Obtención de API Key

1. Ve a https://platform.openai.com/api-keys
2. Inicia sesión o crea una cuenta
3. Haz clic en "Create new secret key"
4. Copia la clave y guárdala de forma segura

## Modelo utilizado

Por defecto se usa `gpt-4o-mini` que es más económico. Puedes cambiarlo en `server/services/chatbotService.ts`:

```typescript
model: "gpt-4o-mini", // Cambiar a "gpt-4" o "gpt-3.5-turbo" si prefieres
```

## Fallback

Si no se configura la API key, el sistema usará un análisis basado en reglas (patrones de texto) como respaldo, por lo que el chatbot seguirá funcionando aunque con capacidades limitadas.

## Costos

- `gpt-4o-mini`: ~$0.15 por 1M tokens de entrada, ~$0.60 por 1M tokens de salida
- `gpt-4`: ~$30 por 1M tokens de entrada, ~$60 por 1M tokens de salida
- `gpt-3.5-turbo`: ~$0.50 por 1M tokens de entrada, ~$1.50 por 1M tokens de salida

Cada solicitud del chatbot consume aproximadamente 500-1000 tokens.

