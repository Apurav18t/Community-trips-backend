"use strict";
const db = require("../models");
var bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
var mongoose = require("mongoose");
const constants = require("../utls/constants");
const { generate4OTP, generatePassword } = require("../services/commonServices");
const { forgotEmailPassword, sendLoginCredentialsEmail } = require("../emails/onBoarding");



module.exports = {
    userRegister: async (req, res) => {
        try {
            const { email, fullName, role, password } = req.body;
            let data = req.body;

            if (!email || !fullName || !password || !role) {
                return res.status(400).json({
                    success: false,
                    message: "Please add all the required fields."
                })
            }
            const findUser = await db.users.findOne({ email: email });
            if (findUser) {
                return res.status(400).json({
                    success: false,
                    message: "Email already exists."
                })
            }
            let otp = generate4OTP();

            data.isVerified = "N";
            data.addedType = "self";

            const hashedPassword = await bcrypt.hashSync(password, bcrypt.genSaltSync(10));
            delete data.password;
            data.password = hashedPassword;

            const create = await db.users.create(data);

            // const findNewUser = await db.users.findOne({ email: email });

            const emailPayload = {
                fullName: fullName,
                email: email,
                otp: otp,
            }

            await sendLoginCredentialsEmail(emailPayload);
            await db.users.updateOne({ _id: create._id }, { otp })

            return res.status(200).json({
                success: true,
                message: "User added. Please verify your account.",
            })

        } catch (err) {
            console.log("ERRROR WHLE REGISTER:", err)
            return res.status(400).json({
                success: false,
                message: "Unable to register."
            })
        }
    },

    registerByGoogle: async (req, res) => {
        try {
            const { email, fullName, role = 'user' } = req.body;
            let data = req.body;

            if (!email || !fullName || !role) {
                return res.status(400).json({
                    success: false,
                    message: "Please add all the required fields."
                })
            }
            const findUser = await db.users.findOne({ email: email });
            if (findUser) {
                return res.status(400).json({
                    success: false,
                    message: "Email already exists."
                })
            }
            // let password = generatePassword();

            // const hashedPassword = await bcrypt.hashSync(password, bcrypt.genSaltSync(10));
            // delete data.password;
            // data.password = hashedPassword;

            const create = await db.users.create(data);

            const findNewUser = await db.users.findOne({ email: email });

            // const emailPayload = {
            //     fullName: findNewUser.fullName,
            //     email: findNewUser.email,
            //     password: password,
            // }

            // await sendLoginCredentialsEmail(emailPayload);

            let token = jwt.sign(
                {
                    id: findNewUser.id,
                    role: findNewUser.role,
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "3000h",
                }
            );

            const userInfo = {
                id: findNewUser._id,
                name: findNewUser.fullName,
                email: findNewUser.email,
                role: findNewUser.role,
                access_token: token
            };

            return res.status(200).json({
                success: true,
                message: "User added.",
                data: userInfo
            })

        } catch (err) {
            console.log("ERRROR WHLE REGISTER:", err)
            return res.status(400).json({
                success: false,
                message: "Unable to register."
            })
        }
    },

    login: async (req, res) => {
        try {
            const { email, password } = req.body;
            if (!req.body.email || typeof req.body.email == undefined) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 404,
                        message: constants.onBoarding.EMAIL_REQUIRED,
                    },
                });
            }

            if (!req.body.password || typeof req.body.password == undefined) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 404,
                        message: constants.onBoarding.PASSWORD_REQUIRED,
                    },
                });
            }

            var query = {};
            query.email = email.toLowerCase();

            query.isDeleted = false;
            const findUsers = await db.users.findOne(query);

            if (!findUsers) {
                return res.status(400).json({
                    success: false,
                    message: constants.onBoarding.NO_USER_EXIST,
                })
            }
            if (findUsers.isVerified === "N") {
                let otp = generate4OTP();
                const emailPayload = {
                    fullName: findUsers.fullName,
                    email: findUsers.email,
                    otp: otp,
                }

                await sendLoginCredentialsEmail(emailPayload);
                return res.status(400).json({
                    success: false,
                    message: "USER NOT VERIFIED. OTP SENT TO YOUR EMAIL PLEASE CHECK",
                })
            }
            let userInfo;
            if (!bcrypt.compareSync(req.body.password, findUsers.password)) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 404,
                        message: constants.onBoarding.WRONG_PASSWORD,
                    },
                });
            } else {
                let token = jwt.sign(
                    {
                        id: findUsers.id,
                        role: findUsers.role,
                    },
                    process.env.JWT_SECRET,
                    {
                        expiresIn: "3000h",
                    }
                );

                userInfo = {
                    id: findUsers._id,
                    name: findUsers.fullName,
                    email: findUsers.email,
                    role: findUsers.role,
                    access_token: token
                };
            }

            return res.status(200).json({
                success: true,
                message: "Welcome back you are logged in.",
                data: userInfo
            })

        } catch (err) {
            console.log("ERRROR WHLE LOGGING IN:", err)
            return res.status(400).json({
                success: false,
                message: "Unable to login."
            })
        }
    },

    verifyUser: async (req, res) => {
        try {
            const { email, otp } = req.body;

            if (!email || !otp) {
                return res.status(400).json({
                    success: false,
                    message: "Email and OTP are required."
                });
            }

            const user = await db.users.findOne({ email: email });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });
            }

            if (user.otp !== parseInt(otp)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid OTP."
                });
            }

            await db.users.updateOne(
                { email: email },
                {
                    $set: {
                        isVerified: "Y",
                        otp: null
                    }
                }
            );

            return res.status(200).json({
                success: true,
                message: "Email verified successfully."
            });

        } catch (err) {
            console.log("ERRROR WHLE LOGGING IN:", err)
            return res.status(400).json({
                success: false,
                message: "Unable to login."
            })
        }
    },

    getAllUsers: async (req, res) => {
        try {
            const findAll = await db.users.find({ isDeleted: false });
            return res.status(200).json({
                success: true,
                message: "data",
                data: findAll
            })
        } catch (err) {
            console.log("ERRROR WHLE LISTING ALL USERS:", err)
            return res.status(400).json({
                success: false,
                message: "Unable to fetch list."
            })
        }
    },

    forgotPasswordOTP: async (req, res) => {
        try {
            const email = req.body.email;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: "EMAIL REQUIRED",
                })
            }

            const findUser = await db.users.findOne({ email: email, isDeleted: false })
            if (!findUser) {
                return res.status(400).json({
                    success: false,
                    message: "USER NOT FOUND!"
                })
            }

            const otp = generate4OTP();

            const emailPayload = {
                fullName: findUser.fullName,
                otp: otp,
                email: email
            };

            const sendEmail = await forgotEmailPassword(emailPayload)

            const updateOtp = await db.users.updateOne({ _id: findUser.id }, { otp: otp })

            return res.status(200).json({
                success: true,
                message: "Forget passoword email sent.Please check."
            })

        } catch (err) {
            console.log("ERRROR OCCURED:", err)
            return res.status(400).json({
                success: false,
                message: "Unable to send email."
            })
        }
    },

    verifyForgotPasswordOTP: async (req, res) => {
        try {
            const { otp, email, newPassword } = req.body;

            if (!otp || !email || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: "Payload Missing."
                })
            }

            const findUser = await db.users.findOne({ email: email, isDeleted: false });

            if (!findUser) {
                return res.status(400).json({
                    success: false,
                    message: "User not found!"
                })
            }

            if (otp !== findUser.otp) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid OTP."
                })
            }
            const hashedPassword = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(10));

            const updatePass = await db.users.updateOne(
                { _id: findUser._id },
                { password: hashedPassword, otp: null }
            );
            return res.status(200).json({
                success: true,
                message: "Password updated sucessfully.",
                data: updatePass
            })

        } catch (err) {
            console.log("ERRROR WHLE VERIFYING OTP:", err)
            return res.status(400).json({
                success: false,
                message: "Unable to verify otp."
            })
        }
    },

    loginWithGoogle: async (req, res) => {
        try {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: "Email required."
                })
            }

            const findUser = await db.users.findOne({ email: email, isDeleted: false });

            if (!findUser) {
                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });
            }

            // Generate JWT token
            const token = jwt.sign(
                {
                    id: findUser._id,
                    role: findUser.role
                },
                process.env.JWT_SECRET,
                { expiresIn: "100h" }
            );

            const userInfo = {
                id: findUser._id,
                name: findUser.fullName,
                email: findUser.email,
                role: findUser.role,
                access_token: token
            };

            return res.status(200).json({
                success: true,
                message: "Welcome back, you are logged in.",
                data: userInfo
            });

        } catch (err) {
            console.log("ERRROR OCCURED:", err)
            return res.status(400).json({
                success: false,
                message: "Unable to login."
            })
        }
    },

    updateProfile: async (req, res) => {
        try {
            const userId = req.params.id;
            const { fullName, website, location, phone, bio } = req.body;

            const findUser = await db.users.findOne({ _id: userId, isDeleted: false });
            if (!findUser) {
                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });
            }

            await db.users.updateOne(
                { _id: userId },
                {
                    $set: {
                        fullName: fullName || findUser.fullName,
                        website: website || findUser.website,
                        location: location || findUser.location,
                        phone: phone || findUser.phone,
                        bio: bio || findUser.bio
                    }
                }
            );

            return res.status(200).json({
                success: true,
                message: "Profile updated successfully."
            });

        } catch (err) {
            console.log("ERROR WHILE UPDATING PROFILE:", err);
            return res.status(500).json({
                success: false,
                message: "Unable to update profile."
            });
        }
    },

    getUserById: async (req, res) => {
        try {
            const { id } = req.params;

            const user = await db.users.findById(id)


            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            if (user.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'User details retrieved successfully',
                data: user
            });

        } catch (error) {
            console.error('Error fetching user:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
}