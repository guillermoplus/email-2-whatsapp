FROM node:22-alpine

WORKDIR /app

# Dependencias de sistema para Puppeteer en Alpine.
# Va antes del COPY para aprovechar la cache de capas.
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Puppeteer usa el Chromium de Alpine, asi que no descarga el suyo: el binario
# que publica es glibc-only y aqui no sirve.
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Copiar manifiestos primero para cachear la instalacion
COPY package.json pnpm-lock.yaml ./

# pnpm fijado: las versiones >=10 ignoran los scripts de instalacion salvo los
# declarados en pnpm.onlyBuiltDependencies, del que depende el binding nativo
# de sqlite3.
RUN npm install -g pnpm@10.8.1

# --frozen-lockfile: falla si el lockfile no coincide con package.json, en vez
# de resolver versiones distintas a las probadas.
RUN pnpm install --frozen-lockfile

# Copiar el resto del codigo
COPY . .

# Compilar TypeScript
RUN pnpm run build

EXPOSE 3072

CMD ["pnpm", "start"]
