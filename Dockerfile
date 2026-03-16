FROM node:20-trixie-slim

WORKDIR /app

COPY package.json ./
COPY prisma ./prisma

RUN apt-get update && apt-get install -y openssl libgomp1 libvulkan1 && rm -rf /var/lib/apt/lists/*

RUN npm install
RUN if [ -d /app/node_modules/@kutalia/whisper-node-addon/dist/linux-x64 ]; then \
      cp /app/node_modules/@kutalia/whisper-node-addon/dist/linux-x64/lib*.so* /usr/lib/x86_64-linux-gnu/ && ldconfig; \
    fi
RUN if [ -d /app/node_modules/@kutalia/whisper-node-addon/dist/linux-arm64 ]; then \
      cp /app/node_modules/@kutalia/whisper-node-addon/dist/linux-arm64/lib*.so* /usr/lib/aarch64-linux-gnu/ && ldconfig; \
    fi

COPY . .

ENV DATABASE_URL=file:./prisma/dev.db
ENV AI_PROVIDER_MODE=local
ENV AI_MODEL=heuristic-v1
ENV OPENAI_MODEL=
ENV AI_COMPATIBLE_BASE_URL=
ENV AI_COMPATIBLE_MODEL=

RUN npx prisma generate

CMD ["npm", "run", "dev"]
