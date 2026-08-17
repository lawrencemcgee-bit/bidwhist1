FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/client/package.json apps/client/

RUN npm install

COPY packages/shared packages/shared
COPY apps/client apps/client

WORKDIR /app/apps/client

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
