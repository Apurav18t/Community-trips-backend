const smtp = require("../services/smtpServices");
const dotenv = require("dotenv");
dotenv.config();

// const { BACK_WEB_URL, FRONT_WEB_URL, ADMIN_WEB_URL } = process.env;

const forgotEmailPassword = async (options) => {
  let email = options.email;
  let otp = options.otp;
  let fullName = options.fullName;
  // let userId = options.id;
  let message;
  message = `
     <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Welcome to ${fullName} Service!</h2>
      <p>Your OTP is ${otp}.</p>
      <p>Thank you for using our service.</p>
         <a href="http://localhost:6969/change-password" 
       style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #007BFF; color: #fff; text-decoration: none; border-radius: 5px;">
      Verify Now
    </a>
      <footer style="margin-top: 20px;">Best regards,<br />Your Team</footer>
    </div>
    `;

  return await smtp.sendEmail({
    to: email,
    subject: "Reset Password.",
    message: message
  });
}

const sendTripInvite = async (options) => {
  const { email, fullName, tripName, tripId, startLocation, endLocation, startDate, endDate } = options;

  const message = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Hello ${fullName}!</h2>
      <p>You are invited to join the trip: <strong>${tripName}</strong>.</p>
      <ul style="margin: 10px 0;">
        <li><strong>From:</strong> ${startLocation}</li>
        <li><strong>To:</strong> ${endLocation}</li>
        <li><strong>Dates:</strong> ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</li>
      </ul>
      <p>Click below to view or accept your trip invitation:</p>
      <a href="http://localhost:3000/trips/${tripId}" 
         style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #28a745; color: #fff; text-decoration: none; border-radius: 5px;">
        View Trip Details
      </a>
      <footer style="margin-top: 30px;">Best regards,<br />Your Trips Team</footer>
    </div>
  `;

  return await smtp.sendEmail({
    to: email,
    subject: `You're Invited to Join "${tripName}"`,
    message: message,
  });
};


module.exports = {
  forgotEmailPassword,
  sendTripInvite
}