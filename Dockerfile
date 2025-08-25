FROM  node:24-alpine
LABEL org.opencontainers.image.source="https://github.com/rohit267/cloudflare-dns-updater"

WORKDIR /app

COPY package.json /app

RUN npm install

VOLUME [ "/app/config.json" ]

COPY . /app

CMD ["npm", "start"]
