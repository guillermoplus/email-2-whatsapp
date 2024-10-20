# Usar la imagen oficial de Node.js
FROM node:20-alpine

# Instalar pnpm globalmente
RUN npm install -g pnpm

# Crear directorio de trabajo
WORKDIR /app

# Copiar los archivos de dependencias
COPY pnpm-lock.yaml ./
COPY package.json ./

# Instalar dependencias usando pnpm
RUN pnpm install --frozen-lockfile

# Copiar el resto del código fuente
COPY . .

# Exponer el puerto
EXPOSE 3000

# Comando de inicio
CMD ["pnpm", "start"]
