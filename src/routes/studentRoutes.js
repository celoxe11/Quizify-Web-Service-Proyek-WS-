const express = require("express");

const {
  startQuiz,
  getQuestions,
  answerQuestion,
  updateAnswer,
  submitQuiz,
  getGenerateQuestion,
  getSessionHistory,
  getQuizReview,
  startQuizByCode,
} = require("../controllers/studentController");

const { authenticate, isStudent } = require("../middleware/authMiddleware");
const logActivity = require("../middleware/logActivity");

const router = express.Router();
router.post(
  "/startquiz/:quiz_id",
  authenticate,
  isStudent,
  logActivity("Student: Start quiz"),
  startQuiz
);

router.get(
  "/questions/:session_id",
  authenticate,
  isStudent,
  logActivity("Student: Get Questions"),
  getQuestions
);
router.post(
  "/answer",
  authenticate,
  isStudent,
  logActivity("Student: Answer question"),
  answerQuestion
);
router.put(
  "/answer",
  authenticate,
  isStudent,
  logActivity("Student: Update answer"),
  updateAnswer
);
router.post(
  "/submitquiz",
  authenticate,
  isStudent,
  logActivity("Student: Submit quiz"),
  submitQuiz
);
router.get(
  "/question/generate",
  authenticate,
  isStudent,
  logActivity("Student: Generate Questions"),
  getGenerateQuestion
);
router.get(
  "/history",
  authenticate,
  isStudent,
  logActivity("Student: Get Session History"),
  getSessionHistory
);
router.get(
  "/review/:quiz_id",
  authenticate,
  isStudent,
  logActivity("Student: Review Quiz"),
  getQuizReview
);
router.post(
  "/startquizbycode/:quiz_code",
  authenticate,
  isStudent,
  logActivity("Student: Start quiz by code"),
  startQuizByCode
);

module.exports = router;
