# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copia package.json e package-lock.json
COPY package*.json ./

# Instala todas as dependências
RUN npm install

# Copia o restante do projeto
COPY . .

# Build para produção
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Copia apenas os arquivos essenciais
COPY --from=builder /app/package*.json ./
RUN npm install --production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Define porta
EXPOSE 3000

# Roda o Next.js ouvindo em 0.0.0.0
CMD ["npx", "next", "start", "-p", "3000", "-H", "0.0.0.0"]
