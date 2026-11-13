FROM node:24-trixie-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl libgomp1 libvulkan1 sqlite3 python3 ca-certificates zip && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
RUN arch="$(dpkg --print-architecture)" && \
    case "$arch" in amd64) addon_arch=x64; system_arch=x86_64;; arm64) addon_arch=arm64; system_arch=aarch64;; esac && \
    cp node_modules/@kutalia/whisper-node-addon/dist/linux-"$addon_arch"/lib*.so* /usr/lib/"$system_arch"-linux-gnu/ && ldconfig
COPY . .
ENV DATABASE_URL=file:/app/.data/cioassistant.db AI_PROVIDER_MODE=local AI_MODEL=heuristic-v1 NEXT_TELEMETRY_DISABLED=1
RUN npm run prisma:generate && npm run build
RUN sh scripts/package-mcp.sh
CMD ["sh", "-ec", "node scripts/database.mjs check && ./node_modules/.bin/prisma migrate deploy && exec npm start"]
