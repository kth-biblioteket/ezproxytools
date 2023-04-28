const jwt = require("jsonwebtoken");
var jwkToPem = require('jwk-to-pem');

function verifyAdmin(req, res, next) {
    return new Promise(function (resolve, reject) {

        let token = req.body.jwt
            || req.query.jwt
            || req.body.apikey
            || req.query.apikey
            || req.cookies.jwt;

        if (!token)
            reject("no token");

        if (req.body.jwt || req.query.jwt || req.cookies.jwt) {
            jwt.verify(token, process.env.SECRET, function (err, decoded) {
                if (err) {
                    console.log(err.message)
                    reject(err.message)
                }
                req.userprincipalname = decoded.id;

                req.token = jwt.sign({ id: req.userprincipalname }, process.env.SECRET, {
                    expiresIn: "7d"
                });
                resolve("ok");
            });
        }

        /*
        if (req.headers['kth-ug-token']) {
            //public key: https://login.ref.ug.kth.se/adfs/discovery/keys
            var keys = { kty: "RSA", use: "sig", alg: "RS256", kid: "lxiNqR7Muv6dbY7WAgq-m1BE09w", x5t: "lxiNqR7Muv6dbY7WAgq-m1BE09w", n: "vGV1umdrKoOHimCSO9aAfAy2ri_4FNU4bodC_dHvJZSbb6CwiQGAJ5LDh3UUcjiG5S6R-Tz_Qz4f3wx5p1nX9yXA6KilJy4XPzXfdGX3I6ad_B3hQYUDVtKC0Ng73eeinaSsz80BVik3bOEbkh4coa2tt9QQJYe_dVPv25XDgu33BEQTdThhcgUcqJexmVbmC0x1KnrhLMvcgPahnRXEi4BUFg1Y_vPfN7A3QHasOQQP3UNsqxpyZ8JFlu29NBPTruSpRr_2ad_giCttIS-HBO7Lc1aknucFzsvO6PPModlvZxDYA198RNaW6QPs-M5xcfvxl6zf2sPHk4eM3IHU-Q", e: "AQAB", x5c: ["MIIC6jCCAdKgAwIBAgIQQDWQJHmY84BMdFTka2bHAjANBgkqhkiG9w0BAQsFADAxMS8wLQYDVQQDEyZBREZTIFNpZ25pbmcgLSBmZWQtcmVmLTEucmVmLnVnLmt0aC5zZTAeFw0xOTA0MDkyMDUxMTdaFw0yOTA0MDYyMDUxMTdaMDExLzAtBgNVBAMTJkFERlMgU2lnbmluZyAtIGZlZC1yZWYtMS5yZWYudWcua3RoLnNlMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvGV1umdrKoOHimCSO9aAfAy2ri\/4FNU4bodC\/dHvJZSbb6CwiQGAJ5LDh3UUcjiG5S6R+Tz\/Qz4f3wx5p1nX9yXA6KilJy4XPzXfdGX3I6ad\/B3hQYUDVtKC0Ng73eeinaSsz80BVik3bOEbkh4coa2tt9QQJYe\/dVPv25XDgu33BEQTdThhcgUcqJexmVbmC0x1KnrhLMvcgPahnRXEi4BUFg1Y\/vPfN7A3QHasOQQP3UNsqxpyZ8JFlu29NBPTruSpRr\/2ad\/giCttIS+HBO7Lc1aknucFzsvO6PPModlvZxDYA198RNaW6QPs+M5xcfvxl6zf2sPHk4eM3IHU+QIDAQABMA0GCSqGSIb3DQEBCwUAA4IBAQB8osWRvmcAfAafy5U55SZNKHCEQgjbAo35\/HVmdM1vbTboO7Bpf5PltK4r5h6UBNU0eqkl5M7ie6IvQbE\/XrwjurXnkdMUJtaG3HhRScj\/DAdP\/gQSyfX2150premDrv+\/L0PPAaskPtp8SbbzsFSvU+9THslhiPdbZmGfhBBLaShGdCeORy3ctYbCfvpqzvwgjYst2K2uJpl7mjhg4RPhKMK87Kz3jIrglso1UJCItlUy4ysUPnO+jVs\/6YfDNq65ryNjMUqjQEtRGxY257+ZlWuOPqdJdH28XBwPSLS\/3+ElWPryKy3CPTgS9ntnUBcXo3TfRa3KR7fWD1d1zuAQ"] }
            pem = jwkToPem(keys);
            jwt.verify(req.headers['kth-ug-token'], pem, function (err, decoded) {
                if (err)
                    reject(err.message)
                req.kthid = decoded.kthid;
                resolve("ok");
            });
        }
        */

        if (req.body.apikey || req.query.apikey) {
            if (token != process.env.APIKEY) {
                reject(err.message)
            } else {
                resolve("ok");
            }
        }
    })
}

module.exports = verifyAdmin;