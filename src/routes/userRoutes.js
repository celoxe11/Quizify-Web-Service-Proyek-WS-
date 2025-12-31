const express = require("express");
const router = express.Router();
const {
  getPublicQuiz,
  updateProfile,
} = require("../controllers/userController");

router.get("/landing/get_public_quiz", getPublicQuiz);
router.put("/profile/:id", updateProfile);

module.exports = router;
