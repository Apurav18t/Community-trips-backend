var Itinerary = require("../controllers/ItineraryController.js");

var router = require("express").Router();

router.post("/generate", Itinerary.generateNewItinerary);

router.post("/re-generate", Itinerary.reGenerateNewItinerary);


module.exports = router;