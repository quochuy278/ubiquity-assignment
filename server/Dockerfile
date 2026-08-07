# syntax=docker/dockerfile:1

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine AS base

WORKDIR /usr/src/app

RUN apk add --no-cache ca-certificates openssl

FROM base AS build

RUN npm install --global pnpm@11.20.0

# Prisma generate reads DIRECT_URL while installing, but does not connect to it.
ENV DIRECT_URL=postgresql://build:build@localhost:5432/build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src

RUN pnpm run build \
    && pnpm prune --prod --ignore-scripts

FROM base AS production

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /usr/src/app

COPY --chown=node:node --from=build /usr/src/app/package.json ./package.json
COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist
COPY --chown=node:node --from=build /usr/src/app/prisma ./prisma
COPY --chown=node:node --from=build /usr/src/app/prisma.config.ts ./prisma.config.ts

# Swagger writes the generated OpenAPI document here during application startup.
RUN mkdir -p generated && chown node:node generated

USER node

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
