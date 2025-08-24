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
               // !data.tripName ||
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
            }if (data.customTripName) {
  data.tripName = data.customTripName;
} else if (!data.tripName) {
  const from = data.startLocation || "Unknown Start";
  const to = data.locations?.map(loc => loc.locationName).join(", ") || "Unknown Destination";
  data.tripName = `${from} to ${to}`;
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
                    addedBy: req.identity.id,
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
            //   .populate("addedBy", "fullName email"); // ✅ populate the user's name



            if (!trip || trip.isDeleted) return res.status(404).json({ success: false, message: "Trip not found" });
// 🧠 Add userName fallback logic
    const userName = trip.addedBy?.fullName || trip.addedBy?.email || "Traveler";

            res.status(200).json({
                success: true,
                message: "Trip detail fetched.",
                data: {
                    ...trip.toObject(),
        userName: userName, // 👈 now frontend can read it
                },
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
            let addedBy = req.query.addedBy;
            let filter = {};
            if (addedBy) {
                filter.addedBy = addedBy;
            }

            const searchFilter = { tripName: { $regex: search, $options: 'i' } };

            if (type === "upcoming") {
                filter = {
                    ...filter,
                    ...searchFilter,
                    startDate: { $gt: date }
                };
            } else if (type === "past") {
                filter = {
                    ...filter,
                    ...searchFilter,
                    endDate: { $lt: date }
                };
            } else if (type === "current") {
                filter = {
                    ...filter,
                    ...searchFilter,
                    startDate: { $lte: date },
                    endDate: { $gte: date }
                };
            } else {
                filter = {
                    ...filter,
                    ...searchFilter
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
        const { email, tripId } = req.body;

        if (!email || !tripId) {
            return res.status(400).json({
                success: false,
                message: "No email address provided.",
            });
        }

        const findEmail = await db.users.findOne({ email: email });
        let fullName = findEmail ? findEmail.fullName : "Explorer";

        const trip = await db.trips.findOne({ _id: tripId, isDeleted: false });
        if (!trip) {
            return res.status(404).json({
                success: false,
                message: "Trip not found.",
            });
        }

        const addedBy = req.identity.id;

        // ✅ Step 1: Create Invite FIRST
        const newInvite = await db.tripInvites.create({
            tripId: trip._id,
            inviteSendTo: email,
            inviteSendBy: addedBy,
            inviteStatus: 'pending', // <-- default status
        });

        // ✅ Step 2: Send email with inviteId (not tripId)
        const emailPayload = {
            email: email,
            fullName: fullName,
            tripName: trip.tripName,
            tripId: trip._id,
            inviteId: newInvite._id.toString(), // 🆕 Include inviteId
            startLocation: trip.startLocation,
            endLocation: trip.endLocation,
            startDate: trip.startDate,
            endDate: trip.endDate
        };
        await sendTripInvite(emailPayload);

        return res.status(200).json({
            success: true,
            message: "Invitation sent successfully!",
        });

    } catch (err) {
        console.log("ERROR WHILE INVITING USER:", err);
        return res.status(400).json({
            success: false,
            message: "Unable to invite new users."
        });
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

    const invite = await db.tripInvites.findById(inviteId);

    if (!invite) {
      return res.status(404).json({ success: false, message: "Invite not found." });
    }

    if (invite.inviteStatus !== 'pending') {
      return res.status(400).json({ success: false, message: "Invite already responded to." });
    }

    // ✅ Now update
    invite.inviteStatus = status;
    await invite.save();

    // ✅ If accepted, add user to trip
    if (status === 'accepted') {
      const trip = await db.trips.findById(invite.tripId);
      if (trip) {
        const user = await db.users.findOne({ email: invite.inviteSendTo });
        if (user) {
          // Check to prevent duplicates
          if (!trip.memberIds.includes(user._id)) {
            trip.memberIds.push(user._id);
            await trip.save();
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Invite status updated.",
      data: invite
    });

  } catch (err) {
    console.log("ERROR WHILE REPLYING INVITE:", err);
    return res.status(400).json({
      success: false,
      message: "Unable to update invite."
    });
  }
},


    generateTripTips: async (req, res) => {
        try {
            const { tripId } = req.body;

            if (!tripId) {
                return res.status(400).json({
                    success: false,
                    message: "Trip ID is required."
                });
            }

            const trip = await db.trips.findById(tripId).populate("locations");

    // ✅ RETURN if tips already exist
    if (trip.tripsTips && trip.tripsTips.length > 20) {
      return res.status(200).json({
        success: true,
        tips: trip.tripsTips,
        message: "Using saved travel tips.",
      });
    }
            if (!trip || !trip.locations || trip.locations.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "No locations found for this trip."
                });
            }

              if(trip.tripsTips){
                return res.status(200).json({
                    success: true,
                    message: "Getting saved travel tips.",
        tips: trip.tripsTips  // ✅ fix this line
                })
            }

            // Extract location names
            const locationNames = trip.locations.map(loc => loc.locationName).filter(Boolean);

            // const locationPrompt = locationNames.join(", ");
            const prompt = `
You are a travel assistant. I am planning a trip to the following locations: ${locationNames.join(", ")}.

For each location, give travel tips in this exact format with clean bullet points:

------------------------------
📍 Location: <Location Name>

• **Safety**: [Short tip]
• **Packing**: [Short tip]
• **Local Customs**: [Short tip]
• **Best Time to Visit**: [Short tip]
------------------------------

Use this format strictly and repeat it for every location. Keep the tips clear and to the point.
`;

            const completion = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
            });

            const tips = completion.choices[0].message.content;

            const updateTripTips = await db.trips.updateOne({ _id: tripId }, { tripsTips: tips });

            return res.status(200).json({
                success: true,
                tips,
            });

        } catch (err) {
            console.log("ERROR WHILE FETCHING TRIP INVITES:", err);
            return res.status(400).json({
                success: false,
                message: "Failed to fetch invites"
            });
        }
    },

    statusChange: async (req, res) => {
        try {

            const { id, inviteStatus } = req.body;

            if (!id || !inviteStatus) {
                return res.status(400).json({
                    success: false,
                    message: "Payload Missing"
                })
            }

const updateStatus = await db.tripInvites.updateOne({ _id: id }, { inviteStatus: inviteStatus })
            if (updateStatus.updatedCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invite not found"
                })
            } else {
                return res.status(200).json({
                    success: true,
                    message: "Status update for this invite."
                })
            }

        } catch (err) {
            console.log("ERROR WHILE FETCHING TRIP INVITES:", err);
            return res.status(400).json({
                success: false,
                message: "Failed to fetch invites"
            });
        }
    },

    deleteInvite: async (req, res) => {
        try {
            const { id } = req.query;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "TripInvite ID is required",
                });
            }

            const deletedInvite = await TripInvite.findByIdAndDelete(id);

            if (!deletedInvite) {
                return res.status(404).json({
                    success: false,
                    message: "TripInvite not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Invite deleted.",
                data: deletedInvite,
            });
        } catch (err) {
            console.log("ERROR WHILE DELETING TRIP INVITES:", err);
            return res.status(400).json({
                success: false,
                message: "Failed to fetch invites"
            });
        }
    },

    getAllUserSentInvites: async (req, res) => {
        try {
            const { userId } = req.query;

            const findUser = await db.users.findOne({ _id: userId, isDeleted: false });
            if (!findUser) {
                return res.status(400).json({
                    success: false,
                    message: "User not found",
                });
            }
            let email = findUser.email;
            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: "User email is required",
                });
            }

            const invites = await db.tripInvites.find({
                inviteSendTo: email,
                isDeleted: false,
            })
                .populate("tripId") 
                .populate("inviteSendBy");

            return res.status(200).json({
                success: true,
                message: "Invites fetched successfully",
                data: invites,
            });
        } catch (err) {
            console.log("ERROR WHILE GETTING ALL TRIP INVITES:", err);
            return res.status(400).json({
                success: false,
                message: "Failed to get all invites"
            });
        }
    }, getInviteDetail: async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ success: false, message: "Invite ID is required" });
    }

    const invite = await db.tripInvites.findById(id)
      .populate('tripId')
      .populate('inviteSendBy');

    if (!invite || invite.isDeleted) {
      return res.status(404).json({ success: false, message: "Invite not found or expired." });
    }

    return res.status(200).json({ success: true, data: invite });
  } catch (err) {
    console.log("ERROR WHILE FETCHING INVITE DETAIL:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
},


}