const jwt = require("jsonwebtoken");
const { QuestionImage, UserLog } = require("../models");
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

// cek kalau user sudah upload gambar lebih dari 3
const uploadImageLimit = async (req, res, next) => {
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
    if (req.user.subscription_id === 1) {
      // lihat dari question_image
      const questionImage = await QuestionImage.findAll({
        where: {
          user_id: user_id,
          created_at: {
            [Op.gte]: startOfDay,
            [Op.lt]: endOfDay,
          },
        },
      });
      if (questionImage.length > 3) {
        return res.status(403).json({
          message: "Anda sudah mengupload gambar lebih dari 3 kali hari ini",
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
