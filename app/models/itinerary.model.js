var Mongoose = require("mongoose"),
    Schema = Mongoose.Schema;
module.exports = (mongoose) => {
    var schema = mongoose.Schema(
        {
            tripId: { type: Schema.Types.ObjectId, ref: "trips" },
            userId: { type: Schema.Types.ObjectId, ref: "users" },
            itineraryData: { type: String },
            promptUsed: { type: String }
        },

        { timestamps: true }
    );

    schema.method("toJSON", function () {
        const { __v, _id, ...object } = this.toObject();
        object.id = _id;
        return object;
    });

    const itinerary = mongoose.model("itinerary", schema);
    return itinerary;
};
