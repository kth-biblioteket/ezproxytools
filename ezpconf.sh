#!/bin/sh

# variables
LOGFILE=${1}
REPOPATH=${2}
EZPROXYPATH=${3}
CONFIGFILE=${4}
SHIBFILE=${5}
STANZAFILE=${6}
IPCONFIGFILE=${7}

set -e

# Sökväg till EZproxy-tjänsten
cd $REPOPATH

# chmod 755 ezproxy

current_timestamp_config=$(stat -c %Y ./$CONFIGFILE)
current_timestamp_stanza=$(stat -c %Y ./$STANZAFILE)
current_timestamp_ip_config=$(stat -c %Y ./$IPCONFIGFILE)

if ! git pull origin main | grep -q 'Already up to date'; then
        # Uppdaterades config-filen?
        if [ $(stat -c %Y ./$CONFIGFILE) -gt $current_timestamp_config ]; then
                cat ./$CONFIGFILE > $EZPROXYPATH/$CONFIGFILE
                echo "$(date) - $EZPROXYPATH/$CONFIGFILE was updated from repository" >> "./$LOGFILE"
        else
                echo "$(date) - $EZPROXYPATH/$CONFIGFILE was NOT updated from repository" >> "./$LOGFILE"
        fi

        # Uppdaterades stanza-filen?
        if [ $(stat -c %Y ./$STANZAFILE) -gt $current_timestamp_stanza ]; then
                cat ./$STANZAFILE > $EZPROXYPATH/$STANZAFILE
                echo "$(date) - $EZPROXYPATH/$STANZAFILE was updated from repository" >> "./$LOGFILE"
        else
                echo "$(date) - $EZPROXYPATH/$STANZAFILE was NOT updated from repository" >> "./$LOGFILE"
        fi

        # Uppdaterades ip_config-filen?
        if [ $(stat -c %Y ./$IPCONFIGFILE) -gt $current_timestamp_ip_config ]; then
                cat ./$IPCONFIGFILE > $EZPROXYPATH/$IPCONFIGFILE
                echo "$(date) - $EZPROXYPATH/$IPCONFIGFILE was updated from repository" >> "./$LOGFILE"
        else
                echo "$(date) - $EZPROXYPATH/$IPCONFIGFILE was NOT updated from repository" >> "./$LOGFILE"
        fi
fi
