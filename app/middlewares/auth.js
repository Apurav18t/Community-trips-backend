var jwt = require("jsonwebtoken");
const unprotectedRoutes =
  require("../utls/unprotectedRoutes").unprotectedroutes;
const db = require("../models");
const Users = db.users;
module.exports = async (req, res, next) => {
  const url = req.url.split("?");
  if (unprotectedRoutes.includes(url[0])) {
    next();
    return;
  }
  if (req.headers && req.headers.authorization) {
    try {
      var parts = req.headers.authorization.split(" ");
      if (parts.length == 2) {
        var scheme = parts[0],
          credentials = parts[1];

        if (/^Bearer$/i.test(scheme)) {
          token = credentials;
        }
      } else {
        return res.status(401).json({
          success: false,
          error: { code: 401, message: "Invalid token" },
        });
      }
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      const user = await Users.findById({ _id: decodedToken.id });
      if (user.isDeleted == true) {
        return res.status(401).json({
          success: false,
          error: {
            code: 401,
            message:
              "Your account is no longer active. Please conatct to site owner.",
          },
        });
      }
      if (user) {
        req.identity = user;
      }
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: {
          code: 401,
          message: "Session expired. Please login again.",
        },
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      error: {
        code: 401,
        message: "Authentication required.",
      },
    });
  }
  next();
  return;
};
