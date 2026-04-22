FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Crear carpeta storage con permisos correctos antes de cambiar usuario
RUN mkdir -p storage/materias && chmod -R 755 storage

RUN addgroup -S app && adduser -S app -G app
RUN chown -R app:app /app

USER app

EXPOSE 3000

CMD ["node", "index.js"]