# KTH Bibliotekets EZproxy Verktyg

https://focus.lib.kth.se:9000/ezptools

https://focus.lib.kth.se:9000/hook

## Webhook som anropas av Github Actions för att Uppdatera EZProxys config.txt

- Anropet verfieras via en "webhook secret" för repositoriet
- Tjänsten kör ett script, ezpconf.sh, som gör en "git pull", i en git-folder: /usr/local/ezproxyrepo.
- Om config-filen ändrats så skrivs den till config-filen i ezproxys programfolder: /usr/local/ezproxy

### Dokumentation

Det här repot installeras manuellt på server:

En dockerfil plus workflow bygger en image via github actions när repot pushas till main

- Skapa folder: /usr/local/docker/ezproxytools

- Skapa där en .env med parametrar
    WEBHOOK_SECRET=xxxxxxxxxxxxx
    PORT=9000
    GITHUB_WEBHOOK_HASHALG=SHA256
    GITHUB_WEBHOOK_SIGNATURE_HEADER=x-hub-signature-256
    GITHUB_DEPLOY_SCRIPT=/app/ezpconf.sh
    ACTIONEVENT=ezproxyupdate
    SECRET=xxxxxx
    KEYFILE=00000022.key
    CRTFILE=00000022.crt
    CAFILE=00000022.ca
    AUTHORIZEDGROUPS=pa.anstallda.T.TR;pa.anstallda.M.MOE
    LOGFILE=ezpconf.log
    REPOPATH=/usr/local/ezproxyrepo
    EZPROXYPATH=/usr/local/ezproxy
    CONFIGFILE=config.txt
    SHIBFILE=shibuser.txt
    STANZAFILE=db_stanzas.txt
    IPCONFIGFILE=ip_config.txt
    LDAP_API_URL=api.lib.kth.se/ldap/api/v1/
    LDAPAPIKEYREAD=mnsidfyn97e6rteb6p963nsydfsayfdaysnalutfbo7we66we062409643q2nt60nt3q976g7n3q9_36g-93q26gn
    SOCKETIOPATH=/socket.io

- Skapa där docker-compose-fil, se till att ha rätt version av crt-,key-,ca- filer

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
Efter varje ny push till repot:
- Kör docker compose pull (för att hämta rätt package från github)
- Kör sedan: docker compose up -d --build (för att start om container)

#### ToDo
- Hantera att KTH-IT centralt ändrar sina certifikatprocesser