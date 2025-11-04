# Guía de Despliegue en Producción

## Opción 1: Railway (Recomendado - Más Fácil)

### Paso 1: Crear cuenta en Railway
1. Ve a https://railway.app
2. Crea una cuenta con GitHub
3. Haz clic en "New Project"
4. Selecciona "Deploy from GitHub repo"
5. Conecta tu repositorio `RetailSense`

### Paso 2: Configurar variables de entorno
En Railway, ve a tu proyecto → Settings → Variables:
- `NODE_ENV=production`
- `PORT` (Railway lo asigna automáticamente)
- `OPENAI_API_KEY` (opcional, si quieres usar OpenAI)

### Paso 3: Desplegar
Railway detectará automáticamente:
- `package.json` → instalará dependencias
- `npm run build` → construirá la aplicación
- `npm start` → iniciará el servidor

### Paso 4: Obtener URL pública
Railway te dará una URL como: `https://tu-app.up.railway.app`

---

## Opción 2: EasyPanel (Con tu propio servidor VPS)

### Requisitos Previos:
- Un servidor VPS con Linux (Ubuntu recomendado)
- Al menos 2 GB de RAM
- Docker instalado

### Paso 1: Instalar EasyPanel en tu servidor
```bash
# Conecta a tu servidor VPS por SSH
ssh usuario@tu-servidor-ip

# Instalar EasyPanel (requiere permisos root)
docker run --rm -it \
  -v /etc/easypanel:/etc/easypanel \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  easypanel/easypanel setup
```

### Paso 2: Acceder al panel
1. Abre tu navegador en `http://tu-servidor-ip:3000`
2. Crea tu cuenta de administrador

### Paso 3: Desplegar tu aplicación
1. En EasyPanel, crea un nuevo **Proyecto**
2. Dentro del proyecto, añade un nuevo **Servicio**
3. Selecciona **"Docker"** (recomendado) o **"Node.js"**

#### Opción A: Usando Docker (Recomendado)
1. Selecciona **"Docker"** como tipo de servicio
2. Conecta tu repositorio de GitHub
3. EasyPanel detectará automáticamente el `Dockerfile`
4. Configura:
   - **Port**: `3000`
   - **Build Context**: `/` (raíz del repositorio)

#### Opción B: Usando Node.js directamente
1. Selecciona **"Node.js"** como tipo de servicio
2. Conecta tu repositorio de GitHub
3. Configura:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Port**: `3000`
   - **Working Directory**: `/` (raíz del proyecto)

### Paso 4: Variables de Entorno
En EasyPanel, ve a tu servicio → **Environment Variables**:
- `NODE_ENV=production`
- `PORT=3000`
- `OPENAI_API_KEY=tu-api-key` (opcional)

### Paso 5: Opcional - Añadir PostgreSQL
1. En el mismo proyecto, añade un servicio **PostgreSQL**
2. EasyPanel creará automáticamente `DATABASE_URL`
3. Conecta tu servicio Node.js a la base de datos PostgreSQL

### Paso 6: Configurar dominio (opcional)
En EasyPanel puedes configurar un dominio personalizado:
- Ve a tu servicio → **Domains**
- Añade tu dominio y configura DNS

---

## Opción 3: Render (Alternativa)

1. Ve a https://render.com
2. Crea cuenta y conecta GitHub
3. Crea un nuevo "Web Service"
4. Conecta tu repositorio
5. Configura:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Environment**: `Node`
6. Añade variables de entorno
7. Despliega

---

## Opción 3: Vercel (Solo Frontend) + Railway/Render (Backend)

### Frontend en Vercel:
1. Ve a https://vercel.com
2. Conecta tu repositorio
3. Configura:
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/public`

### Backend en Railway/Render:
Sigue los pasos de la Opción 1 o 2

---

## Variables de Entorno Necesarias

```env
NODE_ENV=production
PORT=5173
OPENAI_API_KEY=tu-api-key-opcional
```

---

## Nota Importante sobre Datos

Actualmente la aplicación usa **almacenamiento en memoria** (`MemStorage`). Esto significa:
- ✅ Funciona bien para pruebas/demos
- ⚠️ Los datos se pierden al reiniciar el servidor
- 💡 Para producción real, necesitarías migrar a PostgreSQL

### Para añadir PostgreSQL en Railway:
1. En Railway, añade un servicio "PostgreSQL"
2. Railway creará automáticamente `DATABASE_URL`
3. Necesitarías actualizar `server/storage.ts` para usar PostgreSQL en lugar de `MemStorage`

---

## Prueba Local antes de Desplegar

```bash
# Construir la aplicación
npm run build

# Probar producción localmente
npm start
```

La aplicación debería estar disponible en `http://localhost:5173` (o el puerto que uses)

