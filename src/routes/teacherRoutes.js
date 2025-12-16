const express = require("express");

const {
  saveQuizWithQuestions,
  endQuiz,
  generateQuestion,
  getUsersQuiz,
  getQuizDetail,
  getQuizResult,
  getStudentsAnswers,
  getQuizAccuracy,
  subscribe,
  unsubscribe,
} = require("../controllers/teacherController");
const { authenticate, isTeacher } = require("../middleware/authMiddleware");
const {
  isPremium,
  alreadyMadeQuizToday,
} = require("../middleware/teacherMiddleware");
const logActivity = require("../middleware/logActivity");

const router = express.Router();

// Save Quiz with Questions (handles both create and update)
router.post(
  "/quiz/save",
  authenticate,
  isTeacher,
  alreadyMadeQuizToday,
  logActivity("Teacher: Save Quiz with Questions"),
  saveQuizWithQuestions
);

router.post(
  "/endquiz/:session_id",
  authenticate,
  isTeacher,
  logActivity("Teacher: End quiz"),
  endQuiz
);

router.post(
  "/generatequestion",
  authenticate,
  isTeacher,
  isPremium,
  logActivity("Teacher: Generate Question"),
  generateQuestion
);

router.get(
  "/myquiz",
  authenticate,
  isTeacher,
  logActivity("Teacher: Get Teacher's Quiz"),
  getUsersQuiz
);

router.get(
  "/quiz/detail/:quiz_id",
  authenticate,
  isTeacher,
  logActivity("Teacher: Get Quiz Details"),
  getQuizDetail
);

router.get(
  "/quiz/results/:quiz_id",
  authenticate,
  isTeacher,
  logActivity("Teacher: Get Quiz Results"),
  getQuizResult
);

router.get(
  "/quiz/answers",
  authenticate,
  isTeacher,
  logActivity("Teacher: Get a Student's Answers"),
  getStudentsAnswers
);

router.get(
  "/quiz/accuracy/:quiz_id",
  authenticate,
  isTeacher,
  isPremium,
  logActivity("Teacher: Get Quiz Accuracy Result"),
  getQuizAccuracy
);

router.post(
  "/subscribe",
  authenticate,
  isTeacher,
  logActivity("Teacher: Subscribe to Premium"),
  subscribe
);

router.post(
  "/unsubscribe",
  authenticate,
  isTeacher,
  logActivity("Teacher: Unsubscribe from Premium"),
  unsubscribe
);

module.exports = router;
