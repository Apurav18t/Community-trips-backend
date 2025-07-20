var Mongoose = require("mongoose"),
    Schema = Mongoose.Schema;
module.exports = (mongoose) => {
    var schema = mongoose.Schema(
        {
            tripId: { type: Schema.Types.ObjectId, ref: "trips" },
            invitedAccepted: { type: String, enum: ["accepted", "rejected", "pending"], default: "pending" },
            inviteSendTo: { type: String },
            inviteSendBy: { type: Schema.Types.ObjectId, ref: "users" },
            isDeleted: { type: Boolean, default: false },
        },

        { timestamps: true }
    );

    schema.method("toJSON", function () {
        const { __v, _id, ...object } = this.toObject();
        object.id = _id;
        return object;
    });

    const tripInvites = mongoose.model("tripInvites", schema);
    return tripInvites;
};
