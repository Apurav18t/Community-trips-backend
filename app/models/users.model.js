var Mongoose = require("mongoose"),
    Schema = Mongoose.Schema;
module.exports = (mongoose) => {
    var schema = mongoose.Schema(
        {
            firstName: { type: String },
            lastName: { type: String },
            fullName: { type: String },
            password: { type: String },
            userName: { type: String },
            email: { type: String },
            role: { type: String, enum: ["Admin", "user"], default: "user" },
            verificationCode: String,
            otp: Number,
            image: String,
            address: String,
            city: String,
            street: String,
            state: String,
            country: String,
            pinCode: String,
            mobileNo: String,
            website: { type: String },
            location: { type: String },
            phone: { type: String },
            bio: { type: String },
            addedType: { type: String, enum: ["self", "admin"], default: "self" },
            addedBy: { type: Schema.Types.ObjectId, ref: "users" },
            isVerified: { type: String, enum: ["Y", "N"], default: "Y" },
            isDeleted: { type: Boolean, default: false },
        },

        { timestamps: true }
    );

    schema.method("toJSON", function () {
        const { __v, _id, ...object } = this.toObject();
        object.id = _id;
        return object;
    });

    const Users = mongoose.model("users", schema);
    return Users;
};