
# Etapa 1: instalar dependências
FROM node:24-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci


# Etapa 2: build do React
FROM node:24-alpine AS build

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules

COPY . .

ARG VITE_API_URL=/api

ENV VITE_API_URL=${VITE_API_URL}

RUN npm run test

RUN npm run build


# Etapa 3: servir com Nginx
FROM nginx:1.28-alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
