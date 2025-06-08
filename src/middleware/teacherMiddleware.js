const jwt = require("jsonwebtoken");
const { QuestionImage, UserLog, Question, Quiz } = require("../models");
const dotenv = require("dotenv");
const { Op } = require("sequelize");

dotenv.config();

// note: ini buat generate question
const isPremium = (req, res, next) => {
  if (req.user.subscription_id === 2) {
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
    // menggunakan user_log untuk mengecek apakah user sudah membuat kuis hari ini untuk user free
    if (req.user.subscription_id === 1) {
      const quiz = await UserLog.findAll({
        where: {
          user_id: user_id,
          created_at: {
            [Op.gte]: startOfDay,
            [Op.lt]: endOfDay,
          },
          action_type: "Teacher: Create Quiz",
        },
      });
      if (quiz.length > 0) {
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
  const user_id = req.user.id;
  
  try {
    if (req.user.subscription_id === 1) {
      let quiz_id = req.body.quiz_id || req.query.quiz_id;
      let questionIds = [];
      let existingImage = null;
      let question_id = null;
      
      // Jika tidak ada quiz_id, coba dapatkan dari question_id
      if (!quiz_id) {
        question_id = req.body.question_id || req.params.question_id;
        
        if (question_id) {
          // Cari pertanyaan untuk mendapatkan quiz_id
          const question = await Question.findByPk(question_id, {
            attributes: ["id", "quiz_id"]
          });
          
          if (!question) {
            return res.status(404).json({
              message: "Pertanyaan tidak ditemukan"
            });
          }
          
          quiz_id = question.quiz_id;
          
          // Periksa apakah pertanyaan ini sudah memiliki gambar
          existingImage = await QuestionImage.findOne({
            where: {
              question_id: question_id,
              user_id: user_id
            }
          });
        }
      }
      
      // Jika tidak ada quiz_id atau question_id, tidak bisa melanjutkan
      if (!quiz_id) {
        return res.status(400).json({
          message: "Quiz ID atau Question ID diperlukan untuk memeriksa batas unggah gambar"
        });
      }
      
      // Dapatkan semua pertanyaan untuk kuis ini
      const questions = await Question.findAll({
        where: {
          quiz_id: quiz_id
        },
        attributes: ["id"]
      });
      
      questionIds = questions.map((q) => q.id);
      
      // Hitung gambar untuk pertanyaan-pertanyaan ini oleh pengguna ini
      if (questionIds.length > 0) {
        const imageCount = await QuestionImage.count({
          where: {
            user_id: user_id,
            question_id: {
              [Op.in]: questionIds
            }
          }
        });
        
        // Update case: We need to count a new image upload during update as well
        // The only case we don't count is if we're replacing an existing image
        // Regardless of whether it's create or update, if there's no existing image
        // and we're adding a new one, count it towards the limit
        if (!existingImage && imageCount >= 3) {
          return res.status(403).json({
            message: "Anda hanya dapat mengunggah maksimal 3 gambar per kuis"
          });
        }
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
  uploadImageLimit
};
