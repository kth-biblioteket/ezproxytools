require('dotenv').config()

const jwt = require("jsonwebtoken");
const VerifyToken = require('./VerifyToken');
const VerifyAdmin = require('./VerifyAdmin');

const https = require("https");

const fs = require("fs");
const path = require('path');
const readline = require('readline');

const cors = require("cors");

const express = require('express')
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { exec } = require('child_process');
const process = require("process");
const ezpControllers = require('./ezpControllers');
const socketIo = require("socket.io");
const cookieParser = require("cookie-parser");

const app = express()

const port = process.env.PORT
const webhook_secret = process.env.WEBHOOK_SECRET

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.use(cookieParser());

app.use(cors({ 
    preflightContinue: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH' , 'DELETE', 'OPTIONS'],
    origin: true 
}));

const apiRoutes = express.Router();

// Skicka allt till https

app.use((req, res, next) => {
    if (req.protocol === 'http') {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }

    next();
});


app.use('/hook', apiRoutes);

const server = https.createServer(
    //Använd ezproxys cert/key/ca
    {
      key: fs.readFileSync(process.env.KEYFILE),
      cert: fs.readFileSync(process.env.CRTFILE),
      ca: fs.readFileSync(process.env.CAFILE),
    },
    app
  )
  .listen(port, () => {
    console.log(`server is running at port ${port}`);
  });

const io = socketIo(server, {cors: {
    origin: "http://localhost:3000"
  },path: process.env.SOCKETIOPATH})

const sockets = {}

io.on("connection", (socket) => {
    socket.on("connectInit", (sessionId) => {
        sockets[sessionId] = socket.id
        app.set("sockets", sockets)
    })
})

app.set("io", io)

/**
 * 
 * @param  {...any} command 
 * 
 * @returns 
 * 
 * Funktion som kör shellkommando som promise
 */
function cmd(...command) {
    let p = exec(command[0], command.slice(1));
    return new Promise((resolve) => {
        p.stdout.on("data", (x) => {
            process.stdout.write(x.toString());
        });
        p.stderr.on("data", (x) => {
            process.stderr.write(x.toString());
        });
        p.on("exit", (code) => {
            resolve(code);
        });
    });
}

/**
 * 
 *
 * @param {*} body 
 * @param {*} secret 
 * @param {*} signature 
 * @returns 
 * 
 * Funktion som validerar webhook secret
 * 
 */
function validateSignature(body, secret, signature) {
    var hash = crypto.createHmac(process.env.GITHUB_WEBHOOK_HASHALG, secret)
        .update(JSON.stringify(body))
        .digest('hex');
    return (hash === signature.split("=")[1]);
}

app.get("/", async function (req, res, next) {
    try {
        let verify = await VerifyAdmin(req, res, next)
    } catch(err) {
        res.render('login', {logindata: {"status": "ok", "message": "login"}})
    }
});

app.get("/ezptools", VerifyToken, async function (req, res, next) {
    try {
        fs.readdir(process.env.EZPROXYPATH, (err, files) => {
            if (err) {
              console.error(err);
              res.status(500).send('Error reading directory');
            } else {
                // Filter the files by their extension
                const logFiles = files.filter(file => path.extname(file) === '.log');

              res.render('ezptools', { logFiles,logindata: {"status": "ok", "message": "login"} });
            }
        });
    } catch(err) {
        res.render('ezptools', {logindata: {"status": "error", "message": err.message}})
    }
});

app.post("/login", ezpControllers.login)

app.post("/logout", VerifyToken, ezpControllers.logout)

