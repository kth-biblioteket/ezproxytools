require('dotenv').config()

const fs = require("fs");
const path = require('path');
const axios = require('axios')

async function login(req, res) {
    try {
        const response = await axios.post('https://' + process.env.LDAP_API_URL + 'login', req.body)
        console.log(response)
        res
        .cookie("jwt", response.data.token, {
            maxAge: 60 * 60 * 24 * 7 * 1000,
            sameSite: 'lax',
            httpOnly: true,
            secure: process.env.NODE_ENV !== "development",
        })
        .status(200)
        .json({ message: "Success" });
    } catch(err) {
        res.status(401)
        res.json({ message: "Error" });
    }
}

async function logout(req, res) {
    res
    .clearCookie("jwt")
    .status(200)
    .json({ message: "Success" });
}

module.exports = {
    login,
    logout
};