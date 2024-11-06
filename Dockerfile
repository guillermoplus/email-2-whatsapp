FROM node:20-alpine

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY package.json pnpm-lock.yaml ./

# Instalar dependencias
RUN npm install -g pnpm
RUN pnpm store prune
RUN pnpm install puppeteer
RUN pnpm install

# Copiar el resto del código
COPY . .

# Compilar TypeScript
RUN pnpm run build

# Exponer el puerto
EXPOSE 3072

# Comando para ejecutar la aplicación
CMD ["pnpm", "start"]
