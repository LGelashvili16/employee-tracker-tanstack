# syntax=docker/dockerfile:1
FROM node:26-bookworm-slim AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install --global "$(node -p "require('./package.json').packageManager")"
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store
COPY tsconfig.gps.json ./
COPY scripts/gps-*.ts ./scripts/
COPY src/features/gps/server ./src/features/gps/server
COPY src/db/schema/gps ./src/db/schema/gps
RUN pnpm exec tsc -p tsconfig.gps.json
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm prune --prod --offline --store-dir /pnpm/store

FROM node:26-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV GPS_DATA_DIR=/data
WORKDIR /app
RUN mkdir /data && chown node:node /data
COPY --from=build --chown=node:node /app/dist/gps ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
USER node
EXPOSE 5505/tcp
CMD ["node", "scripts/gps-receiver.js"]
