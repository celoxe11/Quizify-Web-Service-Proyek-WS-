const { Quiz, QuizSession, Question, SubmissionAnswer } = require("../models");
const opentdb = require("../services/opentdb");

const startQuiz = async (req, res) => {
  try {
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getQuestions = async (req, res) => {
  try {
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const answerQuestion = async (req, res) => {
  try {
    // Logic to handle answering a question
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
  getQuestions,
  answerQuestion,
  updateAnswer,
  submitQuiz,
  getGenerateQuestion,
};
