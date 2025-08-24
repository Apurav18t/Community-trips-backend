"use strict";
const db = require("../models");
const { OpenAI } = require("openai");
var bcrypt = require("bcrypt");
var mongoose = require("mongoose");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
You are ASG, an expert itinerary assistant for Community Trips. 
Based on a trip's duration and locations, generate a detailed daily itinerary with suggestions for hotel, breakfast, lunch, dinner, and things to do. 
Each day should include a "dayTitle", "morning", "afternoon", "evening", "food" (with keys breakfast, lunch, dinner), and optional "places".
Output a JSON array like:
[
  {
    "dayTitle": "Day 1: Arrival in City",
    "morning": "Do this...",
    "afternoon": "Visit this...",
    "evening": "Explore that...",
    "food": {
      "breakfast": "Place/Type",
      "lunch": "Place/Type",
      "dinner": "Place/Type"
    },
    "places": ["Place 1", "Place 2"]
  }
]
`;

module.exports = {

    generateNewItinerary: async (req, res) => {
        try {
            const { tripId, tripType } = req.body;
            if (!tripId|| !tripType) {
                return res.status(400).json({
                    success: false,
                    message: "Trip ID and Trip Type are required.",
                });
            }

            const tripData = await db.trips.findOne({ _id: tripId, isDeleted: false });
            const findLocations = await db.locations.find({ tripId, isDeleted: false });

            if (!tripData || findLocations.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Trip or locations not found.",
                });
            }

            const locationNames = findLocations.map((loc) => loc.locationName).join(", ");
            const prompt = `
ASG here! I’m assisting with a trip itinerary for the following locations: ${locationNames} from ${tripData.startDate.toDateString()} to ${tripData.endDate.toDateString()}.
Please tailor the itinerary specifically for a **${tripType}**. Here’s what that might include:

- **Solo Trip**: Personal exploration, meditation or yoga retreats, solo treks or hikes, cultural experiences, safety tips.
- **Honeymoon Trip**: Romantic dinners, cozy stays, sunset viewpoints, spas, couple experiences like private cruises or hot air balloons.
- **Romantic Trip**: Wine tasting, stargazing, candlelight dinners, nature walks, scenic drives.
- **Family Trip**: Kid-friendly attractions, museums, water parks, educational spots, easy-paced activities.
- **Trip with Friends / Group Trip**: Group-friendly adventures, nightlife, beach parties, local food markets, shared stays.
- **Adventure Trip**: High-energy activities like trekking, water sports, zip-lining, desert safaris, and exploration.
Build a **day-by-day itinerary** in a readable, stylish format, where:

- Each day starts with a **bold heading** like "Day 1: Title".
- Under each day, break down activities into **Morning**, **Afternoon**, **Evening**.
- Include **Breakfast**, **Lunch**, and **Dinner** suggestions.
- Mention hotels, places to visit, short travel guidance if applicable.
- Style the response as **visually structured text**, with line breaks and **bolded headings** so frontend can display it directly on a blank page.

Only return the final styled itinerary in **text/markdown**, not JSON.
`;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful assistant who generates well-formatted itineraries for frontend display.",
                    },
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                temperature: 0.7,
            });

            const itineraryText = completion.choices[0].message.content;

            // // Optional: Save the itinerary into DB
            // await db.trips.updateOne(
            //     { _id: tripId },
            //     { $set: { placesSelectedData: [itineraryText] } }
            // );

            return res.status(200).json({
                success: true,
                message: "Itinerary generated successfully.",
                data: itineraryText,
            });

        } catch (err) {
            console.log("ERROR OCCURED:", err);
            return res.status(400).json({
                success: false,
                message: "Failed to generate new intinerary for the trip."
            })
        }
    },

    reGenerateNewItinerary: async (req, res) => {
        try {
            const { itineraryMarkdown, prompt } = req.body;

            if (!itineraryMarkdown || !prompt) {
                return res.status(400).json({
                    success: false,
                    message: "Itinerary HTML and prompt are required.",
                });
            }

          const formattedPrompt = `
You are Tripytrek, an expert travel assistant. The user has provided an existing trip itinerary in **Markdown** format.

Your job:
1. Read the given Markdown itinerary.
2. Modify or regenerate it according to the user's instructions.
3. Maintain the same **Markdown structure and formatting** (bold headings, lists, etc.)
4. Do not return HTML. Only return updated **Markdown**.

Existing Itinerary:
${itineraryMarkdown}

User Prompt / Changes to Apply:
"${prompt}"

Now respond with only the updated itinerary in Markdown.
`;


            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: "You are Tripytrek, an expert travel assistant specializing in Markdown-formatted itineraries",
                    },
                    {
                        role: "user",
                        content: formattedPrompt,
                    },
                ],
                temperature: 0.8,
            });

            const responseMarkdown = completion.choices[0]?.message?.content || "";

            return res.status(200).json({
                success: true,
                message: "Itinerary regenerated successfully with user prompt.",
                data: responseMarkdown,
            });
        } catch (err) {
            console.error("Error modifying itinerary:", err);
            return res.status(500).json({
                success: false,
                message: "Something went wrong while regenerating the itinerary.",
            });
        }
    },

    saveNewItinerary: async (req, res) => {
        try {
            const { tripId, userId, itineraryData, promptUsed } = req.body;
            if (!tripId || !itineraryData || !userId || !promptUsed) {
                return res.status(400).json({
                    success: false,
                    message: "Trip ID, userId and itineraryData are required.",
                });
            }

            const findTrip = await db.trips.findOne({ _id: tripId, isDeleted: false });
            if (!findTrip) {
                return res.status(400).json({
                    success: false,
                    message: "Trip not found.",
                });
            }

            const data = await db.itinerary.create({
                tripId,
                userId,
                itineraryData,
                promptUsed
            });

            return res.status(201).json({
                success: true,
                message: "Your itinerary has been saved.",
                data
            })

        } catch (err) {
            console.error("Error saving itinerary:", err);
            return res.status(400).json({
                success: false,
                message: "Something went wrong while saving the itinerary.",
            });
        }
    },

    listAllItinerary: async (req, res) => {
        try {
            let { userId, tripId, page = 1, count = 10 } = req.query;
            if (!userId || !tripId) {
                return res.status(400).json({
                    success: false,
                    message: "Payload Missing",
                })
            }
            let query = {
                userId,
                tripId
            };
            page = parseInt(page);
            count = parseInt(count);

            const findItinerary = await db.itinerary.find(query)
                .populate('tripId')
                .populate('userId', 'fullName')
                .sort({ createdAt: 1 })
                .skip((page - 1) * count)
                .limit(count);

            return res.status(200).json({
                success: true,
                data: findItinerary,
            });

        } catch (err) {
            console.error("Error saving itinerary:", err);
            return res.status(400).json({
                success: false,
                message: "Something went wrong while saving the itinerary.",
            });
        }
    }
}