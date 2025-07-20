const nodemailer = require("nodemailer");
require("dotenv").config();

async function sendEmail({ to, subject, message }) {
    const transport = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    // const to = Array.isArray(toList) ? toList.join(",") : toList;

    const mailOptions = {
        from: `Community Trips <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html: message, // use html instead of 'message'
    };


    return new Promise((resolve, reject) => {
        transport.sendMail(mailOptions, function (err, info) {
            if (err) {
                console.error("Email error:", err);
                return reject(err);
            } else {
                console.log("Email sent:", info.response);
                return resolve(info);
            }
        });
    });
}

module.exports = {
    sendEmail,
}