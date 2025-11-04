# Dockerfile para EasyPanel
FROM node:20-alpine

WORKDIR /app

# Copiar archivos de configuración de dependencias
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies para build)
RUN npm ci

# Copiar el resto de los archivos
COPY . .

# Construir la aplicación
RUN npm run build

# Limpiar dependencias de desarrollo (opcional, para reducir tamaño)
RUN npm prune --production

# Exponer el puerto (EasyPanel asignará el puerto automáticamente)
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Comando para iniciar la aplicación
CMD ["npm", "start"]

