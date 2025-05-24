const axios = require("axios");
const schema = require("../utils/validation/");
const { User, Quiz, Question, QuestionImage, QuizSession, SubmissionAnswer } = require("../models");

const opentdb = require("../services/opentdb"); // ini file untuk nembak ke open trivia api

// todo: cek kalau free user sudah membuat 1 kuis, kalau sudah maka tidak bisa membuat kuis lagi
const createQuiz = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || title === "") {
      return res.status(400).json({
        message: "Judul kuis tidak boleh kosong",
      });
    }

    let desc = "";
    if (description && description !== "") {
      desc = description;
    }

    const allQuiz = await Quiz.findAll();
    let id = "QU" + (allQuiz.length + 1).toString().padStart(3, "0");

    const created_by = req.user.id;
    const quiz = await Quiz.create({
      id,
      title,
      description: desc,
      created_by,
    });
    res.status(201).json({
      message: "Berhasil membuat kuis berjudul " + quiz.title,
      quiz_id: quiz.id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateQuiz = async (req, res) => {
  try {
    const { quiz_id, title, description } = req.body;
    if (!title || title === "") {
      return res.status(400).json({
        message: "Judul kuis tidak boleh kosong",
      });
    }
    let desc = "";
    if (description && description !== "") {
      desc = description;
    }
    const quiz = await Quiz.update(
      {
        title,
        description: desc,
      },
      {
        where: {
          id: quiz_id,
        },
      }
    );
    if (quiz[0] === 0) {
      return res.status(404).json({
        message: "Kuis tidak ditemukan",
      });
    }
    res.status(200).json({
      message: "Berhasil memperbarui kuis berjudul " + title,
      quiz_id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// todo: tambahkan multer buat upload image
// cek juga kalau free user sudah upload 3 image per hari
const createQuestion = async (req, res) => {
  try {
    let {
      quiz_id,
      type,
      category,
      difficulty,
      question_text,
      correct_answer,
      incorrect_answers,
    } = req.body;

    if (incorrect_answers && typeof incorrect_answers === "string") {
      try {
        incorrect_answers = JSON.parse(incorrect_answers);
      } catch (e) {
        incorrect_answers = incorrect_answers
          .split(",")
          .map((item) => item.trim());
      }
    }

    if (!Array.isArray(incorrect_answers)) {
      return res.status(400).json({
        message: "incorrect_answers harus berupa array",
      });
    }

    await schema.questionSchema.validateAsync(
      {
        ...req.body,
        incorrect_answers,
      },
      { abortEarly: false }
    );

    const allQuestion = await Question.findAll();
    let id = "Q" + (allQuestion.length + 1).toString().padStart(3, "0");

    const imagePath = req.file
      ? `/uploads/${req.user.id}/${req.file.filename}`
      : null;

    const question = await Question.create({
      id,
      quiz_id,
      category,
      type,
      difficulty,
      question_text,
      correct_answer,
      incorrect_answers,
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

    // buat format data yang dikembalikan
    const formattedQuestion = {
      id: question.id,
      quiz_id: question.quiz_id,
      category: question.category,
      type: question.type,
      difficulty: question.difficulty,
      question_text: question.question_text,
      correct_answer: question.correct_answer,
      incorrect_answers: question.incorrect_answers,
      image_url: imagePath
        ? `${req.protocol}://${req.get("host")}${imagePath}`
        : null,
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

// todo: tambahkan multer buat upload image
// cek juga kalau free user sudah upload 3 image per hari
const updateQuestion = async (req, res) => {
  try {
    const {
      question_id,
      quiz_id,
      type,
      category,
      difficulty,
      question_text,
      correct_answer,
      incorrect_answers,
    } = req.body;

    await schema.updateQuestionSchema.validateAsync(req.body, {
      abortEarly: false,
    });

    // Handle image upload if present
    const imagePath = req.file
      ? `/uploads/${req.user.id}/${req.file.filename}`
      : null;

    const question = await Question.update(
      {
        quiz_id,
        category,
        type,
        difficulty,
        question_text,
        correct_answer,
        incorrect_answers,
        is_generated: 0,
      },
      {
        where: {
          id: question_id,
        },
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

    return res.status(200).json({
      message: "Berhasil memperbarui pertanyaan",
      question,
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
    const { quiz_id, type, difficulty, category, amount } = req.body;

    if (quiz_id === undefined || quiz_id === "") {
      return res.status(400).json({
        message: "Quiz ID tidak boleh kosong",
      });
    }

    // cari apakah quiz_id ada di database
    const quiz = await Quiz.findOne({
      where: {
        id: quiz_id,
      },
    });
    if (!quiz) {
      return res.status(404).json({
        message: "Quiz ID tidak ditemukan",
      });
    }

    const params = {
      amount: amount || 10, // kalau tidak ada amount, default 10
      category: category || 9, // default category 9 (General Knowledge)
      difficulty: difficulty || undefined, // omit to get random difficulty
      type: type || undefined, // omit to get random type
    };

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

      // Convert OpenTDB question format to our database format
      const newQuestion = await Question.create({
        id,
        quiz_id,
        category: question.category,
        type: question.type,
        difficulty: question.difficulty,
        question_text: question.question,
        correct_answer: question.correct_answer,
        incorrect_answers: question.incorrect_answers,
        is_generated: 1,
      });

      // Format the question data to exclude certain fields
      const formattedQuestion = {
        id: newQuestion.id,
        quiz_id: newQuestion.quiz_id,
        category: newQuestion.category,
        type: newQuestion.type,
        difficulty: newQuestion.difficulty,
        question_text: newQuestion.question_text,
        correct_answer: newQuestion.correct_answer,
        incorrect_answers: newQuestion.incorrect_answers,
      };

      savedQuestions.push(formattedQuestion);
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
    const question_id = req.params.question_id;
    if (!question_id) {
      return res.status(400).json({
        message: "Question ID tidak boleh kosong",
      });
    }

    // cari apakah question_id ada di database
    const question = await Question.findOne({
      where: {
        id: question_id,
      },
    });

    if (!question) {
      return res.status(404).json({
        message: "Question ID tidak ditemukan",
      });
    }

    // hapus question
    await Question.destroy({
      where: {
        id: question_id,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUsersQuiz = async (req, res) => {
  try {
    const user_id = req.user.id;

    // cari semua quiz yang dibuat oleh user beserta tampilkan berapa pertanyaan yang ada di dalamnya dan kapan dibuat
    const quizzes = await Quiz.findAll({
      where: {
        created_by: user_id,
      },
      include: [
        {
          model: Question,
          attributes: ["id"],
        },
      ],
      attributes: {
        include: [
          [
            sequelize.fn("COUNT", sequelize.col("questions.id")),
            "question_count",
          ],
          "created_at",
        ],
      },
      group: ["Quiz.id"],
    });

    if (quizzes.length === 0) {
      return res.status(404).json({
        message: "Tidak ada kuis yang ditemukan",
      });
    }

    // format data yang dikembalikan
    quizzes = quizzes.map((quiz) => {
      return {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        question_count: quiz.dataValues.question_count,
        created_at: quiz.created_at,
      };
    });

    res.status(200).json({
      message: "Berhasil mendapatkan kuis",
      quizzes,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getQuizDetail = async (req, res) => {
  try {
    const quiz_id = req.params.quiz_id;
    if (!quiz_id) {
      return res.status(400).json({
        message: "Quiz ID tidak boleh kosong",
      });
    }
    // cari apakah quiz_id ada di database
    const quiz = await Quiz.findOne({
      where: {
        id: quiz_id,
      },
      include: [
        {
          model: Question,
          attributes: ["id", "question_text", "correct_answer", "incorrect_answers"],
          include: [
            {
              model: QuestionImage,
              attributes: ["image_url"],
            },
          ],
        },
      ],
    });

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz ID tidak ditemukan",
      });
    }

    // format data yang dikembalikan
    const formattedQuiz = {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      created_at: quiz.created_at,
      questions: quiz.questions.map((question) => {
        return {
          id: question.id,
          question_text: question.question_text,
          correct_answer: question.correct_answer,
          incorrect_answers: question.incorrect_answers,
          image_url: question.QuestionImage
            ? `${req.protocol}://${req.get("host")}${question.QuestionImage.image_url}`
            : null,
        };
      }),
    };

    res.status(200).json({
      message: "Berhasil mendapatkan detail kuis",
      quiz: formattedQuiz,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const startQuiz = async (req, res) => {
  try {
    const quiz_id = req.params.quiz_id;
    if (!quiz_id) {
      return res.status(400).json({
        message: "Quiz ID tidak boleh kosong",
      });
    }

    // cari apakah quiz_id ada di database
    const quiz = await Quiz.findOne({
      where: {
        id: quiz_id,
      },
    });

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz ID tidak ditemukan",
      });
    }

    // cek apakah quiz sudah dimulai dari quizSession, lihat apakah started_at null
    const quizSession = await QuizSession.findOne({
      where: {
        quiz_id,
        started_at: null,
      },
    });
    
    if (!quizSession) {
      return res.status(400).json({
        message: "Quiz sudah dimulai",
      });
    }

    // buat quiz session baru
    const quizSessionId = "S" + (quizSession.length + 1).toString().padStart(3, "0");
    const quizSessionCreated = await QuizSession.create({
      id: quizSessionId,
      quiz_id,
      started_at: new Date(),
    });

    if (!quizSessionCreated) {
      return res.status(500).json({
        message: "Gagal memulai kuis",
      });
    }
    res.status(200).json({
      message: `Berhasil memulai kuis ${quiz.title}`,
      quiz_session_id: quizSessionCreated.id,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const endQuiz = async (req, res) => {
  try {
    const quiz_id = req.params.quiz_id;
    if (!quiz_id) {
      return res.status(400).json({
        message: "Quiz ID tidak boleh kosong",
      });
    }

    // cari apakah quiz_id ada di database
    const quiz = await Quiz.findOne({
      where: {
        id: quiz_id,
      },
    });

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz ID tidak ditemukan",
      });
    }

    // cek apakah quiz sudah dimulai dari quizSession, lihat apakah started_at null
    const quizSession = await QuizSession.findOne({
      where: {
        quiz_id,
        started_at: {
          [Op.ne]: null,
        },
      },
    });

    if (!quizSession) {
      return res.status(400).json({
        message: "Quiz belum dimulai",
      });
    }

    // hitung score rata-rata dari semua peserta yang mengikuti kuis, lihat dari submission_answer
    const totalScore = await SubmissionAnswer.sum("score", {
      where: {
        quiz_session_id: quizSession.id,
      },
    });
    const totalParticipants = await SubmissionAnswer.count({
      where: {
        quiz_session_id: quizSession.id,
      },
    });
    const averageScore = totalParticipants > 0 ? totalScore / totalParticipants : 0;
    const score = Math.round(averageScore);

    // update quiz session
    await QuizSession.update(
      {
        ended_at: new Date(),
        status: "completed",
        score: score,
      },
      {
        where: {
          id: quizSession.id,
        },
      }
    );

    res.status(200).json({
      message: `Berhasil mengakhiri kuis ${quiz.title}`,
      quiz_session_id: quizSession.id,
      rata_score: score,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getQuizResult = async (req, res) => {
  try {
    // lihat semua score siswa yang mengikuti kuis
    const quiz_id = req.params.quiz_id;
    if (!quiz_id) {
      return res.status(400).json({
        message: "Quiz ID tidak boleh kosong",
      });
    }
    // cari apakah quiz_id ada di database
    const quiz = await Quiz.findOne({
      where: {
        id: quiz_id,
      },
    });

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz ID tidak ditemukan",
      });
    }

    // cari semua quiz session yang ada
    const quizSessions = await QuizSession.findAll({
      where: {
        quiz_id,
        ended_at: {
          [Op.ne]: null,
        },
      },
      include: [
        {
          model: SubmissionAnswer,
          attributes: ["user_id", "score"],
          include: [
            {
              model: User,
              attributes: ["username"],
            },
          ],
        },
      ],
    });

    if (quizSessions.length === 0) {
      return res.status(404).json({
        message: "Tidak ada hasil kuis yang ditemukan",
      });
    }

    // format data yang dikembalikan
    const formattedResults = quizSessions.map((session) => {
      return {
        rata_score: session.score,
        hasil_siswa: session.SubmissionAnswers.map((answer) => {
          return {
            username: answer.User.username,
            score: answer.score,
          };
        }),
      };
    });

    res.status(200).json({
      message: "Berhasil mendapatkan hasil kuis",
      quiz_id,
      quiz_sessions: formattedResults,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStudentsAnswers = async (req, res) => {
  try {
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getQuizAccuracy = async (req, res) => {
  try {
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const subscribe = async (req, res) => {
  try {
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const unsubscribe = async (req, res) => {
  try {
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createQuiz,
  updateQuiz,
  createQuestion,
  updateQuestion,
  generateQuestion,
  deleteQuestion,
  getUsersQuiz,
  getQuizDetail,
  startQuiz,
  endQuiz,
  getQuizResult,
  getStudentsAnswers,
  getQuizAccuracy,
  subscribe,
  unsubscribe,
};
