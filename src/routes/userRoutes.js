const express = require("express");
const router = express.Router();
const {
  getPublicQuiz,
  updateProfile,
  updatePassword,
} = require("../controllers/userController");

router.get("/landing/get_public_quiz", getPublicQuiz);
router.put("/profile/:id", updateProfile);
router.put("/profile/:id/password", updatePassword);

module.exports = router;
