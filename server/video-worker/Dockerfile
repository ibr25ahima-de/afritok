FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
RUN sed -i 's/"@builder.io\/vite-plugin-jsx-loc": "\^0\.0\.1"/"@builder.io\/vite-plugin-jsx-loc": "^0.1.1"/' package.json
RUN corepack enable && pnpm install --no-frozen-lockfile

COPY . .

EXPOSE 10001
CMD ["pnpm", "exec", "tsx", "server/video-worker/worker-server.ts"]
