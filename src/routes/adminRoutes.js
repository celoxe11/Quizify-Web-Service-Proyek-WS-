const express = require("express");
const {
  parseForm,
  saveFile,
  replaceQuestionImage,
  upload,
} = require("../middleware/uploadFile");

const {
  getLog,
  createTierList,
  getTierList,
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
  getAllUsers,
  getDashboardAnalytics,
  toggleUserStatus,
  deleteQuiz,
  updateUser
} = require("../controllers/adminController");

const logActivity = require("../middleware/logActivity");
const { authenticate, isAdmin } = require("../middleware/authMiddleware");
const { saveQuizWithQuestions } = require("../controllers/teacherController");

const router = express.Router();

router.post(
  "/quiz/save",
  authenticate,
  isAdmin,
  logActivity("Admin: Save Quiz with Questions"),
  saveQuizWithQuestions
);

router.delete(
  "/quiz/delete",
  authenticate,
  isAdmin,
  logActivity("Admin: Delete Quiz"),
  deleteQuiz
);

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

router.post(
  "/tierlist",
  authenticate,
  logActivity("Admin: Create Tier List"),
  isAdmin,
  createTierList
);
router.get(
  "/subscriptions",
  authenticate,
  logActivity("Admin: get Subscription Tier List"),
  isAdmin,
  getTierList
);
router.post(
  "/quiz",
  authenticate,
  isAdmin,
  logActivity("Admin: Create Quiz"),
  saveQuizWithQuestions
);
router.put(
  "/quiz/:quiz_id",
  authenticate,
  isAdmin,
  logActivity("Admin: Update Quiz"),
  saveQuizWithQuestions
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
  "/quiz/answers/:quiz_id/:student_id",
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
router.get(
  "/users",
  authenticate,
  isAdmin,
  logActivity("Admin: Get All Users"),
  getAllUsers
);
router.put(
  "/users/:id",
  authenticate,
  isAdmin,
  logActivity("Admin: Update User"),
  updateUser
);
router.get(
  "/analytics",
  authenticate,
  isAdmin,
  // logActivity("Admin: View Analytics"), // Opsional jika ada middleware log
  getDashboardAnalytics
);

router.patch(
  "/users/:id/status", // Endpoint: /api/admin/users/ST001/status
  authenticate,
  isAdmin,
  logActivity("Admin Change User Status"), // Jika middleware log aktif
  toggleUserStatus
);

module.exports = router;
