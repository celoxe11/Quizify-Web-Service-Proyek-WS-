const fs = require("fs");
const path = require("path");
const teacherSchema = require("../utils/validation/teacherSchema");
const {
  Quiz,
  Question,
  QuestionImage,
  QuizSession,
  User,
  SubmissionAnswer,
  sequelize,
} = require("../models");
const { checkQuizOwnership, formatImageUrl } = require("../utils/helpers");
const generateQuestionGemini = require("../utils/generateQuestionGemini");

/**
 * Save Quiz with Questions
 * Creates a new quiz OR updates an existing quiz with all its questions in a single transaction
 * - If quiz_id is NOT provided: Creates a new quiz with questions
 * - If quiz_id IS provided: Updates the quiz and replaces all questions
 */
const saveQuizWithQuestions = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { error, value } = teacherSchema.saveQuizWithQuestionsSchema.validate(
      req.body
    );
    if (error) {
      await transaction.rollback();
      return res.status(400).json({ message: error.details[0].message });
    }

    const {
      quiz_id,
      title,
      description,
      category,
      status,
      quiz_code,
      questions,
    } = value;
    const desc = description || "";
    const userId = req.user.id;

    console.log("Status: ", status);

    let quiz;
    let quizId;
    let isUpdate = false;

    // Check if this is an update or create operation
    if (quiz_id) {
      // UPDATE MODE: Check if quiz exists and user owns it
      isUpdate = true;
      const ownershipCheck = await checkQuizOwnership(Quiz, quiz_id, userId);
      if (ownershipCheck.error) {
        await transaction.rollback();
        return res
          .status(ownershipCheck.code)
          .json({ message: ownershipCheck.error });
      }

      // Check if quiz_code is being updated and already exists for another quiz
      if (quiz_code) {
        const { Op } = require("sequelize");
        const existingQuiz = await Quiz.findOne({
          where: {
            quiz_code,
            id: { [Op.ne]: quiz_id },
          },
        });
        if (existingQuiz) {
          await transaction.rollback();
          return res.status(400).json({ message: "Quiz code already in use" });
        }
      }

      // Update the quiz
      await Quiz.update(
        {
          title,
          description: desc,
          category: category || null,
          status: status,
          quiz_code: quiz_code || null,
        },
        { where: { id: quiz_id }, transaction }
      );

      quizId = quiz_id;

      // Delete all existing questions for this quiz
      await Question.destroy({ where: { quiz_id: quizId }, transaction });

      // Also delete related question images
      const existingQuestionImages = await QuestionImage.findAll({
        include: [
          {
            model: Question,
            where: { quiz_id: quizId },
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

      quiz = await Quiz.findByPk(quiz_id);
    } else {
      // CREATE MODE: Generate new quiz ID and create quiz

      // Check if quiz_code is provided and already exists
      if (quiz_code) {
        const existingQuiz = await Quiz.findOne({ where: { quiz_code } });
        if (existingQuiz) {
          await transaction.rollback();
          return res.status(400).json({ message: "Quiz code already in use" });
        }
      }

      // Generate quiz ID
      const allQuiz = await Quiz.findAll();
      quizId = "QU" + (allQuiz.length + 1).toString().padStart(3, "0");

      // Create the quiz
      quiz = await Quiz.create(
        {
          id: quizId,
          title,
          description: desc,
          category: category || null,
          status: status,
          quiz_code: quiz_code || null,
          created_by: userId,
        },
        { transaction }
      );
    }

    // Ensure user upload directory exists
    const userUploadDir = `./src/uploads/${userId}`;
    if (!fs.existsSync(userUploadDir)) {
      fs.mkdirSync(userUploadDir, { recursive: true });
    }

    // Get current question count to generate IDs
    const allQuestions = await Question.findAll();
    let questionCount = allQuestions.length;

    // Create all questions
    const savedQuestions = [];
    for (const questionData of questions) {
      questionCount++;
      const questionId = "Q" + questionCount.toString().padStart(3, "0");

      // Combine correct_answer and incorrect_answers into options
      const options = [
        questionData.correct_answer,
        ...questionData.incorrect_answers,
      ];

      const newQuestion = await Question.create(
        {
          id: questionId,
          quiz_id: quizId,
          type: questionData.type,
          difficulty: questionData.difficulty,
          question_text: questionData.question_text,
          correct_answer: questionData.correct_answer,
          options,
          is_generated: 0,
        },
        { transaction }
      );

      // Handle image upload if question_image is provided
      let imageUrl = null;
      if (questionData.question_image) {
        try {
          // Remove data URI prefix if present (e.g., "data:image/png;base64,")
          const base64Data = questionData.question_image.replace(
            /^data:image\/\w+;base64,/,
            ""
          );
          const buffer = Buffer.from(base64Data, "base64");

          // Generate unique filename
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(2, 15);
          const filename = `question_${questionId}_${timestamp}_${randomString}.png`;
          const filepath = path.join(userUploadDir, filename);

          // Save image to file system
          fs.writeFileSync(filepath, buffer);

          // Create image URL
          imageUrl = `/uploads/${userId}/${filename}`;

          // Save to QuestionImage table
          await QuestionImage.create(
            {
              user_id: userId,
              question_id: questionId,
              image_url: imageUrl,
              uploaded_at: new Date(),
            },
            { transaction }
          );
        } catch (imageError) {
          console.error(
            `Error processing image for question ${questionId}:`,
            imageError
          );
          // Continue without image if there's an error
        }
      }

      savedQuestions.push({
        id: newQuestion.id,
        quiz_id: newQuestion.quiz_id,
        type: newQuestion.type,
        difficulty: newQuestion.difficulty,
        question_text: newQuestion.question_text,
        correct_answer: newQuestion.correct_answer,
        options: newQuestion.options,
        image_url: formatImageUrl(req, imageUrl),
      });
    }

    // Commit the transaction
    await transaction.commit();

    const actionMessage = isUpdate ? "memperbarui" : "menyimpan";
    res.status(isUpdate ? 200 : 201).json({
      message: `Berhasil ${actionMessage} kuis "${quiz.title}" dengan ${savedQuestions.length} pertanyaan`,
      quiz_id: quizId,
      quiz_code: quiz.quiz_code,
      questions: savedQuestions,
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: error.message });
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

    // Check quiz ownership
    const ownershipCheck = await checkQuizOwnership(Quiz, quiz_id, userId);
    if (ownershipCheck.error) {
      await transaction.rollback();
      return res
        .status(ownershipCheck.code)
        .json({ message: ownershipCheck.error });
    }
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

const generateQuestion = async (req, res) => {
  try {
    const { error, value } = teacherSchema.generateQuestionSchema.validate(
      req.body
    );
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Call Gemini API to generate questions with all parameters
    const question = await generateQuestionGemini({
      type: value.type,
      difficulty: value.difficulty,
      category: value.category,
      topic: value.topic,
      language: value.language,
      context: value.context,
      age_group: value.age_group,
      avoid_topics: value.avoid_topics,
      include_explanation: value.include_explanation,
      question_style: value.question_style,
    });

    return res.status(200).json({
      question: question,
    });
  } catch (error) {
    console.error("Error in generateQuestion:", error);
    res.status(500).json({ message: error.message });
  }
};

const getUsersQuiz = async (req, res) => {
  try {
    console.log(req.user);
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
      quiz: {
        id: ownershipCheck.quiz.id,
        title: ownershipCheck.quiz.title,
        description: ownershipCheck.quiz.description,
        quiz_code: ownershipCheck.quiz.quiz_code,
        status: ownershipCheck.quiz.status,
        category: ownershipCheck.quiz.category,
        created_by: ownershipCheck.quiz.created_by,
        created_at: ownershipCheck.quiz.created_at,
        updated_at: ownershipCheck.quiz.updated_at,
        questions,
      },
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

module.exports = {
  saveQuizWithQuestions,
  deleteQuiz,
  endQuiz,
  generateQuestion,
  getUsersQuiz,
  getQuizDetail,
  getQuizResult,
  getStudentsAnswers,
  getQuizAccuracy,
  subscribe,
  unsubscribe,
};
