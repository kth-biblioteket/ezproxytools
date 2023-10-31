# KTH Bibliotekets EZproxy Verktyg

https://focus.lib.kth.se:9000/ezptools

https://focus.lib.kth.se:9000/hook

## Webhook som anropas av Github Actions för att Uppdatera EZProxys config.txt

- Anropet verfieras via en "webhook secret" för repositoriet
- Tjänsten kör ett script, ezpconf.sh, som gör en "git pull", i en git-folder: /usr/local/ezproxyrepo.
- Om config-filen ändrats så skrivs den till config-filen i ezproxys programfolder: /usr/local/ezproxy

### Dokumentation

En dockerfil bygger en image via github actions som kan hämtas och startas med 
docker compose up -d (docker compose pull)

- Skapa en .env med parametrar
    WEBHOOK_SECRET=xxxxxxxxxxxxx
    PORT=9000
    GITHUB_WEBHOOK_HASHALG=SHA256
    GITHUB_WEBHOOK_SIGNATURE_HEADER=x-hub-signature-256
    GITHUB_DEPLOY_SCRIPT=/app/ezpconf.sh
    ACTIONEVENT=ezproxyupdate

- Skapa docker-compose-fil

´´´ yml
version: '3.6'

services:
  ezproxytools:
    container_name: ezproxytools
    image: ghcr.io/kth-biblioteket/ezproxytools:main
    privileged: true
    restart: always
    env_file:
      - .env
    ports:
      - 9000:9000
    volumes:
      - /usr/local/ezproxy:/usr/local/ezproxy
      - /usr/local/ezproxyrepo:/usr/local/ezproxyrepo
      - ./00000020.crt:/app/00000020.crt
      - ./00000020.key:/app/00000020.key
      - ./00000020.ca:/app/00000020.ca
´´´