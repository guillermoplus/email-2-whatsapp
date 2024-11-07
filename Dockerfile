FROM node:20-alpine

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY package.json pnpm-lock.yaml ./

# Instalar pnpm y las dependencias
RUN npm install -g pnpm
RUN pnpm store prune
RUN pnpm install --save-dev puppeteer
RUN pnpm install puppeteer-core

# Instalar las dependencias de sistema necesarias para Puppeteer en Alpine
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Definir la ubicación del ejecutable de Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Instalar dependencias de la app
RUN pnpm install

# Copiar el resto del código
COPY . .

# Compilar TypeScript
RUN pnpm run build

# Exponer el puerto
EXPOSE 3072

# Comando para ejecutar la aplicación
CMD ["pnpm", "start"]
