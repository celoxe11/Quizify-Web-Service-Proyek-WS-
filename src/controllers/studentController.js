const {
  Quiz,
  QuizSession,
  Question,
  SubmissionAnswer,
  User,
  QuestionImage,
  Transaction,
  Subscription,
  Avatar,
} = require("../models");
const { get } = require("../routes/studentRoutes");
const fetchGeminiEvaluation = require("../utils/fetchGeminiEvaluation");

// Helper function to pad numbers with leading zeros
const padNumber = (num) => {
  return num.toString().padStart(3, "0");
};

const startQuiz = async (req, res) => {
  try {
    const { quiz_id } = req.params;
    const user_id = req.user.id;

    const quiz = await Quiz.findOne({
      where: { id: quiz_id },
    });

    if (!quiz) {
      return res.status(404).json({ message: "Kuis tidak ditemukan" });
    }

    // cek sesi
    const activeSession = await QuizSession.findOne({
      where: {
        user_id,
        quiz_id,
        status: "in_progress",
      },
    });

    // if there is an active session remove that session
    if (activeSession) {
      await activeSession.destroy();
      console.log("Active session removed");
    }

    // buat ID - cari ID terakhir untuk menghindari duplicate
    const lastSession = await QuizSession.findOne({
      order: [["id", "DESC"]],
      attributes: ["id"],
    });

    let newIdNumber = 1;
    if (lastSession) {
      const lastIdNumber = parseInt(lastSession.id.replace("S", ""));
      newIdNumber = lastIdNumber + 1;
    }
    const idBaruSession = `S${padNumber(newIdNumber)}`;

    const session = await QuizSession.create({
      id: idBaruSession,
      user_id,
      quiz_id,
      status: "in_progress",
      started_at: new Date(),
      ended_at: null,
      score: null,
    });

    res.status(201).json({
      message: "Sesi kuis berhasil dimulai",
      session_id: session.id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// startQuiz berdasarkan quiz_code
const startQuizByCode = async (req, res) => {
  try {
    const { quiz_code } = req.params;
    const user_id = req.user.id;
    const quiz = await Quiz.findOne({
      where: { quiz_code },
    });
    if (!quiz) {
      return res
        .status(404)
        .json({ message: "Kuis dengan kode tersebut tidak ditemukan" });
    }
    // cek sesi
    const activeSession = await QuizSession.findOne({
      where: {
        user_id,
        quiz_id: quiz.id,
        status: "in_progress",
      },
    });
    if (activeSession) {
      await activeSession.destroy();
      console.log("Active session removed");
    }
    // buat ID - cari ID terakhir untuk menghindari duplicate
    const lastSession = await QuizSession.findOne({
      order: [["id", "DESC"]],
      attributes: ["id"],
    });

    let newIdNumber = 1;
    if (lastSession) {
      const lastIdNumber = parseInt(lastSession.id.replace("S", ""));
      newIdNumber = lastIdNumber + 1;
    }
    const idBaruSession = `S${padNumber(newIdNumber)}`;

    const session = await QuizSession.create({
      id: idBaruSession,
      user_id,
      quiz_id: quiz.id,
      status: "in_progress",
      started_at: new Date(),
      ended_at: null,
      score: null,
    });
    res.status(201).json({
      message: "Sesi kuis berhasil dimulai",
      session_id: session.id,
      quiz_id: quiz.id,
    });
  } catch (error) {
    console.error("Error in startQuizByCode:", error);
    res.status(500).json({
      message: error.message,
      error: error.name,
      details: error.errors ? error.errors.map((e) => e.message) : undefined,
    });
  }
};

const getQuestions = async (req, res) => {
  try {
    const { session_id } = req.params;
    const user_id = req.user.id;

    const session = await QuizSession.findOne({
      where: {
        id: session_id,
        user_id,
        status: "in_progress",
      },
    });

    if (!session) {
      return res.status(404).json({
        message:
          "Sesi kuis tidak ditemukan, sudah selesai, atau sudah diselesaikan oleh guru",
      });
    }

    const questions = await Question.findAll({
      where: { quiz_id: session.quiz_id },
      attributes: [
        "id",
        "question_text",
        "type",
        "difficulty",
        "correct_answer",
        "options",
      ],
      include: [
        {
          model: QuestionImage,
          attributes: ["image_url"],
          required: false,
        },
      ],
    });

    const formattedQuestions = questions.map((question) => {
      // Parse options if it's a string
      let options;
      if (typeof question.options === "string") {
        options = JSON.parse(question.options);
      } else {
        options = question.options;
      }

      // Shuffle options
      const shuffledOptions = [...options].sort(() => Math.random() - 0.5);

      // Get question image (hasMany returns array, so take first one)
      const questionImage =
        question.QuestionImages && question.QuestionImages.length > 0
          ? question.QuestionImages[0].image_url
          : null;

      // Return formatted question object
      return {
        id: question.id,
        question_text: question.question_text,
        type: question.type,
        difficulty: question.difficulty,
        possible_answers: shuffledOptions,
        question_image: questionImage,
      };
    });

    res.status(200).json({
      message: "Berhasil mendapatkan pertanyaan",
      questions: formattedQuestions,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const answerQuestion = async (req, res) => {
  try {
    const { quiz_session_id, question_id, selected_answer } = req.body;
    const user_id = req.user.id;

    // cek session ada + punya user
    const session = await QuizSession.findOne({
      where: {
        id: quiz_session_id,
        user_id,
        status: "in_progress",
      },
    });

    if (!session) {
      return res.status(404).json({
        message:
          "Sesi kuis tidak ditemukan, sudah selesai, atau sudah diselesaikan oleh guru",
      });
    }

    const question = await Question.findOne({
      where: {
        id: question_id,
        quiz_id: session.quiz_id,
      },
    });

    if (!question) {
      return res.status(404).json({ message: "Pertanyaan tidak ditemukan" });
    }

    //cek udh dijawab
    const existingAnswer = await SubmissionAnswer.findOne({
      where: {
        quiz_session_id: quiz_session_id,
        question_id,
      },
    });

    if (existingAnswer) {
      return res.status(400).json({
        message: "Jawaban sudah disubmit!",
      });
    }

    // Parse options if it's a string
    const options =
      typeof question.options === "string"
        ? JSON.parse(question.options)
        : question.options;

    if (!options.includes(selected_answer)) {
      return res.status(400).json({
        message: "Jawaban tidak valid, tidak ada pada opsi pertanyaan",
      });
    }

    const normalizedSelected = selected_answer.toString().trim();
    const normalizedCorrect = question.correct_answer.toString().trim();
    const is_correct = normalizedSelected === normalizedCorrect;

    const jumlahJawaban = await SubmissionAnswer.count();
    const idBaruJawaban = `SA${padNumber(jumlahJawaban + 1)}`;

    await SubmissionAnswer.create({
      id: idBaruJawaban,
      quiz_session_id: quiz_session_id,
      question_id,
      selected_answer: selected_answer,
      is_correct,
      answered_at: new Date(),
    });

    res.status(200).json({
      message: "Jawaban berhasil disimpan",
      question_text: question.question_text,
      selected_answer: selected_answer,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAnswer = async (req, res) => {
  try {
    const { quiz_session_id, question_id, selected_answer } = req.body;

    const session = await QuizSession.findOne({
      where: {
        id: quiz_session_id,
        user_id,
        status: "in_progress",
      },
    });

    if (!session) {
      return res.status(404).json({
        message:
          "Sesi kuis tidak ditemukan, sudah selesai, atau sudah diselesaikan oleh guru",
      });
    }

    // cek apakah jawaban sudah pernah diberikan
    const existingAnswer = await SubmissionAnswer.findOne({
      where: {
        quiz_session_id: quiz_session_id,
        question_id: question_id,
      },
    });
    if (!existingAnswer) {
      return res.status(404).json({ message: "Jawaban tidak ditemukan" });
    }

    const quizSession = await QuizSession.findByPk(quiz_session_id);
    if (!quizSession) {
      return res.status(404).json({ message: "Quiz session tidak ditemukan" });
    }

    const question = await Question.findByPk(question_id);
    if (!question) {
      return res.status(404).json({ message: "Pertanyaan tidak ditemukan" });
    }

    // cek kalau jawabannya ada pada opsi pilihan
    const options =
      typeof question.options === "string"
        ? JSON.parse(question.options)
        : question.options;

    if (!options.includes(selected_answer)) {
      return res.status(400).json({
        message: "Jawaban tidak valid, tidak ada pada opsi pertanyaan",
      });
    }

    const normalizedSelected = selected_answer.toString().trim();
    const normalizedCorrect = question.correct_answer.toString().trim();
    const is_correct = normalizedSelected === normalizedCorrect;

    await SubmissionAnswer.update(
      {
        selected_answer: selected_answer,
        is_correct: is_correct,
      },
      {
        where: {
          quiz_session_id: quiz_session_id,
          question_id: question_id,
        },
      },
    );

    return res.status(200).json({
      message: "Berhasil memperbarui jawaban",
      question_text: question.question_text,
      selected_answer: selected_answer,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const submitQuiz = async (req, res) => {
  try {
    const { quiz_session_id } = req.body;

    const quizSession = await QuizSession.findOne({
      where: { id: quiz_session_id },
    });
    if (!quizSession) {
      return res.status(404).json({ message: "Quiz session tidak ditemukan" });
    }

    if (quizSession.status === "completed") {
      return res.status(400).json({
        message: "Quiz sudah diselesaikan sebelumnya",
      });
    }

    const quiz_id = quizSession.quiz_id;
    const quiz = await Quiz.findByPk(quiz_id);

    // hitung total pertanyaan pada kuiz
    const totalQuestions = await Question.count({
      where: { quiz_id: quiz_id },
    });

    // hitung total jawaban yang benar
    const correctAnswers = await SubmissionAnswer.count({
      where: { quiz_session_id: quizSession.id, is_correct: 1 },
    });

    // hitung skore dari total pertanyaan dan jawaban yang benar
    const score =
      totalQuestions > 0
        ? Math.round((correctAnswers / totalQuestions) * 100)
        : 0;

    await QuizSession.update(
      {
        status: "completed",
        ended_at: new Date(),
        score: score,
      },
      {
        where: { id: quiz_session_id },
      },
    );

    // update point student
    const studentEarnedPoints = correctAnswers * 1000;
    const student = await User.findByPk(quizSession.user_id);
    if (student) {
      await User.update(
        {
          points: student.points + studentEarnedPoints,
        },
        {
          where: { id: quizSession.user_id },
        },
      );
    }

    // update point teacher
    const teacherEarnedPoints = 8000;
    const teacher = await User.findByPk(quiz.created_by);
    if (teacher) {
      await User.update(
        {
          points: teacher.points + teacherEarnedPoints,
        },
        {
          where: { id: quiz.created_by },
        },
      );
    }

    return res.status(200).json({
      message: `Berhasil menyelesaikan quiz ${quiz.title}`,
      score_akhir: score,
      points: studentEarnedPoints,
    });
  } catch (error) {
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
      }),
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

const getGeminiEvaluation = async (req, res) => {
  try {
    const { submission_answer_id, language, detailed_feedback, question_type } =
      req.body;

    const submissionAnswer =
      await SubmissionAnswer.findByPk(submission_answer_id);

    if (!submissionAnswer) {
      return res.status(404).json({ message: "Jawaban tidak ditemukan" });
    }

    const question = await Question.findByPk(submissionAnswer.question_id);

    if (!question) {
      return res.status(404).json({ message: "Pertanyaan tidak ditemukan" });
    }

    const options = {
      language,
      detailed_feedback,
      question_type,
    };

    const evaluation = await fetchGeminiEvaluation(
      question.question_text,
      question.correct_answer,
      submissionAnswer.selected_answer,
      options,
    );

    return res.status(200).json({
      message: "Berhasil mendapatkan evaluasi",
      evaluation,
    });
  } catch (error) {
    console.error("Error in getGeminiEvaluation:", error.message);

    // Check if it's a quota exceeded error
    if (error.message.includes("quota") || error.message.includes("Quota")) {
      return res.status(429).json({
        message: "Kuota API Gemini telah habis. Silakan coba lagi nanti.",
        error: "QUOTA_EXCEEDED",
        details:
          language === "en"
            ? "The Gemini API quota has been exceeded. Please try again later."
            : "Kuota API Gemini telah habis. Silakan coba lagi nanti.",
      });
    }

    // Check if it's a rate limit error
    if (
      error.message.includes("rate limit") ||
      error.message.includes("retry")
    ) {
      return res.status(429).json({
        message: "Terlalu banyak permintaan. Silakan tunggu beberapa saat.",
        error: "RATE_LIMIT",
        details:
          language === "en"
            ? "Too many requests. Please wait a moment and try again."
            : "Terlalu banyak permintaan. Silakan tunggu beberapa saat.",
      });
    }

    // Generic error
    return res.status(500).json({
      message: "Gagal mendapatkan evaluasi dari Gemini",
      error: "EVALUATION_FAILED",
      details:
        language === "en"
          ? "Failed to get evaluation from Gemini AI. Please try again later."
          : "Gagal mendapatkan evaluasi dari Gemini AI. Silakan coba lagi nanti.",
    });
  }
};

const getSessionHistory = async (req, res) => {
  try {
    const user_id = req.user.id;

    const allSessions = await QuizSession.findAll({
      where: {
        user_id: user_id,
      },
      include: [
        {
          model: Quiz,
          attributes: ["id", "title", "description", "category", "created_by"], //detail kuis
          include: [
            {
              model: User,
              attributes: ["name"], //dari created_by, cari dibuat sama siapa
            },
          ],
        },
      ],
      order: [["started_at", "DESC"]],
    });

    if (!allSessions || allSessions.length === 0) {
      return res.status(404).json({
        message: "Sejarah sesi quiz kosong, siswa belum pernah melakukan quiz",
      });
    }

    const formattedHistory = allSessions.map((session) => ({
      session_id: session.id,
      quiz: {
        id: session.Quiz.id,
        title: session.Quiz.title,
        description: session.Quiz.description,
        category: session.Quiz.category,
        teacher_name: session.Quiz.User.name,
      },
    }));

    res.status(200).json({
      message: "Berhasil mendapatkan sejarah sesi quiz",
      history: formattedHistory,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getQuizReview = async (req, res) => {
  try {
    const { quiz_id } = req.params;
    const user_id = req.user.id;

    // sesi terakhir dari quiz yang dicari
    const lastSession = await QuizSession.findOne({
      where: {
        user_id: user_id,
        quiz_id: quiz_id,
        status: "completed",
      },
      order: [["ended_at", "DESC"]], //urutan paling baru
      include: [
        {
          model: Quiz,
          attributes: ["id", "title", "description", "category"], //detail quiz
        },
        {
          model: SubmissionAnswer,
          attributes: ["question_id", "selected_answer", "is_correct"], // pertanyaan mana + jawaban
          include: [
            {
              model: Question,
              attributes: ["id", "question_text", "correct_answer", "options"], //detail pertanyaan
            },
          ],
        },
      ],
    });

    if (!lastSession) {
      return res.status(404).json({
        message: "Tidak ada sesi kuis yang sudah diselesaikan untuk kuis ini.",
      });
    }

    const formattedReview = {
      Session: lastSession.id,
      Title: lastSession.Quiz.title,
      Description: lastSession.Quiz.description,
      Category: lastSession.Quiz.category,
      Score: lastSession.score,
      Answers: lastSession.SubmissionAnswers.map((submission) => ({
        ID: submission.Question.id,
        Question: submission.Question.question_text,
        "Correct Answer": submission.Question.correct_answer,
        "Student's Answer": submission.selected_answer,
        "Is it correct?": submission.is_correct,
      })),
    };

    res.status(200).json({
      message: "Berhasil mendapatkan review kuis terakhir",
      Review_Quiz: formattedReview,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStudentHistory = async (req, res) => {
  try {
    // Ambil ID dari token (req.user)
    // Pastikan middleware auth sudah menempelkan uid/id
    const userId = req.user.id || req.user.uid;

    console.log("🔍 Fetching history for user:", userId);

    // 1. Ambil semua sesi kuis yang sudah COMPLETED
    const sessions = await QuizSession.findAll({
      where: {
        user_id: userId,
        status: "completed",
      },
      include: [
        {
          model: Quiz,
          attributes: ["title", "category"],
        },
      ],
      order: [["ended_at", "DESC"]],
    });

    if (!sessions.length) {
      // Return array kosong di dalam key 'data'
      return res.status(200).json({ message: "No history found", data: [] });
    }

    // 2. Hitung Detail (Benar/Salah)
    const historyData = await Promise.all(
      sessions.map(async (session) => {
        const s = session.toJSON();

        // Hitung jawaban benar
        const correctCount = await SubmissionAnswer.count({
          where: { quiz_session_id: s.id, is_correct: 1 },
        });

        // Hitung jawaban salah
        const incorrectCount = await SubmissionAnswer.count({
          where: { quiz_session_id: s.id, is_correct: 0 },
        });

        return {
          // Mapping field sesuai StudentHistoryModel di Flutter
          id: s.id,
          quiz_title: s.Quiz ? s.Quiz.title : "Unknown Quiz",
          score: s.score, // Nilai (0-100)
          correct: correctCount, // Jumlah Benar
          incorrect: incorrectCount, // Jumlah Salah
          finished_at: s.ended_at, // Tanggal Selesai
        };
      }),
    );

    // 3. Kirim response dengan key 'data'
    return res.status(200).json({
      message: "Berhasil mendapatkan sejarah sesi quiz",
      data: historyData, // <--- PENTING: Key harus 'data' agar cocok dengan Flutter
    });
  } catch (error) {
    console.error("Get History Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

const getHistoryDetail = async (req, res) => {
  try {
    const { session_id } = req.params;

    // Gunakan ID internal user
    const userId = req.user.id || req.user.uid;

    // 1. Cek Sesi & Validasi Pemilik
    const session = await QuizSession.findOne({
      where: { id: session_id },
      include: [{ model: Quiz, attributes: ["title", "category"] }],
    });

    if (!session) {
      return res.status(404).json({ message: "Sesi tidak ditemukan" });
    }

    // Pastikan yang akses adalah pemilik sesi (security)
    if (session.user_id !== userId) {
      return res
        .status(403)
        .json({ message: "Anda tidak berhak melihat detail ini" });
    }

    // 2. Ambil Jawaban + Detail Soal
    const answers = await SubmissionAnswer.findAll({
      where: { quiz_session_id: session_id },
      include: [
        {
          model: Question,
          attributes: [
            "id",
            "question_text",
            "type",
            "difficulty",
            "correct_answer",
            "options",
          ],
        },
      ],
    });

    // 3. Format Data untuk Flutter
    const formattedDetails = answers.map((ans) => {
      const q = ans.Question;

      // --- [FIX] CEK APAKAH SOAL MASIH ADA? ---
      if (!q) {
        // Jika soal sudah dihapus dari database, kembalikan data placeholder
        // agar aplikasi tidak crash
        return {
          question_id: ans.question_id || "deleted",
          question_text: "[Soal ini telah dihapus oleh guru]",
          type: "unknown",
          difficulty: "unknown",
          options: [],
          user_answer: ans.selected_answer,
          correct_answer: "-",
          is_correct: ans.is_correct ? true : false,
          submission_answer_id: ans.id,
        };
      }

      return {
        question_id: q.id,
        question_text: q.question_text,
        type: q.type, // 'multiple' / 'boolean'
        difficulty: q.difficulty,

        // PENTING: Parse options jika bentuknya string JSON
        options:
          typeof q.options === "string" ? JSON.parse(q.options) : q.options,

        user_answer: ans.selected_answer,
        correct_answer: q.correct_answer,
        is_correct: ans.is_correct ? true : false,
        submission_answer_id: ans.id,
      };
    });

    return res.status(200).json({
      message: "Detail history berhasil diambil",
      data: {
        quiz_title: session.Quiz ? session.Quiz.title : "Unknown",
        score: session.score,
        finished_at: session.ended_at,
        details: formattedDetails,
      },
    });
  } catch (error) {
    console.error("Get History Detail Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

const getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user.id || req.user.uid;

    const transactions = await Transaction.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Subscription,
          as: "subscription_detail",
          attributes: ["status"],
        },
        {
          model: Avatar,
          as: "avatar_detail",
          attributes: ["name"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    const formatted = transactions.map((t) => {
      let itemName = "Unknown";

      if (t.category === "subscription" && t.subscription_detail) {
        itemName = `Paket ${t.subscription_detail.status}`;
      } else if (t.category === "item" && t.avatar_detail) {
        itemName = `Avatar ${t.avatar_detail.name}`;
      }

      return {
        id: t.id,
        user_id: t.user_id,
        item_name: itemName, // Kirim ini ke Flutter
        category: t.category,
        amount: parseFloat(t.amount),
        status: t.status,
        payment_method: t.payment_method,
        created_at: t.created_at,
      };
    });

    res.status(200).json({ data: formatted });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// SIMULASI BUY SUBSCRIPTION (Dummy Payment)
const buySubscription = async (req, res) => {
  try {
    const userId = req.user.id || req.user.uid;
    const { subscription_id, payment_method } = req.body;

    // 1. Cek User
    const user = await User.findOne({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2. Generate Transaction ID (TR + Random)
    const trId = "TR" + Math.floor(1000 + Math.random() * 9000);

    // 3. Simpan Transaksi (Langsung Success ceritanya)
    await Transaction.create({
      id: trId,
      user_id: userId,
      subscription_id: subscription_id, // Misal 2 (Premium)
      amount: 50000, // Harga ceritanya 50rb
      status: "success",
      payment_method: payment_method || "Manual",
    });

    // 4. UPDATE USER SUBSCRIPTION OTOMATIS
    user.subscription_id = subscription_id;
    await user.save();

    res
      .status(200)
      .json({ message: "Pembelian berhasil! Akun Anda sekarang Premium." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getQuizDetailByCode = async (req, res) => {
  try {
    const { quiz_code } = req.params;
    const quiz = await Quiz.findOne({
      where: { quiz_code },
    });
    if (!quiz) {
      return res
        .status(404)
        .json({ message: "Kuis dengan kode tersebut tidak ditemukan" });
    }
    const questions = await Question.findAll({
      where: { quiz_id: quiz.id },
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
    res.status(200).json({
      message: `Berhasil mendapatkan detail kuis`,
      questions: questions,
      quiz_id: quiz.id,
    });
  } catch (error) {
    console.error("Error getQuizDetailByCode:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
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
  getQuizDetailByCode,
};
