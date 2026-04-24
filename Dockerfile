FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json* ./

ENV NODE_OPTIONS=--dns-result-order=ipv4first

RUN npm config set registry https://registry.npmjs.org/ \
 && npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm install --omit=dev

COPY . .

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["npm", "start"]
