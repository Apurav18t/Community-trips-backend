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
      <h2>Welcome ${fullName}</h2>
      <p>Your OTP is ${otp}.</p>
      <p>Thank you for using our service.</p>
         <a href="https://community-trips-frontend.vercel.app//change-password" 
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
  const { email, fullName, tripName, tripId,inviteId, startLocation, endLocation, startDate, endDate } = options;

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
      <a href="https://community-trips-frontend.vercel.app/invite/${inviteId}" 
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

const sendLoginCredentialsEmail = async (options) => {
  const { email, fullName, password, otp } = options;

  const message = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f7f7f7; border-radius: 8px;">
      <h2 style="color: #333;">Welcome ${fullName}.</h2>
      <p style="font-size: 16px; color: #555;">
        Thank you for registering with us. Please verify your email.:
      </p>
      <div style="background-color: #fff; padding: 15px 20px; border: 1px solid #ddd; border-radius: 5px; margin: 20px 0;">
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>OTP:</strong> ${otp}</p>
      </div>
      <a href="https://community-trips-frontend.vercel.app/verifyUser" 
        style="display: inline-block; margin-top: 10px; padding: 10px 20px; background-color: #007BFF; color: #fff; text-decoration: none; border-radius: 5px;">
        Verify Now
      </a>
      <footer style="margin-top: 30px; color: #888;">Best regards,<br />Your Team</footer>
    </div>
  `;

  return await smtp.sendEmail({
    to: email,
    subject: "Your Login Credentials",
    message: message
  });
};


module.exports = {
  forgotEmailPassword,
  sendTripInvite,
  sendLoginCredentialsEmail
}