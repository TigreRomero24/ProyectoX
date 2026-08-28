FROM node:24-alpine

# Crear usuario y grupo antes para usar IDs consistentes (UID 1000 es estándar)
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

COPY package*.json ./
RUN npm ci

# Copiar el resto del código (excluyendo lo definido en .dockerignore)
COPY . .

# Asegurar que las carpetas de datos existan y tengan el dueño correcto
# Esto es crítico para cuando NO hay volúmenes montados
RUN mkdir -p storage/materias logs && \
    chown -R app:app /app && \
    chmod -R 755 /app && \
    chmod 777 logs

USER app

EXPOSE 3000

CMD ["node", "index.js"]