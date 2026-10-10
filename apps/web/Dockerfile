# CampusTable web (Next.js) — production image.
# Build from the repo root:  docker build -f apps/web/Dockerfile -t campustable-web .
# Run locally:                docker run --rm -p 3000:3000 --env-file /private/path/.env.local campustable-web
# No secrets are baked into this image; all runtime config comes from env.

FROM node:22-alpine AS deps
WORKDIR /app/apps/web
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app/apps/web
COPY --from=deps /app/apps/web/node_modules ./node_modules
COPY apps/web ./
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app/apps/web
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/apps/web/package.json /app/apps/web/package-lock.json ./
COPY --from=build /app/apps/web/.next ./.next
COPY --from=build /app/apps/web/public ./public
COPY --from=build /app/apps/web/node_modules ./node_modules
EXPOSE 3000
USER node
CMD ["npm", "run", "start", "--", "-p", "3000"]
