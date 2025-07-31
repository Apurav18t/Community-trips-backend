var Trips = require("../controllers/TripsController.js");
const { trips } = require("../models/index.js");

var router = require("express").Router();


router.post("/add", Trips.addNewTrip);

router.get("/detail", Trips.getTripById);

router.get("/list", Trips.getAllTrips);

router.delete("/delete", Trips.deleteById);

router.put("/update", Trips.updateTripById);

router.get("/getFilterTrips", Trips.getFilterTrips);

router.post("/generate-highlight", Trips.createLikedLcations);

router.post("/inviteUser", Trips.inviteUserToTrip);

router.get("/invites", Trips.getTripInvites);

router.put("/replyTheInvite", Trips.replyTheInvite);

router.post("/tripTips", Trips.generateTripTips);

router.post("/statusChange", Trips.statusChange);

router.delete("/deleteInvite", Trips.deleteInvite);

router.get("/getAll", Trips.getAllUserSentInvites);

router.get("/inviteDetail", Trips.getInviteDetail);



module.exports = router;
