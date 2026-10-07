
FROM node:22-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build


FROM node:22-alpine AS runner
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production

COPY prisma ./prisma
RUN npx prisma generate


COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main"]