app.post('/summary', async (req, res) => {

    try {
        const selectedFile = req.body.file;

        let total = 0;
        
        const counts = {};
        const summary = {}

        let lineCount = 0;

        const io = req.app.get('io');
        const sockets = req.app.get('sockets');
        const thisSocketId = sockets[req.body.sessionId];
        const socketInstance = io.to(thisSocketId);

        socketInstance.emit('analyzeProgress', `{"type": "log", "message": "Initierar...", "total": ${total}, "progress": 0}`);

        for await (const _ of readline.createInterface({input: fs.createReadStream(process.env.EZPROXYPATH + '/' + selectedFile), crlfDelay: Infinity})) {
            lineCount++;
        }

        total = lineCount;

        const rl = readline.createInterface({
        input: fs.createReadStream(process.env.EZPROXYPATH + '/' + selectedFile),
        crlfDelay: Infinity
        });
        let i = 0

        // 145.14.101.30 Ql3voUxBxWvuinx yueche@kth.se [01/Jul/2021:00:00:03 +0200] "GET https://focus.lib.kth.se:443/login?url=https://pubs.acs.org/doi/10.1021/acs.biochem.7b01248 HTTP/1.1" 302 0
        // IP id username date url status size

        let logRegex
        let downloadheader = ''
        //Lyckade hämtningar pdf
        if (req.body.downloadtype == 'pdf_success' && req.body.databases == 'all') {
            logRegex = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s(\w+)\s([\w@.]+)\s\[(.*)\]\s\"GET\s(.*)pdf(.*)\sHTTP\/\d.\d\"\s(200)\s(\d+)/;
            downloadheader = "PDF Downloads"
        }

        //Lyckade hämtningar pdf för vald databas
        if (req.body.downloadtype == 'pdf_success' && req.body.databases != 'all') {
            logRegex = new RegExp(`^(\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})\\s(\\w+)\\s([\\w@.]+)\\s\\[(.*)\\]\\s\"GET\\s((.*)${req.body.databases}(.*))pdf(.*)\\sHTTP\\/\\d.\\d\"\\s(200)\\s(\\d+)`);
            //logRegex = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s(\w+)\s([\w@.]+)\s\[(.*)\]\s\"GET\s((.*)wiley.com(.*))pdf(.*)\sHTTP\/\d.\d\"\s(200)\s(\d+)/;;
            downloadheader = `PDF Downloads for ${req.body.databases}`
        }

        //Lyckade hämtningar generellt
        if (req.body.downloadtype == 'all_success' && req.body.databases == 'all') {
            //logRegex = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s(\w+)\s([\w@.]+)\s\[(.*)\]\s\"GET\s(.*)\sHTTP\/\d.\d\"\s(200)\s(\d+)/;
            logRegex = new RegExp(`^(\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})\\s(\\w+)\\s([\\w@.]+)\\s\\[(.*)\\]\\s\"GET\\s(.*)\\sHTTP\\/\\d.\\d\"\\s(200)\\s(\\d+)`);
            downloadheader = "Alla lyckade anrop"
        }

        //Lyckade hämtningar generellt
        if (req.body.downloadtype == 'all_success' && req.body.databases != 'all') {
            //logRegex = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s(\w+)\s([\w@.]+)\s\[(.*)\]\s\"GET\s(.*)\sHTTP\/\d.\d\"\s(200)\s(\d+)/;
            logRegex = new RegExp(`^(\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})\\s(\\w+)\\s([\\w@.]+)\\s\\[(.*)\\]\\s\"GET\\s((.*)${req.body.databases}(.*))\\sHTTP\\/\\d.\\d\"\\s(200)\\s(\\d+)`);
            downloadheader = "Alla lyckade anrop"
        }

        //Alla försök till hämtningar generellt
        if (req.body.downloadtype == 'all') {
            logRegex = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s(\w+)\s([\w@.]+)\s\[(.*)\]\s\"GET\s(.*)\sHTTP\/\d.\d\"\s(\d+)\s(\d+)/;
            downloadheader = "Alla anropsförsök"
        }
        
        rl.on('line', (line) => {
            const match = logRegex.exec(line);
            if (!match) {

            } else {
                const ipaddress = match[1];
                const id = match[2];       
                const username = match[3];        
                const timestampString = match[4];
                const url = match[5];
                const status = match[7];
                const size = match[8];
                const ipuser = ipaddress + ', ' + username

                //Datum
                const timestampRegex = /^(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s([-+]\d{4})$/;
                const [, day, monthStr, year, hour, minute, second, timezoneOffset] = timestampRegex.exec(timestampString);
                const month = new Date(Date.parse(`${monthStr} 1, 2021`)).getMonth() + 1;
                /*
                const date__ = new Date(year, month, day, hour, minute, second)

                const result = date__.toLocaleDateString("sv-SE", { // you can use undefined as first argument
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
                })
                */
                //Använd per år
                // 20230305 14:23:43
                const time_ = year + '-' + addZero(month) + '-' + day + ' ' + hour + ':' + minute + ':' + second
        
                const timestamp = monthStr + ' ' + year

                // create an array of the variables
                const data = [ipaddress, id, username, time_, url, status, size];
                

                if (!summary[timestamp]) {
                    summary[timestamp] = {};
                }
                /*
                if (!summary[timestamp][username]) {
                summary[timestamp][username] = 0;
                }
                

                if (!summary[timestamp][ipaddress]) {
                summary[timestamp][ipaddress] = 0;
                }
                */
                const url_ = new URL(match[5]);
                if (!summary[timestamp][ipuser]) {
                    summary[timestamp][ipuser] = {};                    
                    
                } else {
                } 

                if (!summary[timestamp][ipuser][url_.hostname]) {
                    summary[timestamp][ipuser][url_.hostname] = 0;
                }

                //if(parseInt(size) > 1000) {
                    summary[timestamp][ipuser][url_.hostname]++;
                //}
                //summary[timestamp][ipuser][url_.hostname]++;
            }
            i++
            if (i % (total*0.05).toFixed(0) === 0) {
                socketInstance.emit('analyzeProgress', `{"type": "log","message": "Hämtar ${i} av ${total}", "total": ${total}, "progress": ${i}}`);
            }
        });
        rl.on('close', () => {
            socketInstance.emit('analyzeProgress', `{"type": "log","message": "Klart!", "total": ${total}, "progress": ${total}}`);
            let html = `<table id="logfileDT" class="table table-striped" style="width:100%">
                        <thead>
                            <tr>
                                <th>Datum</th>
                                <th>Ip-adress - Användare</th>
                                <th>Databas</th>
                                <th>${downloadheader}</th>
                            </tr>
                        </thead>
                        <tbody>
                    `;
            for (const date in summary) {
                /*
                for (const username in summary[date]) {
                    const count = summary[date][username];
                    html += `<tr><td>${date}</td><td>${username}</td><td>${count}</td></tr>`;
                }
                
                for (const ipaddress in summary[date]) {
                    const count = summary[date][ipaddress];
                    html += `<tr><td>${date}</td><td>${ipaddress}</td><td>${count}</td></tr>`;
                }
                */
                for (const ipuser in summary[date]) {
                    const count = summary[date][ipuser];
                    //console.log(ipuser)
                    for(const urlt in summary[date][ipuser]) {
                        //console.log(urlt)
                        const count2 = summary[date][ipuser][urlt];
                    //}
                        html += `<tr><td>${date}</td><td>${ipuser}</td><td>${urlt} </td><td>${count2}</td></tr>`;
                    }
                }
            }
            html += `</tbody>
                        <tfoot>
                            <tr>
                                <th></th>
                                <th></th>
                                <th></th>
                                <th></th>
                            </tr>
                        </tfoot>
                    </table>`;
        
            /*
            //Jquery datatables
            html +=  `<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
                    <link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/1.11.3/css/jquery.dataTables.css">
                    <script type="text/javascript" charset="utf8" src="https://cdn.datatables.net/1.11.3/js/jquery.dataTables.js"></script>
                    <script>
                        $(document).ready(function() {
                            $('#summary').DataTable();
                        });
                    </script>
                    `;
            */
            //ws.end();
            res.send(html);
        });
    } catch(err) {
        res.json(err.message);
    }

});

app.post("/searchlog", (req, res) => {
    const searchString = req.body.search;
    const logFile = req.body.file;

    // Om ingen söksträng skickas, gör ingenting
    if (!searchString || !logFile) {
        return res.status(400).send({ error: "No search string or log file provided" });
    }

    const safeFile = path.join(process.env.EZPROXYPATH, req.body.file);

    // Skydda mot shell injection genom att tillåta bara vissa tecken
    const safeSearch = searchString.replace(/[^a-zA-Z0-9:/._-]/g, "");

    

    // Kör grep på servern
    exec(`grep -R "${safeSearch}" "${safeFile}"`, (error, stdout, stderr) => {
        if (error) {
        // Om grep inte hittar något returnerar det exit code 1, det är inte ett "fel"
        if (error.code === 1) return res.send("<pre>No matches found</pre>");
        console.error(`grep error: ${error.message}`);
        return res.status(500).send({ error: "Search failed" });
        }

        res.send(`<pre>${stdout}</pre>`);
    });
});

/**
 * Funktion som svarar på vanlig "get"
 */
apiRoutes.get('/', function (req, res, next) {
    res.send("KTH Biblioteket Webhook för EZProxy")
});

/**
 * Funktion som tar emot anrop från Github Actions
 * 
 */
apiRoutes.post('/', function (req, res, next) {
    if (!validateSignature(req.body, webhook_secret, req.get(process.env.GITHUB_WEBHOOK_SIGNATURE_HEADER))) {
        return res.status(401).send({ errorMessage: 'Invalid Signature' });
    }

    var action = req.body.data.action.toLowerCase();
    switch (action) {
        case process.env.ACTIONEVENT:
            // Scriptanrop
            exec(`${process.env.GITHUB_DEPLOY_SCRIPT} ${process.env.LOGFILE} ${process.env.REPOPATH} ${process.env.EZPROXYPATH} ${process.env.CONFIGFILE} ${process.env.SHIBFILE} ${process.env.STANZAFILE} ${process.env.IPCONFIGFILE}`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    res.status(401).send({ errorMessage: error });
                }
                console.log(stdout);
            });
            break;
        default:
            console.log('No handler for type', action);
    }
    res.status(204).send();
});

function addZero(i) {
    if (i < 10) {
        i = "0" + i;
    }
    return i;
}