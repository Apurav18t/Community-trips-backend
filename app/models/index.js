const dbConfig = require("../config/db.js");

const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const db = {};
db.mongoose = mongoose;
db.url = dbConfig.url;

db.users = require("./users.model")(mongoose);
db.trips = require("./trips.model")(mongoose);
db.locations = require("./locations.model")(mongoose);
db.tripInvites = require("./tripInvites.model.js")(mongoose);
db.itinerary = require("./itinerary.model.js")(mongoose);

module.exports = db;