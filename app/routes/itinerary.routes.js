var Itinerary = require("../controllers/ItineraryController.js");

var router = require("express").Router();

router.post("/generate", Itinerary.generateNewItinerary);

router.post("/re-generate", Itinerary.reGenerateNewItinerary);

router.put("/save", Itinerary.saveNewItinerary)


module.exports = router;