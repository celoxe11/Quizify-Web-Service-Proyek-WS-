const express = require("express");

const {
  createQuiz,
  updateQuiz,
  endQuiz,
  createQuestion,
  updateQuestion,
  generateQuestion,
  deleteQuestion,
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
  uploadImageLimit,
} = require("../middleware/teacherMiddleware");
const logActivity = require("../middleware/logActivity");
const upload = require("../middleware/uploadFile");

const router = express.Router();
router.post(
  "/quiz",
  authenticate,
  isTeacher,
  alreadyMadeQuizToday,
  logActivity("Teacher: Create Quiz"),
  createQuiz
);
router.put(
  "/quiz",
  authenticate,
  isTeacher,
  logActivity("Teacher: Update Quiz"),
  updateQuiz
);
router.post(
  "/endquiz/:session_id",
  authenticate,
  isTeacher,
  logActivity("Teacher: End quiz"),
  endQuiz
);
router.post(
  "/question",
  authenticate,
  isTeacher,
  uploadImageLimit,
  upload('gambar_soal'),
  logActivity("Teacher: Create Question"),
  createQuestion
);
router.put(
  "/question",
  authenticate,
  isTeacher,
  uploadImageLimit,
  upload('gambar_soal'),
  logActivity("Teacher: Update Question"),
  updateQuestion
);
router.post(
  "/generatequestion",
  authenticate,
  isTeacher,
  isPremium,
  logActivity("Teacher: Generate Question"),
  generateQuestion
);
router.delete(
  "/question/:question_id",
  authenticate,
  isTeacher,
  logActivity("Teacher: Delete Question"),
  deleteQuestion
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
