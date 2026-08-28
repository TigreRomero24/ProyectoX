FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
COPY vendor ./vendor
RUN npm ci

COPY . .

RUN npm run build