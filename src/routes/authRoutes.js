const express = require("express");
const verifyToken = require("../middleware/verifyFirebaseToken");
const { me, register } = require("../controllers/authController");

const router = express.Router();
router.post("/register", register);
router.get("/me", verifyToken, me);

module.exports = router;
