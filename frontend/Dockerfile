FROM node:22-alpine

WORKDIR /usr/src/app

# Instala as dependências antes do código para aproveitar o cache de camadas.
COPY package.json package-lock.json ./
RUN npm ci

# Copia somente os arquivos usados pelo Angular, sem incluir node_modules do host.
COPY angular.json tsconfig*.json .postcssrc.json ./
COPY src ./src
COPY public ./public

EXPOSE 4200

CMD ["npm", "start", "--", "--host", "0.0.0.0", "--port", "4200", "--poll", "1000"]
