const express = require("express");

const {
  startQuiz,
  getQuestions,
  answerQuestion,
  updateAnswer,
  submitQuiz,
  getAllQuizzes,
  getQuizDetail,
  getGeminiEvaluation,
  getSessionHistory,
  getQuizReview,
  startQuizByCode,
  getStudentHistory,
  getHistoryDetail,
  getTransactionHistory,
  buySubscription,
} = require("../controllers/studentController");

const { authenticate, isStudent } = require("../middleware/authMiddleware");
const logActivity = require("../middleware/logActivity");
const { getUserInventory, equipAvatar } = require("../controllers/avatarController");

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
router.get(
  "/quizzes",
  authenticate,
  isStudent,
  logActivity("Student: Get All Quizzes"),
  getAllQuizzes
);
router.get(
  "/quiz/:quiz_id",
  authenticate,
  isStudent,
  logActivity("Student: Get Quiz Detail"),
  getQuizDetail
);
router.post(
  "/submitquiz",
  authenticate,
  isStudent,
  logActivity("Student: Submit quiz"),
  submitQuiz
);
router.post(
  "/question/gemini-evaluation",
  // authenticate,
  // isStudent,
  // logActivity("Student: Ask Gemini for Evaluation"),
  getGeminiEvaluation
);
// router.get(
//   "/history",
//   authenticate,
//   isStudent,
//   logActivity("Student: Get Session History"),
//   getSessionHistory
// );
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

router.get(
  "/history", 
  authenticate, 
  isStudent, 
  logActivity("Student: Get Student History"),
  getStudentHistory);

router.get(
  "/history/:session_id", // Parameter session_id
  authenticate,
  isStudent,
  getHistoryDetail
  );

router.get(
  "/transactions", 
  authenticate, 
  isStudent, 
  getTransactionHistory);

router.post(
  "/buy-subscription", 
  authenticate, 
  isStudent, 
  buySubscription);

router.get(
  "/inventory",
  authenticate,
  // isStudent, // Boleh diaktifkan jika khusus student
  getUserInventory
);

// POST Equip Avatar (Ganti foto profil)
router.post(
  "/equip-avatar",
  authenticate,
  equipAvatar
);
 
module.exports = router;
