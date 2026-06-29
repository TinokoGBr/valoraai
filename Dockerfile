# Imagem leve do Node.js
FROM node:20-slim

WORKDIR /app

# Copia primeiro os arquivos de dependências para aproveitar cache do Docker
COPY package*.json ./

RUN npm install --omit=dev

# Copia o restante do código
COPY . .

# Garante que a pasta de uploads temporários existe
RUN mkdir -p uploads

EXPOSE 3000

CMD ["node", "server.js"]
