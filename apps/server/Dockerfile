FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/

RUN npm install

COPY packages/shared packages/shared
COPY apps/server apps/server

WORKDIR /app/apps/server
RUN npx prisma generate

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx src/index.ts"]
