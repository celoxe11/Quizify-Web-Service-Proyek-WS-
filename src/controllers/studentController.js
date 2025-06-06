const { Quiz, QuizSession, Question, SubmissionAnswer, User } = require("../models");
const opentdb = require("../services/opentdb");
const { Op } = require("sequelize");

// Helper function to pad numbers with leading zeros
const padNumber = (num) => {
  return num.toString().padStart(3, '0');
};

const startQuiz = async (req, res) => {
  try {
    const { quiz_id } = req.params;
    const user_id = req.user.id;

    const quiz = await Quiz.findOne({
      where: { id: quiz_id }
    });

    if (!quiz) {
      return res.status(404).json({ message: "Kuis tidak ditemukan" });
    }

    // cek sesi
    const activeSession = await QuizSession.findOne({
      where: {
        user_id,
        quiz_id,
        status: "in_progress"
      }
    });

    if (activeSession) {
      return res.status(400).json({ 
        message: "Anda memiliki sesi kuis yang aktif",
        session_id: activeSession.id
      });
    }

    // buat ID
    const jumlahSession = await QuizSession.count();
    const idBaruSession = `S${padNumber(jumlahSession + 1)}`;

    const session = await QuizSession.create({
      id: idBaruSession,
      user_id,
      quiz_id,
      status: "in_progress",
      started_at: new Date(),
      ended_at: null,
      score: null
    });

    res.status(201).json({
      message: "Sesi kuis berhasil dimulai",
      session_id: session.id
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
        status: "in_progress"
      }
    });

    if (!session) {
      return res.status(404).json({ 
        message: "Sesi kuis tidak ditemukan, sudah selesai, atau sudah diselesaikan oleh guru" 
      });
    }

    const questions = await Question.findAll({
      where: { quiz_id: session.quiz_id },
      attributes: [
        'id', 
        'question_text', 
        'type', 
        'difficulty', 
        'category', 
        'correct_answer', 
        'incorrect_answers'
      ]
    });

    const formattedQuestions = questions.map(question => {
      // ini cek string atau ga biar pas dipisah array ga kepisah per karakter
      let incorrectAnswers;
      if (typeof question.incorrect_answers === 'string') {
        incorrectAnswers = JSON.parse(question.incorrect_answers);
      } else {
        incorrectAnswers = question.incorrect_answers;
      }

      const allPossibleAnswers = [
        question.correct_answer,
        ...incorrectAnswers
      ].sort(() => Math.random() - 0.5);

      // Return formatted question object
      return {
        id: question.id,
        question_text: question.question_text,
        type: question.type,
        difficulty: question.difficulty,
        category: question.category,
        possible_answers: allPossibleAnswers
      };
    });

    res.status(200).json({
      message: "Berhasil mendapatkan pertanyaan",
      questions: formattedQuestions
    });

  } catch (error) {
    res.status(500).json({ 
      message: error.message 
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
        status: "in_progress"
      }
    });

    if (!session) {
      return res.status(404).json({ message: "Sesi kuis tidak ditemukan, sudah selesai, atau sudah diselesaikan oleh guru" });
    }

    const question = await Question.findOne({
      where: { 
        id: question_id,
        quiz_id: session.quiz_id
      }
    });

    if (!question) {
      return res.status(404).json({ message: "Pertanyaan tidak ditemukan" });
    }

    //cek udh dijawab
    const existingAnswer = await SubmissionAnswer.findOne({
      where: {
        quiz_session_id: quiz_session_id,
        question_id
      }
    });

    if (existingAnswer) {
      return res.status(400).json({ 
        message: "Jawaban sudah disubmit!" 
      });
    }

    const allPossibleAnswers = [
      question.correct_answer,
      ...(typeof question.incorrect_answers === 'string' ? JSON.parse(question.incorrect_answers) : question.incorrect_answers)
    ];
    if (!allPossibleAnswers.includes(selected_answer)) {
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
      answered_at: new Date()
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
        status: "in_progress"
      }
    });

    if (!session) {
      return res.status(404).json({ message: "Sesi kuis tidak ditemukan, sudah selesai, atau sudah diselesaikan oleh guru" });
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
    const allPossibleAnswers = [
      question.correct_answer,
      ...(typeof question.incorrect_answers === 'string' ? JSON.parse(question.incorrect_answers) : question.incorrect_answers)
    ];
    if (!allPossibleAnswers.includes(selected_answer)) {
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
      }
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
      }
    );

    return res.status(200).json({
      message: `Berhasil menyelesaikan quiz ${quiz.title}`,
      score_akhir: score,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getGenerateQuestion = async (req, res) => {
  try {
    const { type, amount, difficulty, category } = req.body;

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

    const formatedQuestions = data.results.map((question) => {
      const allOptions = [
        `${question.correct_answer} (correct)`,
        ...question.incorrect_answers,
      ];
      const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);
      return {
        question: question.question,
        options: shuffledOptions,
        type: question.type,
        difficulty: question.difficulty,
        category: question.category,
      };
    });

    return res.status(200).json({
      message: `Berhasil mendapatkan ${formatedQuestions.length} pertanyaan`,
      questions: formatedQuestions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSessionHistory = async (req, res) => {
  try {
    const user_id = req.user.id;

    const allSessions = await QuizSession.findAll({
      where: {
        user_id: user_id
      },
      include: [{
        model: Quiz,
        attributes: ['id', 'title', 'description', 'category', 'created_by'], //detail kuis
        include: [{
          model: User,
          attributes: ['name'] //dari created_by, cari dibuat sama siapa
        }]
      }],
      order: [['started_at', 'DESC']]
    });

    if (!allSessions || allSessions.length === 0) {
      return res.status(404).json({
        message: "Sejarah sesi quiz kosong, siswa belum pernah melakukan quiz",
      });
    }

    const formattedHistory = allSessions.map(session => ({
      session_id: session.id,
      quiz: {
        id: session.Quiz.id,
        title: session.Quiz.title,
        description: session.Quiz.description,
        category: session.Quiz.category,
        teacher_name: session.Quiz.User.name
      }
    }));

    res.status(200).json({
      message: "Berhasil mendapatkan sejarah sesi quiz",
      history: formattedHistory
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
        status: "completed"
      },
      order: [['ended_at', 'DESC']], //urutan paling baru
      include: [{
        model: Quiz,
        attributes: ['id', 'title', 'description', 'category'] //detail quiz
      }, {
        model: SubmissionAnswer,
        attributes: ['question_id', 'selected_answer', 'is_correct'], // pertanyaan mana + jawaban
        include: [{
          model: Question,
          attributes: ['id', 'question_text', 'correct_answer', 'incorrect_answers'] //detail pertanyaan
        }]
      }]
    });

    if (!lastSession) {
      return res.status(404).json({
        message: "Tidak ada sesi kuis yang sudah diselesaikan untuk kuis ini."
      });
    }

    const formattedReview = {
      Session: lastSession.id,
      Title: lastSession.Quiz.title,
      Description: lastSession.Quiz.description,
      Category: lastSession.Quiz.category,
      Score: lastSession.score,
      Answers: lastSession.SubmissionAnswers.map(submission => ({
        ID: submission.Question.id,
        Question: submission.Question.question_text,
        "Correct Answer": submission.Question.correct_answer,
        "Student's Answer": submission.selected_answer,
        "Is it correct?": submission.is_correct
      }))
    };

    res.status(200).json({
      message: "Berhasil mendapatkan review kuis terakhir",
      Review_Quiz: formattedReview
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  startQuiz,
  getQuestions,
  answerQuestion,
  updateAnswer,
  submitQuiz,
  getGenerateQuestion,
  getSessionHistory,
  getQuizReview
};
