const express = require("express");
const verifyToken = require("../middleware/verifyFirebaseToken");
const { me, register, googleSignIn, checkGoogleUserExists } = require("../controllers/authController");

const router = express.Router();
router.post("/register", register);
router.get("/me", verifyToken, me);
router.get("/check-google-user/:firebaseUid", checkGoogleUserExists); 
router.post("/google-signin", verifyToken, googleSignIn);

module.exports = router;
