const { Quiz, QuizSession, Question, SubmissionAnswer } = require("../models");
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

const endQuiz = async (req, res) => {
  try {
    const { session_id } = req.params;
    const user_id = req.user.id;

    // Verify session exists and belongs to user
    const session = await QuizSession.findOne({
      where: {
        id: session_id,
        user_id,
        status: "in_progress"
      }
    });

    if (!session) {
      return res.status(404).json({ message: "Sesi kuis tidak ditemukan atau sudah selesai" });
    }

    // Get all questions for this quiz
    const totalQuestions = await Question.count({
      where: { quiz_id: session.quiz_id }
    });

    // Get correct answers count
    const correctAnswers = await SubmissionAnswer.count({
      where: {
        quiz_session_id: session_id,
        is_correct: true
      }
    });

    // Calculate score (percentage of correct answers)
    const score = totalQuestions > 0 
      ? Math.round((correctAnswers / totalQuestions) * 100)
      : 0;

    // Update session
    await session.update({
      status: "completed",
      ended_at: new Date(),
      score: score
    });

    res.status(200).json({
      message: "Kuis berhasil diselesaikan",
      session_id: session.id,
      score: score,
      total_questions: totalQuestions,
      correct_answers: correctAnswers
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
        message: "Sesi kuis tidak ditemukan atau sudah selesai" 
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

    // ambil jawaban yg udh ada
    const existingAnswers = await SubmissionAnswer.findAll({
      where: { quiz_session_id: session_id },
      attributes: ['question_id', 'selected_answer']
    });

    // question + jawaban
    const formattedQuestions = questions.map(question => {
      const userAnswer = existingAnswers.find(
        answer => answer.question_id === question.id
      );

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
        answered: !!userAnswer, // true if question has been answered
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
    const { session_id, question_id, answer } = req.body;
    const user_id = req.user.id;

    // cek session ada + punya user
    const session = await QuizSession.findOne({
      where: {
        id: session_id,
        user_id,
        status: "in_progress"
      }
    });

    if (!session) {
      return res.status(404).json({ message: "Sesi kuis tidak ditemukan atau sudah selesai" });
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
        quiz_session_id: session_id,
        question_id
      }
    });

    if (existingAnswer) {
      return res.status(400).json({ 
        message: "Jawaban sudah disubmit!" 
      });
    }

    const is_correct = answer === question.correct_answer;


    const jumlahJawaban = await SubmissionAnswer.count();
    const idBaruJawaban = `SA${padNumber(jumlahJawaban + 1)}`;

    await SubmissionAnswer.create({
      id: idBaruJawaban,
      quiz_session_id: session_id,
      question_id,
      selected_answer: answer,
      is_correct,
      answered_at: new Date()
    });

    res.status(200).json({
      message: "Jawaban berhasil disimpan",
      is_correct
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAnswer = async (req, res) => {
  try {
    const { quiz_session_id, question_id, selected_answer } = req.body;
    const quizSession = await QuizSession.findByPk(quiz_session_id);
    if (!quizSession) {
      return res.status(404).json({ message: "Quiz session tidak ditemukan" });
    }

    const question = await Question.findByPk(question_id);
    if (!question) {
      return res.status(404).json({ message: "Pertanyaan tidak ditemukan" });
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

    await SubmissionAnswer.update(
      {
        selected_answer: selected_answer,
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

module.exports = {
  startQuiz,
  endQuiz,
  getQuestions,
  answerQuestion,
  updateAnswer,
  submitQuiz,
  getGenerateQuestion,
};
