const express = require("express");
const router = express.Router();
const {
  createUser,
  getUserByFirebaseUid,
  generateUniqueUserId,
} = require("../controllers/userController");

router.post("/", createUser);
router.get("/firebase/:firebaseUid", getUserByFirebaseUid);
router.get("/generate-id", generateUniqueUserId);

module.exports = router;