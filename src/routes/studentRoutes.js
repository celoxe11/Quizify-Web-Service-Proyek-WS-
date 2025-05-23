const express = require("express");

const {
  doQuiz,
  getGenerateQuestion,
} = require("../controllers/studentController");

const { authenticate, isStudent } = require("../middleware/authMiddleware");
const logActivity = require("../middleware/logActivity");

const router = express.Router();
router.post(
  "/quiz",
  authenticate,
  isStudent,
  logActivity("Student: Do quiz"),
  doQuiz
);
router.get(
  "/question/generate",
  authenticate,
  isStudent,
  logActivity("Student: Generate Questions"),
  getGenerateQuestion
);

module.exports = router;
