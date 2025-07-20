const express = require("express");

const router = express();

router.use("/user", require("./users.routes"));
router.use("/trips", require("./trips.routes.js"));
router.use("/itinerary", require("./itinerary.routes.js"));

module.exports = router;