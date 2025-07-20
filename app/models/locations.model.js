var Mongoose = require("mongoose"),
    Schema = Mongoose.Schema;
module.exports = (mongoose) => {
    var schema = mongoose.Schema(
        {
            tripId: { type: Schema.Types.ObjectId, ref: "trips" },
            locationOrder: { type: Number },
            locationName: { type: String },
            likedLocations: { type: String },
            eta: { type: Date },
            addedBy: { type: Schema.Types.ObjectId, ref: "users" },
            isDeleted: { type: Boolean, default: false },
        },

        { timestamps: true }
    );

    schema.method("toJSON", function () {
        const { __v, _id, ...object } = this.toObject();
        object.id = _id;
        return object;
    });

    const Locations = mongoose.model("locations", schema);
    return Locations;
};
