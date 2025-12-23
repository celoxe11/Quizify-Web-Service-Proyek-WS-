const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Joi = require("joi");

const {User, Subscription, UserLog, Question, Quiz} = require("../models/index");

// Ambil log aktivitas user (dengan relasi ke User)
const getLog = async (req, res) => {
  const { user_id } = req.body;

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

// Update subscription user
const userSubscription = async (req, res) => {
  const schema = Joi.object({
    user_id: Joi.string().required().messages({
        "any.required": "user_id wajib diisi",
        "string.empty": "user_id tidak boleh kosong",
    }),
    subscription: Joi.string().required().messages({
        "any.required": "Subscription wajib diisi",
        "string.empty": "Subscription tidak boleh kosong",
    }),
  });

  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });

  const { user_id, subscription } = value;

  try {
    const user = await User.findOne({
      where: { id: user_id },
      include: [Subscription],
    });

    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    const subscriptionData = await Subscription.findOne({
      where: { status: subscription },
    });

    if (!subscriptionData) {
      return res.status(404).json({ message: "Subscription tidak ditemukan" });
    }

    user.subscription_id = subscriptionData.id_subs;
    await user.save();

    return res.status(200).json({
      message: `Subscription ${user.name} berhasil diperbarui`,
      subscription: subscriptionData.status,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", detail: error.message });
  }
};

// Ambil daftar user beserta subscription mereka
const getSubsList = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "name", "username", "email", "role", "is_active"],
      include: [
        {
          model: Subscription,
          attributes: ["status"],
        },
      ],
      order: [[Subscription, "status", "DESC"]],
    });

    return res.status(200).json(users);
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
    const existing = await Subscription.findOne({ where: { status: statusTrimmed } });
    if (existing) {
      return res.status(409).json({ message: "Status subscription sudah ada" });
    }

    console.log('Status yang akan dibuat:', statusTrimmed);

    // Buat subscription dengan status yang sudah di-trim
    const newSubscription = await Subscription.create({ status: statusTrimmed });

    console.log('Subscription baru:', newSubscription.toJSON());

    return res.status(201).json({
      message: "Subscription berhasil dibuat",
      data: newSubscription,
    });
  } catch (error) {
    console.error('Error saat membuat subscription:', error);
    return res.status(500).json({ message: error.message });
  }
};

// Ambil semua tier subscription
const getTierList = async (req, res) => {
  try {
    const subscriptions = await Subscription.findAll({
      attributes: ["id_subs", "status"],
    });

    return res.status(200).json(subscriptions);
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
}

const getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.findAll();
    return res.status(200).json(quizzes);
  } catch (error) {
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
    const { error, value } = teacherSchema.idSchema.validate({
      id: req.params.quiz_id,
    });
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const quiz_id = value.id;

    // Check quiz ownership
    const ownershipCheck = await checkQuizOwnership(Quiz, quiz_id, req.user.id);
    if (ownershipCheck.error) {
      return res
        .status(ownershipCheck.code)
        .json({ message: ownershipCheck.error });
    }

    // Get questions for this quiz
    const questions = await Question.findAll({
      where: { quiz_id },
      attributes: [
        "id",
        "type",
        "difficulty",
        "question_text",
        "correct_answer",
        "options",
      ],
    });

    // Include images if available
    for (const question of questions) {
      const image = await QuestionImage.findOne({
        where: { question_id: question.id },
      });

      question.dataValues.image_url = formatImageUrl(req, image?.image_url);
    }

    res.status(200).json({
      message: `Berhasil mendapatkan detail kuis ${ownershipCheck.quiz.title}`,
      questions,
    });
  } catch (error) {
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

    // Check quiz ownership
    const ownershipCheck = await checkQuizOwnership(Quiz, quiz_id, req.user.id);
    if (ownershipCheck.error) {
      return res
        .status(ownershipCheck.code)
        .json({ message: ownershipCheck.error });
    }

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
      student: session.User.name,
      score: session.score,
      started_at: session.started_at.toISOString(),
      ended_at: session.ended_at.toISOString(),
    }));

    res.status(200).json({
      message: `Berhasil mendapatkan hasil kuis ${ownershipCheck.quiz.title}`,
      results,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStudentsAnswers = async (req, res) => {
  try {
    const { student_id, quiz_id } = req.body;

    const sessions = await QuizSession.findAll({
      where: {
        user_id: student_id,
        quiz_id,
      },
    });

    if (!sessions || sessions.length === 0) {
      return res
        .status(404)
        .json({ message: "Tidak ada sesi quiz yang ditemukan" });
    }

    // Get answers for all sessions
    const answers = await SubmissionAnswer.findAll({
      where: {
        quiz_session_id: sessions.map((session) => session.id),
      },
    });

    res.status(200).json({
      message: "Berhasil mendapatkan jawaban siswa",
      sessions: sessions,
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
      attributes: ["id", "name", "username", "email", "role", "is_active", "subscription_id"],
      include: [
        {
          model: Subscription,
          // as: 'subscription', 
          attributes: ["status"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    // 2. FORMATTING DATA (PENTING!)
    // Kita harus "meratakan" objek agar sesuai dengan UserModel di Flutter
    const formattedUsers = users.map((user) => {
      // Ubah instance Sequelize jadi plain object
      const u = user.toJSON();
      
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
        subscription_status: u.subscription ? u.subscription.status : 'Free'
      };
    });

    // 3. WRAPPING RESPONSE
    // Flutter AdminApiService mengharapkan: response.data['data']
    return res.status(200).json({
      success: true,
      data: formattedUsers 
    });

  } catch (error) {
    console.error("=========================================");
    console.error("🔥 ERROR SAAT GET ALL USERS:");
    console.error(error); // Ini akan mencetak stack trace lengkap
    console.error("=========================================");

    return res.status(500).json({ message: error.message });
  }
};



module.exports = {
  getLog,
  userSubscription,
  getSubsList,
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
};
