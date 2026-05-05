FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN node ace build

# ----------

FROM node:24-alpine

WORKDIR /app

# Use Alpine v3.17 repo to pin pg_dump to v15 for compatibility with
# our DB container, avoiding the higher v18 in newer Alpine.
RUN apk add --no-cache postgresql15-client --repository=http://dl-cdn.alpinelinux.org/alpine/v3.17/main

# Copy only the compiled code from the builder stage to save space
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./

# Install only production dependencies (no TypeScript, linter, test runner etc.) to save RAM and space
RUN npm install --omit=dev

EXPOSE 3333

CMD ["node", "build/bin/server.js"]