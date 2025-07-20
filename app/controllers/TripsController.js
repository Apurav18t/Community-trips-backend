"use strict";
const db = require("../models");
var bcrypt = require("bcrypt");
const { json } = require("body-parser");
var mongoose = require("mongoose");
const { OpenAI } = require("openai");
const { sendTripInvite } = require("../emails/onBoarding");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

module.exports = {
    addNewTrip: async (req, res) => {
        try {
            const data = req.body;

            if (
                !data.tripName ||
                !data.tripDescription ||
                !data.startDate ||
                !data.endDate ||
                !data.tripBudget ||
                !data.locations ||
                data.locations.length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "PAYLOAD MISSING!"
                })
            }
            let location = data.locations;
            delete data.locations;
            data.addedBy = req.identity.id;

            const trip = await db.trips.create(data);

            let i = 0;
            for (let l of location) {
                await db.locations.create({
                    tripId: trip._id,
                    locationOrder: i,
                    locationName: l.locationName,
                    likedLocations: l?.likedLocations || null,
                })
                i++;
            }

            // const findAllLocations = await db.locations.find(
            //     { tripId: trip._id, isDeleted: false }
            // )
            // findAllLocations.shift();

            // const locationNames = findAllLocations.map((l) => l.locationName).join(", ");

            //             console.log("NAME:", locationNames);

            //             const prompt = `
            // For each of the following locations: ${locationNames},
            // give me a JSON array where each object includes:
            // - the location name,
            // - best time to visit that location (in 1 line),
            // - and 7 to 12 most famous places to visit there.

            // Response Format Example:
            // [
            //   {
            //     "location": "LOCATION_NAME",
            //     "bestTimeToVisit": "Best months or season to visit(write all months name).",
            //     "famousPlaces": ["Place 1", "Place 2", ..., "Place N"]
            //   }
            // ]

            // Make sure the output is valid JSON.
            // `;

            //             const completion = await openai.chat.completions.create({
            //                 model: "gpt-4",
            //                 messages: [{ role: "user", content: prompt }],
            //                 temperature: 0.7,
            //             });

            //             const aiResponse = JSON.parse(completion.choices[0].message.content);
            return res.status(200).json({
                success: true,
                message: "Trip added successfully.",
                data: trip
            });

        } catch (err) {
            console.log("ERRROR WHLE ADDING TRIPS:", err)
            return res.status(400).json({
                success: false,
                message: "Unable to add trip."
            })
        }
    },

    getTripById: async (req, res) => {
        try {
            let id = req.query.id;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "ID required."
                })
            }
            const trip = await db.trips.findById(id).populate("locations");
            // .populate("addedBy", "fullName")
            // .populate("memberIds", "fullName");

            if (!trip || trip.isDeleted) return res.status(404).json({ success: false, message: "Trip not found" });

            res.status(200).json({
                success: true,
                message: "Trip detail fetched.",
                data: trip
            });
        } catch (err) {
            console.log("ERRROR WHLE GETTING SINGLE TRIP:", err)
            return res.status(400).json({
                success: false,
                message: "Unable to getting trip details."
            })
        }
    },

    getAllTrips: async (req, res) => {
        try {
            const { page = 1, limit = 10, search = "", addedBy, startDate, endDate } = req.query;

            const filters = { isDeleted: false };
            if (addedBy) filters.addedBy = addedBy;
            if (startDate && endDate) filters.startDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
            if (search) filters.tripName = { $regex: search, $options: "i" };

            const trips = await db.trips.find(filters)
                .skip((page - 1) * limit)
                .limit(Number(limit))
            // .populate("addedBy", "fullName")
            // .populate("memberIds", "fullName");

            const total = await db.trips.countDocuments(filters);

            res.status(200).json({
                success: true,
                data: trips,
                total
            });
        } catch (err) {
            console.log("ERRROR WHLE GETTING ALL TRIPS:", err)
            return res.status(400).json({
                success: false,
                message: "Unable to getting all trips."
            })
        }
    },

    deleteById: async (req, res) => {
        try {
            let id = req.query.id;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "ID required."
                })
            }
            const deleted = await db.trips.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
            res.status(200).json({
                success: true,
                message: "Trip deleted"
            });

        } catch (err) {
            console.log("ERRROR WHLE DELETING TRIP:", err)
            return res.status(400).json({
                success: false,
                message: "Unable to deleting trip."
            })
        }
    },

    updateTripById: async (req, res) => {
        try {
            let id = req.body.id;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "ID required."
                })
            }
            const data = req.body;

            const updated = await db.trips.findByIdAndUpdate(
                id, data, { new: true });
            res.status(200).json({
                success: true,
                data: updated
            });

        } catch (err) {
            console.log("ERRROR WHLE UPDATING TRIP:", err)
            return res.status(400).json({
                success: false,
                message: "Unable to updating trip."
            })
        }
    },

    getFilterTrips: async (req, res) => {
        try {
            let date = new Date();

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const sortBy = req.query.sortBy || 'startDate';
            const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
            const search = req.query.search || '';
            let type = req.query.type;
            let filter = {};

            if (type === "upcoming") {
                filter = {
                    startDate: { $gt: date },
                    tripName: { $regex: search, $options: 'i' }
                };
            } else if (type === "past") {
                filter = {
                    endDate: { $lt: date },
                    tripName: { $regex: search, $options: 'i' }
                };
            } else if (type === "current") {
                filter = {
                    startDate: { $lte: date },
                    endDate: { $gte: date },
                    tripName: { $regex: search, $options: 'i' }
                };
            }

            const total = await db.trips.countDocuments(filter);
            const trips = await db.trips.find(filter)
                .sort({ [sortBy]: sortOrder })
                .skip((page - 1) * limit)
                .limit(limit);

            return res.status(200).json({
                success: true,
                message: 'Past trips fetched successfully',
                data: trips,
                total
            });
        } catch (err) {
            console.log("ERRROR WHLE GET UPCOMING TRIPS:", err)
            return res.status(400).json({
                success: false,
                message: "Unable to get upcoming trips."
            })
        }
    },

    createLikedLcations: async (req, res) => {
        try {

            const { locations } = req.body;
            if (!locations) {
                return res.status(200).json({
                    success: false,
                    message: "Location missing",
                })
            }
            const prompt = `
            For each of the following locations: ${locations},
            give me a JSON array where each object includes:
            - the location name,
            - best time to visit that location (in 1 line),
            - and 7 to 10 most famous places to visit there.

            Response Format Example:
            [
              {
                "location": "LOCATION_NAME",
                "bestTimeToVisit": "Best months or season to visit(write all months name).",
                "famousPlaces": ["Place 1", "Place 2", ..., "Place N"]
              }
            ]

            Make sure the output is valid JSON.
            `;

            const completion = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
            });

            const aiResponse = JSON.parse(completion.choices[0].message.content);
            return res.status(200).json({
                success: true,
                message: "Data fetched",
                data: aiResponse
            })
        } catch (err) {
            console.log("ERRROR WHLE GET CREATING DATA:", err)
            return res.status(400).json({
                success: false,
                message: "Unable to get upcoming trips."
            })
        }
    },

    inviteUserToTrip: async (req, res) => {
        try {
            const { email, tripId, addedBy } = req.body;

            if (!email || !tripId) {
                return res.status(400).json({
                    success: false,
                    message: "No email address provided.",
                });
            }

            const findEmail = await db.users.findOne({ email: email })
            let fullName;
            if (findEmail) {
                fullName = findEmail.fullName
            } else {
                fullName = "Explorer";
            }

            const trip = await db.trips.findOne({ _id: tripId, isDeleted: false });

            if (!trip) {
                return res.status(404).json({
                    success: false,
                    message: "Trip not found.",
                });
            }

            const emailPayload = {
                email: email,
                fullName: fullName,
                tripName: trip.tripName,
                tripId: trip._id,
                startLocation: trip.startLocation,
                endLocation: trip.endLocation,
                startDate: trip.startDate,
                endDate: trip.endDate
            };
            const sendInvite = sendTripInvite(emailPayload)

            const createInvite = db.tripInvites.create(
                {
                    inviteSendTo: email,
                    inviteSendBy: tripId.addedBy,
                }
            );

            return res.status(200).json({
                success: true,
                message: "Invitations sent successfully!",
            });

        } catch (err) {
            console.log("ERRROR WHILE INVITING USER:", err)
            return res.status(400).json({
                success: false,
                message: "Unable to invite new users."
            })
        }
    },

    getTripInvites: async (req, res) => {
        try {
            const { tripId } = req.query;
            if (!tripId) {
                return res.status(400).json({ success: false, message: "tripId required" });
            }

            const invites = await db.tripInvites.find({ tripId, isDeleted: false });
            return res.status(200).json({ success: true, data: invites });
        } catch (err) {
            console.log("ERROR WHILE FETCHING TRIP INVITES:", err);
            return res.status(400).json({ success: false, message: "Failed to fetch invites" });
        }
    },

    replyTheInvite: async (req, res) => {
        try {
            const { inviteId, status } = req.body;

            if (!inviteId || !['accepted', 'rejected'].includes(status)) {
                return res.status(400).json({ success: false, message: "Invalid input." });
            }

            const updatedInvite = await db.tripInvites.findByIdAndUpdate(
                inviteId,
                { invitedAccepted: status },
                { new: true }
            );

            if (status === 'accepted') {
                const trip = await db.trips.findById(updatedInvite.tripId);

                if (trip) {

                    const user = await db.users.findOne({ email: updatedInvite.inviteSendTo });


                    if (user) {
                        trip.memberIds.push(user._id);
                        await trip.save();
                    }
                }
            }

            return res.status(200).json({
                success: true,
                message: "Invite status updated.",
                data: updatedInvite
            });

        } catch (err) {
            console.log("ERROR WHILE REPLYING INVITE:", err);
            return res.status(400).json({
                success: false,
                message: "Unable to update invite."
            });
        }
    }


}