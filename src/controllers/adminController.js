const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Joi = require("joi");

const {
  User,
  Subscription,
  UserLog,
  Question,
  Quiz,
  QuestionImage,
  SubmissionAnswer,
  QuizSession,
} = require("../models/index");
const { formatImageUrl } = require("../utils/helpers");
const sequelize = require("../database/connection");
const { Op } = require("sequelize");

const teacherSchema = {
  // 1. Validasi untuk ID (dipakai di delete/get detail)
  idSchema: Joi.object({
    id: Joi.string().required(),
  }),

  // 2. Validasi untuk Generate Question (OpenTDB)
  generateQuestionSchema: Joi.object({
    quiz_id: Joi.string().required(),
    type: Joi.string().valid("multiple", "boolean").optional(),
    difficulty: Joi.string().valid("easy", "medium", "hard").optional(),
    category: Joi.string().optional(),
    amount: Joi.number().integer().min(1).max(50).optional(),
  }),

  // 3. Validasi untuk Create Question Manual
  questionSchema: Joi.object({
    quiz_id: Joi.string().required(),
    type: Joi.string().valid("multiple", "boolean").required(),
    difficulty: Joi.string().valid("easy", "medium", "hard").required(),
    question_text: Joi.string().required(),
    correct_answer: Joi.string().required(),
    incorrect_answers: Joi.array().items(Joi.string()).required(),
  }),

  // 4. Validasi untuk Update Question
  updateQuestionSchema: Joi.object({
    question_id: Joi.string().required(),
    type: Joi.string().optional(),
    difficulty: Joi.string().optional(),
    question_text: Joi.string().optional(),
    correct_answer: Joi.string().optional(),
    incorrect_answers: Joi.array().items(Joi.string()).optional(),
  }),
};

const checkQuizOwnership = async (QuizModel, quizId, userId) => {
  try {
    const quiz = await QuizModel.findOne({ where: { id: quizId } });

    if (!quiz) {
      return { error: "Quiz tidak ditemukan", code: 404 };
    }

    const user = await User.findOne({
      where: { id: userId },
    });

    // Jika logic ini untuk ADMIN, Admin biasanya boleh edit punya siapa saja.
    // Jadi kita bisa skip pengecekan created_by jika perlu.
    // Tapi untuk memuaskan kodingan yang ada, ini logic standarnya:

    // Cek apakah yang edit adalah pembuat quiz (Owner)
    if (quiz.created_by !== userId && user.role !== "admin") {
      // OPSIONAL: Jika kamu ingin Admin bisa edit punya orang lain,
      // kamu bisa tambahkan logic di sini (misal cek role req.user.role === 'admin')
      // Tapi kodingan di bawah ini defaultnya "Hanya Pembuat yang bisa edit"
      return {
        error: "Anda tidak memiliki izin untuk mengedit kuis ini",
        code: 403,
      };
    }

    return { quiz }; // Berhasil
  } catch (err) {
    return { error: err.message, code: 500 };
  }
};

