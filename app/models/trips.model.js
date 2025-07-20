var Mongoose = require("mongoose"),
    Schema = Mongoose.Schema;
module.exports = (mongoose) => {
    var schema = mongoose.Schema(
        {
            tripName: { type: String },
            tripDescription: { type: String },
            startDate: { type: Date },
            endDate: { type: Date },
            numberOfBodies: { type: Number },
            numberOfAdults: { type: Number },
            numberOfChildern: { type: Number },
            numberOfInfants: { type: Number },
            numberOfPets: { type: Number },
            tripBudget: { type: Number },
            memberIds: [{ type: Schema.Types.ObjectId, ref: "users" }],
            addedBy: { type: Schema.Types.ObjectId, ref: "users", required: true },
            isDeleted: { type: Boolean, default: false },
            placesSelectedData: { type: Array }, // after add use it in update
            itineraryData: { type: String },
        },

        { timestamps: true }
    );
    schema.virtual("locations", {
        ref: "locations",           // name of the model being linked
        localField: "_id",          // the field on this (Trip) schema
        foreignField: "tripId",     // the field on the Location schema
        justOne: false              // set to false because it's an array
    });

    // Ensure virtuals are included in output
    schema.set("toJSON", { virtuals: true });
    schema.set("toObject", { virtuals: true });

    schema.method("toJSON", function () {
        const { __v, _id, ...object } = this.toObject();
        object.id = _id;
        return object;
    });

    const Trips = mongoose.model("trips", schema);
    return Trips;
};
