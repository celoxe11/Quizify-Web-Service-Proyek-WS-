const jwt = require("jsonwebtoken");
const { QuestionImage, UserLog, Question, Quiz } = require("../models");
const dotenv = require("dotenv");
const { Op } = require("sequelize");

dotenv.config();

// note: ini buat generate question
const isPremium = (req, res, next) => {
  if (req.user.subscription_id === 2 || req.user.subscription_id === 4) {
    return next();
  }
  return res.status(403).json({
    message:
      "Akses ditolak. Anda harus menjadi pengguna premium untuk mengakses fitur ini.",
  });
};

// note : free teacher hanya bisa buat 1 kuis per hari
const alreadyMadeQuizToday = async (req, res, next) => {
  const user_id = req.user.id;
  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const endOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1
  );
  try {
    // Check if user is free tier
    if (req.user.subscription_id === 1) {
      const quiz_id = req.body.quiz_id;

      // If quiz_id is provided, verify it exists and user owns it
      if (quiz_id) {
        const existingQuiz = await Quiz.findOne({
          where: {
            id: quiz_id,
            created_by: user_id,
          },
        });

        // If quiz exists, it's an update - allow it
        if (existingQuiz) {
          return next();
        }
      }

      // For new quiz creation, check if user created a quiz today
      const quizCount = await Quiz.count({
        where: {
          created_by: user_id,
          created_at: {
            [Op.gte]: startOfDay,
            [Op.lt]: endOfDay,
          },
        },
      });

      if (quizCount > 0) {
        return res
          .status(403)
          .json({ message: "Anda sudah membuat kuis hari ini" });
      }
    }
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Middleware untuk memeriksa batas unggah gambar (max 3 per kuis)
const uploadImageLimit = async (req, res, next) => {
  try {
    if (req.user.subscription_id === 1) {
      const questions = req.body.questions || [];

      // Count how many questions have images
      const imageCount = questions.filter((q) => q.question_image).length;

      if (imageCount > 3) {
        return res.status(403).json({
          message: "Anda hanya dapat mengunggah maksimal 3 gambar per kuis",
        });
      }
    }

    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  isPremium,
  alreadyMadeQuizToday,
  uploadImageLimit,
};
