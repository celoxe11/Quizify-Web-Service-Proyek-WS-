const express = require("express");
const {
  parseForm,
  saveFile,
  replaceQuestionImage,
  upload,
} = require("../middleware/uploadFile");

const {
  getLog,
  getSubsList,
  createTierList,
  getTierList,
  userSubscription,
  getAllQuestions,
  getQuizResult,
  getQuizDetail,
  getUsersQuiz,
  deleteQuestion,
  generateQuestion,
  updateQuestion,
  createQuestion,
  endQuiz,
  getStudentsAnswers,
  getQuizAccuracy,
  getAllQuizzes,
} = require("../controllers/adminController");

const logActivity = require("../middleware/logActivity");
const { authenticate, isAdmin } = require("../middleware/authMiddleware");
const { updateQuiz, createQuiz } = require("../controllers/teacherController");

const router = express.Router();
router.get(
  "/questions",
  // authenticate,
  // logActivity("Admin View Log Access"),
  // isAdmin,
  getAllQuestions
);
router.get(
  "/quizzes",
  // authenticate,
  // logActivity("Admin View Log Access"),
  // isAdmin,
  getAllQuizzes
);
router.get(
  "/logaccess",
  authenticate,
  logActivity("Admin View Log Access"),
  isAdmin,
  getLog
);
router.put(
  "/users/subscription",
  authenticate,
  logActivity("Admin: View Log Access"),
  isAdmin,
  userSubscription
);
router.get(
  "/users",
  authenticate,
  logActivity("Admin: View Users"),
  isAdmin,
  getSubsList
);
router.post(
  "/tierlist",
  authenticate,
  logActivity("Admin: Create Tier List"),
  isAdmin,
  createTierList
);
router.get(
  "/tierlist",
  authenticate,
  logActivity("Admin: View Tier List"),
  isAdmin,
  getTierList
);
router.post(
  "/quiz",
  authenticate,
  isAdmin,
  logActivity("Admin: Create Quiz"),
  createQuiz
);
router.put(
  "/quiz",
  authenticate,
  isAdmin,
  logActivity("Admin: Update Quiz"),
  updateQuiz
);
router.post(
  "/endquiz/:session_id",
  authenticate,
  isAdmin,
  logActivity("Admin: End quiz"),
  endQuiz
);
router.post(
  "/question",
  authenticate,
  isAdmin,
  parseForm("gambar_soal"), // Parse form but don't save yet
  saveFile(), // Save file only if limit check passes
  logActivity("Admin: Create Question"),
  createQuestion
);
router.put(
  "/question",
  authenticate,
  isAdmin,
  parseForm("gambar_soal"), // Parse form but keep file in memory
  replaceQuestionImage(), // Replace existing image with new one
  logActivity("Admin: Update Question"),
  updateQuestion
);
router.post(
  "/generatequestion",
  authenticate,
  isAdmin,
  logActivity("Admin: Generate Question"),
  generateQuestion
);
router.delete(
  "/question/:question_id",
  authenticate,
  isAdmin,
  logActivity("Admin: Delete Question"),
  deleteQuestion
);
router.get(
  "/myquiz",
  // authenticate,
  // isAdmin,
  // logActivity("Admin: Get Admin's Quiz"),
  getUsersQuiz
);
router.get(
  "/quiz/detail/:quiz_id",
  authenticate,
  isAdmin,
  logActivity("Admin: Get Quiz Details"),
  getQuizDetail
);
router.get(
  "/quiz/results/:quiz_id",
  authenticate,
  isAdmin,
  logActivity("Admin: Get Quiz Results"),
  getQuizResult
);
router.get(
  "/quiz/answers",
  authenticate,
  isAdmin,
  logActivity("Admin: Get a Student's Answers"),
  getStudentsAnswers
);
router.get(
  "/quiz/accuracy/:quiz_id",
  authenticate,
  isAdmin,
  logActivity("Admin: Get Quiz Accuracy Result"),
  getQuizAccuracy
);

module.exports = router;
