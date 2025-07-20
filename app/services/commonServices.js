"use strict";
const db = require("../models");


module.exports = {
    generate4OTP: () => {
        return Math.floor(1000 + Math.random() * 9000);
    }
}