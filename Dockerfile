FROM node:16-alpine

# Installera git
RUN apk add --no-cache git

WORKDIR /app

COPY . .

# Gör skriptet körbart
RUN chmod +x /app/ezpconf.sh

RUN npm install

EXPOSE 9000

CMD ["npm", "start"]