// Ambil log aktivitas user (dengan relasi ke User)
const getLog = async (req, res) => {
  const { user_id } = req.query;

  try {
    const logs = await UserLog.findAll({
      where: user_id ? { user_id } : {},
      order: [["created_at", "DESC"]],
      include: [
        {
          model: User,
          attributes: ["id", "name", "username"],
        },
      ],
    });

    if (logs.length === 0) {
      return res.status(404).json({ message: "Masih belum ada aktivitas" });
    }

    return res.status(200).json(logs);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Buat tier subscription baru
const createTierList = async (req, res) => {
  const schema = Joi.object({
    status: Joi.string().trim().min(1).required().messages({
      "any.required": "Status wajib diisi",
      "string.empty": "Status tidak boleh kosong",
    }),
  });

  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });

  try {
    // Trim ulang biar benar-benar bersih
    const statusTrimmed = value.status.trim();

    // Cek kalau status sudah ada, hindari duplikat
    const existing = await Subscription.findOne({
      where: { status: statusTrimmed },
    });
    if (existing) {
      return res.status(409).json({ message: "Status subscription sudah ada" });
    }

    console.log("Status yang akan dibuat:", statusTrimmed);

    // Buat subscription dengan status yang sudah di-trim
    const newSubscription = await Subscription.create({
      status: statusTrimmed,
    });

    console.log("Subscription baru:", newSubscription.toJSON());

    return res.status(201).json({
      message: "Subscription berhasil dibuat",
      data: newSubscription,
    });
  } catch (error) {
    console.error("Error saat membuat subscription:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Ambil semua tier subscription
const getTierList = async (req, res) => {
  try {
    const subs = await Subscription.findAll();
    return res.status(200).json({ data: subs });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.findAll();
    return res.status(200).json(questions);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteQuiz = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { error, value } = teacherSchema.idSchema.validate(req.body);
    if (error) {
      await transaction.rollback();
      return res.status(400).json({ message: error.details[0].message });
    }
    const quiz_id = value.id;
    const userId = req.user.id;

    // Delete related question images
    const existingQuestionImages = await QuestionImage.findAll({
      include: [
        {
          model: Question,
          where: { quiz_id: quiz_id },
          required: true,
        },
      ],
    });
    for (const img of existingQuestionImages) {
      // Delete image file from server
      const imagePath = img.image_url.replace(`/uploads/${userId}/`, "");
      const fullPath = `./src/uploads/${userId}/${imagePath}`;
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      await QuestionImage.destroy({ where: { id: img.id }, transaction });
    }
    // Delete questions
    await Question.destroy({ where: { quiz_id: quiz_id }, transaction });
    // Delete quiz
    await Quiz.destroy({ where: { id: quiz_id }, transaction });
    await transaction.commit();
    res.status(200).json({ message: "Successfully delete quiz" });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: error.message });
  }
};

const getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.findAll({
      include: [
        {
          model: User,
          attributes: ["name"], // Kita cuma butuh namanya
        },
      ],
      order: [["created_at", "DESC"]],
    });

    // Format data agar sesuai dengan QuizModel Flutter (Flattening)
    const formattedQuizzes = quizzes.map((quiz) => {
      // Ubah ke plain object
      const q = quiz.get({ plain: true });

      return {
        ...q, // Copy semua field quiz (id, title, status, dll)

        // [PENTING] Mapping dari Nested Object ke Flat Field
        // Flutter QuizModel mencari: json['creator_name']
        creator_name: q.User ? q.User.name : "Unknown Teacher",
      };
    });

    return res.status(200).json(formattedQuizzes);
  } catch (error) {
    console.error("Get All Quizzes Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

const createQuestion = async (req, res) => {
  try {
    // Parse incorrect_answers if it's a string
    req.body.incorrect_answers = parseIncorrectAnswers(
      req.body.incorrect_answers
    );

    // Validate inputs
    await schema.questionSchema.validateAsync(req.body, { abortEarly: false });

    const {
      quiz_id,
      type,
      difficulty,
      question_text,
      correct_answer,
      incorrect_answers,
    } = req.body;

    // Combine correct_answer and incorrect_answers into options
    const options = [correct_answer, ...incorrect_answers];

    // Check quiz ownership
    const ownershipCheck = await checkQuizOwnership(Quiz, quiz_id, req.user.id);
    if (ownershipCheck.error) {
      return res
        .status(ownershipCheck.code)
        .json({ message: ownershipCheck.error });
    }

    // Generate question ID
    const allQuestion = await Question.findAll();
    const id = "Q" + (allQuestion.length + 1).toString().padStart(3, "0");

    const imagePath = req.file
      ? `/uploads/${req.user.id}/${req.file.filename}`
      : null;

    const question = await Question.create({
      id,
      quiz_id,
      type,
      difficulty,
      question_text,
      correct_answer,
      options,
      is_generated: 0,
    });

    if (imagePath) {
      await QuestionImage.create({
        user_id: req.user.id,
        question_id: question.id,
        image_url: imagePath,
        uploaded_at: new Date(),
      });
    }

    // Format response data
    const formattedQuestion = {
      id: question.id,
      quiz_id: question.quiz_id,
      type: question.type,
      difficulty: question.difficulty,
      question_text: question.question_text,
      correct_answer: question.correct_answer,
      options: question.options,
      image_url: formatImageUrl(req, imagePath),
    };

    res.status(201).json({
      message: "Berhasil membuat pertanyaan",
      question: formattedQuestion,
    });
  } catch (error) {
    if (error.isJoi) {
      return res
        .status(400)
        .json({ errors: error.details.map((err) => err.message) });
    }
    res.status(500).json({ message: error.message });
  }
};

const updateQuestion = async (req, res) => {
  try {
    // Parse incorrect_answers if it's a string
    req.body.incorrect_answers = parseIncorrectAnswers(
      req.body.incorrect_answers
    );

    await schema.updateQuestionSchema.validateAsync(req.body, {
      abortEarly: false,
    });

    const {
      question_id,
      type,
      difficulty,
      question_text,
      correct_answer,
      incorrect_answers,
    } = req.body;

    // Combine correct_answer and incorrect_answers into options
    const options = [correct_answer, ...incorrect_answers];

    const question = await Question.findOne({
      where: { id: question_id },
    });

    if (!question) {
      return res.status(404).json({ message: "Pertanyaan tidak ditemukan" });
    }

    // Check quiz ownership
    const ownershipCheck = await checkQuizOwnership(
      Quiz,
      question.quiz_id,
      req.user.id
    );
    if (ownershipCheck.error) {
      return res
        .status(ownershipCheck.code)
        .json({ message: ownershipCheck.error });
    }

    // Check for new image upload
    const imagePath = req.file
      ? `/uploads/${req.user.id}/${req.file.filename}`
      : null;

    await Question.update(
      {
        type,
        difficulty,
        question_text,
        correct_answer,
        options,
        is_generated: 0,
      },
      {
        where: { id: question_id },
      }
    );

    if (imagePath) {
      const existingImage = await QuestionImage.findOne({
        where: { question_id },
      });

      if (existingImage) {
        await QuestionImage.update(
          { image_url: imagePath },
          { where: { question_id } }
        );
      } else {
        await QuestionImage.create({
          user_id: req.user.id,
          question_id,
          image_url: imagePath,
        });
      }
    }

    // Get updated question
    const updatedQuestion = await Question.findOne({
      where: { id: question_id },
    });

    // Format response
    const formattedQuestion = {
      id: updatedQuestion.id,
      quiz_id: updatedQuestion.quiz_id,
      type: updatedQuestion.type,
      difficulty: updatedQuestion.difficulty,
      question_text: updatedQuestion.question_text,
      correct_answer: updatedQuestion.correct_answer,
      options: updatedQuestion.options,
      image_url: formatImageUrl(req, imagePath),
    };

    return res.status(200).json({
      message: "Berhasil memperbarui pertanyaan",
      question: formattedQuestion,
    });
  } catch (error) {
    if (error.isJoi) {
      return res
        .status(400)
        .json({ errors: error.details.map((err) => err.message) });
    }
    res.status(500).json({ message: error.message });
  }
};

const generateQuestion = async (req, res) => {
  try {
    const { error, value } = teacherSchema.generateQuestionSchema.validate(
      req.body
    );
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const { quiz_id, type, difficulty, category, amount } = value;

    // Check if quiz exists
    const quiz = await Quiz.findOne({
      where: { id: quiz_id },
    });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz ID tidak ditemukan" });
    }

    const params = {
      amount: amount || 10,
    };
    if (category) params.category = category;
    if (difficulty) params.difficulty = difficulty;
    if (type) params.type = type;

    const response = await opentdb.get("/api.php", { params });
    const data = response.data;

    if (!data.results || data.results.length === 0) {
      return res.status(404).json({
        message: "Tidak ada pertanyaan yang ditemukan dari Open Trivia DB",
      });
    }

    // Get current question count to generate IDs
    const allQuestions = await Question.findAll();
    let questionCount = allQuestions.length;

    // Process and save each question from the API
    const savedQuestions = [];
    for (const question of data.results) {
      questionCount++;
      const id = "Q" + questionCount.toString().padStart(3, "0");

      // Combine correct_answer and incorrect_answers into options
      const options = [question.correct_answer, ...question.incorrect_answers];

      const newQuestion = await Question.create({
        id,
        quiz_id,
        type: question.type,
        difficulty: question.difficulty,
        question_text: question.question,
        correct_answer: question.correct_answer,
        options,
        is_generated: 1,
      });

      savedQuestions.push({
        id: newQuestion.id,
        quiz_id: newQuestion.quiz_id,
        type: newQuestion.type,
        difficulty: newQuestion.difficulty,
        question_text: newQuestion.question_text,
        correct_answer: newQuestion.correct_answer,
        options: newQuestion.options,
      });
    }

    res.status(201).json({
      message: `Berhasil menambahkan ${savedQuestions.length} pertanyaan dari Open Trivia DB`,
      questions: savedQuestions,
    });
  } catch (error) {
    console.error("Error fetching from OpenTDB:", error.message);
    res.status(500).json({ message: error.message });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const { error, value } = teacherSchema.idSchema.validate({
      id: req.params.question_id,
    });
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const question_id = value.id;

    const question = await Question.findOne({
      where: { id: question_id },
    });

    if (!question) {
      return res.status(404).json({ message: "Question ID tidak ditemukan" });
    }

    // Check quiz ownership
    const ownershipCheck = await checkQuizOwnership(
      Quiz,
      question.quiz_id,
      req.user.id
    );
    if (ownershipCheck.error) {
      return res
        .status(ownershipCheck.code)
        .json({ message: ownershipCheck.error });
    }

    // Delete question
    await Question.destroy({
      where: { id: question_id },
    });

    // Delete related image if exists
    const questionImage = await QuestionImage.findOne({
      where: { question_id },
    });

    if (questionImage) {
      await QuestionImage.destroy({
        where: { question_id },
      });

      // Delete image file from server
      const imagePath = questionImage.image_url.replace(
        `/uploads/${req.user.id}/`,
        ""
      );
      const fullPath = `./uploads/${req.user.id}/${imagePath}`;
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    res.status(200).json({
      message: "Berhasil menghapus pertanyaan dengan ID " + question_id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUsersQuiz = async (req, res) => {
  try {
    const userId = req.user.id;
    const quizzes = await Quiz.findAll({
      where: { created_by: userId },
      attributes: ["id", "title", "description", "created_at"],
    });

    if (quizzes.length === 0) {
      return res.status(404).json({ message: "Tidak ada kuis ditemukan" });
    }

    // Format created_at date
    quizzes.forEach((quiz) => {
      quiz.dataValues.created_at = quiz.created_at.toISOString().split("T")[0];
    });

    // Add question count to each quiz
    for (const quiz of quizzes) {
      quiz.dataValues.question_count = await Question.count({
        where: { quiz_id: quiz.id },
      });
    }

    res.status(200).json({
      message: "Berhasil mendapatkan daftar kuis",
      quizzes,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getQuizDetail = async (req, res) => {
  try {
    // 1. Validasi Input
    const { error, value } = teacherSchema.idSchema.validate({
      id: req.params.quiz_id,
    });
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const quiz_id = value.id;

    // 2. Ambil Semua Pertanyaan
    const questions = await Question.findAll({
      where: { quiz_id },
      attributes: [
        "id",
        "type",
        "difficulty",
        "question_text",
        "correct_answer",
        "options",
        "created_at",
        "updated_at",
      ],
    });

    // 3. [LOGIC BARU] Hitung Statistik & Gambar untuk Setiap Pertanyaan
    // Kita pakai Promise.all agar prosesnya berjalan paralel (lebih cepat)
    const questionsWithStats = await Promise.all(
      questions.map(async (question) => {
        const q = question.toJSON(); // Ubah ke object biasa agar bisa ditambah field baru

        // A. Hitung Jawaban BENAR (is_correct = 1)
        const correctCount = await SubmissionAnswer.count({
          where: {
            question_id: q.id,
            is_correct: true, // atau 1
          },
        });

        // B. Hitung Jawaban SALAH (is_correct = 0)
        const incorrectCount = await SubmissionAnswer.count({
          where: {
            question_id: q.id,
            is_correct: false, // atau 0
          },
        });

        // C. Ambil Gambar (Logic lama)
        const image = await QuestionImage.findOne({
          where: { question_id: q.id },
        });

        // D. Masukkan data ke object response
        q.correct_answers = correctCount; // <-- INI YANG DIBACA FLUTTER
        q.incorrect_answers = incorrectCount; // <-- INI YANG DIBACA FLUTTER
        q.image_url = formatImageUrl(req, image?.image_url);

        return q;
      })
    );

    res.status(200).json({
      message: `Berhasil mendapatkan detail kuis`,
      questions: questionsWithStats,
    });
  } catch (error) {
    console.error("Error getQuizDetail:", error);
    res.status(500).json({ message: error.message });
  }
};

const getQuizResult = async (req, res) => {
  try {
    const { error, value } = teacherSchema.idSchema.validate({
      id: req.params.quiz_id,
    });
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const quiz_id = value.id;

    // Get quiz sessions
    const quizSessions = await QuizSession.findAll({
      where: {
        quiz_id,
        status: "completed",
      },
      include: [
        {
          model: User,
          attributes: ["id", "name", "username", "email"],
        },
      ],
      order: [["ended_at", "DESC"]],
    });

    if (quizSessions.length === 0) {
      return res.status(404).json({
        message: "Tidak ada hasil kuis ditemukan untuk kuis ini",
      });
    }

    // Format results
    const results = quizSessions.map((session) => ({
      student_id: session.User.id,
      student: session.User.name,
      score: session.score,
      started_at: session.started_at.toISOString(),
      ended_at: session.ended_at.toISOString(),
    }));

    res.status(200).json({
      message: `Berhasil mendapatkan hasil kuis`,
      results,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStudentsAnswers = async (req, res) => {
  try {
    const { student_id, quiz_id } = req.params;

    const session = await QuizSession.findOne({
      where: {
        user_id: student_id,
        quiz_id,
      },
    });

    if (!session) {
      return res
        .status(404)
        .json({ message: "Tidak ada sesi quiz yang ditemukan" });
    }

    // Get answers for the session
    const answers = await SubmissionAnswer.findAll({
      where: {
        quiz_session_id: session.id,
      },
      include: [
        {
          model: Question,
          required: false,
          attributes: [
            "id",
            "type",
            "difficulty",
            "question_text",
            "correct_answer",
            "options",
          ],
        },
      ],
    });

    res.status(200).json({
      message: "Berhasil mendapatkan jawaban siswa",
      session: session,
      answers: answers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getQuizAccuracy = async (req, res) => {
  try {
    const { quiz_id } = req.params;
    // Check quiz ownership
    const ownershipCheck = await checkQuizOwnership(Quiz, quiz_id, req.user.id);
    if (ownershipCheck.error) {
      return res
        .status(ownershipCheck.code)
        .json({ message: ownershipCheck.error });
    }

    // Get all questions for this quiz
    const questions = await Question.findAll({
      where: { quiz_id },
      attributes: ["id", "question_text"],
    });

    if (questions.length === 0) {
      return res
        .status(404)
        .json({ message: "Tidak ada pertanyaan ditemukan untuk kuis ini" });
    }

    // cari quiz session yang selesai
    const quizSessions = await QuizSession.findAll({
      where: { quiz_id, status: "completed" },
      attributes: ["id"],
    });

    if (quizSessions.length === 0) {
      return res
        .status(404)
        .json({ message: "Tidak ada sesi kuis yang selesai ditemukan" });
    }

    // jawaban quiz
    const submissionAnswers = await SubmissionAnswer.findAll({
      where: {
        quiz_session_id: quizSessions.map((session) => session.id),
      },
      attributes: ["question_id", "is_correct"],
    });

    // hitung statistik untuk setiap pertanyaan
    const questionStats = questions.map((question) => {
      //ambil jawaban dari quiz yg dicari
      const questionAnswers = submissionAnswers.filter(
        (answer) => answer.question_id === question.id
      );

      const total_answered = questionAnswers.length;
      const correct_answers = questionAnswers.filter(
        (answer) => answer.is_correct
      ).length;

      //hitung berapa yg salah
      const incorrect_answers = total_answered - correct_answers;

      //ngitung akurasi dlm persen
      let accuracy, mean;
      if (total_answered > 0) {
        accuracy = Math.round((correct_answers / total_answered) * 100);

        //rata-rata yang jawab benar
        mean = correct_answers / total_answered;
      } else {
        accuracy = 0;
        mean = 0;
      }

      return {
        question_id: question.id,
        question: question.question_text,
        total_answered,
        correct_answers,
        incorrect_answers,
        mean,
        accuracy,
      };
    });

    res.status(200).json({
      message: `Berhasil mendapatkan statistik akurasi kuis ${ownershipCheck.quiz.title}`,
      question_stats: questionStats,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const subscribe = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findOne({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    if (user.subscription_id === 2) {
      return res
        .status(200)
        .json({ message: "Guru sudah memiliki subscription!" });
    }

    // Update user's subscription to premium
    await User.update({ subscription_id: 2 }, { where: { id: userId } });

    res.status(200).json({
      message: `Guru ${user.name} Berhasil mengupgrade subscription ke premium`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: "Subscribed",
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const unsubscribe = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findOne({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    if (user.subscription_id === 1) {
      return res
        .status(200)
        .json({ message: "Guru sudah memiliki subscription free!" });
    }

    // Update user's subscription to free
    await User.update({ subscription_id: 1 }, { where: { id: userId } });

    res.status(200).json({
      message: `Guru ${user.name} Berhasil membatalkan subscription kembali ke free`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: "Not subscribed",
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const endQuiz = async (req, res) => {
  try {
    const { session_id } = req.params;
    const teacher_id = req.user.id;

    // Verify session exists and belongs to user
    const session = await QuizSession.findOne({
      where: {
        id: session_id,
        status: "in_progress",
      },
    });

    if (!session) {
      return res
        .status(404)
        .json({ message: "Sesi kuis tidak ditemukan atau sudah selesai" });
    }

    //cek apakah quiz dari session ini memang punya teacher
    const quiz = await Quiz.findOne({
      where: {
        id: session.quiz_id,
        created_by: teacher_id,
      },
    });

    if (!quiz) {
      return res
        .status(403)
        .json({ message: "Anda tidak memiliki akses ke kuis ini" });
    }

    // hitung total pertanyaan pada kuiz
    const totalQuestions = await Question.count({
      where: { quiz_id: session.quiz_id },
    });

    // hitung total jawaban yang benar
    const correctAnswers = await SubmissionAnswer.count({
      where: {
        quiz_session_id: session.id,
        is_correct: 1,
      },
    });

    // hitung skore dari total pertanyaan dan jawaban yang benar
    const score =
      totalQuestions > 0
        ? Math.round((correctAnswers / totalQuestions) * 100)
        : 0;

    // Update session with score and completed status
    await session.update({
      status: "completed",
      ended_at: new Date(),
      score: score,
    });

    // Get student info
    const student = await User.findByPk(session.user_id, {
      attributes: ["id", "name"],
    });

    res.status(200).json({
      message: `Kuis ${quiz.title} untuk siswa ${
        student ? student.name : "unknown"
      } berhasil diselesaikan`,
      student_name: student ? student.name : "unknown",
      score: score,
    });
  } catch (error) {
    console.error("Error ending quiz:", error);
    res.status(500).json({ message: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      // 1. WAJIB: Masukkan 'subscription_id' ke dalam attributes
      attributes: [
        "id",
        "name",
        "username",
        "email",
        "role",
        "is_active",
        "subscription_id",
      ],
      include: [
        {
          model: Subscription,
          as: "subscription",
          attributes: ["status"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    // 2. FORMATTING DATA (PENTING!)
    // Kita harus "meratakan" objek agar sesuai dengan UserModel di Flutter
    const formattedUsers = users.map((user) => {
      // Ubah instance Sequelize jadi plain object
      const u = user.get({ plain: true });

      return {
        id: u.id,
        name: u.name,
        username: u.username,
        email: u.email,
        role: u.role,

        // Paksa is_active jadi angka 1 atau 0 (Integer) untuk menghindari error 'String is not subtype of Int'
        is_active: u.is_active ? 1 : 0,

        subscription_id: u.subscription_id,

        // Ambil status dari nested object, taruh di root json
        // Cek apakah u.Subscription (kapital S) atau u.subscription (kecil) tergantung definisi model kamu
        subscription_status: u.subscription ? u.subscription.status : "Free",
      };
    });

    // 3. WRAPPING RESPONSE
    // Flutter AdminApiService mengharapkan: response.data['data']
    return res.status(200).json({
      success: true,
      data: formattedUsers,
    });
  } catch (error) {
    console.error("=========================================");
    console.error("🔥 ERROR SAAT GET ALL USERS:");
    console.error(error); // Ini akan mencetak stack trace lengkap
    console.error("=========================================");

    return res.status(500).json({ message: error.message });
  }
};

const getDashboardAnalytics = async (req, res) => {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    // =======================================================
    // 1. DATA TEACHER TRENDS (Chart 1)
    // Mengelompokkan Quiz berdasarkan Guru dan Kategori
    // =======================================================
    const teacherStats = await Quiz.findAll({
      attributes: [
        "created_by",
        "category",
        [sequelize.fn("COUNT", sequelize.col("Quiz.id")), "count"],
      ],
      include: [
        {
          model: User,
          attributes: ["name"],
          where: { role: "teacher" },
        },
      ],
      group: ["created_by", "category", "User.id", "User.name"],
    });

    // Formatting data agar mudah dibaca Flutter
    // Hasil: { "Nama Guru": { "Math": 5, "Science": 2 } }
    const teacherTrends = {};
    teacherStats.forEach((stat) => {
      const teacherName = stat.User.name;
      const category = stat.category || "Uncategorized";
      const count = parseInt(stat.dataValues.count);

      if (!teacherTrends[teacherName]) {
        teacherTrends[teacherName] = {};
      }
      if (!teacherTrends[teacherName][category]) {
        teacherTrends[teacherName][category] = 0;
      }
      teacherTrends[teacherName][category] += count;
    });

    // =======================================================
    // 2. DATA STUDENT PARTICIPATION (Chart 2)
    // Total Siswa vs Yang sudah pernah submit kuis
    // =======================================================
    const totalStudents = await User.count({
      where: { role: "student", is_active: 1 },
    });

    // Hitung siswa unik yang sudah pernah menyelesaikan setidaknya 1 kuis
    const activeStudents = await QuizSession.count({
      distinct: true,
      col: "user_id",
      where: { status: "completed" },
    });

    const studentParticipation = {
      total: totalStudents,
      active: activeStudents,
      pending: totalStudents - activeStudents, // Siswa yang belum pernah mengerjakan
    };

    // =======================================================
    // 3. QUIZ FLOW / QUESTION DIFFICULTY (Chart 3)
    // Ambil 10 Pertanyaan dengan tingkat kesalahan tertinggi (Top 10 Hardest)
    // =======================================================
    // Kita cari pertanyaan yang sudah pernah dijawab
    const questionStatsRaw = await Question.findAll({
      attributes: ["id", "question_text"], // Ambil ID dan Teks
      limit: 10, // Ambil sampel 10 soal saja untuk grafik
    });

    // Kita hitung manual akurasinya (karena count di include kadang berat)
    const quizFlow = await Promise.all(
      questionStatsRaw.map(async (q) => {
        const correct = await SubmissionAnswer.count({
          where: { question_id: q.id, is_correct: 1 },
        });
        const wrong = await SubmissionAnswer.count({
          where: { question_id: q.id, is_correct: 0 },
        });
        const total = correct + wrong;

        const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100);

        return {
          question_id: q.id,
          label: `Q${q.id.slice(-3)}`, // Label pendek misal Q001
          difficulty: 100 - accuracy, // Semakin kecil akurasi, semakin sulit (Difficulty naik)
          failures: wrong,
        };
      })
    );

    // =======================================================
    // 4. USER ACTIVITY (Chart 4) - Last 7 Days
    // Register vs Login
    // =======================================================
    const userActivity = [];

    // Loop 7 hari ke belakang
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);

      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));

      // Hitung New Register
      const newRegisters = await User.count({
        where: {
          created_at: { [Op.between]: [startOfDay, endOfDay] },
        },
      });

      // Hitung Active Login (Dari UserLog)
      const activeLogins = await UserLog.count({
        where: {
          created_at: { [Op.between]: [startOfDay, endOfDay] },
          action_type: "LOGIN", // Pastikan action_type di database sesuai
        },
      });

      userActivity.push({
        date: startOfDay.toISOString().split("T")[0], // YYYY-MM-DD
        day: startOfDay.toLocaleDateString("en-US", { weekday: "short" }), // Mon, Tue...
        registers: newRegisters,
        logins: activeLogins,
      });
    }

    // =======================================================
    // FINAL RESPONSE
    // =======================================================
    return res.status(200).json({
      message: "Analytics data fetched successfully",
      data: {
        teacher_trends: teacherTrends,
        student_participation: studentParticipation,
        quiz_flow: quizFlow,
        user_activity: userActivity,
      },
    });
  } catch (error) {
    console.error("Analytics Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Cari User
    const user = await User.findOne({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    // 2. Cek Admin Utama
    if (user.role === "admin") {
      return res
        .status(403)
        .json({ message: "Tidak dapat memblokir akun Admin" });
    }

    // 3. LOGIC TOGGLE (PEMBALIKAN) OTOMATIS
    // Jika 1 jadi 0, Jika 0 jadi 1.
    // Kita baca status yang ada di database sekarang, lalu dibalik (!)
    const newStatus = !user.is_active;

    // Update ke database
    user.is_active = newStatus ? 1 : 0;
    await user.save();

    const statusText = newStatus ? "diaktifkan" : "diblokir";

    return res.status(200).json({
      message: `User ${user.name} berhasil ${statusText}`,
      user: {
        id: user.id,
        is_active: user.is_active ? 1 : 0, // Pastikan return integer/boolean konsisten
      },
    });
  } catch (error) {
    console.error("Toggle User Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Update User (Role & Subscription)
const updateUser = async (req, res) => {
  const admin = require("firebase-admin"); 
  console.log("📥 [Backend] Masuk Update User");
  console.log("🔑 ID Params:", req.params.id);
  console.log("📦 Body:", req.body);
  try {
    const { id } = req.params;
    const { role, subscription_id } = req.body;

    const user = await User.findOne({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    // Cegah edit Role Admin Utama (Optional security)
    if (user.role === 'admin' && role !== 'admin') {
      return res.status(403).json({ message: "Tidak dapat mengubah role Admin utama" });
    }

    // Update Data
    if (role) user.role = role;
    if (subscription_id) user.subscription_id = subscription_id;

    await user.save();

    // Jika Role berubah, update juga Custom Claims Firebase (Penting!)
    if (user.firebase_uid) {
       await admin.auth().setCustomUserClaims(user.firebase_uid, { role: user.role });
    }

    return res.status(200).json({ 
      message: `User ${user.name} berhasil diperbarui`,
      user
    });

  } catch (error) {
    console.error("Update User Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getLog,
  createTierList,
  getTierList,
  getAllQuestions,
  getAllQuizzes,
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
  endQuiz,
  getAllUsers,
  getDashboardAnalytics,
  toggleUserStatus,
  deleteQuiz,
  updateUser,
};
