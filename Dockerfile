FROM  node:18-alpine

WORKDIR /app

COPY package.json /app

RUN npm install

VOLUME [ "/app/config.json" ]

COPY . /app

CMD ["npm", "start"]
