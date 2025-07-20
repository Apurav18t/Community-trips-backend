"use strict";
const db = require("../models");


module.exports = {
    generate4OTP: () => {
        return Math.floor(1000 + Math.random() * 9000);
    },

    generatePassword: (length = 8) => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$&";
        let password = "";

        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * chars.length);
            password += chars[randomIndex];
        }

        return password;
    }

}