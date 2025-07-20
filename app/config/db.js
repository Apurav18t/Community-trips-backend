"use strict";
const dotenv = require("dotenv");
const assert = require("assert");

dotenv.config();

const { PORT, MONGODB_URI } = process.env;

assert(PORT, "PORT is required");
module.exports = {
    url: MONGODB_URI || "mongodb://localhost:27017/communitytrips",
};
