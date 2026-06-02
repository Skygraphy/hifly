FROM node:20-slim

# Install dcraw and dependencies
RUN apt-get update && apt-get install -y \
    dcraw \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY dist/ ./dist/

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
