var user = require("../controllers/UsersController.js");

var router = require("express").Router();

// router.post("/admin/login", user.adminLogin);


router.post("/registerUser", user.userRegister);

router.post("/google-register", user.registerByGoogle);

router.post("/login", user.login);

router.get("/allUsers", user.getAllUsers);

router.post("/forgotPasswordOTP", user.forgotPasswordOTP);

router.post("/verifyOTP", user.verifyForgotPasswordOTP);

router.post("/google-login", user.loginWithGoogle);

router.put("/updateProfile/:id", user.updateProfile);

router.get("/details/:id", user.getUserById);



module.exports = router;
