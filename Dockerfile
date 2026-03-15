FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json ./
COPY prisma ./prisma

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN npm install

COPY . .

ENV DATABASE_URL=file:./prisma/dev.db
ENV AI_PROVIDER_MODE=local
ENV AI_MODEL=heuristic-v1
ENV OPENAI_MODEL=
ENV AI_COMPATIBLE_BASE_URL=
ENV AI_COMPATIBLE_MODEL=

RUN npx prisma generate

CMD ["npm", "run", "dev"]
